import { describe, expect, it } from "vitest";
import { formatCompactMoney, formatDate, formatDistance, formatMoney, formatPercent, formatSignedMoney } from "./format";

const N = " ";
describe("format", () => {
  it("money", () => {
    expect(formatMoney(1240000)).toBe(`1${N}240${N}000${N}₸`);
    expect(formatMoney(-12500)).toBe(`−12${N}500${N}₸`);
    expect(formatMoney(0)).toBe(`0${N}₸`);
  });
  it("signed", () => {
    expect(formatSignedMoney(-12500)).toBe(`−12${N}500${N}₸`);
    expect(formatSignedMoney(500)).toBe(`+500${N}₸`);
  });
  it("percent", () => {
    expect(formatPercent(15.3)).toBe(`15,3${N}%`);
    expect(formatPercent(-2)).toBe(`−2,0${N}%`);
  });
  it("compact", () => {
    expect(formatCompactMoney(1_240_000)).toBe(`1,2${N}млн${N}₸`);
    expect(formatCompactMoney(500)).toBe(`500${N}₸`);
  });
  it("distance", () => {
    expect(formatDistance(1240)).toBe(`1${N}240${N}км`);
  });
  it("date in Almaty across midnight", () => {
    expect(formatDate("2026-11-03T19:30:00Z")).toBe("04.11.2026");
  });
});
