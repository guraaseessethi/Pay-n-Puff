import { NextResponse, type NextRequest } from "next/server";
import { setCustomerSession } from "@/lib/auth/session";
import { cookieSecret, verify } from "@/lib/auth/token";
import { DEMO_VERIFY_DAYS } from "@/lib/compliance/policy";
import type { MagicToken } from "@/app/actions/verify";

/** Magic sign-in link from a staff ID check. Sets the signed customer cookie and goes to the shelf. */
export async function GET(req: NextRequest) {
  const t = await verify<MagicToken>(req.nextUrl.searchParams.get("t"), "magic", cookieSecret());
  if (!t) return NextResponse.redirect(new URL("/verify?link=expired", req.url));
  await setCustomerSession({ name: t.name, method: "staff", minAge: t.minAge, ref: t.ref, verifiedAt: t.verifiedAt }, DEMO_VERIFY_DAYS * 24 * 60 * 60);
  const res = NextResponse.redirect(new URL("/shelf", req.url));
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
