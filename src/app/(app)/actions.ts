"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/supabase/server";

export async function resetDemo() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_demo");
  if (error) throw new Error("Не удалось сбросить демо: " + error.message);
  revalidatePath("/", "layout");
}
