import { describe, expect, it } from "vitest";
import { MemoryKV, MockRepository } from "@/lib/data/mock/MockRepository";
import { seedProducts, seedState } from "@/lib/data/mock/seed.server";
import { sign, verify } from "@/lib/auth/token";
import { splitTaxIn } from "@/lib/money";

function repo() {
  return new MockRepository(new MemoryKV(), { products: seedProducts(), ...seedState() });
}

async function bookDelivery(r: MockRepository) {
  const lines = [{ sku: "GKB-9K", label: "Geek Bar 9K digital", qty: 2, unitCents: 3500 }];
  const split = splitTaxIn(7000 + 500);
  return r.createDeliveryOrder({
    kind: "delivery",
    recipientName: "Demo Customer",
    recipientShort: "Demo C.",
    address: "1 Sample St",
    postalCode: "L4M 1A2",
    zoneFsa: "L4M",
    window: "ASAP",
    paymentMethod: "cash",
    lines,
    subtotalCents: 7000,
    deliveryFeeCents: 500,
    totalCents: split.totalCents,
    preTaxCents: split.preTaxCents,
    taxCents: split.taxCents,
  });
}

const stockOf = async (r: MockRepository, sku: string) => (await r.listProducts()).find((p) => p.sku === sku)!.stock;

describe("MockRepository: delivery flow", () => {
  it("Booked → Boarding → In flight → door check pass → Landed, logged, sale recorded", async () => {
    const r = repo();
    const before = await stockOf(r, "GKB-9K");
    const o = await bookDelivery(r);
    expect(o.code).toBe("PNP-119");
    expect(await stockOf(r, "GKB-9K")).toBe(before - 2);
    await r.assignDriver(o.code, "Driver 1");
    await r.takeOff(o.code);
    await r.arriveAtDoor(o.code);
    const { order, check } = await r.recordDoorCheck(
      o.code,
      { where: "door", staff: "Driver 1", idType: "Driver's licence", age: 27, nameMatches: true, orderCode: o.code },
      19,
    );
    expect(order.status).toBe("Landed");
    expect(check.result).toBe("Pass");
    expect((await r.listIdChecks()).at(-1)).toMatchObject({ where: "door", orderCode: o.code, age: 27 });
    expect((await r.listSales()).at(-1)).toMatchObject({ channel: "delivery", idCheckId: check.id });
    expect(await stockOf(r, "GKB-9K")).toBe(before - 2);
  });

  it("refused at the door → Returned and restocked exactly once", async () => {
    const r = repo();
    const before = await stockOf(r, "GKB-9K");
    const o = await bookDelivery(r);
    await r.assignDriver(o.code, "Driver 2");
    await r.takeOff(o.code);
    const { order } = await r.recordDoorCheck(o.code, { where: "door", staff: "Driver 2", idType: "No ID", age: null, nameMatches: null, orderCode: o.code }, 19);
    expect(order.status).toBe("Returned");
    expect(order.restocked).toBe(true);
    expect(await stockOf(r, "GKB-9K")).toBe(before);
    await expect(r.returnOrder(o.code, "again", "Owner")).rejects.toThrow();
    expect(await stockOf(r, "GKB-9K")).toBe(before);
  });

  it("can't land an order that never left", async () => {
    const r = repo();
    const o = await bookDelivery(r);
    await expect(
      r.recordDoorCheck(o.code, { where: "door", staff: "Driver 1", idType: "Passport", age: 30, nameMatches: true, orderCode: o.code }, 19),
    ).rejects.toThrow(/isn't at the door/);
  });

  it("never stores an ID number or date of birth on a check", async () => {
    const r = repo();
    await expect(
      r.recordCounterCheck({ where: "counter", staff: "Owner", idType: "Passport", age: 30, nameMatches: null, orderCode: null, dob: "1990-01-01" } as never, 19),
    ).rejects.toThrow();
  });
});

describe("MockRepository: till", () => {
  it("won't take payment without a passing counter check", async () => {
    const r = repo();
    const lines = [{ sku: "GKB-9K", label: "x", qty: 1, unitCents: 3500 }];
    const refused = await r.recordCounterCheck({ where: "counter", staff: "Owner", idType: "No ID", age: null, nameMatches: null, orderCode: null }, 19);
    await expect(r.completeSale(lines, "cash", refused.id)).rejects.toThrow(/passing age check/);
    const ok = await r.recordCounterCheck({ where: "counter", staff: "Owner", idType: "Driver's licence", age: 22, nameMatches: null, orderCode: null }, 19);
    const sale = await r.completeSale(lines, "cash", ok.id);
    expect(sale.totalCents).toBe(3500);
    expect(sale.preTaxCents + sale.taxCents).toBe(3500);
  });
  it("blocks non-sellable products at the till", async () => {
    const r = repo();
    const ok = await r.recordCounterCheck({ where: "counter", staff: "Owner", idType: "Driver's licence", age: 22, nameMatches: null, orderCode: null }, 19);
    await expect(r.completeSale([{ sku: "IMP-50", label: "x", qty: 1, unitCents: 3000 }], "cash", ok.id)).rejects.toThrow(/blocked/);
  });
});

describe("signed tokens", () => {
  const secret = "test-secret-test-secret-test-secret-1234";
  it("round-trips and checks purpose and expiry", async () => {
    const t = await sign({ typ: "customer", exp: Math.floor(Date.now() / 1000) + 60, name: "A" }, secret);
    expect(await verify(t, "customer", secret)).toMatchObject({ name: "A" });
    expect(await verify(t, "staff", secret)).toBeNull();
    expect(await verify(t, "customer", "another-secret-another-secret-12345678")).toBeNull();
    const old = await sign({ typ: "customer", exp: Math.floor(Date.now() / 1000) - 1 }, secret);
    expect(await verify(old, "customer", secret)).toBeNull();
  });
  it("rejects a tampered payload", async () => {
    const t = await sign({ typ: "customer", exp: Math.floor(Date.now() / 1000) + 60, method: "self_declare" }, secret);
    const [body, sig] = t.split(".");
    const forged = btoa(atob(body.replace(/-/g, "+").replace(/_/g, "/")).replace("self_declare", "staff")).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(await verify(`${forged}.${sig}`, "customer", secret)).toBeNull();
  });
});
