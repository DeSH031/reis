import { tengeToWords } from "@/domain/documents/number-to-words";
import type { DocumentTotals } from "./types";

export const toTiyn = (tenge: number): number => Math.round(tenge * 100);
export const fromTiyn = (tiyn: number): number => tiyn / 100;

export interface TripPriceInput {
  freight_price: number;
  vat_mode: "incl" | "excl" | "none";
}

export function computeTripTotals(
  trip: TripPriceInput,
  vatPercent: number | null,
): { subtotalTiyn: number; vatTiyn: number; totalTiyn: number } {
  const pTiyn = toTiyn(Number(trip.freight_price) || 0);

  if (trip.vat_mode === "none" || !vatPercent || vatPercent <= 0) {
    return { subtotalTiyn: pTiyn, vatTiyn: 0, totalTiyn: pTiyn };
  }

  if (trip.vat_mode === "incl") {
    const vatTiyn = Math.round((pTiyn * vatPercent) / (100 + vatPercent));
    const subtotalTiyn = pTiyn - vatTiyn;
    return { subtotalTiyn, vatTiyn, totalTiyn: pTiyn };
  }

  // trip.vat_mode === "excl"
  const vatTiyn = Math.round((pTiyn * vatPercent) / 100);
  const totalTiyn = pTiyn + vatTiyn;
  return { subtotalTiyn: pTiyn, vatTiyn, totalTiyn };
}

export function computeDocumentTotals(
  trips: TripPriceInput[],
  vatPercent: number | null,
): DocumentTotals {
  let subtotalTiyn = 0;
  let vatTiyn = 0;
  let totalTiyn = 0;

  for (const t of trips) {
    const res = computeTripTotals(t, vatPercent);
    subtotalTiyn += res.subtotalTiyn;
    vatTiyn += res.vatTiyn;
    totalTiyn += res.totalTiyn;
  }

  const vatMode: "incl" | "excl" | "none" =
    trips.length > 0 ? trips[0].vat_mode : "none";

  return {
    subtotalTiyn,
    vatTiyn,
    totalTiyn,
    subtotal: fromTiyn(subtotalTiyn),
    vat: fromTiyn(vatTiyn),
    total: fromTiyn(totalTiyn),
    vatMode,
    vatPercent: vatMode === "none" ? null : vatPercent,
    totalInWords: tengeToWords(totalTiyn),
  };
}
