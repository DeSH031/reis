import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/core/env";
import { aggregate, almatyDayKey } from "@/domain/profit";
import { computeReceivables } from "@/domain/receivables";
import { buildDailyReport } from "@/domain/report";
import { sendTelegram } from "@/modules/telegram/send";
import { profitFor, type CostRow, type TripRow } from "@/modules/trips/shared";

export const maxDuration = 60;
const DAY = 86_400_000;

export async function GET(req: Request) {
  const env = serverEnv();
  if (!env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const db = createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const today = almatyDayKey(new Date());
  const yesterday = almatyDayKey(new Date(Date.now() - DAY));
  const tomorrow = almatyDayKey(new Date(Date.now() + DAY));
  const { data: orgs } = await db.from("org_settings").select("org_id,telegram_chat_id,vat_percent").eq("report_enabled", true).not("telegram_chat_id", "is", null);
  const results: { org: string; status: string }[] = [];

  for (const o of orgs ?? []) {
    const { data: done } = await db.from("report_deliveries").select("id").eq("org_id", o.org_id).eq("channel", "telegram").eq("report_date", today).eq("status", "sent").maybeSingle();
    if (done) { results.push({ org: o.org_id, status: "already_sent" }); continue; }
    const [{ data: org }, { data: trips }, { data: costs }, { data: clients }, { data: docs }, { data: pays }] = await Promise.all([
      db.from("orgs").select("name").eq("id", o.org_id).single(),
      db.from("trips").select("*").eq("org_id", o.org_id).gte("loading_date", almatyDayKey(new Date(Date.now() - 60 * DAY))).limit(3000),
      db.from("trip_costs").select("trip_id,category,amount,source").eq("org_id", o.org_id).limit(20000),
      db.from("clients").select("id,payment_terms_days").eq("org_id", o.org_id).limit(1000),
      db.from("documents").select("id,client_id,number,issue_date,amount_total").eq("org_id", o.org_id).eq("doc_type", "invoice").neq("status", "draft").limit(3000),
      db.from("payments").select("document_id,amount").eq("org_id", o.org_id).limit(10000),
    ]);
    const vat = o.vat_percent != null ? Number(o.vat_percent) : null;
    const byTrip = new Map<string, CostRow[]>();
    for (const c of (costs ?? []) as CostRow[]) byTrip.set(c.trip_id, [...(byTrip.get(c.trip_id) ?? []), c]);
    const all = ((trips ?? []) as (TripRow & { delivered_at: string | null })[]).map((t) => ({ t, p: profitFor(t, byTrip.get(t.id) ?? [], vat) }));
    const delivered = all.filter(({ t }) => t.delivered_at && almatyDayKey(t.delivered_at) === yesterday);
    const agg = aggregate(delivered.map(({ t, p }) => ({ p, trip: { status: t.status, freightPrice: Number(t.freight_price), vatMode: t.vat_mode, loadedKm: t.loaded_km, emptyKm: t.empty_km, isSubcontracted: !!t.subcontractor_id }, profit: p })).map((x) => ({ trip: x.trip, profit: x.profit })));
    const terms = new Map((clients ?? []).map((c) => [c.id, c.payment_terms_days as number | null]));
    const rec = computeReceivables(
      (docs ?? []).map((d) => ({ id: d.id, clientId: d.client_id, number: d.number, issueDate: d.issue_date, amount: Number(d.amount_total), termsDays: terms.get(d.client_id ?? "") ?? null })),
      (pays ?? []).map((p) => ({ documentId: p.document_id, amount: Number(p.amount) })), today,
    );
    const overdue = rec.filter((r) => r.status === "overdue");
    const text = buildDailyReport({
      orgName: org?.name ?? "Рейс", dateLabel: yesterday.split("-").reverse().join("."),
      deliveredTrips: delivered.length, profitKnownTiyn: agg.profitKnownTiyn, incompleteTrips: agg.incompleteTrips, lossMakingTrips: agg.lossMakingTrips,
      activeTrips: all.filter(({ t }) => t.status === "in_transit").length,
      overdueCount: overdue.length, overdueTiyn: overdue.reduce((s, r) => s + r.outstandingTiyn, 0),
      unassignedTomorrow: all.filter(({ t }) => t.loading_date === tomorrow && !t.vehicle_id && t.status !== "cancelled").length,
    });
    const sent = await sendTelegram(env.TELEGRAM_BOT_TOKEN, o.telegram_chat_id, text);
    await db.from("report_deliveries").upsert({ org_id: o.org_id, report_date: today, channel: "telegram", status: sent.ok ? "sent" : "failed", payload: { text }, error: sent.error ?? null }, { onConflict: "org_id,channel,report_date" });
    results.push({ org: o.org_id, status: sent.ok ? "sent" : "failed" });
  }
  return NextResponse.json({ results });
}
