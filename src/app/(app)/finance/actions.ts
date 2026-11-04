"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";
import { canEditPayments, requireOrg } from "@/core/session";

export async function addPayment(formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditPayments(ctx.role)) throw new Error("Недостаточно прав");
  const p = z.object({
    document_id: z.string().min(10), amount: z.coerce.number().positive(), paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purpose: z.string().max(300).optional(),
  }).parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id,client_id").eq("id", p.document_id).eq("org_id", ctx.orgId).maybeSingle();
  if (!doc) throw new Error("Счёт не найден");
  const { error } = await supabase.from("payments").insert({
    org_id: ctx.orgId, client_id: doc.client_id, document_id: doc.id, paid_at: p.paid_at, amount: p.amount, purpose: p.purpose || null,
  });
  if (error) throw new Error("Не удалось сохранить платёж: " + error.message);
  revalidatePath("/finance");
}
