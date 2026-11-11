import "server-only";
import type {
  Hold,
  IdCheck,
  Order,
  Product,
  Sale,
  ShelfProduct,
  WholesaleRequest,
} from "@/lib/domain/types";
import { sellable } from "@/lib/compliance/sellable";
import { splitTaxIn } from "@/lib/money";
import { formatInTimeZone } from "date-fns-tz";
import { STORE_TZ } from "@/lib/hours/hours";

/**
 * SAMPLE DATA. Product names and tax-in prices come from the concept (which took them from
 * paynpuffvapes.com). Nicotine, stamps, flavour families, stock and costs are placeholders.
 * Everything here is [verify] in docs/CONTENT_TODO.md.
 *
 * `server-only`: this module can never be bundled into client JS, so an unverified visitor
 * can't find product names by reading our scripts.
 */

type Row = [
  sku: string,
  brand: string,
  name: string,
  category: Product["category"],
  nic: number,
  size: string,
  priceDollars: number,
  stock: number,
  par: number,
  stamp: Product["stamp"],
  supplier: string,
  flavour: Product["flavourFamily"],
  house?: boolean,
];

const ROWS: Row[] = [
  ["PNP-30K", "Pay N' Puff", "30K disposable", "Disposables", 20, "30,000 puffs", 45, 18, 8, "ON", "House brand", "flavoured", true],
  ["OXB-10K", "OXBAR", "Rocky Vapor 10K", "Disposables", 20, "10,000 puffs", 35, 9, 6, "ON", "Distributor A", "flavoured"],
  ["FBM-8K", "Flavour Beast", "Beast Mode 8K", "Disposables", 20, "8,000 puffs", 40, 7, 6, "ON", "Distributor B", "flavoured"],
  ["STL-8K", "STLTH", "Dispo 8K", "Disposables", 20, "8,000 puffs", 40, 2, 6, "ON", "Distributor C", "flavoured"],
  ["GKB-9K", "Geek Bar", "9K digital", "Disposables", 20, "9,000 puffs", 35, 11, 6, "ON", "Distributor A", "flavoured"],
  ["VCE-55", "VICE", "5.5K disposable", "Disposables", 20, "5,500 puffs", 30, 6, 4, "ON", "Distributor B", "flavoured"],
  ["GKB-5K", "Geek Bar", "5K", "Disposables", 20, "5,000 puffs", 30, 0, 4, "ON", "Distributor A", "flavoured"],
  ["DRP-5K", "Drip'n", "5K disposable", "Disposables", 20, "5,000 puffs", 30, 5, 4, "ON", "Distributor C", "flavoured"],
  ["ZPD-3", "Z Pods", "Pod pack", "Pods", 20, "Pods · tobacco", 25, 14, 6, "ON", "Distributor C", "tobacco"],
  ["STL-DEV", "STLTH", "Vaping device", "Devices", 0, "Battery device", 25, 6, 3, "n/a", "Distributor C", "none"],
  ["IMP-50", "Imported disposable", "(sample: from a shipment)", "Disposables", 50, "6,000 puffs", 30, 12, 0, "none", "Distributor D", "flavoured"],
  ["OLD-CA", "Older pod stock", "(sample: Canada stamp only)", "Pods", 20, "Pods · mint", 20, 6, 0, "CA", "Distributor B", "mint"],
];

export function seedProducts(): Product[] {
  return ROWS.map(([sku, brand, name, category, nic, size, price, stock, par, stamp, supplier, flavour, house]) => ({
    sku,
    brand,
    name,
    category,
    nicotineMgMl: nic,
    size,
    flavourFamily: flavour,
    priceCents: Math.round(price * 100),
    costCents: Math.round(price * 100 * (house ? 0.38 : 0.55)),
    stock,
    par,
    stamp,
    supplier,
    house: !!house,
  }));
}

/** What a verified customer is sent: sellable products only, no cost or supplier. */
export function shelfProducts(): ShelfProduct[] {
  return seedProducts()
    .filter((p) => sellable(p))
    .map(({ costCents: _c, supplier: _s, ...rest }) => rest);
}

/** What the counter role is sent: everything, minus cost. */
export function counterProducts(): Product[] {
  return seedProducts().map((p) => ({ ...p, costCents: 0 }));
}

const label = (sku: string) => {
  const p = seedProducts().find((x) => x.sku === sku)!;
  return { sku, label: `${p.brand} ${p.name}`, unitCents: p.priceCents };
};

/** An instant `minutes` before now. Seed data is always "earlier tonight", whatever time the demo runs. */
function ago(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

/** Toronto "HH:MM" for an instant `minutes` from now (ETAs). */
function clock(now: Date, minutes: number): string {
  return formatInTimeZone(new Date(now.getTime() + minutes * 60_000), STORE_TZ, "HH:mm");
}

function order(
  now: Date,
  code: string,
  short: string,
  address: string,
  postal: string,
  items: [string, number][],
  status: Order["status"],
  driver: string | null,
  eta: string | null,
  outcome?: string,
): Order {
  const lines = items.map(([sku, qty]) => ({ ...label(sku), qty }));
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const fee = 500;
  const split = splitTaxIn(subtotal + fee);
  return {
    id: code,
    code,
    kind: "delivery",
    createdAt: ago(now, 75),
    recipientName: `Sample Customer ${short[0]}`,
    recipientShort: `Sample ${short}`,
    address,
    postalCode: postal,
    zoneFsa: postal.slice(0, 3),
    window: "ASAP (about 45 min)",
    paymentMethod: "cash",
    lines,
    subtotalCents: subtotal,
    deliveryFeeCents: fee,
    totalCents: split.totalCents,
    preTaxCents: split.preTaxCents,
    taxCents: split.taxCents,
    status,
    driver,
    eta,
    outcome,
    restocked: status === "Returned" ? true : undefined,
  };
}

export interface SeedState {
  orders: Order[];
  holds: Hold[];
  sales: Sale[];
  idChecks: IdCheck[];
  wholesale: WholesaleRequest[];
}

export function seedState(now = new Date()): SeedState {
  const sale = (id: string, minsAgo: number, items: [string, number][], pay: Sale["paymentMethod"], idSummary: string, idCheckId: string | null): Sale => {
    const lines = items.map(([sku, qty]) => ({ ...label(sku), qty }));
    const split = splitTaxIn(lines.reduce((s, l) => s + l.unitCents * l.qty, 0));
    return { id, at: ago(now, minsAgo), channel: "counter", lines, ...split, paymentMethod: pay, idCheckId, idSummary };
  };
  const hold: Hold = {
    id: "H-1",
    code: "HLD-21",
    createdAt: ago(now, 240),
    expiresAt: new Date(now.getTime() + (24 * 60 - 240) * 60_000).toISOString(),
    name: "Sample Customer T",
    lines: [{ ...label("STL-8K"), qty: 1 }],
    totalCents: 4000,
    status: "Held",
  };
  return {
    orders: [
      order(now, "PNP-118", "M.", "Mapleview Dr E (sample)", "L4N 0A1", [["GKB-9K", 1], ["ZPD-3", 1]], "Boarding", "Driver 1", clock(now, 35)),
      order(now, "PNP-117", "J.", "Allandale (sample)", "L4N 2B3", [["PNP-30K", 1]], "In flight", "Driver 2", clock(now, 12)),
      order(now, "PNP-116", "R.", "Georgian Dr (sample)", "L4M 3C4", [["OXB-10K", 2]], "Landed", "Driver 1", clock(now, -70), "Driver's licence · 27"),
      order(now, "PNP-115", "K.", "Painswick (sample)", "L4N 5D6", [["VCE-55", 1]], "Returned", "Driver 2", clock(now, -100), "No ID at door"),
    ],
    holds: [hold],
    sales: [
      sale("S-1", 190, [["OXB-10K", 1], ["STL-8K", 1]], "card", "Clearly 25+", "ID-0"),
      sale("S-2", 150, [["PNP-30K", 1]], "cash", "Driver's licence · 22", "ID-1"),
      sale("S-3", 110, [["GKB-9K", 1]], "etransfer", "Ontario Photo Card · 34", "ID-5"),
    ],
    idChecks: [
      { id: "ID-0", at: ago(now, 190), where: "counter", staff: "Owner", idType: "Clearly 25+ (no ID asked)", age: null, nameMatches: null, orderCode: null, result: "Pass" },
      { id: "ID-1", at: ago(now, 150), where: "counter", staff: "Owner", idType: "Driver's licence", age: 22, nameMatches: null, orderCode: null, result: "Pass" },
      { id: "ID-2", at: ago(now, 125), where: "counter", staff: "Owner", idType: "No ID", age: null, nameMatches: null, orderCode: null, result: "Refused", reason: "No ID, looked under 25" },
      { id: "ID-3", at: ago(now, 100), where: "door", staff: "Driver 2", idType: "No ID", age: null, nameMatches: null, orderCode: "PNP-115", result: "Refused", reason: "No ID at door" },
      { id: "ID-4", at: ago(now, 70), where: "door", staff: "Driver 1", idType: "Driver's licence", age: 27, nameMatches: true, orderCode: "PNP-116", result: "Pass" },
      { id: "ID-5", at: ago(now, 110), where: "counter", staff: "Counter 2", idType: "Ontario Photo Card", age: 34, nameMatches: null, orderCode: null, result: "Pass" },
    ],
    wholesale: [
      {
        id: "W-1",
        createdAt: ago(now, 600),
        retailer: {
          id: "R-1",
          business: "Sample store A",
          type: "specialty",
          city: "Innisfil",
          contactName: "Sample contact",
          email: "sample-a@example.com",
          phone: "",
          registrationStatus: "Verified",
          registrationCheck: { method: "Saw health unit specialty vape store registration", checkedAt: ago(now, 580), by: "Owner" },
        },
        asking: "Geek Bar 9K, 10 boxes",
        quoteStatus: "Sent",
      },
      {
        id: "W-2",
        createdAt: ago(now, 480),
        retailer: {
          id: "R-2",
          business: "Sample store B",
          type: "convenience",
          city: "Orillia",
          contactName: "Sample contact",
          email: "sample-b@example.com",
          phone: "",
          registrationStatus: "Unchecked",
          registrationCheck: null,
        },
        asking: "Z Pods, 20 packs",
        quoteStatus: "New",
      },
    ],
  };
}
