/**
 * Money is always integer cents. Shelf prices are shown tax-in (as on the current
 * site); we split them into pre-tax + HST so receipts and reports are correct.
 */
export const HST_RATE = 0.13;

export type Cents = number;

export interface TaxSplit {
  /** Price the customer pays, tax included. */
  totalCents: Cents;
  /** Pre-tax amount. */
  preTaxCents: Cents;
  /** HST included in the total. */
  taxCents: Cents;
}

/** Split a tax-in price into pre-tax and HST. Pre-tax is rounded to the cent; tax takes the remainder so the parts always add up. */
export function splitTaxIn(totalCents: Cents, rate = HST_RATE): TaxSplit {
  assertCents(totalCents);
  const preTaxCents = Math.round(totalCents / (1 + rate));
  return { totalCents, preTaxCents, taxCents: totalCents - preTaxCents };
}

/** Sum line totals and split once, so rounding errors don't add up across lines. */
export function splitLines(lines: { unitCents: Cents; qty: number }[], rate = HST_RATE): TaxSplit {
  const total = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  return splitTaxIn(total, rate);
}

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-CA")}.${String(abs % 100).padStart(2, "0")}`;
}

export function dollarsToCents(d: number): Cents {
  return Math.round(d * 100);
}

function assertCents(n: number) {
  if (!Number.isInteger(n)) throw new Error(`Money must be integer cents, got ${n}`);
}
