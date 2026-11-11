import type { Product } from "@/lib/domain/types";
import { flags } from "./flags";
import { STORE_TYPE, type RetailerType } from "./policy";

type Checkable = Pick<Product, "category" | "nicotineMgMl" | "stamp" | "flavourFamily">;

/**
 * Can this product be sold at all? Used in three places, always the same function:
 *  - the shelf (non-sellable products are never sent to the browser),
 *  - the till (blocked items can't be added),
 *  - the wholesale quote tool (via wholesaleRules, which adds buyer-type rules).
 */
export function sellable(p: Checkable, storeType: RetailerType = STORE_TYPE): boolean {
  return flags(p, storeType).length === 0;
}

/** Sellable and in stock. */
export function availableNow(p: Checkable & Pick<Product, "stock">): boolean {
  return sellable(p) && p.stock > 0;
}

/** Throw if any product isn't sellable. Server actions call this before accepting an order. */
export function assertAllSellable<T extends Checkable & { sku: string }>(products: T[]): void {
  const bad = products.filter((p) => !sellable(p));
  if (bad.length) throw new Error(`Not sellable: ${bad.map((p) => p.sku).join(", ")}`);
}
