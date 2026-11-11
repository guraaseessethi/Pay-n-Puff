# Architecture

## Phase 1 (this repo): clickable mockup

Next.js 16 (App Router, TypeScript strict), CSS Modules + a small global stylesheet ported from the approved concept, no UI kit. Sample data only, structured so Phase 2 swaps in real services without touching the UI.

```
app/
  (public)/          home, visit, rules, delivery, wholesale, verify (+ verify/link), shelf (verified only)
  (admin)/admin/     role picker; (staff)/ today, checkout, flights, inventory, wholesale*, staff, reports*, compliance, settings*   (* owner only)
  (driver)/driver/   run list, [code] door check (phone-first, installable PWA)
  actions/           server actions: public, verify, order, staff
  manifest.ts robots.ts sitemap.ts
proxy.ts             CSP nonce + security headers + noindex + ?review=1   (Next 16's name for middleware)
lib/
  domain/types.ts    Product, Order, Hold, Sale, IdCheck, VerifiedCustomer, Retailer, WholesaleRequest, … + zod
  compliance/        policy.ts (MIN_AGE, NICOTINE_CAP_MG_ML, FLAVOUR_POLICY, DELIVERY_ENABLED, RESERVATIONS_ENABLED, PROMOTIONS_ENABLED),
                     flags.ts, sellable.ts, ageGate.ts, idCheck.ts, wholesaleRules.ts
  delivery/          zones.ts (FSA allow-list, fee, minimum), status.ts (Booked → Boarding → In flight → At the door → Landed | Returned)
  hours/             hours.ts ("25:00" = 1 am next day, America/Toronto)
  auth/              token.ts (HMAC-signed tokens), session.ts (customer, staff, settings cookies)
  settings/          schema.ts (zod) + defaults
  data/              repository.ts (interface), mock/MockRepository.ts (localStorage), mock/seed.server.ts (server-only catalogue), index.ts (getRepository)
  verification/      provider.ts (AgeVerificationProvider), demo.ts (DemoProvider, Phase 1 only)
  money.ts           integer cents, tax-in → pre-tax + 13% HST
components/          public/, admin/, driver/, ui/
tests/unit           Vitest: compliance, hours, zones, money, wholesale, repository, tokens
tests/e2e            Playwright: public pages + axe, no-leak, full flow, roles, screenshots
```

### How the demo hangs together

- **Server decides access.** The verified-customer cookie is an HMAC-signed, httpOnly token (`pnp_verified`) carrying name, method, age band and expiry. `/shelf` and `placeOrder` verify it on the server before loading the catalogue. Staff areas use a signed `pnp_staff` cookie from the demo role picker.
- **Catalogue is server-only.** `seed.server.ts` imports `server-only`. Verified pages receive sellable products as props (no cost or supplier); the owner's back office receives everything; the counter role gets costs zeroed; drivers get no catalogue.
- **Demo state is per browser.** Orders, holds, sales, ID checks, wholesale requests, outbox and audit live in `localStorage` via `MockRepository`, so one phone can go shop → back office → driver and see the same order move. It isn't shared between devices. "Reset demo data" in Settings clears it.
- **Settings are a signed cookie** in the demo, so changing the age-gate mode or switching delivery off changes what the server renders, for that browser.
- **The server judges ID checks** (`judgeIdCheck`) with the same `evaluateIdCheck` used by the repository and tests; the client then records the result.
- **Driver offline-ish:** if there's no signal, the door check is queued on the phone and synced (server-validated, then applied) when back online. The service worker keeps `/driver` pages and assets available.

### Rendering

Every page is dynamic (the root layout reads request headers) so each response gets a fresh CSP nonce. Server Components by default; client components only where there's interaction (board clock, forms, shelf, back office).

## Phase 2: production (not built)

| Layer | Choice | Why |
|---|---|---|
| Web + admin + driver PWA + API | Next.js on **Vercel Pro** | Commercial use needs Pro. One codebase, no app-store fees for the driver app. |
| Database, auth, realtime | **Supabase Pro**, Canada (Central) region if available | Orders, runs, ID log; realtime updates the Flights board and driver phones. |
| Age & identity verification | **Didit** or **Veriff** behind `AgeVerificationProvider` (only if the owner picks `id_provider`) | Store only the result. |
| Transactional email | **Resend** free tier on `mail.paynpuffvapes.com` (SPF/DKIM/DMARC) | Order confirmation, sign-in links, "driver on the way". |
| SMS | **Twilio** Canadian long code | Sign-in links, "driver 5 minutes away", "order returned". Transactional only. |
| Payments | **None online.** Cash / e-Transfer on delivery, existing terminal in store | Card processors treat vape as restricted; Ontario may ban online sales. |
| Maps | Driver taps the address → phone's maps app; zone check by postal code | $0. |
| DNS, WAF, bot protection | **Cloudflare** free + Turnstile | |
| Errors & uptime | Sentry free, UptimeRobot / Better Stack free | Alerts matter at 1 am. |
| Off-site backups | Nightly encrypted `pg_dump` → Cloudflare R2 free tier | |

### Data model

`staff` (owner | counter | driver) · `products` · `product_compliance` (nicotine, stamp, flavour family, blocked reason) · `stock_movements` · `suppliers` · `customers` (verified only: name, phone, address, `verified_min_age`, `verified_at`, `verification_ref`, consents) · `orders` (pickup | delivery, recipient name, address, zone, window, payment method, status) · `order_items` · `delivery_runs` · `id_checks` (where, staff, time, ID type, age, name match, result, reason; **no ID number, no DOB; append-only**) · `retailers` (business, type, registration check method + date) · `wholesale_quotes` · `checklists` · `settings` · `message_log` · `audit_log`.

Constraints in the database, not just the app:
- a sale or delivery can't complete without a linked passing `id_checks` row;
- a non-sellable product can't be on any order or quote (check against `product_compliance`);
- wholesale quote lines are checked against the buyer type;
- `id_checks` is insert-only (no UPDATE/DELETE grants, trigger guard);
- customer addresses deleted or anonymised after 12 months of inactivity (scheduled job).

### Roles (RLS on every table)

| Role | Access |
|---|---|
| Owner | Everything, costs, wholesale, reports, exports, settings |
| Counter | Checkout, holds, deliveries board, stock counts, checklist |
| Driver | Only their assigned runs, only while active; door ID check form |

### Exit plan

All accounts in the owner's name with Kooht as collaborator; handover = remove Kooht. Standard Postgres + SQL migrations + Next.js, movable to any host. `scripts/export-all.ts` (Phase 2) produces a full CSV + JSON export.

### Shared code (for Kooht)

Vape Mantra and Pay N' Puff need the same compliance core (age gate, `sellable()`, ID log, flags). Extract `lib/compliance` and `lib/verification` into a private package so fixes and law changes land in both client sites at once. They have no Next.js or storage dependencies, so they lift out as-is.
