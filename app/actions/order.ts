"use server";

import { z } from "zod";
import { requireShelfAccess } from "@/lib/auth/session";
import { seedProducts } from "@/lib/data/mock/seed.server";
import { sellable } from "@/lib/compliance/sellable";
import { checkZone } from "@/lib/delivery/zones";
import { splitTaxIn } from "@/lib/money";
import type { Hold, Order, OrderLine } from "@/lib/domain/types";

const Lines = z.array(z.object({ sku: z.string().max(20), qty: z.number().int().min(1).max(10) }).strict()).min(1).max(20);

const DeliveryDraft = z
  .object({
    kind: z.literal("delivery"),
    lines: Lines,
    address: z.string().trim().min(5, "Add the street address").max(160),
    postalCode: z.string().trim().max(10),
    window: z.string().max(40),
    paymentMethod: z.enum(["cash", "etransfer"]),
  })
  .strict();

const PickupDraft = z.object({ kind: z.literal("pickup"), lines: Lines }).strict();

export type OrderDraft = z.input<typeof DeliveryDraft> | z.input<typeof PickupDraft>;

export type OrderResult =
  | { ok: true; kind: "delivery"; order: Omit<Order, "id" | "code" | "status" | "driver" | "eta" | "createdAt"> }
  | { ok: true; kind: "pickup"; hold: Omit<Hold, "id" | "code" | "createdAt" | "status"> }
  | { ok: false; error: string };

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

/**
 * Every online order passes through here. The server re-checks:
 *  verified session (signed cookie) → feature flags → products sellable → zone/minimum → recipient = verified name.
 * Prices come from the server catalogue, never from the browser.
 */
export async function placeOrder(raw: OrderDraft): Promise<OrderResult> {
  const access = await requireShelfAccess();
  if (!access) return { ok: false, error: "Please verify your age first." };
  const { session, settings } = access;

  const catalogue = seedProducts();
  const priceLines = (lines: { sku: string; qty: number }[]): OrderLine[] | string => {
    const out: OrderLine[] = [];
    for (const l of lines) {
      const p = catalogue.find((c) => c.sku === l.sku);
      if (!p || !sellable(p)) return `That product isn't available.`;
      out.push({ sku: p.sku, label: `${p.brand} ${p.name}`, qty: l.qty, unitCents: p.priceCents });
    }
    return out;
  };

  if (raw.kind === "pickup") {
    if (!settings.reservationsEnabled) return { ok: false, error: "Online holds are switched off." };
    const d = PickupDraft.safeParse(raw);
    if (!d.success) return { ok: false, error: d.error.issues[0].message };
    const lines = priceLines(d.data.lines);
    if (typeof lines === "string") return { ok: false, error: lines };
    const total = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
    return {
      ok: true,
      kind: "pickup",
      hold: { name: session.name, lines, totalCents: total, expiresAt: new Date(Date.now() + settings.holdHours * 3600_000).toISOString() },
    };
  }

  if (!settings.deliveryEnabled) return { ok: false, error: "Delivery is switched off." };
  const d = DeliveryDraft.safeParse(raw);
  if (!d.success) return { ok: false, error: d.error.issues[0].message };
  if (d.data.paymentMethod === "cash" && !settings.delivery.payment.cash) return { ok: false, error: "Cash isn't accepted for delivery." };
  if (d.data.paymentMethod === "etransfer" && !settings.delivery.payment.etransfer) return { ok: false, error: "e-Transfer isn't accepted for delivery." };
  if (!settings.delivery.windows.includes(d.data.window)) return { ok: false, error: "Pick a delivery window." };
  const lines = priceLines(d.data.lines);
  if (typeof lines === "string") return { ok: false, error: lines };
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const zone = checkZone(d.data.postalCode, subtotal, settings.delivery);
  if (!zone.ok) return { ok: false, error: zone.message };
  const split = splitTaxIn(subtotal + zone.feeCents);
  return {
    ok: true,
    kind: "delivery",
    order: {
      kind: "delivery",
      // The recipient is always the verified customer. It isn't a form field.
      recipientName: session.name,
      recipientShort: shortName(session.name),
      address: d.data.address,
      postalCode: zone.postal,
      zoneFsa: zone.fsa,
      window: d.data.window,
      paymentMethod: d.data.paymentMethod,
      lines,
      subtotalCents: subtotal,
      deliveryFeeCents: zone.feeCents,
      totalCents: split.totalCents,
      preTaxCents: split.preTaxCents,
      taxCents: split.taxCents,
    },
  };
}
