import { describe, expect, it } from "vitest";
import { parseTripText } from "./parse-text";

const clients = [{ id: "c1", name: "Нур Строй" }, { id: "c2", name: "Каспий Опт" }];

describe("parseTripText", () => {
  it("parses a typical dispatcher message", () => {
    const d = parseTripText("Из Алматы в Астану завтра 22 тонны 600000 Нур Строй", "2026-11-04", clients);
    expect(d).toEqual({ origin: "Алматы", dest: "Астана", price: 600000, loadingDate: "2026-11-05", weightT: 22, clientId: "c1" });
  });
  it("understands thousands and explicit date", () => {
    const d = parseTripText("Атырау → Актобе 12.11 ставка 340 тыс", "2026-11-04");
    expect(d.origin).toBe("Атырау"); expect(d.dest).toBe("Актобе"); expect(d.price).toBe(340000); expect(d.loadingDate).toBe("2026-11-12");
  });
  it("returns nulls for unknown data instead of guessing", () => {
    const d = parseTripText("привет", "2026-11-04");
    expect(d).toEqual({ origin: null, dest: null, price: null, loadingDate: null, weightT: null, clientId: null });
  });
  it("does not take weight or km as price", () => {
    const d = parseTripText("Шымкент Алматы 20 т", "2026-11-04"); expect(d.price).toBeNull(); expect(d.weightT).toBe(20);
  });
});

describe("parseTripText short forms", () => {
  it("understands 340к", () => expect(parseTripText("Атырау Актобе 340к", "2026-11-04").price).toBe(340000));
});
