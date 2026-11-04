"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";

const token = z.string().min(20).max(100);

export async function driverStatus(t: string, formData: FormData) {
  const status = z.enum(["in_transit", "delivered"]).parse(formData.get("status"));
  const supabase = await createClient();
  await supabase.rpc("driver_set_status", { p_token: token.parse(t), p_status: status });
  revalidatePath(`/d/${t}`);
}

export async function driverCost(t: string, formData: FormData) {
  const p = z.object({ category: z.enum(["fuel", "tolls", "repairs", "other"]), amount: z.coerce.number().positive().max(10_000_000) }).parse(Object.fromEntries(formData));
  const supabase = await createClient();
  await supabase.rpc("driver_add_cost", { p_token: token.parse(t), p_category: p.category, p_amount: p.amount });
  revalidatePath(`/d/${t}`);
}
