"use server";

import { redirect } from "next/navigation";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";

const ALIASES: Record<string, string[]> = {
  date: ["дата", "дата погрузки", "date"],
  client: ["клиент", "заказчик", "client"],
  origin: ["откуда", "пункт погрузки", "отправление", "from"],
  dest: ["куда", "пункт выгрузки", "назначение", "to"],
  price: ["ставка", "сумма", "цена", "стоимость", "price"],
  km: ["км", "расстояние", "пробег"],
  cost: ["расходы", "затраты", "себестоимость", "cost"],
  fuel: ["топливо", "гсм"],
  pay: ["зарплата водителя", "зарплата", "оплата водителя"],
};

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return String(o.text);
    if (o.result != null) return cellText(o.result);
  }
  return String(v).trim();
}
const num = (s: string) => { const n = Number(s.replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
function toIso(s: string): string | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? null;
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (d) return `${d[3].length === 2 ? "20" + d[3] : d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}`;
  return null;
}

async function readRows(file: File): Promise<string[][]> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const rows: string[][] = [];
    ws?.eachRow({ includeEmpty: false }, (row) => {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(vals.map(cellText));
    });
    return rows;
  }
  const text = buf.toString("utf8").replace(/^﻿/, "");
  return Papa.parse<string[]>(text, { skipEmptyLines: true, delimiter: text.includes(";") ? ";" : undefined }).data;
}

export async function importTrips(formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 2_000_000) redirect("/trips/import?err=file");
  let rows: string[][];
  try { rows = await readRows(file); } catch { redirect("/trips/import?err=read"); }
  const header = (rows[0] ?? []).map((h) => h.toLowerCase());
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(ALIASES)) col[k] = header.findIndex((h) => names.includes(h));
  if (col.origin < 0 || col.dest < 0 || col.price < 0) redirect("/trips/import?err=cols");

  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id,name").eq("org_id", ctx.orgId).limit(500);
  const byName = new Map((clients ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const { count } = await supabase.from("trips").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId);
  const today = new Date().toISOString().slice(0, 10);
  let ok = 0, skipped = 0, noClient = 0;
  for (const r of rows.slice(1, 301)) {
    const g = (k: string) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");
    const origin = g("origin"), dest = g("dest"), price = num(g("price"));
    if (!origin || !dest || !(price > 0)) { skipped++; continue; }
    const date = toIso(g("date"));
    const clientId = byName.get(g("client").toLowerCase()) ?? null;
    if (g("client") && !clientId) noClient++;
    const delivered = !!date && date <= today;
    const number = `Р-${String((count ?? 0) + ok + 1).padStart(4, "0")}-X${Math.floor(Math.random() * 900 + 100)}`;
    const { data, error } = await supabase.from("trips").insert({
      org_id: ctx.orgId, number, origin_city: origin, dest_city: dest, freight_price: price, vat_mode: "incl",
      loaded_km: Math.round(num(g("km"))), empty_km: 0, client_id: clientId, loading_date: date, unloading_date: date,
      status: delivered ? "delivered" : "request", delivered_at: delivered ? `${date}T12:00:00Z` : null,
    }).select("id").single();
    if (error || !data) { skipped++; continue; }
    const fuel = num(g("fuel")), pay = num(g("pay")), total = num(g("cost"));
    const rowsCosts: { category: string; amount: number; source: string }[] = [];
    if (fuel > 0 || pay > 0) {
      if (fuel > 0) rowsCosts.push({ category: "fuel", amount: fuel, source: "actual" });
      if (pay > 0) rowsCosts.push({ category: "driver_pay", amount: pay, source: "actual" });
    } else if (total > 0) {
      // Одна сумма расходов: делим 60/40 на топливо и зарплату, помечаем как оценку
      rowsCosts.push({ category: "fuel", amount: Math.round(total * 0.6), source: "estimated" });
      rowsCosts.push({ category: "driver_pay", amount: total - Math.round(total * 0.6), source: "estimated" });
    }
    if (rowsCosts.length) await supabase.from("trip_costs").insert(rowsCosts.map((c) => ({ org_id: ctx.orgId, trip_id: data.id, ...c })));
    ok++;
  }
  redirect(`/trips/import?ok=${ok}&skip=${skipped}&nc=${noClient}`);
}
