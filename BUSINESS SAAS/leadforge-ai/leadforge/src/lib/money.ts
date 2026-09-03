/**
 * All money in LeadForge is stored and calculated as integer cents (minor units).
 * Never do `price * 1.1` on a dollar float — floating point cannot represent
 * most decimal fractions exactly, and errors compound across line items,
 * discounts, and tax. Every function here works in integers only.
 */

export type LineInput = {
  quantity: number; // may be fractional (e.g. 2.5 hours) — validated by zod as a finite number
  unitPriceCents: number;
  discountCents?: number;
};

/** Rounds a fractional cent value to the nearest integer cent, half-up. */
export function roundCents(value: number): number {
  return Math.round(value);
}

/** Line total = quantity * unit price, minus a flat per-line discount, floor at 0. */
export function lineTotalCents(line: LineInput): number {
  const raw = line.quantity * line.unitPriceCents - (line.discountCents ?? 0);
  return Math.max(0, roundCents(raw));
}

export type QuoteTotals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Computes subtotal, tax, and total for a set of line items plus an
 * order-level discount and a tax rate expressed in basis points
 * (e.g. 750 = 7.5%). Tax is applied after the order-level discount,
 * which is the common convention for service quotes.
 */
export function computeTotals(
  lines: LineInput[],
  orderDiscountCents: number,
  taxRateBps: number
): QuoteTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const discountCents = Math.max(0, Math.min(orderDiscountCents, subtotalCents));
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.max(0, roundCents((taxableCents * taxRateBps) / 10000));
  const totalCents = taxableCents + taxCents;
  return { subtotalCents, discountCents, taxCents, totalCents };
}

/** Formats integer cents as a currency string, e.g. 123456 -> "$1,234.56". */
export function formatCents(cents: number, currency = "USD", locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

/** Parses a user-typed dollar string ("1,234.56") into integer cents. Throws on invalid input. */
export function parseToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new Error(`Cannot parse "${input}" as a currency amount`);
  }
  return roundCents(Number(cleaned) * 100);
}
