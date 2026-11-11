"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearCustomerSession, clearStaffSession, getSettings, getStaffSession, resetSettings, saveSettings, setStaffSession } from "@/lib/auth/session";
import { evaluateIdCheck } from "@/lib/compliance/idCheck";
import { validateQuote, wholesaleUnitCents } from "@/lib/compliance/wholesaleRules";
import { seedProducts } from "@/lib/data/mock/seed.server";
import { IdCheckInput, RetailerTypeSchema, type StaffRole } from "@/lib/domain/types";
import { Settings } from "@/lib/settings/schema";

/* ---------- demo role picker ---------- */

const ROLE_NAMES: Record<StaffRole, string[]> = { owner: ["Owner"], counter: ["Counter 2"], driver: ["Driver 1", "Driver 2"] };

export async function pickRole(role: StaffRole, name?: string): Promise<void> {
  const allowed = ROLE_NAMES[role];
  if (!allowed) throw new Error("Unknown role");
  const who = name && allowed.includes(name) ? name : allowed[0];
  await setStaffSession(role, who);
  redirect(role === "driver" ? "/driver" : "/admin/today");
}

export async function signOutStaff(): Promise<void> {
  await clearStaffSession();
  redirect("/admin");
}

/* ---------- settings (owner only) ---------- */

export async function updateSettings(next: unknown): Promise<{ ok: true; settings: Settings; notes: string[] } | { ok: false; error: string }> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "owner") return { ok: false, error: "Only the owner can change settings." };
  const parsed = Settings.safeParse(next);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(".")}: ${i.message}` };
  }
  const prev = await getSettings();
  const s = parsed.data;
  const notes: string[] = [];
  if (s.ageGateMode === "self_declare" && prev.ageGateMode !== "self_declare") {
    s.selfDeclareAck = { by: staff.name, at: new Date().toISOString() };
    notes.push(`${staff.name} switched the age gate to self-declare (highest legal risk).`);
  } else if (s.ageGateMode !== "self_declare") {
    s.selfDeclareAck = null;
  } else {
    s.selfDeclareAck = prev.selfDeclareAck;
  }
  if (s.ageGateMode !== prev.ageGateMode) notes.push(`Age gate: ${prev.ageGateMode} → ${s.ageGateMode}`);
  if (s.deliveryEnabled !== prev.deliveryEnabled) notes.push(`Delivery ${s.deliveryEnabled ? "on" : "off"}`);
  if (s.reservationsEnabled !== prev.reservationsEnabled) notes.push(`Online holds ${s.reservationsEnabled ? "on" : "off"}`);
  if (s.minAge !== prev.minAge) notes.push(`Minimum age ${prev.minAge} → ${s.minAge}`);
  await saveSettings(s);
  return { ok: true, settings: s, notes };
}

/** "Reset demo data": settings back to defaults and every demo cookie cleared. The browser clears its own store. */
export async function resetDemo(): Promise<void> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "owner") throw new Error("Owner only");
  await resetSettings();
  await clearCustomerSession();
}

/* ---------- ID checks: the server is the judge ---------- */

/**
 * Validate a counter or door check and return the decision. The client stores it (Phase 1);
 * Phase 2 inserts into the append-only `id_checks` table here. Rejects any extra field (e.g. an ID number or DOB).
 */
export async function judgeIdCheck(raw: unknown): Promise<{ ok: true; result: "Pass" | "Refused"; reason?: string } | { ok: false; error: string }> {
  const staff = await getStaffSession();
  if (!staff) return { ok: false, error: "Staff sign-in required." };
  const parsed = IdCheckInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Only ID type, age in years and name match are recorded." };
  if (staff.role === "driver" && parsed.data.where !== "door") return { ok: false, error: "Drivers record door checks only." };
  const settings = await getSettings();
  const d = evaluateIdCheck(parsed.data, settings.minAge);
  return { ok: true, result: d.result, reason: d.reason };
}

/* ---------- wholesale quotes (owner only) ---------- */

const QuoteInput = z
  .object({
    retailer: z.object({
      type: RetailerTypeSchema,
      registrationStatus: z.enum(["Unchecked", "Verified", "Failed"]),
      registrationCheck: z.object({ method: z.string(), checkedAt: z.string(), by: z.string(), note: z.string().optional() }).nullable(),
    }),
    marginPct: z.number().min(0).max(100),
    lines: z.array(z.object({ sku: z.string(), qty: z.number().int().min(1).max(10000) })).min(1).max(50),
  })
  .strict();

export async function priceQuote(raw: unknown): Promise<
  { ok: true; lines: { sku: string; label: string; qty: number; unitCents: number }[]; totalCents: number } | { ok: false; error: string }
> {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "owner") return { ok: false, error: "Only the owner can quote wholesale." };
  const parsed = QuoteInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const catalogue = seedProducts();
  const lines = parsed.data.lines.map((l) => {
    const p = catalogue.find((c) => c.sku === l.sku);
    return { sku: l.sku, label: p ? `${p.brand} ${p.name}` : l.sku, qty: l.qty, unitCents: p ? wholesaleUnitCents(p.costCents, parsed.data.marginPct) : 0 };
  });
  try {
    validateQuote(parsed.data.retailer, lines, catalogue);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  return { ok: true, lines, totalCents: lines.reduce((s, l) => s + l.unitCents * l.qty, 0) };
}
