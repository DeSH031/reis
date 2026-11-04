import Link from "next/link";
import { createClient } from "@/core/supabase/server";
import { requireOrg } from "@/core/session";
import { EmptyState, PageHeader, cx } from "@/core/ui";
import { almatyDayKey } from "@/domain/profit";
import { buildAlerts } from "@/domain/alerts";
import { computeReceivables } from "@/domain/receivables";
import { profitFor, type CostRow, type TripRow } from "@/modules/trips/shared";

const SEV = { high: "Срочно", medium: "Важно", low: "Заметить" } as const;
const daysAgoKey = (n: number) => almatyDayKey(new Date(Date.now() - n * 86_400_000));

export default async function AlertsPage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const [{ data: trips }, { data: costs }, { data: clients }, { data: settings }, { data: docs }, { data: pays }] = await Promise.all([
    supabase.from("trips").select("*").eq("org_id", ctx.orgId).gte("loading_date", daysAgoKey(60)).limit(2000),
    supabase.from("trip_costs").select("trip_id,category,amount,source").eq("org_id", ctx.orgId).limit(10000),
    supabase.from("clients").select("id,name,payment_terms_days").eq("org_id", ctx.orgId).limit(500),
    supabase.from("org_settings").select("vat_percent,margin_alert_percent").eq("org_id", ctx.orgId).maybeSingle(),
    supabase.from("documents").select("id,client_id,number,issue_date,amount_total").eq("org_id", ctx.orgId).eq("doc_type", "invoice").neq("status", "draft").limit(2000),
    supabase.from("payments").select("document_id,amount").eq("org_id", ctx.orgId).limit(5000),
  ]);
  const vat = settings?.vat_percent != null ? Number(settings.vat_percent) : null;
  const byTrip = new Map<string, CostRow[]>();
  for (const c of (costs ?? []) as CostRow[]) byTrip.set(c.trip_id, [...(byTrip.get(c.trip_id) ?? []), c]);
  const cl = new Map((clients ?? []).map((c) => [c.id, c]));
  const rec = computeReceivables(
    (docs ?? []).map((d) => ({ id: d.id, clientId: d.client_id, number: d.number, issueDate: d.issue_date, amount: Number(d.amount_total), termsDays: cl.get(d.client_id ?? "")?.payment_terms_days ?? null })),
    (pays ?? []).map((p) => ({ documentId: p.document_id, amount: Number(p.amount) })), almatyDayKey(new Date()),
  );
  const alerts = buildAlerts(
    ((trips ?? []) as TripRow[]).map((t) => ({ id: t.id, label: `${t.origin_city} → ${t.dest_city}`, status: t.status, profit: profitFor(t, byTrip.get(t.id) ?? [], vat) })),
    rec, (id) => cl.get(id ?? "")?.name ?? "—",
    { marginAlertPercent: settings?.margin_alert_percent != null ? Number(settings.margin_alert_percent) : null },
  );

  return (
    <>
      <PageHeader title="Оповещения" subtitle={`${alerts.length} требуют внимания`} />
      {!alerts.length ? <EmptyState title="Всё в порядке" hint="Убыточных рейсов и просрочек нет" /> : (
        <ul className="space-y-2">{alerts.slice(0, 100).map((a) => (
          <li key={a.key}>
            <Link href={a.href ?? "#"} className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
              <span className={cx("shrink-0 rounded px-2 py-0.5 text-xs font-medium", a.severity === "high" ? "bg-negative text-white" : "bg-surface-2")}>{SEV[a.severity]}</span>
              <span><span className="block font-medium">{a.title}</span><span className="text-muted">{a.detail}</span></span>
            </Link>
          </li>))}</ul>
      )}
    </>
  );
}
