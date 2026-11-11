import type { Product } from "@/lib/domain/types";
import { FLAVOUR_POLICY, NICOTINE_CAP_MG_ML, REQUIRED_STAMP, STORE_TYPE, type RetailerType } from "./policy";

/** Products that carry e-liquid need the Ontario stamp. Bare hardware (no liquid) doesn't. */
export function requiresStamp(p: Pick<Product, "category" | "nicotineMgMl" | "flavourFamily">): boolean {
  return !(p.category === "Devices" && p.nicotineMgMl === 0 && p.flavourFamily === "none");
}

export type BlockReason =
  | "Over 20 mg/mL: federal cap"
  | "Canada stamp only: Ontario stamp required"
  | "Unstamped"
  | "Stamp missing"
  | "Flavour not allowed for this store type";

type Flaggable = Pick<Product, "category" | "nicotineMgMl" | "stamp" | "flavourFamily">;

/**
 * Every reason a product can't be sold. Empty = sellable.
 * Same logic as the concept's flag(), extended to return all reasons.
 */
export function flags(p: Flaggable, storeType: RetailerType = STORE_TYPE): BlockReason[] {
  const out: BlockReason[] = [];
  if (p.nicotineMgMl > NICOTINE_CAP_MG_ML) out.push("Over 20 mg/mL: federal cap");
  if (requiresStamp(p)) {
    if (p.stamp === "CA") out.push("Canada stamp only: Ontario stamp required");
    else if (p.stamp === "none") out.push("Unstamped");
    else if (p.stamp !== REQUIRED_STAMP) out.push("Stamp missing");
  } else if (p.stamp === "none" || p.stamp === "CA") {
    // Hardware shouldn't carry a liquid stamp state; treat odd data as a stamp problem, not silently OK.
    out.push(p.stamp === "CA" ? "Canada stamp only: Ontario stamp required" : "Unstamped");
  }
  if (!FLAVOUR_POLICY[storeType].includes(p.flavourFamily)) out.push("Flavour not allowed for this store type");
  return out;
}

/** First reason only, for compact UI (inventory pill). */
export function flag(p: Flaggable, storeType: RetailerType = STORE_TYPE): BlockReason | "" {
  return flags(p, storeType)[0] ?? "";
}
