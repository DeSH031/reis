import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { Button, Card, PageHeader, inputCls } from "@/core/ui";
import { formatDate, formatMoney, formatPercent } from "@/core/format";
import { COST_CATEGORIES, STATUSES, costLabel, profitFor, statusLabel, type CostRow, type TripRow } from "@/modules/trips/shared";
import { addCost, setStatus } from "../actions";

export default async function TripCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).eq("org_id", ctx.orgId).maybeSingle();
  if (!trip) notFound();
  const [{ data: costs }, { data: events }, { data: settings }, { data: client }, { data: vehicle }, { data: driver }] = await Promise.all([
    supabase.from("trip_costs").select("*").eq("trip_id", id).order("created_at"),
    supabase.from("trip_events").select("*").eq("trip_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("org_settings").select("vat_percent").eq("org_id", ctx.orgId).maybeSingle(),
    trip.client_id ? supabase.from("clients").select("name").eq("id", trip.client_id).maybeSingle() : Promise.resolve({ data: null }),
    trip.vehicle_id ? supabase.from("vehicles").select("plate").eq("id", trip.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
    trip.driver_id ? supabase.from("drivers").select("name").eq("id", trip.driver_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const vat = settings?.vat_percent != null ? Number(settings.vat_percent) : null;
  const p = profitFor(trip as TripRow, (costs ?? []) as CostRow[], vat);
  const edit = canEditTrips(ctx.role);

  return (
    <>
      <PageHeader title={`${trip.origin_city} → ${trip.dest_city}`} subtitle={`${trip.number} · ${statusLabel(trip.status)}`}
        actions={<Link href="/trips" className="text-sm text-accent">← К рейсам</Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Рейс</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted">Клиент</dt><dd>{client?.name ?? "—"}</dd>
            <dt className="text-muted">Машина</dt><dd>{vehicle?.plate ?? "—"}</dd>
            <dt className="text-muted">Водитель</dt><dd>{driver?.name ?? "—"}</dd>
            <dt className="text-muted">Погрузка</dt><dd>{trip.loading_date ? formatDate(trip.loading_date) : "—"}</dd>
            <dt className="text-muted">Выгрузка</dt><dd>{trip.unloading_date ? formatDate(trip.unloading_date) : "—"}</dd>
            <dt className="text-muted">Груз</dt><dd>{trip.cargo_description ?? "—"}</dd>
            <dt className="text-muted">Ставка</dt><dd>{formatMoney(Number(trip.freight_price))}</dd>
            <dt className="text-muted">Километраж</dt><dd>{trip.loaded_km} с грузом / {trip.empty_km} порожняком</dd>
          </dl>
          {edit && (
            <form action={setStatus.bind(null, id)} className="mt-4 flex gap-2">
              <select name="status" defaultValue={trip.status} className={inputCls}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
              <Button type="submit" variant="secondary">Сменить статус</Button>
            </form>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Прибыль</h2>
          {p.cancelled ? <p className="text-sm text-muted">Рейс отменён.</p> : (
            <>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted">Выручка без НДС</dt><dd>{p.revenueNetTiyn !== null ? formatMoney(p.revenueNetTiyn / 100) : "неизвестна: не задан НДС"}</dd>
                {Object.entries(p.costsByCategory).map(([k, v]) => (<><dt key={k + "l"} className="text-muted">{costLabel(k)}</dt><dd key={k}>−{formatMoney((v as number) / 100)}</dd></>))}
                <dt className="font-medium">Известная прибыль</dt>
                <dd className="font-medium">{p.profitKnownTiyn !== null ? `${formatMoney(p.profitKnownTiyn / 100)} (${formatPercent(p.marginPct ?? 0)})` : "не рассчитана"}</dd>
              </dl>
              {p.profitKnownTiyn === null && <p className="mt-3 text-sm text-muted">{p.flags.incomplete ? "Не хватает расходов (топливо, зарплата водителя или перевозчик). Прибыль не показываем, чтобы не вводить в заблуждение." : "Прибыль считается после доставки."}</p>}
              {p.flags.estimated && <p className="mt-2 text-sm text-warning">Часть расходов оценочная.</p>}
            </>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium">Расходы</h2>
          {costs?.length ? (
            <table className="w-full text-sm"><tbody>{costs.map((c) => (
              <tr key={c.id} className="border-t border-border first:border-0"><td className="py-2">{costLabel(c.category)}</td><td>{c.source === "estimated" ? "оценка" : "факт"}</td><td className="text-right">{formatMoney(Number(c.amount))}</td></tr>
            ))}</tbody></table>
          ) : <p className="text-sm text-muted">Расходов пока нет.</p>}
          {edit && (
            <form action={addCost.bind(null, id)} className="mt-4 grid gap-2 sm:grid-cols-4">
              <select name="category" className={inputCls}>{COST_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input name="amount" type="number" min="0" step="any" required placeholder="Сумма, ₸" className={inputCls} />
              <select name="source" className={inputCls}><option value="actual">Факт</option><option value="estimated">Оценка</option></select>
              <Button type="submit">Добавить</Button>
            </form>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-medium">История</h2>
          <ul className="space-y-1 text-sm">{events?.map((e) => <li key={e.id} className="text-muted">{formatDate(e.created_at)} · {e.kind}{e.actor ? ` · ${e.actor}` : ""}</li>)}</ul>
        </Card>
      </div>
    </>
  );
}
