import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";

export type Role = "owner" | "dispatcher" | "accountant" | "viewer";
export interface OrgContext {
  userId: string;
  email: string | null;
  orgId: string;
  orgName: string;
  isDemo: boolean;
  role: Role;
}

/** Текущий пользователь и его организация. Редирект на /login, если нет сессии. */
export async function requireOrg(): Promise<OrgContext> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: m } = await supabase
    .from("org_members")
    .select("role, orgs(id, name, is_demo)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();
  const org = (m?.orgs as unknown as { id: string; name: string; is_demo: boolean } | null) ?? null;
  if (!m || !org) redirect("/login?error=no-org");
  return { userId: auth.user.id, email: auth.user.email ?? null, orgId: org.id, orgName: org.name, isDemo: org.is_demo, role: m.role as Role };
}

export const canEditTrips = (r: Role) => r === "owner" || r === "dispatcher";
export const canEditDocs = (r: Role) => r === "owner" || r === "accountant" || r === "dispatcher";
export const canEditPayments = (r: Role) => r === "owner" || r === "accountant";
