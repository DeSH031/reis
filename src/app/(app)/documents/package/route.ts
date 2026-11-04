import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { requireOrg } from "@/core/session";
import { createClient } from "@/core/supabase/server";
import { buildDocumentSnapshot } from "@/modules/documents/builder";
import { renderDocumentPdfBuffer } from "@/modules/documents/pdf/render";
import { DOC_KINDS, type DocKind, type DocumentSnapshot } from "@/modules/documents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().min(10);

export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get("tripId");
  const parsed = idSchema.safeParse(tripId);
  if (!parsed.success) {
    return new NextResponse("Укажите корректный tripId", { status: 400 });
  }

  const ctx = await requireOrg();
  const supabase = await createClient();

  // 1. Fetch trip, vehicle, driver, and client
  const [{ data: trip, error: tripErr }, { data: settings }] = await Promise.all([
    supabase
      .from("trips")
      .select("*, clients(*), vehicle:vehicles(plate, make_model), driver:drivers(name, phone)")
      .eq("id", parsed.data)
      .eq("org_id", ctx.orgId)
      .maybeSingle(),
    supabase.from("org_settings").select("*").eq("org_id", ctx.orgId).maybeSingle(),
  ]);

  if (tripErr || !trip) {
    return new NextResponse("Рейс не найден", { status: 404 });
  }

  // 2. Fetch existing documents for this trip
  const { data: docTrips } = await supabase
    .from("document_trips")
    .select("documents(*, document_versions(data, version))")
    .eq("trip_id", trip.id)
    .eq("org_id", ctx.orgId);

  interface DocVersionRecord {
    version: number;
    data: unknown;
  }
  interface DocTripRecord {
    documents: {
      doc_type: string;
      document_versions: DocVersionRecord[];
    } | null;
  }

  const existingDocsByKind = new Map<DocKind, DocumentSnapshot>();
  for (const dt of (docTrips ?? []) as unknown as DocTripRecord[]) {
    const d = dt.documents;
    if (!d) continue;
    const vers = (d.document_versions ?? []).sort((a, b) => b.version - a.version);
    const snap = vers[0]?.data as DocumentSnapshot | undefined;
    if (snap && snap.supplier && snap.document) {
      existingDocsByKind.set(d.doc_type as DocKind, snap);
    }
  }

  const kinds: DocKind[] = ["request", "invoice", "act", "ttn"];
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const vatPercent = settings?.vat_percent != null ? Number(settings.vat_percent) : null;
  const prefixes = (settings?.doc_prefix as Record<string, string>) ?? {};

  const snapshots = new Map<DocKind, DocumentSnapshot>();

  for (const k of kinds) {
    const existing = existingDocsByKind.get(k);
    if (existing) {
      snapshots.set(k, existing);
    } else {
      const prefix = prefixes[k] || DOC_KINDS[k].prefix;
      const snap = buildDocumentSnapshot({
        document: {
          id: `pkg-${trip.id}-${k}`,
          number: `${prefix}-${trip.number}`,
          doc_type: k,
          issue_date: today,
          year,
          seq: 1,
          status: "issued",
        },
        supplierRaw: (settings?.requisites as Record<string, unknown>) ?? null,
        clientRaw: (trip.clients as unknown as Record<string, unknown>) ?? null,
        tripsRaw: [trip as unknown as Parameters<typeof buildDocumentSnapshot>[0]["tripsRaw"][0]],
        vatPercent,
      });
      snapshots.set(k, snap);
    }
  }

  // 3. Render all 4 PDFs concurrently
  try {
    const [reqPdf, invPdf, actPdf, ttnPdf] = await Promise.all([
      renderDocumentPdfBuffer(snapshots.get("request")!),
      renderDocumentPdfBuffer(snapshots.get("invoice")!),
      renderDocumentPdfBuffer(snapshots.get("act")!),
      renderDocumentPdfBuffer(snapshots.get("ttn")!),
    ]);

    // 4. Create ZIP archive
    const zip = new JSZip();
    zip.file(`1_Заявка_${trip.number}.pdf`, reqPdf);
    zip.file(`2_Счёт_${trip.number}.pdf`, invPdf);
    zip.file(`3_Акт_${trip.number}.pdf`, actPdf);
    zip.file(`4_ТТН_${trip.number}.pdf`, ttnPdf);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="package.zip"; filename*=UTF-8''${encodeURIComponent("package-" + trip.number)}.zip`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "неизвестная ошибка";
    return new NextResponse("Ошибка формирования пакета документов: " + msg, {
      status: 500,
    });
  }
}
