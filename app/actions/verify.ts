"use server";

import { z } from "zod";
import { clearCustomerSession, getSettings, getStaffSession, setCustomerSession } from "@/lib/auth/session";
import { cookieSecret, sign } from "@/lib/auth/token";
import { DEMO_VERIFY_DAYS, STAFF_REVERIFY_MONTHS } from "@/lib/compliance/policy";
import { getVerificationProvider } from "@/lib/verification/demo";

const Name = z.string().trim().min(2, "Enter the name on the ID").max(80);
const DAYS = 24 * 60 * 60;

/** Step 0 of the DemoProvider flow. */
export async function startDemoVerification(): Promise<{ sessionId: string }> {
  const settings = await getSettings();
  if (settings.ageGateMode === "info_only") throw new Error("Online verification is off.");
  const { sessionId } = await getVerificationProvider().start({ minAge: settings.minAge, returnUrl: "/shelf" });
  return { sessionId };
}

/** Final step: read the provider result and set the signed, httpOnly cookie. Demo: 30 days. */
export async function completeDemoVerification(sessionId: string, name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await getSettings();
  if (settings.ageGateMode === "info_only") return { ok: false, error: "Online verification is off." };
  const n = Name.safeParse(name);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  const r = await getVerificationProvider().getResult(sessionId, n.data, settings.minAge);
  if (r.status !== "approved" || (r.ageBandPassed ?? 0) < settings.minAge) return { ok: false, error: "Verification didn't pass." };
  await setCustomerSession(
    { name: r.verifiedName ?? n.data, method: "demo", minAge: settings.minAge, ref: r.providerRef, verifiedAt: r.checkedAt },
    DEMO_VERIFY_DAYS * DAYS,
  );
  return { ok: true };
}

/**
 * Demo shortcut for staff_verified mode, so the owner can tap through without visiting the counter first.
 * Clearly labelled in the UI. Phase 2 removes it: only a staff-issued magic link sets a "staff" session.
 */
export async function demoStaffVerifiedSignIn(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await getSettings();
  if (settings.ageGateMode === "info_only") return { ok: false, error: "Online ordering is off." };
  const n = Name.safeParse(name);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  await setCustomerSession(
    { name: n.data, method: "staff", minAge: settings.minAge, ref: `demo-staff-${crypto.randomUUID().slice(0, 8)}`, verifiedAt: new Date().toISOString() },
    DEMO_VERIFY_DAYS * DAYS,
  );
  return { ok: true };
}

export async function signOutCustomer(): Promise<void> {
  await clearCustomerSession();
}

/* ---------- staff: "Verify customer" → magic link ---------- */

export type MagicToken = { typ: "magic"; exp: number; name: string; minAge: number; ref: string; verifiedAt: string; by: string };

/**
 * Staff checked ID in person (counter or door). Issue a sign-in link for the customer.
 * Requires a staff session. No ID number or birth date is accepted or stored.
 */
export async function issueMagicLink(input: { name: string; contact: string; where: "counter" | "door" }): Promise<{ ok: true; link: string; ref: string; expiresAt: string } | { ok: false; error: string }> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "Staff sign-in required." };
  const settings = await getSettings();
  const parsed = z
    .object({ name: Name, contact: z.string().trim().min(5, "Add an email or mobile number").max(120), where: z.enum(["counter", "door"]) })
    .strict()
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ref = `staff-${parsed.data.where}-${crypto.randomUUID().slice(0, 8)}`;
  const verifiedAt = new Date().toISOString();
  // Demo: link valid 7 days so it can be tapped from the outbox later. Phase 2: 15 minutes, single use.
  const token = await sign<MagicToken>(
    { typ: "magic", exp: Math.floor(Date.now() / 1000) + 7 * DAYS, name: parsed.data.name, minAge: settings.minAge, ref, verifiedAt, by: staff.name },
    cookieSecret(),
  );
  const expires = new Date();
  expires.setMonth(expires.getMonth() + STAFF_REVERIFY_MONTHS);
  return { ok: true, link: `/verify/link?t=${encodeURIComponent(token)}`, ref, expiresAt: expires.toISOString() };
}
