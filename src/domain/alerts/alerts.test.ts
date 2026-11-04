import { describe, expect, it } from "vitest";
import { computeTripProfit } from "@/domain/profit";
import { buildAlerts } from ".";

const trip = (over: object, costs: { category: "fuel" | "driver_pay"; amount: number }[]) =>
  computeTripProfit({ status: "delivered", freightPrice: 100000, vatMode: "none", loadedKm: 500, emptyKm: 0, isSubcontracted: false, ...over },
    costs.map((c) => ({ ...c, source: "actual" as const })), { vatPercent: 12 });

describe("alerts", () => {
  it("flags loss, incomplete, low margin, overdue and sorts by severity", () => {
    const a = buildAlerts(
      [
        { id: "1", label: "Р1", status: "delivered", profit: trip({}, [{ category: "fuel", amount: 90000 }, { category: "driver_pay", amount: 30000 }]) },
        { id: "2", label: "Р2", status: "delivered", profit: trip({}, []) },
        { id: "3", label: "Р3", status: "delivered", profit: trip({}, [{ category: "fuel", amount: 50000 }, { category: "driver_pay", amount: 45000 }]) },
      ],
      [{ id: "i", clientId: "c", number: "СЧ-1", issueDate: "2026-01-01", dueDate: "2026-01-15", totalTiyn: 1, paidTiyn: 0, outstandingTiyn: 1, overdueDays: 40, status: "overdue" }],
      () => "Клиент", { marginAlertPercent: 10 },
    );
    expect(a.map((x) => x.key)).toEqual(["loss:1", "overdue:i", "inc:2", "margin:3"]);
  });
  it("ignores cancelled trips", () => {
    const p = computeTripProfit({ status: "cancelled", freightPrice: 1, vatMode: "none", loadedKm: 0, emptyKm: 0, isSubcontracted: false }, [], { vatPercent: null });
    expect(buildAlerts([{ id: "x", label: "x", status: "cancelled", profit: p }], [], () => "", { marginAlertPercent: null })).toEqual([]);
  });
});
