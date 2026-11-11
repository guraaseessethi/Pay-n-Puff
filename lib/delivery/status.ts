import type { OrderStatus } from "@/lib/domain/types";

/**
 * Booked → Boarding (driver assigned) → In flight (left the store) → At the door → Landed | Returned.
 * Landed requires a passing door ID check. Returned restocks the items.
 */
const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  Booked: ["Boarding", "Returned"],
  Boarding: ["In flight", "Returned"],
  "In flight": ["At the door", "Returned"],
  "At the door": ["Landed", "Returned"],
  Landed: [],
  Returned: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) throw new Error(`Can't go from ${from} to ${to}`);
}

export const LIVE_STATUSES: readonly OrderStatus[] = ["Booked", "Boarding", "In flight", "At the door"];

export function isLive(s: OrderStatus): boolean {
  return LIVE_STATUSES.includes(s);
}

export function isFinal(s: OrderStatus): boolean {
  return s === "Landed" || s === "Returned";
}

/** Pill tone per status, for the departures board. */
export const STATUS_TONE: Record<OrderStatus, "hot" | "cy" | "warn" | "ok" | "bad" | "mute"> = {
  Booked: "hot",
  Boarding: "cy",
  "In flight": "warn",
  "At the door": "warn",
  Landed: "ok",
  Returned: "bad",
};
