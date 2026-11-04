import { createClient } from "@/core/supabase/server";
import { formatDate, formatMoney } from "@/core/format";
import { Button, Card, inputCls } from "@/core/ui";
import { costLabel, statusLabel } from "@/modules/trips/shared";
import { driverCost, driverStatus } from "./actions";

interface DriverTrip { number: string; status: string; origin_city: string; origin_address: string | null; dest_city: string; dest_address: string | null; loading_date: string | null; unloading_date: string | null; cargo: string | null; costs: { category: string; amount: number }[] }

export default async function DriverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("driver_get_trip", { p_token: token });
  const trip = data as DriverTrip | null;
  if (!trip) {
    return <main className="mx-auto max-w-md p-6"><Card><h1 className="font-semibold">Ссылка недействительна</h1><p className="mt-2 text-sm text-muted">Срок действия ссылки истёк или она введена неверно. Попросите диспетчера выдать новую.</p></Card></main>;
  }
  const active = trip.status === "assigned" || trip.status === "in_transit";
  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">{trip.origin_city} → {trip.dest_city}</h1>
      <Card>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Рейс</dt><dd>{trip.number}</dd>
          <dt className="text-muted">Статус</dt><dd>{statusLabel(trip.status)}</dd>
          <dt className="text-muted">Погрузка</dt><dd>{trip.loading_date ? formatDate(trip.loading_date) : "—"}{trip.origin_address ? `, ${trip.origin_address}` : ""}</dd>
          <dt className="text-muted">Выгрузка</dt><dd>{trip.unloading_date ? formatDate(trip.unloading_date) : "—"}{trip.dest_address ? `, ${trip.dest_address}` : ""}</dd>
          <dt className="text-muted">Груз</dt><dd>{trip.cargo ?? "—"}</dd>
        </dl>
      </Card>
      {active && (
        <Card>
          <form action={driverStatus.bind(null, token)} className="grid gap-2">
            {trip.status === "assigned" && <><input type="hidden" name="status" value="in_transit" /><Button type="submit" className="w-full">Выехал, груз на борту</Button></>}
            {trip.status === "in_transit" && <><input type="hidden" name="status" value="delivered" /><Button type="submit" className="w-full">Груз доставлен</Button></>}
          </form>
        </Card>
      )}
      {active && (
        <Card>
          <h2 className="mb-2 font-medium">Добавить расход</h2>
          <form action={driverCost.bind(null, token)} className="grid gap-2">
            <select name="category" className={inputCls}><option value="fuel">{costLabel("fuel")}</option><option value="tolls">{costLabel("tolls")}</option><option value="repairs">{costLabel("repairs")}</option><option value="other">{costLabel("other")}</option></select>
            <input name="amount" type="number" min="1" step="any" required placeholder="Сумма, ₸" className={inputCls} />
            <Button type="submit" variant="secondary">Сохранить расход</Button>
          </form>
          {trip.costs.length > 0 && <ul className="mt-3 text-sm">{trip.costs.map((c, i) => <li key={i} className="flex justify-between border-t border-border py-1"><span>{costLabel(c.category)}</span><span>{formatMoney(Number(c.amount))}</span></li>)}</ul>}
        </Card>
      )}
      {!active && <Card className="text-sm text-muted">Рейс закрыт для изменений. Спасибо!</Card>}
    </main>
  );
}
