import Link from "next/link";
import { createClient } from "@/core/supabase/server";
import { requireOrg } from "@/core/session";
import { Card, PageHeader } from "@/core/ui";
import { formatCompactMoney, formatMoney, formatPercent } from "@/core/format";
import { aggregate, almatyDayKey } from "@/domain/profit";
import { computeReceivables } from "@/domain/receivables";
import { profitFor, type CostRow, type TripRow } from "@/modules/trips/shared";

const DAY = 86_400_000;
const daysAgoKey = (n: number) => almatyDayKey(new Date(Date.now() - n * DAY));

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><div className="text-sm text-muted">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div>{hint && <div className="mt-1 text-sm text-muted">{hint}</div>}</Card>
  );
}

export default async function Dashboard() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const today = almatyDayKey(new Date());
  const from = daysAgoKey(30);
  const [{ data: trips }, { data: costs }, { data: clients }, { data: settings }, { data: docs }, { data: pays }] = await Promise.all([
    supabase.from("trips").select("*").eq("org_id", ctx.orgId).gte("loading_date", from).limit(2000),
    supabase.from("trip_costs").select("trip_id,category,amount,source").eq("org_id", ctx.orgId).limit(10000),
    supabase.from("clients").select("id,name,payment_terms_days").eq("org_id", ctx.orgId).limit(500),
    supabase.from("org_settings").select("vat_percent").eq("org_id", ctx.orgId).maybeSingle(),
    supabase.from("documents").select("id,client_id,number,issue_date,amount_total").eq("org_id", ctx.orgId).eq("doc_type", "invoice").neq("status", "draft").limit(2000),
    supabase.from("payments").select("document_id,amount").eq("org_id", ctx.orgId).limit(5000),
  ]);
  const vat = settings?.vat_percent != null ? Number(settings.vat_percent) : null;
  const byTrip = new Map<string, CostRow[]>();
  for (const c of (costs ?? []) as CostRow[]) byTrip.set(c.trip_id, [...(byTrip.get(c.trip_id) ?? []), c]);
  const items = ((trips ?? []) as TripRow[]).map((t) => {
    const p = profitFor(t, byTrip.get(t.id) ?? [], vat);
    return { t, p, trip: { status: t.status, freightPrice: Number(t.freight_price), vatMode: t.vat_mode, loadedKm: t.loaded_km, emptyKm: t.empty_km, isSubcontracted: !!t.subcontractor_id }, profit: p };
  });
  const agg = aggregate(items.map((i) => ({ trip: i.trip, profit: i.profit })));
  const name = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const cl = new Map((clients ?? []).map((c) => [c.id, c]));

  const routes = new Map<string, { n: number; profit: number; rev: number }>();
  const byClient = new Map<string, { profit: number; rev: number }>();
  for (const { t, p } of items) {
    if (p.profitKnownTiyn === null || p.revenueNetTiyn === null) continue;
    const k = `${t.origin_city} → ${t.dest_city}`;
    const r = routes.get(k) ?? { n: 0, profit: 0, rev: 0 };
    routes.set(k, { n: r.n + 1, profit: r.profit + p.profitKnownTiyn, rev: r.rev + p.revenueNetTiyn });
    const ck = t.client_id ?? "";
    const c = byClient.get(ck) ?? { profit: 0, rev: 0 };
    byClient.set(ck, { profit: c.profit + p.profitKnownTiyn, rev: c.rev + p.revenueNetTiyn });
  }
  const routeRows = [...routes.entries()].sort((a, b) => b[1].profit - a[1].profit);
  const clientRows = [...byClient.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 5);
  const losses = items.filter((i) => i.p.flags.lossMaking).sort((a, b) => (a.p.profitKnownTiyn ?? 0) - (b.p.profitKnownTiyn ?? 0)).slice(0, 5);

  const rec = computeReceivables(
    (docs ?? []).map((d) => ({ id: d.id, clientId: d.client_id, number: d.number, issueDate: d.issue_date, amount: Number(d.amount_total), termsDays: cl.get(d.client_id ?? "")?.payment_terms_days ?? null })),
    (pays ?? []).map((p) => ({ documentId: p.document_id, amount: Number(p.amount) })), today,
  );
  const overdueSum = rec.filter((r) => r.status === "overdue").reduce((s, r) => s + r.outstandingTiyn, 0) / 100;

  return (
    <>
      <PageHeader title="Обзор" subtitle="Последние 30 дней" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Известная прибыль" value={formatCompactMoney(agg.profitKnownTiyn / 100)} hint={agg.marginPct !== null ? `маржа ${formatPercent(agg.marginPct)}` : undefined} />
        <Kpi label="Рейсов с полными данными" value={`${agg.completeTrips} из ${agg.trips}`} hint={agg.incompleteTrips ? `${agg.incompleteTrips} без данных по расходам` : undefined} />
        <Kpi label="Прибыль на км с грузом" value={agg.profitPerLoadedKm !== null ? formatMoney(agg.profitPerLoadedKm) : "—"} />
        <Kpi label="Просрочено клиентами" value={formatCompactMoney(overdueSum)} hint={`${rec.filter((r) => r.status === "overdue").length} счетов`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Маршруты по прибыли</h2>
          {routeRows.length ? <table className="w-full text-sm"><tbody>{routeRows.map(([k, r]) => (
            <tr key={k} className="border-t border-border first:border-0"><td className="py-2">{k}</td><td className="text-muted">{r.n} рейс.</td>
              <td className={`text-right ${r.profit < 0 ? "text-negative" : ""}`}>{formatCompactMoney(r.profit / 100)}</td></tr>))}</tbody></table> : <p className="text-sm text-muted">Пока нет завершённых рейсов с полными данными.</p>}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-medium">Клиенты по прибыли</h2>
            <table className="w-full text-sm"><tbody>{clientRows.map(([id, r]) => (
              <tr key={id} className="border-t border-border first:border-0"><td className="py-2">{name.get(id) ?? "—"}</td><td className="text-right">{formatCompactMoney(r.profit / 100)}</td></tr>))}</tbody></table>
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Убыточные рейсы</h2>
            {losses.length ? <ul className="space-y-2 text-sm">{losses.map(({ t, p }) => (
              <li key={t.id} className="flex justify-between"><Link className="text-accent" href={`/trips/${t.id}`}>{t.origin_city} → {t.dest_city}</Link>
                <span className="text-negative">{formatMoney((p.profitKnownTiyn ?? 0) / 100)}</span></li>))}</ul> : <p className="text-sm text-muted">Убыточных рейсов нет.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
