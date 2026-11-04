import { describe, expect, it } from "vitest";
import { integerToWords, plural, tengeToWords } from "./number-to-words";

describe("integerToWords", () => {
  it.each([
    [0, "ноль"], [1, "один"], [2, "два"], [11, "одиннадцать"], [21, "двадцать один"],
    [100, "сто"], [101, "сто один"], [1000, "одна тысяча"], [2000, "две тысячи"],
    [5000, "пять тысяч"], [11000, "одиннадцать тысяч"], [21000, "двадцать одна тысяча"],
    [1_000_000, "один миллион"], [2_000_000, "два миллиона"], [1_000_001, "один миллион один"],
    [123_500, "сто двадцать три тысячи пятьсот"],
    [1_234_567, "один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь"],
  ])("%i", (n, w) => expect(integerToWords(n)).toBe(w));
  it("female forms", () => {
    expect(integerToWords(1, true)).toBe("одна");
    expect(integerToWords(2, true)).toBe("две");
  });
  it("throws on bad input", () => {
    expect(() => integerToWords(-1)).toThrow();
    expect(() => integerToWords(1.5)).toThrow();
  });
});

describe("plural", () => {
  it("rules", () => {
    const f: [string, string, string] = ["тиын", "тиына", "тиынов"];
    expect(plural(1, f)).toBe("тиын");
    expect(plural(2, f)).toBe("тиына");
    expect(plural(5, f)).toBe("тиынов");
    expect(plural(11, f)).toBe("тиынов");
    expect(plural(21, f)).toBe("тиын");
    expect(plural(112, f)).toBe("тиынов");
  });
});

describe("tengeToWords", () => {
  it("example from spec", () => {
    expect(tengeToWords(12_350_000)).toBe("Сто двадцать три тысячи пятьсот тенге 00 тиынов");
  });
  it("1 234 567,89", () => {
    expect(tengeToWords(123_456_789)).toBe(
      "Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь тенге 89 тиынов");
  });
  it("zero and small", () => {
    expect(tengeToWords(0)).toBe("Ноль тенге 00 тиынов");
    expect(tengeToWords(101)).toBe("Один тенге 01 тиын");
    expect(tengeToWords(202)).toBe("Два тенге 02 тиына");
  });
  it("negative", () => expect(tengeToWords(-100)).toBe("Минус один тенге 00 тиынов"));
  it("rejects fractional tiyn", () => expect(() => tengeToWords(1.5)).toThrow());
});
