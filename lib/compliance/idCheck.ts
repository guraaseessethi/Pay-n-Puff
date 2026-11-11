import type { IdCheckInput, IdType } from "@/lib/domain/types";
import { passesAge } from "./ageGate";

export const PHOTO_ID_TYPES: readonly IdType[] = ["Driver's licence", "Ontario Photo Card", "Passport", "Permanent resident card"];

export interface IdDecision {
  result: "Pass" | "Refused";
  reason?: string;
}

/**
 * One rule set for counter and door. No ID number, no date of birth: staff read the age off the ID.
 *  - Counter: "clearly 25+" passes without ID (Ontario's ask-if-under-25 practice); otherwise photo ID with age ≥ minimum.
 *  - Door: always photo ID, age ≥ minimum, AND the name on the ID matches the order's recipient. Otherwise no handoff.
 */
export function evaluateIdCheck(input: Pick<IdCheckInput, "where" | "idType" | "age" | "nameMatches" | "refusedByStaff" | "reason">, minAge: number): IdDecision {
  if (input.refusedByStaff) return { result: "Refused", reason: input.reason || "Refused by staff" };
  if (input.where === "counter" && input.idType === "Clearly 25+ (no ID asked)") return { result: "Pass" };
  if (!PHOTO_ID_TYPES.includes(input.idType)) return { result: "Refused", reason: input.where === "door" ? "No ID at door" : "No ID" };
  if (!passesAge(input.age, minAge)) return { result: "Refused", reason: `Under ${minAge}` };
  if (input.where === "door" && input.nameMatches !== true) return { result: "Refused", reason: "Name on ID doesn't match the order" };
  return { result: "Pass" };
}

export function summariseIdCheck(c: { idType: IdType; age: number | null; result: string; reason?: string }): string {
  if (c.result !== "Pass") return c.reason ?? "Refused";
  if (c.idType === "Clearly 25+ (no ID asked)") return "Clearly 25+";
  return `${c.idType} · ${c.age}`;
}
