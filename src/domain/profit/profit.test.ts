import { describe, expect, it } from "vitest";
import { aggregate, almatyDayKey, computeTripProfit, inPeriod, netRevenueTiyn, type CostInput, type TripInput } from "./index";

const base: TripInput = { status: "paid", freightPrice: 560_000, vatMode: "none", loadedKm: 1000, emptyKm: 200,
  loadingDate: "2026-10-01", unloadingDate: "2026-10-03", isSubcontracted: false };
const costs: CostInput[] = [
  { category: "fuel", amount: 150_000, source: "actual" },
  { category: "driver_pay", amount: 100_000, source: "actual" },
  { category: "tolls", amount: 10_000, source: "actual" },
];
const S = { vatPercent: 12 };

describe("single trip", () => {
  it("profit, margin, per-km, empty share, days busy", () => {
    const p = computeTripProfit(base, costs, S);
    expect(p.revenueNetTiyn).toBe(56_000_000);
    expect(p.profitKnownTiyn).toBe(30_000_000);
    expect(p.marginPct).toBeCloseTo(53.571, 2);
    expect(p.profitPerLoadedKm).toBe(300);
    expect(p.profitPerTotalKm).toBe(250);
    expect(p.emptyKmShare).toBeCloseTo(1 / 6, 5);
    expect(p.daysBusy).toBe(3);
    expect(p.flags.lossMaking).toBe(false);
  });
});

describe("VAT modes", () => {
  it("incl: net = price / 1.12", () => expect(netRevenueTiyn(112_000, "incl", 12)).toBe(10_000_000));
  it("excl and none: net = price", () => {
    expect(netRevenueTiyn(100_000, "excl", 12)).toBe(10_000_000);
    expect(netRevenueTiyn(100_000, "none", null)).toBe(10_000_000);
  });
  it("incl without VAT setting stays unknown", () => {
    expect(netRevenueTiyn(112_000, "incl", null)).toBeNull();
    const p = computeTripProfit({ ...base, vatMode: "incl" }, costs, { vatPercent: null });
    expect(p.profitKnownTiyn).toBeNull();
    expect(p.flags.revenueUnknown).toBe(true);
    expect(p.flags.incomplete).toBe(true);
  });
});

describe("unknown stays unknown", () => {
  it("delivered trip without fuel is incomplete, not zero-cost", () => {
    const p = computeTripProfit({ ...base, status: "delivered" }, costs.filter((c) => c.category !== "fuel"), S);
    expect(p.flags.costMissing).toBe(true);
    expect(p.profitKnownTiyn).toBeNull();
  });
  it("subcontractor trip needs the subcontractor line", () => {
    const t = { ...base, isSubcontracted: true };
    expect(computeTripProfit(t, [], S).flags.costMissing).toBe(true);
    const p = computeTripProfit(t, [{ category: "subcontractor", amount: 490_000, source: "actual" }], S);
    expect(p.profitKnownTiyn).toBe(7_000_000);
    expect(p.marginPct).toBeCloseTo(12.5, 5);
  });
  it("trip in transit has no known profit", () => {
    expect(computeTripProfit({ ...base, status: "in_transit" }, costs, S).profitKnownTiyn).toBeNull();
  });
});

describe("estimates, loss, zero revenue, cancelled", () => {
  it("flags estimated lines", () => {
    const p = computeTripProfit(base, [{ ...costs[0], source: "estimated" }, costs[1]], S);
    expect(p.flags.estimated).toBe(true);
  });
  it("loss-making", () => {
    const p = computeTripProfit({ ...base, freightPrice: 200_000 }, costs, S);
    expect(p.profitKnownTiyn).toBe(-6_000_000);
    expect(p.flags.lossMaking).toBe(true);
  });
  it("zero revenue gives null margin", () => {
    const p = computeTripProfit({ ...base, freightPrice: 0 }, costs, S);
    expect(p.marginPct).toBeNull();
    expect(p.profitKnownTiyn).toBe(-26_000_000);
  });
  it("cancelled is excluded", () => {
    const p = computeTripProfit({ ...base, status: "cancelled" }, costs, S);
    expect(p.cancelled).toBe(true);
    expect(p.profitKnownTiyn).toBeNull();
    expect(p.knownCostsTiyn).toBe(0);
  });
  it("empty return only (loaded km = 0) has no per-loaded-km", () => {
    const p = computeTripProfit({ ...base, loadedKm: 0, emptyKm: 300 }, costs, S);
    expect(p.profitPerLoadedKm).toBeNull();
    expect(p.emptyKmShare).toBe(1);
  });
});

describe("rounding", () => {
  it("rounds once, in tiyn", () => {
    expect(netRevenueTiyn(100, "incl", 12)).toBe(8929); // 10000 / 1.12 = 8928.57
    const p = computeTripProfit({ ...base, freightPrice: 100, vatMode: "incl" },
      [{ category: "fuel", amount: 0.1, source: "actual" }, { category: "driver_pay", amount: 0.2, source: "actual" }], S);
    expect(p.knownCostsTiyn).toBe(30);
    expect(p.profitKnownTiyn).toBe(8929 - 30);
  });
});

describe("aggregate", () => {
  it("counts incomplete trips and keeps them out of known profit", () => {
    const mk = (t: TripInput, c: CostInput[]) => ({ trip: t, profit: computeTripProfit(t, c, S) });
    const a = aggregate([
      mk(base, costs),
      mk({ ...base, status: "delivered" }, []),
      mk({ ...base, status: "cancelled" }, costs),
      mk({ ...base, freightPrice: 200_000 }, costs),
    ]);
    expect(a.trips).toBe(3);
    expect(a.completeTrips).toBe(2);
    expect(a.incompleteTrips).toBe(1);
    expect(a.profitKnownTiyn).toBe(30_000_000 - 6_000_000);
    expect(a.lossMakingTrips).toBe(1);
  });
});

describe("Asia/Almaty day boundaries", () => {
  it("21:00 UTC is already the next day in Almaty", () => {
    expect(almatyDayKey("2026-10-31T18:59:00Z")).toBe("2026-10-31");
    expect(almatyDayKey("2026-10-31T19:00:00Z")).toBe("2026-11-01");
  });
  it("period membership across midnight", () => {
    expect(inPeriod("2026-10-31T19:30:00Z", "2026-11-01", "2026-11-01")).toBe(true);
    expect(inPeriod("2026-10-31T18:30:00Z", "2026-11-01", "2026-11-01")).toBe(false);
  });
});
