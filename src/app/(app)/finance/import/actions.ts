"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { canEditPayments, requireOrg } from "@/core/session";
import { almatyDayKey } from "@/domain/profit";
import { computeReceivables } from "@/domain/receivables";

/** Строка выписки: дата;сумма;назначение. Сопоставление: номер счёта в назначении, иначе точная сумма остатка. */
export async function importStatement(formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditPayments(ctx.role)) throw new Error("Недостаточно прав");
  const text = String(formData.get("csv") ?? "").slice(0, 100_000);
  const supabase = await createClient();
  const [{ data: docs }, { data: pays }, { data: clients }] = await Promise.all([
    supabase.from("documents").select("id,client_id,number,issue_date,amount_total").eq("org_id", ctx.orgId).eq("doc_type", "invoice").neq("status", "draft").limit(2000),
    supabase.from("payments").select("document_id,amount").eq("org_id", ctx.orgId).limit(5000),
    supabase.from("clients").select("id,payment_terms_days").eq("org_id", ctx.orgId).limit(500),
  ]);
  const terms = new Map((clients ?? []).map((c) => [c.id, c.payment_terms_days as number | null]));
  const open = computeReceivables(
    (docs ?? []).map((d) => ({ id: d.id, clientId: d.client_id, number: d.number, issueDate: d.issue_date, amount: Number(d.amount_total), termsDays: terms.get(d.client_id ?? "") ?? null })),
    (pays ?? []).map((p) => ({ documentId: p.document_id, amount: Number(p.amount) })), almatyDayKey(new Date()),
  ).filter((r) => r.outstandingTiyn > 0);
  const used = new Set<string>();
  let matched = 0, unmatched = 0;
  let n = 0;
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 500)) {
    const [date, amountRaw, ...rest] = line.split(/[;\t]/);
    const amount = Number((amountRaw ?? "").replace(/\s/g, "").replace(",", "."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !(amount > 0)) continue;
    const purpose = rest.join(" ").slice(0, 300);
    const hit = open.find((r) => !used.has(r.id) && purpose.includes(r.number)) ?? open.find((r) => !used.has(r.id) && r.outstandingTiyn === Math.round(amount * 100));
    if (hit) used.add(hit.id);
    const { error } = await supabase.from("payments").insert({
      org_id: ctx.orgId, client_id: hit?.clientId ?? null, document_id: hit?.id ?? null, paid_at: date, amount, purpose,
      source: "bank_import", match_status: hit ? "confirmed" : "unmatched", external_ref: `imp-${Date.now()}-${n++}`,
    });
    if (!error) { if (hit) matched++; else unmatched++; }
  }
  redirect(`/finance/import?ok=${matched}&no=${unmatched}`);
}
