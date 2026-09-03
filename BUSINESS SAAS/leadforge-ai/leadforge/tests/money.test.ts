import { describe, it, expect } from "vitest";
import { lineTotalCents, computeTotals, formatCents, parseToCents, roundCents } from "@/lib/money";

describe("lineTotalCents", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotalCents({ quantity: 3, unitPriceCents: 18000 })).toBe(54000);
  });

  it("subtracts a per-line discount", () => {
    expect(lineTotalCents({ quantity: 1, unitPriceCents: 10000, discountCents: 2500 })).toBe(7500);
  });

  it("never returns a negative total even if discount exceeds the line value", () => {
    expect(lineTotalCents({ quantity: 1, unitPriceCents: 1000, discountCents: 5000 })).toBe(0);
  });

  it("handles fractional quantities (e.g. 2.5 hours) without float drift", () => {
    // 2.5 * 4999 = 12497.5 -> rounds to 12498, not 12497 or 12499 from float error
    expect(lineTotalCents({ quantity: 2.5, unitPriceCents: 4999 })).toBe(12498);
  });

  it("rounds half-up consistently", () => {
    expect(lineTotalCents({ quantity: 1, unitPriceCents: 100 })).toBe(100);
    expect(lineTotalCents({ quantity: 0.005, unitPriceCents: 100000 })).toBe(500);
  });
});

describe("computeTotals", () => {
  const lines = [
    { quantity: 3, unitPriceCents: 18000 }, // 54000
    { quantity: 1, unitPriceCents: 9500 }, // 9500
    { quantity: 3, unitPriceCents: 6000 } // 18000
  ];
  // subtotal = 81500

  it("computes subtotal from all line items", () => {
    const totals = computeTotals(lines, 0, 0);
    expect(totals.subtotalCents).toBe(81500);
  });

  it("applies an order-level discount before tax", () => {
    const totals = computeTotals(lines, 5000, 0);
    expect(totals.discountCents).toBe(5000);
    expect(totals.totalCents).toBe(76500);
  });

  it("clamps an order-level discount to never exceed the subtotal", () => {
    const totals = computeTotals(lines, 999999, 0);
    expect(totals.discountCents).toBe(81500);
    expect(totals.totalCents).toBe(0);
  });

  it("applies tax after the discount, using basis points", () => {
    // 81500 subtotal, 5000 discount -> 76500 taxable, 7.5% tax (750 bps)
    const totals = computeTotals(lines, 5000, 750);
    expect(totals.taxCents).toBe(5738); // round(76500 * 0.075) = round(5737.5) = 5738
    expect(totals.totalCents).toBe(82238);
  });

  it("produces zero tax when the rate is zero", () => {
    const totals = computeTotals(lines, 0, 0);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(81500);
  });

  it("never lets floating point compound across many small lines", () => {
    // 37 lines of an amount known to be lossy in binary floating point
    const manyLines = Array.from({ length: 37 }, () => ({ quantity: 1, unitPriceCents: 1099 }));
    const totals = computeTotals(manyLines, 0, 0);
    expect(totals.subtotalCents).toBe(37 * 1099);
  });
});

describe("roundCents", () => {
  it("rounds to the nearest integer", () => {
    expect(roundCents(100.4)).toBe(100);
    expect(roundCents(100.5)).toBe(101);
    expect(roundCents(100.6)).toBe(101);
  });
});

describe("formatCents", () => {
  it("formats integer cents as a currency string", () => {
    expect(formatCents(123456, "USD")).toBe("$1,234.56");
  });

  it("formats zero correctly", () => {
    expect(formatCents(0, "USD")).toBe("$0.00");
  });
});

describe("parseToCents", () => {
  it("parses a plain decimal string", () => {
    expect(parseToCents("12.34")).toBe(1234);
  });

  it("parses a string with thousands separators and a currency symbol", () => {
    expect(parseToCents("$1,234.56")).toBe(123456);
  });

  it("throws on unparseable input rather than silently returning 0", () => {
    expect(() => parseToCents("not a number")).toThrow();
  });
});
