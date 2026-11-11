import { describe, expect, it } from "vitest";
import { flag, flags, requiresStamp } from "@/lib/compliance/flags";
import { sellable } from "@/lib/compliance/sellable";
import { evaluateIdCheck } from "@/lib/compliance/idCheck";
import { bornOnOrBefore, canOrderOnline, canViewShelf, passesAge, type CustomerSession } from "@/lib/compliance/ageGate";
import { FLAVOUR_POLICY, NICOTINE_CAP_MG_ML, PROMOTIONS_ENABLED } from "@/lib/compliance/policy";
import { seedProducts, shelfProducts } from "@/lib/data/mock/seed.server";
import type { Product } from "@/lib/domain/types";

const base: Pick<Product, "category" | "nicotineMgMl" | "stamp" | "flavourFamily"> = {
  category: "Disposables",
  nicotineMgMl: 20,
  stamp: "ON",
  flavourFamily: "flavoured",
};

describe("sellable / flags (concept logic)", () => {
  it("allows 20 mg/mL with the Ontario stamp", () => {
    expect(sellable(base)).toBe(true);
    expect(flag(base)).toBe("");
  });
  it("blocks anything over the 20 mg/mL federal cap", () => {
    expect(NICOTINE_CAP_MG_ML).toBe(20);
    expect(sellable({ ...base, nicotineMgMl: 20.1 })).toBe(false);
    expect(flag({ ...base, nicotineMgMl: 50 })).toBe("Over 20 mg/mL: federal cap");
  });
  it("blocks Canada-only stamp where Ontario is required", () => {
    expect(flag({ ...base, stamp: "CA" })).toBe("Canada stamp only: Ontario stamp required");
  });
  it("blocks unstamped stock", () => {
    expect(flag({ ...base, stamp: "none" })).toBe("Unstamped");
  });
  it("blocks a liquid product marked n/a (it needs a stamp)", () => {
    expect(sellable({ ...base, stamp: "n/a" })).toBe(false);
  });
  it("allows bare hardware with no stamp", () => {
    const device = { category: "Devices" as const, nicotineMgMl: 0, stamp: "n/a" as const, flavourFamily: "none" as const };
    expect(requiresStamp(device)).toBe(false);
    expect(sellable(device)).toBe(true);
  });
  it("reports every reason, not just the first", () => {
    expect(flags({ ...base, nicotineMgMl: 50, stamp: "none" })).toEqual(["Over 20 mg/mL: federal cap", "Unstamped"]);
  });
  it("applies FLAVOUR_POLICY by store type", () => {
    expect(FLAVOUR_POLICY.convenience).not.toContain("flavoured");
    expect(sellable(base, "convenience")).toBe(false);
    expect(sellable({ ...base, flavourFamily: "menthol" }, "convenience")).toBe(true);
  });
});

describe("sample catalogue", () => {
  it("has the concept's two blocked SKUs and they never reach the shelf", () => {
    const blocked = seedProducts().filter((p) => !sellable(p)).map((p) => p.sku);
    expect(blocked.sort()).toEqual(["IMP-50", "OLD-CA"]);
    const shelf = shelfProducts().map((p) => p.sku);
    expect(shelf).not.toContain("IMP-50");
    expect(shelf).not.toContain("OLD-CA");
  });
  it("never sends cost or supplier to the shelf", () => {
    for (const p of shelfProducts()) {
      expect(p).not.toHaveProperty("costCents");
      expect(p).not.toHaveProperty("supplier");
    }
  });
  it("stores money in integer cents", () => {
    for (const p of seedProducts()) {
      expect(Number.isInteger(p.priceCents)).toBe(true);
      expect(Number.isInteger(p.costCents)).toBe(true);
    }
  });
});

describe("promotions", () => {
  it("stay off until the health unit confirms", () => {
    expect(PROMOTIONS_ENABLED).toBe(false);
  });
});

describe("ID checks (no DOB, no ID number)", () => {
  it("counter: clearly 25+ passes without ID", () => {
    expect(evaluateIdCheck({ where: "counter", idType: "Clearly 25+ (no ID asked)", age: null, nameMatches: null }, 19).result).toBe("Pass");
  });
  it("door: clearly 25+ is NOT enough, photo ID is always required", () => {
    expect(evaluateIdCheck({ where: "door", idType: "Clearly 25+ (no ID asked)", age: null, nameMatches: true }, 19).result).toBe("Refused");
  });
  it("refuses under the minimum age", () => {
    const d = evaluateIdCheck({ where: "counter", idType: "Passport", age: 18, nameMatches: null }, 19);
    expect(d).toEqual({ result: "Refused", reason: "Under 19" });
  });
  it("door: refuses when the name doesn't match the order", () => {
    expect(evaluateIdCheck({ where: "door", idType: "Driver's licence", age: 30, nameMatches: false }, 19).reason).toMatch(/doesn't match/);
  });
  it("door: passes with photo ID, age and matching name", () => {
    expect(evaluateIdCheck({ where: "door", idType: "Driver's licence", age: 19, nameMatches: true }, 19).result).toBe("Pass");
  });
  it("a staff refusal is always a refusal, even with valid ID", () => {
    expect(evaluateIdCheck({ where: "door", idType: "Passport", age: 40, nameMatches: true, refusedByStaff: true, reason: "Looked intoxicated" }, 19)).toEqual({
      result: "Refused",
      reason: "Looked intoxicated",
    });
  });
  it("respects MIN_AGE = 21 if Bill 125 passes", () => {
    expect(evaluateIdCheck({ where: "door", idType: "Driver's licence", age: 20, nameMatches: true }, 21).result).toBe("Refused");
    expect(passesAge(21, 21)).toBe(true);
  });
  it("gives staff a 'born on or before' date instead of asking for a DOB", () => {
    expect(bornOnOrBefore(19, new Date(2026, 10, 11)).toDateString()).toBe(new Date(2007, 10, 11).toDateString());
    // Feb 29 → Feb 28 in a non-leap year
    expect(bornOnOrBefore(19, new Date(2028, 1, 29)).toDateString()).toBe(new Date(2009, 1, 28).toDateString());
  });
});

describe("age gate modes", () => {
  const now = Date.now();
  const s = (method: CustomerSession["method"], minAge = 19, expOffset = 3600): CustomerSession => ({
    kind: "customer",
    name: "Demo Customer",
    method,
    minAge,
    ref: "x",
    verifiedAt: new Date(now).toISOString(),
    exp: Math.floor(now / 1000) + expOffset,
  });

  it("info_only never shows the shelf", () => {
    expect(canViewShelf("info_only", s("staff"), 19, now)).toBe(false);
  });
  it("staff_verified needs a real check, not a self-declaration", () => {
    expect(canViewShelf("staff_verified", s("staff"), 19, now)).toBe(true);
    expect(canViewShelf("staff_verified", s("self_declare"), 19, now)).toBe(false);
    expect(canViewShelf("staff_verified", null, 19, now)).toBe(false);
  });
  it("id_provider ignores self-declarations", () => {
    expect(canViewShelf("id_provider", s("self_declare"), 19, now)).toBe(false);
    expect(canViewShelf("id_provider", s("id_provider"), 19, now)).toBe(true);
  });
  it("self_declare accepts the yes/no answer", () => {
    expect(canViewShelf("self_declare", s("self_declare"), 19, now)).toBe(true);
  });
  it("expired sessions and sessions verified for a lower age don't count", () => {
    expect(canViewShelf("staff_verified", s("staff", 19, -1), 19, now)).toBe(false);
    expect(canViewShelf("staff_verified", s("staff", 19), 21, now)).toBe(false);
  });
  it("ordering switches off when both delivery and reservations are off (Bill 125)", () => {
    expect(canOrderOnline("staff_verified", s("staff"), 19, { deliveryEnabled: false, reservationsEnabled: false }, now)).toBe(false);
    expect(canOrderOnline("staff_verified", s("staff"), 19, { deliveryEnabled: true, reservationsEnabled: false }, now)).toBe(true);
  });
});
