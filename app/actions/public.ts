"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, getSettings, setCustomerSession } from "@/lib/auth/session";
import { DEMO_VERIFY_DAYS } from "@/lib/compliance/policy";
import { WholesaleRequestInput } from "@/lib/domain/types";

/** "Are you 19+?" pop-up. In self_declare mode a "yes" also unlocks the shelf (owner's risk, logged in Settings). */
export async function confirmAge(): Promise<{ ok: true; unlocked: boolean }> {
  const settings = await getSettings();
  (await cookies()).set(COOKIE.ageOk, "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, httpOnly: true, secure: process.env.NODE_ENV === "production" });
  if (settings.ageGateMode === "self_declare") {
    await setCustomerSession(
      { name: "Self-declared visitor", method: "self_declare", minAge: settings.minAge, ref: "self-declare", verifiedAt: new Date().toISOString() },
      60 * 60 * 24 * DEMO_VERIFY_DAYS,
    );
    return { ok: true, unlocked: true };
  }
  return { ok: true, unlocked: false };
}

/** Form version of confirmAge: works before the page's JavaScript loads (progressive enhancement). */
export async function confirmAgeForm(formData: FormData): Promise<void> {
  await confirmAge();
  const back = String(formData.get("back") ?? "/");
  // Same-site paths only: no open redirects.
  redirect(back.startsWith("/") && !back.startsWith("//") && !back.includes("\\") ? back : "/");
}

export type WholesaleResult = { ok: true; data: WholesaleRequestInput } | { ok: false; errors: Record<string, string> };

/** Public wholesale form. Validated on the server; no product list or prices are ever returned. */
export async function submitWholesale(raw: unknown): Promise<WholesaleResult> {
  const parsed = WholesaleRequestInput.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      errors[k] ??= issue.message;
    }
    return { ok: false, errors };
  }
  // Phase 2: insert into `retailers` + `wholesale_requests`, notify the owner. Phase 1: the browser stores it.
  return { ok: true, data: parsed.data };
}
