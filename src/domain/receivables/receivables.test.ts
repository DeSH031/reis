import { describe, expect, it } from "vitest";
import { addDays, computeReceivables } from ".";

const inv = (o: Partial<Parameters<typeof computeReceivables>[0][0]> = {}) => ({ id: "a", clientId: "c", number: "СЧ-1", issueDate: "2026-10-01", amount: 100000, termsDays: 14, ...o });

describe("receivables", () => {
  it("adds days across month boundary", () => expect(addDays("2026-10-25", 14)).toBe("2026-11-08"));
  it("open invoice before due date", () => {
    const [r] = computeReceivables([inv()], [], "2026-10-10");
    expect(r.status).toBe("open"); expect(r.outstandingTiyn).toBe(10_000_000); expect(r.overdueDays).toBe(0);
  });
  it("overdue days counted from due date", () => {
    const [r] = computeReceivables([inv()], [], "2026-10-20");
    expect(r.status).toBe("overdue"); expect(r.overdueDays).toBe(5);
  });
  it("partial payment reduces outstanding", () => {
    const [r] = computeReceivables([inv()], [{ documentId: "a", amount: 40000.5 }], "2026-10-10");
    expect(r.outstandingTiyn).toBe(5_999_950); expect(r.paidTiyn).toBe(4_000_050);
  });
  it("full payment is paid, never negative", () => {
    const [r] = computeReceivables([inv()], [{ documentId: "a", amount: 120000 }], "2026-12-01");
    expect(r.status).toBe("paid"); expect(r.outstandingTiyn).toBe(0);
  });
  it("unknown terms never overdue", () => {
    const [r] = computeReceivables([inv({ termsDays: null })], [], "2027-01-01");
    expect(r.dueDate).toBeNull(); expect(r.status).toBe("open");
  });
});
