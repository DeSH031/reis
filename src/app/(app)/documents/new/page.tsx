import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate, formatMoney } from "@/core/format";
import { canEditDocs, requireOrg } from "@/core/session";
import { createClient } from "@/core/supabase/server";
import { Button, Card, EmptyState, PageHeader, cx } from "@/core/ui";
import { DOC_KINDS, type DocKind } from "@/modules/documents/types";
import { createDocument } from "../actions";

interface TripOption {
  id: string;
  number: string;
  origin_city: string;
  dest_city: string;
  loading_date: string | null;
  freight_price: number | string;
  vat_mode: "incl" | "excl" | "none";
  status: string;
}

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; clientId?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  if (!canEditDocs(ctx.role)) redirect("/documents");

  const kind: DocKind = (sp.kind as DocKind) in DOC_KINDS ? (sp.kind as DocKind) : "invoice";
  const clientId = sp.clientId || "";

  const supabase = await createClient();

  // 1. Fetch clients for selection
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, bin")
    .eq("org_id", ctx.orgId)
    .order("name")
    .limit(500);

  // 2. If client is selected, fetch delivered trips
  let trips: TripOption[] = [];
  let existingTripIds = new Set<string>();

  if (clientId) {
    // Check trips that already have a document of this type
    const { data: existing } = await supabase
      .from("document_trips")
      .select("trip_id, documents!inner(doc_type)")
      .eq("org_id", ctx.orgId)
      .eq("documents.doc_type", kind);

    existingTripIds = new Set((existing ?? []).map((e) => e.trip_id));

    // For invoice and act: delivered, documents, paid trips
    // For request and ttn: also assigned, in_transit
    const allowedStatuses =
      kind === "request" || kind === "ttn"
        ? ["assigned", "in_transit", "delivered", "documents", "paid"]
        : ["delivered", "documents", "paid"];

    const { data: clientTrips } = await supabase
      .from("trips")
      .select("id, number, origin_city, dest_city, loading_date, freight_price, vat_mode, status")
      .eq("org_id", ctx.orgId)
      .eq("client_id", clientId)
      .in("status", allowedStatuses)
      .order("loading_date", { ascending: false })
      .limit(200);

    trips = ((clientTrips ?? []) as unknown as TripOption[]).filter((t) => !existingTripIds.has(t.id));
  }

  return (
    <>
      <PageHeader
        title="Новый документ"
        subtitle="Формирование документа со сквозной нумерацией"
      />

      {/* Step 1: Document Type */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">1. ТИП ДОКУМЕНТА</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DOC_KINDS).map(([k, c]) => (
            <Link
              key={k}
              href={`/documents/new?kind=${k}${clientId ? `&clientId=${clientId}` : ""}`}
              className={cx(
                "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition",
                kind === k ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-2",
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </Card>

      {/* Step 2: Client Selection */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">2. ЗАКАЗЧИК (КЛИЕНТ)</h2>
        <form method="GET" action="/documents/new" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="kind" value={kind} />
          <select
            name="clientId"
            defaultValue={clientId}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="">— Выберите клиента из справочника —</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.bin ? `(БИН ${c.bin})` : ""}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary">
            Выбрать
          </Button>
        </form>
      </Card>

      {/* Step 3: Trip Selection & Submit */}
      {clientId && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">
            3. РЕЙСЫ КЛИЕНТА ДЛЯ ДОКУМЕНТА: {DOC_KINDS[kind].shortLabel.toUpperCase()}
          </h2>
          {trips.length === 0 ? (
            <EmptyState
              title="Нет подходящих рейсов"
              hint="Все доставленные рейсы этого клиента уже имеют сформированный документ данного типа, либо рейсы ещё не доставлены."
            />
          ) : (
            <form action={createDocument} className="space-y-4">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="client_id" value={clientId} />

              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium w-12 text-center">Выбор</th>
                      <th className="px-3 py-2 font-medium">Рейс</th>
                      <th className="px-3 py-2 font-medium">Маршрут</th>
                      <th className="px-3 py-2 font-medium">Погрузка</th>
                      <th className="px-3 py-2 font-medium">НДС</th>
                      <th className="px-3 py-2 font-medium text-right">Ставка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t, idx) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            name="trip_id"
                            value={t.id}
                            defaultChecked={idx === 0}
                            className="size-5 rounded border-border"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono font-medium">{t.number}</td>
                        <td className="px-3 py-2">
                          {t.origin_city} → {t.dest_city}
                        </td>
                        <td className="px-3 py-2">{t.loading_date ? formatDate(t.loading_date) : "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {t.vat_mode === "none"
                            ? "Без НДС"
                            : t.vat_mode === "incl"
                              ? "Включён"
                              : "Сверху"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(Number(t.freight_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted">
                  Выберите один или несколько рейсов для включения в позицию документа.
                </p>
                <Button type="submit">Сформировать {DOC_KINDS[kind].shortLabel}</Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </>
  );
}
