/**
 * Delivery zone: an allow-list of postal-code FSAs (first three characters), set in Settings.
 * No paid maps API. The driver taps the address to open their own maps app.
 */

const POSTAL_RE = /^([A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z])\s?(\d[A-CEGHJ-NPR-TV-Z]\d)$/;

export function normalisePostal(input: string): string | null {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  const m = POSTAL_RE.exec(s);
  return m ? `${m[1]} ${m[2]}` : null;
}

export function fsaOf(postal: string): string | null {
  const n = normalisePostal(postal);
  return n ? n.slice(0, 3) : null;
}

export interface ZoneConfig {
  fsas: string[];
  feeCents: number;
  minimumCents: number;
}

export type ZoneResult =
  | { ok: true; fsa: string; postal: string; feeCents: number }
  | { ok: false; reason: "invalid_postal" | "outside_zone" | "below_minimum"; message: string };

export function checkZone(postalInput: string, subtotalCents: number, cfg: ZoneConfig): ZoneResult {
  const postal = normalisePostal(postalInput);
  if (!postal) return { ok: false, reason: "invalid_postal", message: "Enter a Canadian postal code, like L4M 1A2." };
  const fsa = postal.slice(0, 3);
  if (!cfg.fsas.includes(fsa)) {
    return { ok: false, reason: "outside_zone", message: `We don't deliver to ${fsa} yet. Pick up in store instead.` };
  }
  if (subtotalCents < cfg.minimumCents) {
    return {
      ok: false,
      reason: "below_minimum",
      message: `Delivery minimum is $${(cfg.minimumCents / 100).toFixed(2)} before the delivery fee.`,
    };
  }
  return { ok: true, fsa, postal, feeCents: cfg.feeCents };
}
