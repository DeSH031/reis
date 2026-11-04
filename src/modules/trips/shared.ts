import { computeTripProfit, type CostInput, type TripInput, type TripStatus } from "@/domain/profit";

export const STATUSES: { key: TripStatus; label: string }[] = [
  { key: "request", label: "Заявка" },
  { key: "assigned", label: "Назначен" },
  { key: "in_transit", label: "В пути" },
  { key: "delivered", label: "Доставлен" },
  { key: "documents", label: "Документы" },
  { key: "paid", label: "Оплачен" },
  { key: "cancelled", label: "Отменён" },
];
export const statusLabel = (s: string) => STATUSES.find((x) => x.key === s)?.label ?? s;

export const COST_CATEGORIES: [string, string][] = [
  ["fuel", "Топливо"], ["driver_pay", "Зарплата водителя"], ["tolls", "Платные дороги"], ["per_diem", "Суточные"],
  ["repairs", "Ремонт"], ["subcontractor", "Перевозчик"], ["customs", "Таможня"], ["insurance", "Страховка"],
  ["depreciation", "Амортизация"], ["overhead", "Накладные"], ["other", "Прочее"],
];
export const costLabel = (c: string) => COST_CATEGORIES.find((x) => x[0] === c)?.[1] ?? c;

export interface TripRow {
  id: string; number: string; status: TripStatus; origin_city: string; dest_city: string; loading_date: string | null;
  unloading_date: string | null; freight_price: number | string; vat_mode: "incl" | "excl" | "none"; loaded_km: number; empty_km: number;
  subcontractor_id: string | null; client_id: string | null; vehicle_id: string | null; driver_id: string | null;
}
export interface CostRow { id?: string; trip_id: string; category: CostInput["category"]; amount: number | string; source: "actual" | "estimated" }

export function profitFor(t: TripRow, costs: CostRow[], vatPercent: number | null) {
  const input: TripInput = {
    status: t.status, freightPrice: Number(t.freight_price), vatMode: t.vat_mode, loadedKm: t.loaded_km, emptyKm: t.empty_km,
    loadingDate: t.loading_date, unloadingDate: t.unloading_date, isSubcontracted: !!t.subcontractor_id,
  };
  return computeTripProfit(input, costs.map((c) => ({ category: c.category, amount: Number(c.amount), source: c.source })), { vatPercent });
}
