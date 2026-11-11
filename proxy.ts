import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page:
 *  - per-request CSP nonce (Next applies it to its own scripts),
 *  - security headers,
 *  - camera allowed only on /verify and /driver,
 *  - noindex on verified/staff areas,
 *  - ?review=1 → [verify] tags on (remembered in a cookie, forwarded as a request header).
 *
 * Proxy is NOT the access control. Every verified-only page and server action checks the
 * signed cookie itself (lib/auth/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (React style={}) need this; no remote styles are allowed.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const reviewParam = searchParams.get("review");
  const review = reviewParam === "1" || (reviewParam !== "0" && request.cookies.get("pnp_review")?.value === "1");

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", csp);
  reqHeaders.set("x-pnp-review", review ? "1" : "0");
  reqHeaders.set("x-pnp-path", pathname);

  const res = NextResponse.next({ request: { headers: reqHeaders } });

  const cameraOk = pathname === "/verify" || pathname.startsWith("/verify/") || pathname === "/driver" || pathname.startsWith("/driver/");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    `camera=${cameraOk ? "(self)" : "()"}, microphone=(), geolocation=(), payment=(), usb=()`,
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (/^\/(shelf|admin|driver|verify\/link)(\/|$)/.test(pathname)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "private, no-store");
  }

  if (reviewParam === "1") res.cookies.set("pnp_review", "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 8 });
  if (reviewParam === "0") res.cookies.delete("pnp_review");

  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icons/|images/|icon.png|apple-icon.png|sw.js|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
