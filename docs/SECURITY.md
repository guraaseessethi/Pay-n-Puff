# Security

## Phase 1 (in this repo)

- **Headers** (`proxy.ts`): CSP with a per-request nonce and `strict-dynamic` (no inline or third-party scripts; `frame-ancestors 'none'`; `connect-src 'self'`), HSTS (2 years, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, and `Permissions-Policy` with `camera=(self)` only on `/verify` and `/driver` (everything else `camera=()`; microphone, geolocation, payment off). `X-Robots-Tag: noindex` and `Cache-Control: private, no-store` on `/shelf`, `/admin`, `/driver`. `style-src` allows inline style attributes (React `style={}`); no remote styles or fonts are loaded (fonts are self-hosted by `next/font`).
- **Cookies**: HMAC-SHA256-signed tokens with a purpose (`typ`) and expiry; httpOnly, SameSite=Lax, Secure in production. A token for one purpose (e.g. a magic link) is never accepted as another (e.g. a session). Tampering is tested.
- **Secret**: `VERIFY_COOKIE_SECRET` (32+ chars) is required in production; the app refuses to sign or verify without it. `.env.example` only; no secrets committed. A fixed dev-only value is used in `pnpm dev` and tests.
- **Server-side checks** in every server action: verified session for orders; staff session for ID checks, magic links and quotes; owner for settings and wholesale. zod validation everywhere, `.strict()` schemas reject extra fields (an ID number or DOB can't sneak in). Prices always come from the server catalogue.
- **No product data** in public HTML/JS/RSC (tested). Catalogue module is `server-only`.
- **No real personal data.** Sample names are obviously sample. Demo state stays in the browser.
- **Open-redirect safe**: the age pop-up's return path must be same-site.

Known demo-only weaknesses (removed in Phase 2): anyone can pick a staff role; the "Demo: continue as a verified adult" shortcut and DemoProvider always approve; demo magic links last 7 days; settings are per browser; wholesale registration status comes from the browser.

## Phase 2 plan

- Staff auth with **TOTP MFA** for owner and counter; drivers get short, device-bound sessions that can be revoked instantly.
- **RLS on every table**; service-role key server-only; separate Supabase projects for preview and production.
- Verification webhooks: signatures checked; verification tied to the customer record; re-verify every 30 days for provider checks, 12 months for staff checks; delivery name must match the verified name.
- Magic links: 15 minutes, single use, bound to the customer record.
- zod validation, rate limiting, Cloudflare Turnstile on public forms; order limits per verified customer per night.
- CSP with nonces (kept), HSTS (kept), Dependabot, branch protection on `main`, required CI.
- Privacy: PIPEDA-friendly policy stating exactly what is kept; addresses and logs have retention limits; delete-on-request.
- Backups: nightly encrypted `pg_dump` to Cloudflare R2; restore tested quarterly.

**Honest note for the client:** no system is unbreachable. This one stores very little (no ID numbers, birth dates or card data), limits what each account can see, and can be restored from backup in hours.
