import { describe, expect, it } from "vitest";
import { checkZone, fsaOf, normalisePostal } from "@/lib/delivery/zones";
import { canTransition } from "@/lib/delivery/status";
import { formatCents, splitLines, splitTaxIn } from "@/lib/money";
import { canQuote, quotableProducts, quoteBlocks, validateQuote, wholesaleUnitCents } from "@/lib/compliance/wholesaleRules";
import { seedProducts } from "@/lib/data/mock/seed.server";
import type { Retailer } from "@/lib/domain/types";

const zone = { fsas: ["L4M", "L4N", "L9J"], feeCents: 500, minimumCents: 3000 };

describe("delivery zone (postal-code FSA allow-list)", () => {
  it("normalises postal codes", () => {
    expect(normalisePostal("l4m1a2")).toBe("L4M 1A2");
    expect(normalisePostal(" L4M  1A2 ")).toBe("L4M 1A2");
    expect(normalisePostal("D4M 1A2")).toBeNull(); // D isn't a valid first letter
    expect(normalisePostal("12345")).toBeNull();
    expect(fsaOf("L4N 0A1")).toBe("L4N");
  });
  it("books inside the zone over the minimum", () => {
    expect(checkZone("L4M 1A2", 4500, zone)).toEqual({ ok: true, fsa: "L4M", postal: "L4M 1A2", feeCents: 500 });
  });
  it("refuses a postal code outside the zone", () => {
    const r = checkZone("L3Y 1A1", 4500, zone); // Newmarket
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("outside_zone");
  });
  it("refuses below the minimum", () => {
    const r = checkZone("L4M 1A2", 2500, zone);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("below_minimum");
  });
  it("refuses an invalid postal code", () => {
    expect(checkZone("nope", 9999, zone).ok).toBe(false);
  });
});

describe("delivery status", () => {
  it("follows Booked → Boarding → In flight → At the door → Landed | Returned", () => {
    expect(canTransition("Booked", "Boarding")).toBe(true);
    expect(canTransition("Boarding", "In flight")).toBe(true);
    expect(canTransition("In flight", "At the door")).toBe(true);
    expect(canTransition("At the door", "Landed")).toBe(true);
    expect(canTransition("At the door", "Returned")).toBe(true);
  });
  it("can't land without going to the door, and final states are final", () => {
    expect(canTransition("Booked", "Landed")).toBe(false);
    expect(canTransition("In flight", "Landed")).toBe(false);
    expect(canTransition("Landed", "Returned")).toBe(false);
    expect(canTransition("Returned", "Booked")).toBe(false);
  });
});

describe("tax-in pricing (13% HST, integer cents)", () => {
  it("splits a $45.00 tax-in price", () => {
    expect(splitTaxIn(4500)).toEqual({ totalCents: 4500, preTaxCents: 3982, taxCents: 518 });
  });
  it("parts always add up to the total", () => {
    for (let c = 0; c < 20000; c += 37) {
      const s = splitTaxIn(c);
      expect(s.preTaxCents + s.taxCents).toBe(c);
      expect(Number.isInteger(s.taxCents)).toBe(true);
    }
  });
  it("splits once across lines so rounding doesn't drift", () => {
    expect(splitLines([{ unitCents: 3500, qty: 2 }, { unitCents: 2500, qty: 1 }])).toEqual(splitTaxIn(9500));
  });
  it("rejects non-integer money", () => {
    expect(() => splitTaxIn(45.5)).toThrow();
  });
  it("formats cents", () => {
    expect(formatCents(4500)).toBe("$45.00");
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(5)).toBe("$0.05");
  });
});

describe("wholesale quote rules", () => {
  const check = { method: "Saw health unit registration", checkedAt: "2026-11-11T12:00:00Z", by: "Owner" };
  const specialty: Pick<Retailer, "type" | "registrationStatus" | "registrationCheck"> = { type: "specialty", registrationStatus: "Verified", registrationCheck: check };
  const convenience: typeof specialty = { type: "convenience", registrationStatus: "Verified", registrationCheck: check };
  const products = seedProducts();
  const bySku = (s: string) => products.find((p) => p.sku === s)!;

  it("won't quote an unverified retailer", () => {
    expect(quoteBlocks({ ...specialty, registrationStatus: "Unchecked", registrationCheck: null }, bySku("GKB-9K"))).toEqual([
      "Retailer registration not verified",
      "No record of how registration was checked",
    ]);
  });
  it("specialty stores can be quoted flavoured stock", () => {
    expect(canQuote(specialty, bySku("GKB-9K"))).toBe(true);
  });
  it("a convenience store quote can't include flavoured stock", () => {
    expect(quoteBlocks(convenience, bySku("GKB-9K"))).toContain("Flavoured stock: specialty vape stores only");
    expect(canQuote(convenience, bySku("ZPD-3"))).toBe(true); // tobacco
    expect(canQuote(convenience, bySku("STL-DEV"))).toBe(true); // hardware
  });
  it("blocked products are never quotable, to anyone", () => {
    expect(canQuote(specialty, bySku("IMP-50"))).toBe(false);
    expect(canQuote(specialty, bySku("OLD-CA"))).toBe(false);
    const q = quotableProducts(convenience, products).map((p) => p.sku);
    expect(q.sort()).toEqual(["STL-DEV", "ZPD-3"]);
  });
  it("validateQuote rejects a convenience quote with a flavoured line", () => {
    expect(() =>
      validateQuote(convenience, [{ sku: "GKB-9K", label: "x", qty: 10, unitCents: 2000 }], products),
    ).toThrow(/specialty vape stores only/);
    expect(() => validateQuote(convenience, [{ sku: "ZPD-3", label: "x", qty: 10, unitCents: 2000 }], products)).not.toThrow();
  });
  it("computes unit price from cost + margin in cents", () => {
    expect(wholesaleUnitCents(1925, 18)).toBe(2272);
    expect(() => wholesaleUnitCents(1000, -1)).toThrow();
  });
});
