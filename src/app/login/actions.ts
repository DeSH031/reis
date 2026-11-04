"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";
import { serverEnv } from "@/core/env";

const creds = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function demoLogin() {
  const env = serverEnv();
  if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD) redirect("/login?error=demo-off");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
  if (error) redirect("/login?error=demo-failed");
  redirect("/dashboard");
}

export async function passwordLogin(formData: FormData) {
  const parsed = creds.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid");
  redirect("/dashboard");
}

export async function magicLink(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect("/login?error=invalid");
  const supabase = await createClient();
  const base = serverEnv().APP_URL ?? "";
  await supabase.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: `${base}/auth/callback` } });
  redirect("/login?sent=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
