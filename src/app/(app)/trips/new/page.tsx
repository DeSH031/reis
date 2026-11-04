import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { Button, Card, EmptyState, PageHeader, inputCls } from "@/core/ui";
import { createTrip } from "../actions";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm"><span className="mb-1 block text-muted">{label}</span>{children}</label>;
}

export default async function NewTrip() {
  const ctx = await requireOrg();
  if (!canEditTrips(ctx.role)) return <EmptyState title="Недостаточно прав для создания рейса" />;
  const supabase = await createClient();
  const [{ data: clients }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from("clients").select("id,name").eq("org_id", ctx.orgId).order("name").limit(500),
    supabase.from("vehicles").select("id,plate").eq("org_id", ctx.orgId).order("plate").limit(200),
    supabase.from("drivers").select("id,name").eq("org_id", ctx.orgId).order("name").limit(200),
  ]);
  return (
    <>
      <PageHeader title="Новый рейс" />
      <Card>
        <form action={createTrip} className="grid gap-3 sm:grid-cols-2">
          <F label="Откуда"><input name="origin_city" required className={inputCls} /></F>
          <F label="Куда"><input name="dest_city" required className={inputCls} /></F>
          <F label="Клиент"><select name="client_id" className={inputCls}><option value="">—</option>{clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          <F label="Ставка, ₸"><input name="freight_price" type="number" min="0" step="any" required className={inputCls} /></F>
          <F label="НДС"><select name="vat_mode" className={inputCls}><option value="none">Без НДС</option><option value="incl">НДС включён</option><option value="excl">НДС сверху</option></select></F>
          <F label="Груз"><input name="cargo_description" className={inputCls} /></F>
          <F label="Машина"><select name="vehicle_id" className={inputCls}><option value="">—</option>{vehicles?.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}</select></F>
          <F label="Водитель"><select name="driver_id" className={inputCls}><option value="">—</option>{drivers?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></F>
          <F label="Погрузка"><input name="loading_date" type="date" className={inputCls} /></F>
          <F label="Выгрузка"><input name="unloading_date" type="date" className={inputCls} /></F>
          <F label="Км с грузом"><input name="loaded_km" type="number" min="0" defaultValue={0} className={inputCls} /></F>
          <F label="Км порожняком"><input name="empty_km" type="number" min="0" defaultValue={0} className={inputCls} /></F>
          <div className="sm:col-span-2"><Button type="submit">Создать рейс</Button></div>
        </form>
      </Card>
    </>
  );
}
