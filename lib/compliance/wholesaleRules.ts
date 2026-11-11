import type { Product, Retailer, WholesaleQuoteLine } from "@/lib/domain/types";
import { flags } from "./flags";
import { NICOTINE_CAP_MG_ML } from "./policy";

type QuoteProduct = Pick<Product, "sku" | "category" | "nicotineMgMl" | "stamp" | "flavourFamily">;

export type QuoteBlock =
  | "Retailer registration not verified"
  | "No record of how registration was checked"
  | "Product can't be sold (cap or stamp)"
  | "Flavoured stock: specialty vape stores only"
  | "Over 20 mg/mL";

/**
 * Why a product can't go on a quote for this retailer. Empty = allowed.
 * - Only verified, registered retailers, with a record of how we checked.
 * - Nothing that fails sellable() (cap/stamp).
 * - Convenience and other non-specialty retailers: tobacco/mint/menthol (and bare hardware) only, ≤20 mg/mL.
 */
export function quoteBlocks(retailer: Pick<Retailer, "type" | "registrationStatus" | "registrationCheck">, p: QuoteProduct): QuoteBlock[] {
  const out: QuoteBlock[] = [];
  if (retailer.registrationStatus !== "Verified") out.push("Retailer registration not verified");
  if (!retailer.registrationCheck?.method) out.push("No record of how registration was checked");
  // Cap/stamp checks are store-type independent; evaluate as specialty so flavour is judged separately below.
  const base = flags(p, "specialty");
  if (base.length) out.push("Product can't be sold (cap or stamp)");
  if (retailer.type !== "specialty") {
    if (p.flavourFamily === "flavoured") out.push("Flavoured stock: specialty vape stores only");
    if (p.nicotineMgMl > NICOTINE_CAP_MG_ML) out.push("Over 20 mg/mL");
  }
  return out;
}

export function canQuote(retailer: Pick<Retailer, "type" | "registrationStatus" | "registrationCheck">, p: QuoteProduct): boolean {
  return quoteBlocks(retailer, p).length === 0;
}

/** Products this retailer may be quoted. */
export function quotableProducts<T extends QuoteProduct>(retailer: Pick<Retailer, "type" | "registrationStatus" | "registrationCheck">, products: T[]): T[] {
  return products.filter((p) => canQuote(retailer, p));
}

/** Unit price = cost × (1 + margin), rounded to the cent. */
export function wholesaleUnitCents(costCents: number, marginPct: number): number {
  if (marginPct < 0 || marginPct > 100) throw new Error("Margin must be 0–100%");
  return Math.round(costCents * (1 + marginPct / 100));
}

/** Validate a whole quote. Throws with every problem so the UI and the server reject the same things. */
export function validateQuote(
  retailer: Pick<Retailer, "type" | "registrationStatus" | "registrationCheck">,
  lines: WholesaleQuoteLine[],
  catalogue: QuoteProduct[],
): void {
  const problems: string[] = [];
  if (!lines.length) problems.push("Quote has no lines");
  for (const l of lines) {
    const p = catalogue.find((c) => c.sku === l.sku);
    if (!p) {
      problems.push(`${l.sku}: unknown product`);
      continue;
    }
    for (const b of quoteBlocks(retailer, p)) problems.push(`${l.sku}: ${b}`);
    if (!Number.isInteger(l.qty) || l.qty < 1) problems.push(`${l.sku}: quantity must be a whole number ≥ 1`);
  }
  if (problems.length) throw new Error(problems.join("; "));
}
