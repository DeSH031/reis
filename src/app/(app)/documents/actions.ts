"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canEditDocs, requireOrg } from "@/core/session";
import { createClient } from "@/core/supabase/server";
import { buildDocumentSnapshot } from "@/modules/documents/builder";
import { DOC_KINDS, type DocStatus } from "@/modules/documents/types";

const idSchema = z.string().min(10);
const createSchema = z.object({
  kind: z.enum(["request", "invoice", "act", "ttn"]),
  trip_ids: z.array(idSchema).min(1, "Выберите хотя бы один рейс"),
  client_id: idSchema,
});

async function createDocumentInner(formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditDocs(ctx.role)) throw new Error("Недостаточно прав для создания документов");

  const rawKind = formData.get("kind");
  const rawClientId = formData.get("client_id");
  const rawTripIds = formData.getAll("trip_id").map(String).filter(Boolean);

  const parsed = createSchema.parse({
    kind: rawKind,
    client_id: rawClientId,
    trip_ids: rawTripIds,
  });

  const supabase = await createClient();

  // 1. Fetch settings, client, trips concurrently
  const [{ data: settings }, { data: client, error: clientErr }, { data: trips, error: tripsErr }] =
    await Promise.all([
      supabase.from("org_settings").select("*").eq("org_id", ctx.orgId).maybeSingle(),
      supabase.from("clients").select("*").eq("id", parsed.client_id).eq("org_id", ctx.orgId).single(),
      supabase
        .from("trips")
        .select("*, vehicle:vehicles(plate, make_model), driver:drivers(name, phone)")
        .in("id", parsed.trip_ids)
        .eq("org_id", ctx.orgId),
    ]);

  if (clientErr || !client) throw new Error("Клиент не найден");
  if (tripsErr || !trips || trips.length === 0) throw new Error("Рейсы не найдены");

  const year = new Date().getFullYear();
  let seq = 1;
  let number = "";

  // 2. Call issue_doc_number RPC
  const { data: numData, error: numError } = await supabase.rpc("issue_doc_number", {
    p_org: ctx.orgId,
    p_type: parsed.kind,
    p_year: year,
  });

  if (!numError && numData) {
    if (typeof numData === "object" && numData !== null && "number" in numData) {
      const obj = numData as { seq?: number; number?: string; year?: number };
      seq = Number(obj.seq) || 1;
      number = String(obj.number);
    } else if (typeof numData === "number") {
      seq = numData;
      const prefix =
        (settings?.doc_prefix as Record<string, string>)?.[parsed.kind] ||
        DOC_KINDS[parsed.kind].prefix;
      number = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
    } else if (typeof numData === "string") {
      number = numData;
      const parts = number.split("-");
      seq = parseInt(parts[parts.length - 1] || "1", 10) || 1;
    }
  } else {
    // Graceful fallback: query max seq
    const prefix =
      (settings?.doc_prefix as Record<string, string>)?.[parsed.kind] ||
      DOC_KINDS[parsed.kind].prefix;
    const { data: maxDoc } = await supabase
      .from("documents")
      .select("seq")
      .eq("org_id", ctx.orgId)
      .eq("doc_type", parsed.kind)
      .eq("year", year)
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    seq = (maxDoc?.seq ?? 0) + 1;
    number = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
  }

  const today = new Date().toISOString().slice(0, 10);
  const vatPercent = settings?.vat_percent != null ? Number(settings.vat_percent) : null;

  // 3. Insert documents table record
  const { data: newDoc, error: docError } = await supabase
    .from("documents")
    .insert({
      org_id: ctx.orgId,
      trip_id: parsed.trip_ids[0] ?? null,
      client_id: parsed.client_id,
      doc_type: parsed.kind,
      year,
      seq,
      number,
      status: "issued",
      issue_date: today,
      amount_total: 0, // will update with snapshot totals
      vat_amount: 0,
      locked: false,
    })
    .select("id")
    .single();

  if (docError || !newDoc) {
    throw new Error("Не удалось создать документ: " + (docError?.message ?? ""));
  }

  // 4. Build frozen snapshot
  const snapshot = buildDocumentSnapshot({
    document: {
      id: newDoc.id,
      number,
      doc_type: parsed.kind,
      issue_date: today,
      year,
      seq,
      status: "issued",
    },
    supplierRaw: (settings?.requisites as Record<string, unknown>) ?? null,
    clientRaw: client as Record<string, unknown>,
    tripsRaw: trips as unknown as Parameters<typeof buildDocumentSnapshot>[0]["tripsRaw"],
    vatPercent,
  });

  // 5. Update amount_total and vat_amount in document
  await supabase
    .from("documents")
    .update({
      amount_total: snapshot.totals.total,
      vat_amount: snapshot.totals.vat,
    })
    .eq("id", newDoc.id)
    .eq("org_id", ctx.orgId);

  // 6. Insert document_trips
  const docTrips = parsed.trip_ids.map((tid) => ({
    document_id: newDoc.id,
    trip_id: tid,
    org_id: ctx.orgId,
  }));
  await supabase.from("document_trips").insert(docTrips);

  // 7. Store snapshot in document_versions (version 1)
  const { error: verError } = await supabase.from("document_versions").insert({
    org_id: ctx.orgId,
    document_id: newDoc.id,
    version: 1,
    data: snapshot,
    is_current: true,
    created_by: ctx.userId,
  });

  if (verError) {
    throw new Error("Не удалось сохранить версию документа: " + verError.message);
  }

  // 8. Update delivered trips to documents status if applicable
  const deliveredTripIds = (trips as unknown as Array<{ id: string; status: string }>)
    .filter((t) => t.status === "delivered")
    .map((t) => t.id);

  if (deliveredTripIds.length > 0) {
    await supabase
      .from("trips")
      .update({ status: "documents", updated_at: new Date().toISOString() })
      .in("id", deliveredTripIds)
      .eq("org_id", ctx.orgId);
  }

  revalidatePath("/documents");
  redirect("/documents");
}

export async function createDocument(formData: FormData) {
  try {
    await createDocumentInner(formData);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Ошибка";
    const back = new URLSearchParams({ kind: String(formData.get("kind") ?? ""), clientId: String(formData.get("client_id") ?? ""), err: msg.slice(0, 200) });
    redirect(`/documents/new?${back.toString()}`);
  }
}

export async function updateDocumentStatus(documentId: string, newStatus: DocStatus) {
  const ctx = await requireOrg();
  if (!canEditDocs(ctx.role)) throw new Error("Недостаточно прав");

  const validId = idSchema.parse(documentId);
  const supabase = await createClient();

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("id, status, locked")
    .eq("id", validId)
    .eq("org_id", ctx.orgId)
    .single();

  if (fetchErr || !doc) throw new Error("Документ не найден");

  if (doc.locked && ctx.role !== "owner" && ctx.role !== "accountant") {
    throw new Error("Документ заблокирован от изменений");
  }

  const patch: Record<string, unknown> = {
    status: newStatus,
  };

  if (newStatus === "signed" || newStatus === "paid") {
    patch.locked = true;
  }

  const { error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", validId)
    .eq("org_id", ctx.orgId);

  if (error) throw new Error("Не удалось обновить статус: " + error.message);

  revalidatePath("/documents");
  revalidatePath(`/documents/${validId}`);
}
