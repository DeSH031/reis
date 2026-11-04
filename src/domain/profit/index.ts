/**
 * Движок прибыли рейса. Чистый TypeScript, без I/O.
 * Деньги считаются в целых тиынах, округление выполняется один раз в конце.
 * Неизвестное остаётся неизвестным: рейс с неполными расходами НЕ входит в «известную прибыль».
 */
export type VatMode = "incl" | "excl" | "none";
export type TripStatus = "request" | "assigned" | "in_transit" | "delivered" | "documents" | "paid" | "cancelled";
export type CostCategory =
  | "fuel" | "driver_pay" | "tolls" | "per_diem" | "repairs" | "subcontractor"
  | "customs" | "insurance" | "depreciation" | "overhead" | "other";

export interface TripInput {
  status: TripStatus;
  freightPrice: number; // тенге, как в БД
  vatMode: VatMode;
  loadedKm: number;
  emptyKm: number;
  loadingDate?: string | null; // yyyy-MM-dd
  unloadingDate?: string | null;
  isSubcontracted: boolean;
}
export interface CostInput { category: CostCategory; amount: number; source: "actual" | "estimated" }
export interface ProfitSettings { vatPercent: number | null }

export interface TripProfit {
  cancelled: boolean;
  revenueNetTiyn: number | null;
  knownCostsTiyn: number;
  costsByCategory: Partial<Record<CostCategory, number>>; // тиыны
  /** Известная прибыль. null, если данные неполные или рейс не доставлен. */
  profitKnownTiyn: number | null;
  marginPct: number | null;
  profitPerLoadedKm: number | null; // тенге/км
  profitPerTotalKm: number | null;
  emptyKmShare: number | null;
  daysBusy: number | null;
  flags: { costMissing: boolean; estimated: boolean; lossMaking: boolean; incomplete: boolean; revenueUnknown: boolean };
}

export const toTiyn = (tenge: number): number => Math.round(tenge * 100);
export const fromTiyn = (tiyn: number): number => tiyn / 100;

const DELIVERED: TripStatus[] = ["delivered", "documents", "paid"];

export function netRevenueTiyn(price: number, vatMode: VatMode, vatPercent: number | null): number | null {
  const p = toTiyn(price);
  if (vatMode !== "incl") return p;
  if (vatPercent === null) return null;
  return Math.round(p / (1 + vatPercent / 100));
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function computeTripProfit(trip: TripInput, costs: CostInput[], s: ProfitSettings): TripProfit {
  const byCat: Partial<Record<CostCategory, number>> = {};
  let known = 0;
  let estimated = false;
  for (const c of costs) {
    const t = toTiyn(c.amount);
    byCat[c.category] = (byCat[c.category] ?? 0) + t;
    known += t;
    if (c.source === "estimated") estimated = true;
  }
  const empty = {
    cancelled: false, revenueNetTiyn: null, knownCostsTiyn: known, costsByCategory: byCat, profitKnownTiyn: null,
    marginPct: null, profitPerLoadedKm: null, profitPerTotalKm: null, emptyKmShare: null, daysBusy: null,
  };
  if (trip.status === "cancelled") {
    return { ...empty, cancelled: true, knownCostsTiyn: 0, costsByCategory: {},
      flags: { costMissing: false, estimated: false, lossMaking: false, incomplete: false, revenueUnknown: false } };
  }

  const revenue = netRevenueTiyn(trip.freightPrice, trip.vatMode, s.vatPercent);
  const delivered = DELIVERED.includes(trip.status);
  const has = (c: CostCategory) => (byCat[c] ?? 0) > 0;
  const costMissing = delivered && (trip.isSubcontracted ? !has("subcontractor") : !has("fuel") || !has("driver_pay"));
  const revenueUnknown = revenue === null;
  const incomplete = delivered && (costMissing || revenueUnknown);

  let profit: number | null = null;
  if (delivered && !incomplete && revenue !== null) profit = revenue - known;

  const totalKm = trip.loadedKm + trip.emptyKm;
  const margin = profit !== null && revenue ? (profit / revenue) * 100 : null;
  return {
    ...empty,
    revenueNetTiyn: revenue,
    profitKnownTiyn: profit,
    marginPct: margin,
    profitPerLoadedKm: profit !== null && trip.loadedKm > 0 ? profit / 100 / trip.loadedKm : null,
    profitPerTotalKm: profit !== null && totalKm > 0 ? profit / 100 / totalKm : null,
    emptyKmShare: totalKm > 0 ? trip.emptyKm / totalKm : null,
    daysBusy: trip.loadingDate && trip.unloadingDate ? Math.max(1, dayDiff(trip.loadingDate, trip.unloadingDate) + 1) : null,
    flags: { costMissing, estimated, lossMaking: profit !== null && profit < 0, incomplete, revenueUnknown },
  };
}

export interface Aggregate {
  trips: number; // без отменённых
  completeTrips: number;
  incompleteTrips: number;
  revenueNetKnownTiyn: number; // выручка рейсов с полными данными
  profitKnownTiyn: number;
  marginPct: number | null;
  loadedKm: number;
  totalKm: number;
  profitPerLoadedKm: number | null;
  lossMakingTrips: number;
}

export function aggregate(items: { trip: TripInput; profit: TripProfit }[]): Aggregate {
  let trips = 0, complete = 0, incomplete = 0, rev = 0, prof = 0, loaded = 0, total = 0, loss = 0;
  for (const { trip, profit } of items) {
    if (profit.cancelled) continue;
    trips++;
    if (profit.flags.incomplete) incomplete++;
    if (profit.profitKnownTiyn !== null && profit.revenueNetTiyn !== null) {
      complete++;
      rev += profit.revenueNetTiyn;
      prof += profit.profitKnownTiyn;
      loaded += trip.loadedKm;
      total += trip.loadedKm + trip.emptyKm;
      if (profit.flags.lossMaking) loss++;
    }
  }
  return {
    trips, completeTrips: complete, incompleteTrips: incomplete, revenueNetKnownTiyn: rev, profitKnownTiyn: prof,
    marginPct: rev > 0 ? (prof / rev) * 100 : null, loadedKm: loaded, totalKm: total,
    profitPerLoadedKm: loaded > 0 ? prof / 100 / loaded : null, lossMakingTrips: loss,
  };
}

/** Ключ дня в часовом поясе Asia/Almaty (UTC+5), чтобы границы суток считались по местному времени. */
export function almatyDayKey(ts: Date | string): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // yyyy-MM-dd
}
export const inPeriod = (ts: Date | string, fromKey: string, toKey: string): boolean => {
  const k = almatyDayKey(ts);
  return k >= fromKey && k <= toKey;
};
