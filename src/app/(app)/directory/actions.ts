"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { KINDS, type Kind } from "@/modules/directory-config";

export async function createRecord(kind: Kind, formData: FormData) {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) throw new Error("Недостаточно прав");
  const cfg = KINDS[kind];
  if (!cfg) throw new Error("Неизвестный справочник");
  const row: Record<string, unknown> = { org_id: ctx.orgId };
  for (const f of cfg.fields) {
    const raw = formData.get(f.name);
    if (f.type === "checkbox") row[f.name] = raw === "on";
    else if (raw === null || raw === "") {
      if (f.required) throw new Error(`Заполните поле «${f.label}»`);
    } else if (f.type === "number") row[f.name] = z.coerce.number().min(0).parse(raw);
    else row[f.name] = z.string().max(300).parse(raw);
  }
  const supabase = await createClient();
  const { error } = await supabase.from(cfg.table).insert(row);
  if (error) throw new Error("Не удалось сохранить: " + error.message);
  revalidatePath(`/directory/${kind}`);
}
