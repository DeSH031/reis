"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";
import { requireOrg } from "@/core/session";

const num = z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().min(0).max(100000000).nullable());
const txt = z.string().max(200).default("");

export async function saveSettings(formData: FormData) {
  const ctx = await requireOrg();
  if (ctx.role !== "owner") throw new Error("Только владелец может менять настройки");
  const raw = Object.fromEntries(formData);
  const p = z.object({
    vat_percent: num, fuel_price: num, per_diem: num, margin_alert_percent: num, act_unsigned_days: num,
    req_name: txt, req_bin: txt, req_address: txt, req_bank: txt, req_iban: txt, req_bik: txt, req_phone: txt,
  }).parse(raw);
  const supabase = await createClient();
  const { error } = await supabase.from("org_settings").update({
    vat_payer: formData.get("vat_payer") === "on",
    vat_percent: p.vat_percent, fuel_price: p.fuel_price, per_diem: p.per_diem, margin_alert_percent: p.margin_alert_percent,
    act_unsigned_days: p.act_unsigned_days === null ? null : Math.round(p.act_unsigned_days),
    requisites: { name: p.req_name, bin: p.req_bin, address: p.req_address, bank: p.req_bank, iban: p.req_iban, bik: p.req_bik, phone: p.req_phone },
    updated_at: new Date().toISOString(),
  }).eq("org_id", ctx.orgId);
  if (error) throw new Error("Не удалось сохранить: " + error.message);
  revalidatePath("/settings");
}
