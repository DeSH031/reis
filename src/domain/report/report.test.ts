import { describe, expect, it } from "vitest";
import { buildDailyReport } from ".";

const base = { orgName: "Демо", dateLabel: "04.11.2026", deliveredTrips: 3, profitKnownTiyn: 25_000_000, incompleteTrips: 0, lossMakingTrips: 0, activeTrips: 5, overdueCount: 0, overdueTiyn: 0, unassignedTomorrow: 0 };

describe("daily report", () => {
  it("shows profit and omits empty warnings", () => {
    const t = buildDailyReport(base);
    expect(t).toContain("Известная прибыль: 250");
    expect(t).not.toContain("Убыточных");
    expect(t).toContain("Просроченных счетов нет");
  });
  it("says unknown instead of zero when nothing delivered", () => {
    expect(buildDailyReport({ ...base, deliveredTrips: 0, profitKnownTiyn: 0 })).toContain("нет доставленных рейсов");
  });
  it("lists problems", () => {
    const t = buildDailyReport({ ...base, incompleteTrips: 2, lossMakingTrips: 1, overdueCount: 4, overdueTiyn: 500_000_000, unassignedTomorrow: 2 });
    expect(t).toContain("Без данных по расходам: 2");
    expect(t).toContain("Убыточных рейсов: 1");
    expect(t).toContain("Просрочено счетов: 4");
    expect(t).toContain("без машины: 2");
  });
});
