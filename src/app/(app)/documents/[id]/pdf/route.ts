import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/core/session";
import { createClient } from "@/core/supabase/server";
import { buildDocumentSnapshot } from "@/modules/documents/builder";
import { renderDocumentPdfBuffer } from "@/modules/documents/pdf/render";
import type { DocKind, DocumentSnapshot } from "@/modules/documents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().min(10);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return new NextResponse("Некорректный идентификатор", { status: 400 });
  }

  const ctx = await requireOrg();
  const supabase = await createClient();

  // 1. Fetch document
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("*, clients(*)")
    .eq("id", parsedId.data)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (docErr || !doc) {
    return new NextResponse("Документ не найден", { status: 404 });
  }

  // 2. Fetch latest current version snapshot
  const { data: ver } = await supabase
    .from("document_versions")
    .select("data, version")
    .eq("document_id", doc.id)
    .eq("org_id", ctx.orgId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let snapshot = ver?.data as DocumentSnapshot | undefined;

  // If snapshot is missing or incomplete (e.g. demo-seeded document), build on the fly
  if (!snapshot || !snapshot.supplier || !snapshot.document) {
    const [{ data: settings }, { data: docTrips }] = await Promise.all([
      supabase.from("org_settings").select("*").eq("org_id", ctx.orgId).maybeSingle(),
      supabase
        .from("document_trips")
        .select("trip_id, trips(*, vehicle:vehicles(plate, make_model), driver:drivers(name, phone))")
        .eq("document_id", doc.id)
        .eq("org_id", ctx.orgId),
    ]);

    const tripsRaw = (docTrips ?? [])
      .map((dt) => (dt as { trips: unknown }).trips)
      .filter(Boolean);

    // If no document_trips found, check doc.trip_id
    if (tripsRaw.length === 0 && doc.trip_id) {
      const { data: singleTrip } = await supabase
        .from("trips")
        .select("*, vehicle:vehicles(plate, make_model), driver:drivers(name, phone)")
        .eq("id", doc.trip_id)
        .eq("org_id", ctx.orgId)
        .maybeSingle();
      if (singleTrip) tripsRaw.push(singleTrip);
    }

    const vatPercent = settings?.vat_percent != null ? Number(settings.vat_percent) : null;

    snapshot = buildDocumentSnapshot({
      document: {
        id: doc.id,
        number: doc.number,
        doc_type: doc.doc_type as DocKind,
        issue_date: doc.issue_date,
        year: doc.year,
        seq: doc.seq,
        status: doc.status,
      },
      supplierRaw: (settings?.requisites as Record<string, unknown>) ?? null,
      clientRaw: (doc.clients as unknown as Record<string, unknown>) ?? null,
      tripsRaw: tripsRaw as unknown as Parameters<typeof buildDocumentSnapshot>[0]["tripsRaw"],
      vatPercent,
    });
  }

  try {
    const pdfBuffer = await renderDocumentPdfBuffer(snapshot);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "неизвестная ошибка";
    return new NextResponse("Ошибка формирования PDF: " + msg, {
      status: 500,
    });
  }
}
