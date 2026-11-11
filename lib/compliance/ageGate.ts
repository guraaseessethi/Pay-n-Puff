import type { AgeGateMode } from "@/lib/settings/schema";

/**
 * Age gate modes. One setting, chosen by the owner in admin Settings.
 * The counter check on every sale and the door check on every delivery happen in EVERY mode.
 */

export type VerifyMethod = "staff" | "id_provider" | "demo" | "self_declare";

export interface CustomerSession {
  kind: "customer";
  name: string;
  method: VerifyMethod;
  minAge: number;
  /** Provider / staff reference. Never an ID number. */
  ref: string;
  verifiedAt: string;
  exp: number;
}

export interface ModeInfo {
  mode: AgeGateMode;
  label: string;
  visitor: string;
  publicSees: string;
  cost: string;
  risk: "low" | "medium" | "high";
  riskNote: string;
}

export const MODE_INFO: Record<AgeGateMode, ModeInfo> = {
  info_only: {
    mode: "info_only",
    label: "Info only",
    visitor: "A yes/no \"Are you 19+?\" pop-up. No online shelf or ordering.",
    publicSees: "Store info only. No product names, prices or images anywhere.",
    cost: "$0",
    risk: "low",
    riskNote: "Lowest risk. Customers order in store or by phone; the counter and door checks still apply.",
  },
  staff_verified: {
    mode: "staff_verified",
    label: "Staff-verified login (recommended)",
    visitor:
      "Info pages behind a yes/no pop-up. To see the shelf, a customer's ID is checked once by staff, at the counter or by the driver on their first delivery. Then they get a sign-in link by email or SMS.",
    publicSees: "Store info publicly; the shelf only after sign-in.",
    cost: "$0",
    risk: "low",
    riskNote: "A real person checks real ID before anyone sees products online. Re-check every 12 months.",
  },
  id_provider: {
    mode: "id_provider",
    label: "Online ID + selfie check",
    visitor: "An online ID and selfie check (Didit or Veriff) before the shelf.",
    publicSees: "Store info publicly; the shelf after the check.",
    cost: "About $0.33–0.80 per check",
    risk: "low",
    riskNote: "Strong check, but each verification costs money and some people can't use a camera.",
  },
  self_declare: {
    mode: "self_declare",
    label: "Self-declare (not recommended)",
    visitor: "A yes/no pop-up only.",
    publicSees: "The shelf with products and prices after \"Yes\".",
    cost: "$0",
    risk: "high",
    riskNote:
      "Health Canada says a checkbox or birthday isn't enough to show vaping products online, and Ontario requires a process to verify a buyer's age before an online sale. You're choosing this at your own risk.",
  },
};

export const SELF_DECLARE_WARNING = MODE_INFO.self_declare.riskNote;

/** Which verification methods unlock the shelf in each mode. */
const ALLOWED: Record<AgeGateMode, readonly VerifyMethod[]> = {
  info_only: [],
  staff_verified: ["staff", "demo", "id_provider"],
  id_provider: ["id_provider", "demo", "staff"],
  self_declare: ["self_declare", "staff", "demo", "id_provider"],
};

/** Can this session see product names, prices and the order form? */
export function canViewShelf(mode: AgeGateMode, session: CustomerSession | null, minAge: number, now = Date.now()): boolean {
  if (!session) return false;
  if (session.exp * 1000 <= now) return false;
  if (session.minAge < minAge) return false;
  return ALLOWED[mode].includes(session.method);
}

/** Can this session place orders online? Same rule as viewing, plus at least one ordering channel on. */
export function canOrderOnline(
  mode: AgeGateMode,
  session: CustomerSession | null,
  minAge: number,
  flags: { deliveryEnabled: boolean; reservationsEnabled: boolean },
  now = Date.now(),
): boolean {
  return canViewShelf(mode, session, minAge, now) && (flags.deliveryEnabled || flags.reservationsEnabled);
}

/** Door and counter checks: always required, every mode. Kept as a function so nobody "optimises" it away. */
export function requiresInPersonIdCheck(_mode: AgeGateMode): true {
  return true;
}

/** Age at the door or counter must meet the minimum age. */
export function passesAge(age: number | null, minAge: number): boolean {
  return age !== null && Number.isInteger(age) && age >= minAge;
}

/** Latest birth date that passes today, for the staff prompt ("born on or before …"). Computed in local date terms. */
export function bornOnOrBefore(minAge: number, today: Date): Date {
  const d = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  // Feb 29 → Feb 28 in non-leap target years is handled by Date rolling to Mar 1; step back one day.
  if (d.getMonth() !== today.getMonth()) d.setDate(0);
  return d;
}
