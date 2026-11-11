/**
 * Compliance policy: the single place for the numbers and switches the law sets.
 * Defaults come from env so a law change (e.g. Ontario Bill 125) is a config change, not a rebuild.
 * The owner can override most of these per-store in admin Settings.
 */

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

function envInt(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
}

/** Ontario minimum age to buy, receive or see vaping products. Bill 125 (if passed) would make it 21. */
export const MIN_AGE: number = envInt("MIN_AGE", 19);

/** Federal nicotine concentration cap (Nicotine Concentration in Vaping Products Regulations). */
export const NICOTINE_CAP_MG_ML = 20;

/** Delivery of orders. Switch off if online/remote sales are banned. */
export const DELIVERY_ENABLED: boolean = envBool("DELIVERY_ENABLED", true);

/** Online holds for in-store pickup. Bill 125 as introduced would also ban "offering to sell" online. */
export const RESERVATIONS_ENABLED: boolean = envBool("RESERVATIONS_ENABLED", true);

/**
 * Loyalty rewards, volume discounts to consumers, sticker trade-ins, gifts.
 * OFF until the owner confirms with Simcoe Muskoka District Health Unit what's allowed.
 * See docs/COMPLIANCE.md. Settings shows this as locked.
 */
export const PROMOTIONS_ENABLED = false as const;

export type FlavourFamily = "tobacco" | "mint" | "menthol" | "flavoured" | "none";
export type RetailerType = "specialty" | "convenience" | "other";

/**
 * Which flavour families each kind of retailer may sell in Ontario.
 * "none" = hardware with no e-liquid (batteries, empty devices).
 * Specialty vape stores (registered with the health unit, 19+ entry) can sell all flavours.
 * Convenience and other retailers: tobacco, mint, menthol only.
 */
export const FLAVOUR_POLICY: Record<RetailerType, readonly FlavourFamily[]> = {
  specialty: ["tobacco", "mint", "menthol", "flavoured", "none"],
  convenience: ["tobacco", "mint", "menthol", "none"],
  other: ["tobacco", "mint", "menthol", "none"],
};

/** This store's own type (it's a specialty vape store). Used for the shelf and the till. */
export const STORE_TYPE: RetailerType = "specialty";

/** Ontario requires the Ontario vaping excise stamp since Oct 2024 for liquid products. */
export const REQUIRED_STAMP = "ON" as const;

/** How long a staff ID check keeps a customer verified for online ordering. */
export const STAFF_REVERIFY_MONTHS = 12;
/** Demo verification cookie lifetime (Phase 1 only). Phase 2 provider checks re-verify every 30 days. */
export const DEMO_VERIFY_DAYS = 30;

/** Default hold length for in-store pickup. */
export const DEFAULT_HOLD_HOURS = 24;

/** Health Canada mandatory health warnings, rotated on verified-only pages. Confirm wording/size before launch (docs/COMPLIANCE.md). */
export const HEALTH_WARNINGS = [
  "WARNING: Vaping products contain nicotine, a highly addictive chemical.",
  "WARNING: Vaping products release chemicals that may harm your health.",
] as const;
