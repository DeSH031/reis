"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { COST_CATEGORIES, STATUSES } from "@/modules/trips/shared";

const id = z.string().min(10);
const opt = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : String(v));

export async function createTrip(formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const supabase = await createClient();
  const p = z.object({
    origin_city: z.string().min(1).max(100), dest_city: z.string().min(1).max(100),
    freight_price: z.coerce.number().min(0), loaded_km: z.coerce.number().int().min(0).default(0), empty_km: z.coerce.number().int().min(0).default(0),
    vat_mode: z.enum(["incl", "excl", "none"]),
  }).parse(Object.fromEntries(formData));
  const { count } = await supabase.from("trips").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId);
  const number = `Р-${String((count ?? 0) + 1).padStart(4, "0")}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  const { data, error } = await supabase.from("trips").insert({
    org_id: ctx.orgId, number, ...p,
    client_id: opt(formData.get("client_id")), vehicle_id: opt(formData.get("vehicle_id")), driver_id: opt(formData.get("driver_id")),
    loading_date: opt(formData.get("loading_date")), unloading_date: opt(formData.get("unloading_date")),
    cargo_description: opt(formData.get("cargo_description")),
    status: formData.get("vehicle_id") ? "assigned" : "request",
  }).select("id").single();
  if (error) throw new Error("Не удалось создать рейс: " + error.message);
  await supabase.from("trip_events").insert({ org_id: ctx.orgId, trip_id: data.id, kind: "created", actor: ctx.email });
  revalidatePath("/trips");
  redirect(`/trips/${data.id}`);
}

export async function setStatus(tripId: string, formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const status = z.enum(STATUSES.map((s) => s.key) as [string, ...string[]]).parse(formData.get("status"));
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "delivered") patch.delivered_at = new Date().toISOString();
  const { error } = await supabase.from("trips").update(patch).eq("id", id.parse(tripId)).eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  await supabase.from("trip_events").insert({ org_id: ctx.orgId, trip_id: tripId, kind: "status", payload: { status }, actor: ctx.email });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function addCost(tripId: string, formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const p = z.object({
    category: z.enum(COST_CATEGORIES.map((c) => c[0]) as [string, ...string[]]),
    amount: z.coerce.number().min(0), source: z.enum(["actual", "estimated"]),
  }).parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("trip_costs").insert({ org_id: ctx.orgId, trip_id: id.parse(tripId), ...p });
  if (error) throw new Error(error.message);
  await supabase.from("trip_events").insert({ org_id: ctx.orgId, trip_id: tripId, kind: "cost_added", payload: p, actor: ctx.email });
  revalidatePath(`/trips/${tripId}`);
}

export async function createDriverLink(tripId: string, _prev: string): Promise<string> { void _prev;
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_driver_link", { p_trip: id.parse(tripId) });
  if (error || !data) throw new Error("Не удалось создать ссылку");
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `https://${host}/d/${data}`;
}
