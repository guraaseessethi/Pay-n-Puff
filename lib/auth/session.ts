import "server-only";
import { cookies, headers } from "next/headers";
import type { CustomerSession } from "@/lib/compliance/ageGate";
import { canViewShelf } from "@/lib/compliance/ageGate";
import type { StaffRole } from "@/lib/domain/types";
import { DEFAULT_SETTINGS, Settings } from "@/lib/settings/schema";
import { cookieSecret, sign, verify } from "./token";

export const COOKIE = {
  customer: "pnp_verified",
  staff: "pnp_staff",
  settings: "pnp_settings",
  ageOk: "pnp_19",
  review: "pnp_review",
} as const;

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/* ---------------- verified customer ---------------- */

type CustomerToken = CustomerSession & { typ: "customer" };

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const t = await verify<CustomerToken>(jar.get(COOKIE.customer)?.value, "customer", cookieSecret());
  return t ?? null;
}

export async function setCustomerSession(s: Omit<CustomerSession, "kind" | "exp">, maxAgeSeconds: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const token = await sign<CustomerToken>({ ...s, kind: "customer", typ: "customer", exp }, cookieSecret());
  (await cookies()).set(COOKIE.customer, token, { ...base, maxAge: maxAgeSeconds });
}

export async function clearCustomerSession(): Promise<void> {
  (await cookies()).delete(COOKIE.customer);
}

/** The one check every verified-only route and action uses. */
export async function requireShelfAccess(): Promise<{ session: CustomerSession; settings: Settings } | null> {
  const [session, settings] = await Promise.all([getCustomerSession(), getSettings()]);
  if (!canViewShelf(settings.ageGateMode, session, settings.minAge)) return null;
  return { session: session!, settings };
}

/* ---------------- demo staff ---------------- */

export interface StaffSession {
  kind: "staff";
  role: StaffRole;
  name: string;
  exp: number;
}
type StaffToken = StaffSession & { typ: "staff" };

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  return (await verify<StaffToken>(jar.get(COOKIE.staff)?.value, "staff", cookieSecret())) ?? null;
}

export async function setStaffSession(role: StaffRole, name: string): Promise<void> {
  const maxAge = 60 * 60 * 12; // one shift
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const token = await sign<StaffToken>({ kind: "staff", typ: "staff", role, name, exp }, cookieSecret());
  (await cookies()).set(COOKIE.staff, token, { ...base, maxAge });
}

export async function clearStaffSession(): Promise<void> {
  (await cookies()).delete(COOKIE.staff);
}

/* ---------------- settings (demo: per-browser, signed) ---------------- */

type SettingsToken = { typ: "settings"; exp: number; s: Settings };

export async function getSettings(): Promise<Settings> {
  const jar = await cookies();
  const t = await verify<SettingsToken>(jar.get(COOKIE.settings)?.value, "settings", cookieSecret());
  if (!t) return DEFAULT_SETTINGS;
  const parsed = Settings.safeParse(t.s);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  const maxAge = 60 * 60 * 24 * 365;
  const token = await sign<SettingsToken>({ typ: "settings", exp: Math.floor(Date.now() / 1000) + maxAge, s }, cookieSecret());
  (await cookies()).set(COOKIE.settings, token, { ...base, maxAge });
}

export async function resetSettings(): Promise<void> {
  (await cookies()).delete(COOKIE.settings);
}

/* ---------------- small public cookies ---------------- */

export async function hasAgeOk(): Promise<boolean> {
  return (await cookies()).get(COOKIE.ageOk)?.value === "1";
}

/** `?review=1` turns on [verify] tags. proxy.ts remembers it in a cookie and forwards it as a request header. */
export async function isReviewMode(): Promise<boolean> {
  return (await headers()).get("x-pnp-review") === "1";
}
