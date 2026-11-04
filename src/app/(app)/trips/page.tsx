import Link from "next/link";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { Card, EmptyState, PageHeader, cx } from "@/core/ui";
import { formatDate, formatMoney, formatPercent } from "@/core/format";
import { STATUSES, profitFor, statusLabel, type CostRow, type TripRow } from "@/modules/trips/shared";

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "kanban" ? "kanban" : "table";
  const ctx = await requireOrg();
  const supabase = await createClient();
  const [{ data: trips }, { data: costs }, { data: clients }, { data: settings }] = await Promise.all([
    supabase.from("trips").select("*").eq("org_id", ctx.orgId).order("loading_date", { ascending: false }).limit(300),
    supabase.from("trip_costs").select("trip_id,category,amount,source").eq("org_id", ctx.orgId).limit(5000),
    supabase.from("clients").select("id,name").eq("org_id", ctx.orgId).limit(500),
    supabase.from("org_settings").select("vat_percent").eq("org_id", ctx.orgId).maybeSingle(),
  ]);
  const vat = settings?.vat_percent != null ? Number(settings.vat_percent) : null;
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const costsByTrip = new Map<string, CostRow[]>();
  for (const c of (costs ?? []) as CostRow[]) costsByTrip.set(c.trip_id, [...(costsByTrip.get(c.trip_id) ?? []), c]);
  const rows = ((trips ?? []) as TripRow[])
    .filter((t) => !sp.status || t.status === sp.status)
    .map((t) => ({ t, p: profitFor(t, costsByTrip.get(t.id) ?? [], vat) }));

  const profitCell = (p: ReturnType<typeof profitFor>) =>
    p.cancelled ? <span className="text-muted">—</span>
    : p.profitKnownTiyn !== null ? <span className={p.profitKnownTiyn < 0 ? "text-negative" : ""}>{formatMoney(p.profitKnownTiyn / 100)} · {p.marginPct !== null ? formatPercent(p.marginPct) : ""}</span>
    : <span className="text-muted">{p.flags.incomplete ? "не хватает данных" : "после доставки"}</span>;

  return (
    <>
      <PageHeader
        title="Рейсы"
        subtitle={`${rows.length} рейсов`}
        actions={canEditTrips(ctx.role) ? <Link href="/trips/new" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg">Новый рейс</Link> : undefined}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/trips" className={cx("min-h-11 content-center rounded-lg border border-border px-3", view === "table" && "bg-accent-soft text-accent")}>Таблица</Link>
        <Link href="/trips?view=kanban" className={cx("min-h-11 content-center rounded-lg border border-border px-3", view === "kanban" && "bg-accent-soft text-accent")}>Канбан</Link>
        {view === "table" && STATUSES.map((s) => (
          <Link key={s.key} href={`/trips?status=${s.key}`} className={cx("min-h-11 content-center rounded-lg border border-border px-3", sp.status === s.key && "bg-accent-soft text-accent")}>{s.label}</Link>
        ))}
      </div>
      {!rows.length ? <EmptyState title="Рейсов пока нет" hint="Создайте первый рейс" /> : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted">
              <tr>{["№", "Маршрут", "Клиент", "Погрузка", "Статус", "Ставка", "Прибыль"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ t, p }) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2"><Link className="text-accent" href={`/trips/${t.id}`}>{t.number}</Link></td>
                  <td className="px-3 py-2">{t.origin_city} → {t.dest_city}</td>
                  <td className="px-3 py-2">{clientName.get(t.client_id ?? "") ?? "—"}</td>
                  <td className="px-3 py-2">{t.loading_date ? formatDate(t.loading_date) : "—"}</td>
                  <td className="px-3 py-2">{statusLabel(t.status)}</td>
                  <td className="px-3 py-2">{formatMoney(Number(t.freight_price))}</td>
                  <td className="px-3 py-2">{profitCell(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 overflow-x-auto md:grid-flow-col md:auto-cols-[260px]">
          {STATUSES.filter((s) => s.key !== "cancelled").map((s) => {
            const col = rows.filter(({ t }) => t.status === s.key);
            return (
              <div key={s.key} className="rounded-xl bg-surface-2 p-2">
                <h2 className="px-2 py-1 text-sm font-medium">{s.label} <span className="text-muted">{col.length}</span></h2>
                <div className="space-y-2">
                  {col.slice(0, 30).map(({ t, p }) => (
                    <Link key={t.id} href={`/trips/${t.id}`} className="block rounded-lg border border-border bg-surface p-3 text-sm">
                      <div className="font-medium">{t.origin_city} → {t.dest_city}</div>
                      <div className="text-muted">{t.number} · {clientName.get(t.client_id ?? "") ?? "—"}</div>
                      <div className="mt-1">{formatMoney(Number(t.freight_price))}</div>
                      <div className="text-xs">{profitCell(p)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Card className="mt-6 text-sm text-muted">Прибыль считается только по доставленным рейсам с полными расходами. Если данных не хватает, показываем это, а не ноль.</Card>
    </>
  );
}
