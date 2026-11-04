import { describe, expect, it } from "vitest";
import { tengeToWords } from "@/domain/documents/number-to-words";
import { buildDocumentSnapshot, sanitize } from "./builder";
import { computeDocumentTotals, computeTripTotals } from "./totals";

describe("Document Totals and VAT math", () => {
  it("calculates none VAT mode correctly with integer tiyn", () => {
    const res = computeTripTotals({ freight_price: 100_000, vat_mode: "none" }, 12);
    expect(res.subtotalTiyn).toBe(10_000_000);
    expect(res.vatTiyn).toBe(0);
    expect(res.totalTiyn).toBe(10_000_000);

    const doc = computeDocumentTotals([{ freight_price: 100_000, vat_mode: "none" }], 12);
    expect(doc.subtotal).toBe(100_000);
    expect(doc.vat).toBe(0);
    expect(doc.total).toBe(100_000);
    expect(doc.vatMode).toBe("none");
    expect(doc.vatPercent).toBeNull();
  });

  it("calculates incl VAT mode correctly with single rounding in tiyn", () => {
    // 112 000 тенге -> exactly 12 000 VAT and 100 000 subtotal
    const resExact = computeTripTotals({ freight_price: 112_000, vat_mode: "incl" }, 12);
    expect(resExact.totalTiyn).toBe(11_200_000);
    expect(resExact.vatTiyn).toBe(1_200_000);
    expect(resExact.subtotalTiyn).toBe(10_000_000);

    // 100 000 тенге incl 12% VAT: 10000000 * 12 / 112 = 1071428.57 -> rounds to 1071429 tiyn
    const resRound = computeTripTotals({ freight_price: 100_000, vat_mode: "incl" }, 12);
    expect(resRound.totalTiyn).toBe(10_000_000);
    expect(resRound.vatTiyn).toBe(1_071_429);
    expect(resRound.subtotalTiyn).toBe(8_928_571);
    expect(resRound.subtotalTiyn + resRound.vatTiyn).toBe(resRound.totalTiyn);

    const doc = computeDocumentTotals([{ freight_price: 100_000, vat_mode: "incl" }], 12);
    expect(doc.total).toBe(100_000);
    expect(doc.vat).toBe(10_714.29);
    expect(doc.subtotal).toBe(89_285.71);
    expect(doc.subtotal + doc.vat).toBe(doc.total);
  });

  it("calculates excl VAT mode correctly with single rounding in tiyn", () => {
    // 100 000 тенге excl 12% VAT -> subtotal 10 000 000, vat 1 200 000, total 11 200 000
    const res = computeTripTotals({ freight_price: 100_000, vat_mode: "excl" }, 12);
    expect(res.subtotalTiyn).toBe(10_000_000);
    expect(res.vatTiyn).toBe(1_200_000);
    expect(res.totalTiyn).toBe(11_200_000);

    // 123 456.78 excl 12% VAT
    const resFrac = computeTripTotals({ freight_price: 123_456.78, vat_mode: "excl" }, 12);
    expect(resFrac.subtotalTiyn).toBe(12_345_678);
    // 12345678 * 12 / 100 = 1481481.36 -> 1481481
    expect(resFrac.vatTiyn).toBe(1_481_481);
    expect(resFrac.totalTiyn).toBe(13_827_159);
    expect(resFrac.subtotalTiyn + resFrac.vatTiyn).toBe(resFrac.totalTiyn);
  });
});

describe("Amount in words (tengeToWords)", () => {
  it("formats 0 тенге", () => {
    expect(tengeToWords(0)).toBe("Ноль тенге 00 тиынов");
  });

  it("formats 1 000 тенге", () => {
    // 1 000 тенге = 100 000 тиын
    expect(tengeToWords(1_000 * 100)).toBe("Одна тысяча тенге 00 тиынов");
  });

  it("formats 1 234 567,89 тенге", () => {
    // 1 234 567.89 тенге = 123 456 789 тиын
    expect(tengeToWords(123_456_789)).toBe(
      "Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь тенге 89 тиынов",
    );
  });
});

describe("Snapshot builder and sanitization", () => {
  it("replaces null, undefined, empty, and NaN with '—'", () => {
    expect(sanitize(null)).toBe("—");
    expect(sanitize(undefined)).toBe("—");
    expect(sanitize("")).toBe("—");
    expect(sanitize("   ")).toBe("—");
    expect(sanitize(NaN)).toBe("—");
    expect(sanitize("Алматы")).toBe("Алматы");
    expect(sanitize(123)).toBe("123");
  });

  it("returns '—' for missing client, БИН, and optional fields", () => {
    const snapshot = buildDocumentSnapshot({
      document: {
        id: "doc-1234567890",
        number: "АКТ-2026-0001",
        doc_type: "act",
        issue_date: "2026-11-04",
        year: 2026,
        seq: 1,
        status: "issued",
      },
      supplierRaw: {
        name: "ТОО Тест",
        bin: null, // missing БИН
        address: "", // missing address
      },
      clientRaw: {
        // empty client object: no name, no bin, no address
      },
      tripsRaw: [
        {
          id: "trip-1234567890",
          number: "Р-0001",
          freight_price: 250_000,
          vat_mode: "none",
          origin_city: null,
          dest_city: undefined,
          vehicle: null,
          driver: null,
        },
      ],
      vatPercent: 12,
    });

    expect(snapshot.client.name).toBe("—");
    expect(snapshot.client.bin).toBe("—");
    expect(snapshot.client.address).toBe("—");
    expect(snapshot.client.phone).toBe("—");
    expect(snapshot.supplier.bin).toBe("—");
    expect(snapshot.supplier.address).toBe("—");
    expect(snapshot.trips[0].origin_city).toBe("—");
    expect(snapshot.trips[0].dest_city).toBe("—");
    expect(snapshot.trips[0].vehicle_plate).toBe("—");
    expect(snapshot.trips[0].driver_name).toBe("—");
    expect(snapshot.totals.total).toBe(250_000);
    expect(snapshot.totals.totalInWords).toBe("Двести пятьдесят тысяч тенге 00 тиынов");
  });
});

describe("PDF Rendering with bundled Cyrillic font", () => {
  it("renders all four document types to valid PDF buffers", async () => {
    const { renderDocumentPdfBuffer } = await import("./pdf/render");
    const kinds = ["request", "invoice", "act", "ttn"] as const;

    for (const kind of kinds) {
      const snapshot = buildDocumentSnapshot({
        document: {
          id: `test-doc-${kind}`,
          number: `ТЕСТ-2026-0001`,
          doc_type: kind,
          issue_date: "2026-11-04",
          year: 2026,
          seq: 1,
          status: "issued",
        },
        supplierRaw: {
          name: "ТОО «Рейс Логистика»",
          bin: "123456789012",
          address: "г. Алматы, ул. Достык, 10",
          bank: "АО «Банк ЦентрКредит»",
          bik: "KCIBKZKX",
          iik: "KZ123456789012345678",
          kbe: "17",
          director: "Алиев А.А.",
          accountant: "Смагулова С.С.",
        },
        clientRaw: {
          id: "client-001",
          name: "ТОО «Северный Ветер»",
          bin: "999000000001",
          legal_address: "г. Астана, пр. Республики, 5",
          contact_phone: "+7 777 000 11 22",
          contact_name: "Иванов И.И.",
          contract_number: "СВ-100",
          contract_date: "2026-01-15",
        },
        tripsRaw: [
          {
            id: "trip-001",
            number: "Р-0001",
            origin_city: "Алматы",
            origin_address: "Склад №1",
            dest_city: "Астана",
            dest_address: "Терминал А",
            loading_date: "2026-11-01",
            unloading_date: "2026-11-03",
            cargo_type: "tent",
            cargo_weight_t: 20,
            cargo_volume_m3: 82,
            cargo_description: "Строительные смеси и плитка",
            freight_price: 450_000,
            vat_mode: "incl",
            vehicle: { plate: "010KZ01", make_model: "Volvo FH" },
            trailer_plate: "100KZ02",
            driver: { name: "Берик Тестов", phone: "+7 701 123 45 67" },
          },
        ],
        vatPercent: 12,
      });

      const buf = await renderDocumentPdfBuffer(snapshot);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(1000);
      expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    }
  });
});

