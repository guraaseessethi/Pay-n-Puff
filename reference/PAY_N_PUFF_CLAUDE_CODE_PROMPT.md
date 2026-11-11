# Pay N' Puff Vapes — Claude Code Build Prompt

> How to use: create an empty folder, put `pay-n-puff-concept.html` inside `reference/`, open Claude Code in that folder, and paste everything below the line. Phase 1 (mockup) is the job now. Phase 2 is written into the repo as documentation so the mockup is shaped correctly, but it is NOT built yet.

---

## Who you are working for

You are building for **Kooht Studio** (Lucky), a small web studio in Barrie, Ontario. The client is **Pay N' Puff Vapes**, a specialty vape store at **15 Dunlop St E, Barrie, ON L4M 1A2** (downtown, beside 5 Points Barber), open late (till 1 am Friday and Saturday). It started as a **delivery service** ("We'll fly to you!") and now also has a counter. It also offers **wholesale consultations** to other retailers. Email paynpuffvapes@gmail.com.

Their current site (paynpuffvapes.com, Squarespace) shows products and prices to anyone, with no real age verification, runs loyalty-style promos on nicotine products, has a wholesale link that goes to an empty page, a "vapecave.ca" leftover, no address or hours, and prices from 2023–2024. Our version replaces it, and fixing the compliance gaps is the main reason it's worth doing.

The approved concept is `reference/pay-n-puff-concept.html`: public site (19+ strip, live "departures board" open/closed clock, walk-in vs delivery, store rules, Health Canada quit link, wholesale consultation form, visit), a real-ID verification gate, a verified-only shelf with a "boarding pass" bag for pickup or delivery, and a back office (Today, Checkout, Deliveries/"Flights", Inventory, Wholesale, Staff late shifts, Reports, Compliance). **It is the design source of truth**: their logo colours (hot pink `#e8429f`, sky cyan `#17c4ee`, magenta lettering, white plane on a dashed flight path), airport departures-board styling, Chewy (logo only), Barlow Condensed, Figtree, DM Mono. Light mode only. Read the whole file before writing code.

## This is a regulated product with delivery. Compliance is the product.

1. **No product names, images, prices or flavours before a real age-and-identity check.** Federal rules (Tobacco and Vaping Products Act + Vaping Products Promotion Regulations) prohibit promoting vaping products where young people can see them; a checkbox or self-declared birthday isn't enough. Public pages show only: name, address, hours, phone/email, directions, store rules, delivery rules in plain words, wholesale form (no product list), quit-support link, verify button.
2. **Health warning** on every verified-only page and any promotion. Rotate the two warnings in the concept. Confirm wording/size against Health Canada's current list before Phase 2 launch; record source in `docs/COMPLIANCE.md`.
3. **19+** everywhere: to see the shelf, to order, to receive. Make it one setting `MIN_AGE` (Ontario Bill 125 would raise it to 21 if passed).
4. **Delivery rules** (Smoke-Free Ontario Act, 2017 online/remote sales): verify age before the sale, and make sure the **recipient** is 19+. Build it as: the verified customer must be the named recipient; driver checks photo ID at the door against that name; no ID or wrong person = no handoff, order returns to store; bag labelled "Must be received by a person 19+". Every door check is logged like a counter check.
5. **Delivery and reservations are feature flags** (`DELIVERY_ENABLED`, `RESERVATIONS_ENABLED`). Ontario Bill 125 as introduced would ban selling or offering to sell vapour products online; if it passes, both switch off and the site becomes info + compliance back office without a rebuild.
6. **Never sellable**: nicotine over 20 mg/mL, Canada-only stamp where an Ontario stamp is required, unstamped stock. Keep the concept's `sellable()`/`flag()` logic: blocked at the till, hidden from the shelf, flagged in inventory. `FLAVOUR_POLICY` as config.
7. **Wholesale**: quote only to verified registered retailers. If the buyer is a **convenience store or other non-specialty retailer**, the quote tool must only allow products they can legally sell (tobacco/mint/menthol flavours, ≤20 mg/mL); flavoured stock is only quotable to specialty vape stores. Every quote records how the retailer's registration was checked.
8. **No loyalty rewards, discounts-for-volume to consumers, sticker trade-ins or gifts** on the public or verified site until the owner confirms with Simcoe Muskoka District Health Unit what's allowed. Keep a disabled `PROMOTIONS_ENABLED=false` flag and say why in `docs/COMPLIANCE.md`.
9. **Never store ID numbers or full dates of birth.** Store only: verified yes/no, age band passed, timestamp, provider reference, expiry; at the door: ID type, age in years, result.
10. Public copy stays factual. The cartoon lettering stays inside the logo; no lifestyle imagery, no people, nothing youth-appealing. Keep the quit-support link.

`docs/COMPLIANCE.md` must open with: "Kooht Studio isn't a law firm. The owner should review this site with Simcoe Muskoka District Health Unit, and confirm house-brand and wholesale obligations with the CRA and Health Canada, before launch."

## Age gate modes (overrides rule 1 where they differ)

Make the gate a single setting `AGE_GATE_MODE`, chosen by the owner in admin Settings, with a plain-language risk note beside each option:

| Mode | What the visitor does | What the public can see | Running cost |
|---|---|---|---|
| `info_only` | Yes/no "Are you 19+?" pop-up | Store info only. No product names, prices or images anywhere | $0 |
| `staff_verified` **(default)** | Yes/no pop-up for info pages. To see the shelf and order delivery, a customer's ID is checked once by staff, at the counter **or by the driver on their first delivery** (first order placed by phone or in store). Then they get a login (magic link by email or SMS) | Info publicly; shelf only after login | $0 |
| `id_provider` | Online ID + selfie check (Didit/Veriff) | Info publicly; shelf after check | ~$0.33–0.80 per check |
| `self_declare` | Yes/no pop-up only | Shelf with products and prices after "Yes" | $0, **highest legal risk** |

- `self_declare` stays available but shows a persistent warning in admin: "Health Canada says a checkbox or birthday isn't enough to show vaping products online, and Ontario requires a process to verify a buyer's age before an online sale. You're choosing this at your own risk." Log who turned it on and when.
- The door ID check on every delivery and the counter check on every sale happen in every mode.
- `staff_verified` needs: a "Verify customer" action at Checkout and in the driver door-check (name + email/phone, ID checked, no ID number stored), magic-link login, re-verify every 12 months.
- Phase 2 cost table: with `staff_verified`, the ID-check line is $0.

## The goal of Phase 1

A polished clickable mockup on Vercel from a private GitHub repo that the owner can tap through on his phone: public site → demo ID check → shelf → bag → pickup or delivery → back office (order appears on the Flights board, driver does the door check, it lands in the compliance log). Plus a **driver view** that works on a phone. Sample data only, structured so Phase 2 swaps in real services.

---

## Phase 1 — build this now

### 1. Stack
- **Next.js (latest stable, App Router) + TypeScript strict**, `pnpm`.
- Port the concept's CSS custom properties into `app/globals.css`, **CSS Modules**, no UI kit. Departures-board flip styling in CSS; respect `prefers-reduced-motion`.
- Fonts via `next/font/google`: Chewy (logo only), Barlow Condensed (500–700), Figtree (400–700), DM Mono (400/500).
- `zod`, `date-fns` + `date-fns-tz` (`America/Toronto`; hours that run past midnight stored as "close at 25:00" like the concept, with tests).
- **Vitest** for compliance, hours-past-midnight, delivery zone, tax-in pricing, wholesale quote rules; **Playwright** smoke tests; `@axe-core/playwright` on every public page.

### 2. Architecture
```
app/
  (public)/            page.tsx (home), visit/, rules/, delivery/, wholesale/, verify/, shelf/ (verified only)
  (admin)/admin/       today, checkout, flights, inventory, wholesale, staff, reports, compliance, settings
  (driver)/driver/     run list, order detail, door ID check (mobile-first, installable PWA)
lib/
  domain/              types.ts (Product, Stamp, Order, DeliveryRun, Hold, IdCheck, WholesaleRequest, Retailer, Staff, Settings) + zod
  compliance/          sellable.ts, flags.ts, ageGate.ts, wholesaleRules.ts, policy.ts (MIN_AGE, FLAVOUR_POLICY, DELIVERY_ENABLED, RESERVATIONS_ENABLED, PROMOTIONS_ENABLED, NICOTINE_CAP_MG_ML=20)
  delivery/            zones.ts (postal-code FSA allow-list + minimum order + fee), status.ts (Booked → Boarding → In flight → Landed | Returned)
  hours/               hours.ts (past-midnight close, open-now, next-open)
  data/
    repository.ts      interface DataRepository
    mock/              MockRepository (sample data + localStorage)
    index.ts           getRepository() reads NEXT_PUBLIC_DATA_SOURCE=mock|supabase
  verification/
    provider.ts        interface AgeVerificationProvider { start(), getResult() }
    demo.ts            DemoProvider (Phase 1 only, clearly labelled)
components/            public/, admin/, driver/, ui/
docs/                  ARCHITECTURE.md, COMPLIANCE.md, SECURITY.md, COSTS.md, MIGRATION.md, CONTENT_TODO.md
reference/             pay-n-puff-concept.html (do not ship)
```
Rules:
- Verified-only routes (`/shelf`, ordering actions) are protected **server-side** by a signed, httpOnly, short-lived cookie. Product data must never be in HTML/JS sent to an unverified visitor.
- Money in integer cents. Prices are shown **tax-in** (as on their current site); store pre-tax + tax separately so receipts and reports are correct (13% HST).
- Driver routes only show what a driver needs: first name + initial, address, items, total, payment method. No customer history.

### 3. Content to port, and what must be verified
Port copy, store rules, delivery rules, wholesale services (fair-price review, price match/beat, market overview), visit section, product names and tax-in prices from the concept (which came from their current site).

**`docs/CONTENT_TODO.md` + `[verify]` tag in `?review=1` mode:**
- Hours (concept: Sun 12–8, Mon unconfirmed, Tue–Wed 12–9, Thu 12–10, Fri–Sat 12 pm–1 am).
- **Delivery area.** Their current site mentions Bradford, Newmarket, Sharon, Holland Landing, Aurora and London. Confirm the real zone, fee, minimum order and delivery hours; build the zone from a postal-code list in settings.
- Every product, price, nicotine level and stamp (sample stock levels).
- **The house brand "Pay N' Puff 30K".** Who makes, packages and stamps it? (See Phase 2 compliance.)
- Payment methods (current site: e-Transfer and cash; concept also shows card at counter).
- Wholesale terms and who they sell to.

### 4. Images
- Public pages: no product images. Logo, optional storefront exterior photo (name sign only), simplified map SVG (concept has one).
- Verified shelf: typographic product cards as in the concept; owner photos may be added later, verified pages only.
- Don't scrape or hotlink anything. `public/images/README.md` lists slots and sizes. Logo: owner supplies the original file; the concept's version is a stand-in.

### 5. Public site
- 19+ strip, live departures-board open/closed clock (with a plain-text equivalent for screen readers), click-to-email/call.
- "Two ways to fly": walk in or delivery, with the delivery rules spelled out.
- `/verify` runs **DemoProvider**: 3 steps (ID photo, selfie, done), labelled "Demo: no real check runs", then sets the signed cookie (30 days in demo). Alternative "Verify in store" for anyone who can't use a camera.
- `/shelf` (verified): category chips, search, stock pill, bag ("boarding pass"), **Pickup** (hold 24 h, bring photo ID, pay in store) or **Delivery** (postal-code zone check, recipient = verified name, delivery window, pay on delivery: cash or e-Transfer per settings). No online card payment.
- `/wholesale`: business name, store type (specialty vape / convenience / other), city, registration confirmation checkbox, what they're asking about, contact. No product list or prices publicly.
- Local SEO: `Store` JSON-LD with address, phone, hours only (no products, no offers), sitemap of public routes; `/shelf`, `/admin`, `/driver` are `noindex`.
- "Concept preview · sample data" ribbon.

### 6. Back office + driver mockup
- `/admin` demo role picker (Owner / Counter / Driver), labelled "Demo. Real staff login comes in the full build." Counter: no Reports, no costs, no Wholesale. Driver: redirected to `/driver`.
- **Today**: tax-in sales (counter + delivered), live deliveries, ID checks and refusals, holds, low stock, checklist.
- **Checkout**: concept behaviour; mandatory age-check panel; blocked items can't be added.
- **Flights (deliveries)**: departures board of orders; assign driver → Boarding → Take off → At the door → Landed or Returned. Returned orders restock automatically.
- **Driver view** (`/driver`, phone-first): my runs, tap address to open in the phone's maps app (no embedded map cost), "At the door" → ID check form (ID type, age, name matches order yes/no, result) → Landed or Returned with reason. Big buttons, works one-handed, works offline-ish (queues the check and syncs).
- **Inventory**: stamps, nicotine, stock vs par, blocked reasons, cost (owner only).
- **Wholesale**: requests, retailer-registration check status, quote calculator (margin slider) that enforces `wholesaleRules.ts`.
- **Staff**: late shifts, two people after 10 pm Fri/Sat, drivers.
- **Reports**: 8-week sales, sales by hour (late-night share), delivery vs counter, refusals.
- **Compliance**: one log for counter and door checks, opening/closing checklist (signs, nothing visible from Dunlop St, testing rules), blocked stock, export for health unit visits.
- **Settings**: hours, delivery zone/fee/minimum/hours, hold length, all compliance flags.
- Send actions show "Would send in the full build" and log to a demo outbox. "Reset demo data" button.

### 7. Accessibility (WCAG 2.2 AA)
- Landmarks, one `h1`, skip link, visible focus. Check hot pink and cyan on white for text contrast (likely fail at body size: use them for large text, borders, or with dark text). Chewy only in the logo.
- Departures-board animation off under `prefers-reduced-motion`; live region for status changes and toasts; modals trap focus; targets ≥ 24×24px, driver buttons ≥ 48px.
- axe: zero serious/critical issues.

### 8. Performance
- Lighthouse mobile ≥ 95 on all four categories for home. Server Components by default.

### 9. Security in the mockup
- Security headers (CSP with nonces, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy with `camera` only on `/verify` and `/driver`, `frame-ancestors 'none'`).
- `VERIFY_COOKIE_SECRET` in `.env.example` only. No real personal data. No secrets committed.

### 10. Git and deploy
1. `git init`, small logical conventional commits.
2. `gh repo create pay-n-puff --private --source=. --push`. If `gh` isn't authenticated, stop and tell me the command.
3. GitHub Actions: install → typecheck → lint → unit tests → build; Playwright on PRs.
4. Don't deploy to Vercel yourself, and **don't touch the live paynpuffvapes.com domain**. Finish with a checklist for me.

### 11. Definition of done
- [ ] Build passes, zero type/lint errors; unit, e2e and axe tests pass.
- [ ] Unverified visitor: view-source and network tab contain no product names or prices.
- [ ] Verified → shelf → delivery order → Flights board → driver door check → Landed → compliance log; and the Returned path restocks.
- [ ] Postal code outside the zone can't book delivery; blocked products never appear on shelf, till or wholesale quote; a convenience-store wholesale quote can't include flavoured stock.
- [ ] Hours past midnight show correctly at 12:30 am Saturday.
- [ ] Screenshots at 360/768/1280 saved to `docs/screenshots/`.
- [ ] `docs/` written. Pushed. Give me the repo URL and a 5-line summary of anything not done.

---

## Phase 2 — DO NOT BUILD YET. Write into `docs/ARCHITECTURE.md`, `docs/COMPLIANCE.md`, `docs/SECURITY.md`, `docs/MIGRATION.md`, `docs/COSTS.md`.

### Target production stack
| Layer | Choice | Why |
|---|---|---|
| Web + admin + driver PWA + API | Next.js on **Vercel Pro** | Commercial use needs Pro. One codebase, no app-store fees for the driver app. |
| Database, auth, realtime | **Supabase Pro**, Canada (Central) region if available | Orders, runs, ID log; realtime updates the Flights board and driver phones. |
| Age & identity verification | **Didit** or **Veriff** (document + selfie liveness) behind `AgeVerificationProvider` | Required for the shelf and delivery. Store only the result. |
| Transactional email | **Resend** free tier on `mail.paynpuffvapes.com` (SPF/DKIM/DMARC) | Order confirmation, "driver on the way". |
| SMS | **Twilio** Canadian long code | "Driver is 5 minutes away", "order returned". Transactional only, no promos. |
| Payments | **None online.** Cash / e-Transfer on delivery, existing terminal in store | Card processors treat vape as restricted (Stripe lists e-cigarettes as restricted) and Ontario may ban online sales. |
| Maps | Driver taps address → opens phone's maps app. Zone check by postal code | $0 instead of a paid maps API. |
| DNS, WAF, bot protection | **Cloudflare** free + Turnstile | |
| Errors & uptime | Sentry free, UptimeRobot/Better Stack free | Alerts matter at 1 am. |
| Off-site backups | Nightly encrypted `pg_dump` → Cloudflare R2 free tier | |

### Compliance items the owner must settle before launch (not code, but they block launch)
- **House brand**: under the federal excise framework, anyone who manufactures (including filling or packaging) vaping products, or imports them for stamping, needs a CRA vaping product licence, and unstamped products can't be sold or possessed outside licensed channels. If "Pay N' Puff 30K" is made or packaged for them, confirm who holds the licence and stamps it. Health Canada labelling/reporting rules also apply to manufacturers and importers.
- **Wholesale**: confirm what licences or registrations apply to selling to other retailers, and keep the flavour/nicotine rules per buyer type.
- **Promotions**: confirm with the health unit before any loyalty, rewards or trade-in offers.
- **Delivery**: confirm delivery area and hours with the health unit; train drivers; written door-check procedure.

### Data model
`staff` (roles: owner, counter, driver), `products`, `product_compliance` (nicotine, stamp, flavour family, blocked reason), `stock_movements`, `suppliers`, `customers` (verified only: name, phone, address, `verified_min_age`, `verified_at`, `verification_ref`, consents), `orders` (pickup | delivery, recipient name, address, zone, window, payment method, status), `order_items`, `delivery_runs`, `id_checks` (where: counter | door, staff, time, ID type, age, name match, result, reason; **no ID number, no DOB**; append-only), `retailers` (wholesale: business, type, registration check method + date), `wholesale_quotes`, `checklists`, `settings`, `message_log`, `audit_log`.
- DB constraints: a sale or delivery can't complete without a linked `id_checks` pass; a non-sellable product can't be on any order or quote; wholesale quote lines checked against buyer type.
- Customer addresses deleted or anonymised after a set period (e.g. 12 months of inactivity).

### Roles (RLS-enforced)
| Role | Access |
|---|---|
| Owner | Everything, costs, wholesale, reports, exports, settings |
| Counter | Checkout, holds, deliveries board, stock counts, checklist |
| Driver | Only their assigned runs, only while active; door ID check form |

### Security plan
- Staff auth with **TOTP MFA** for owner and counter; drivers get short sessions, device-bound, revocable instantly.
- RLS on every table; service-role key server-only; separate Supabase projects for preview and production.
- Verification webhook signatures checked; verification tied to the customer record; re-verify every 30 days; delivery name must match verified name.
- zod validation, rate limiting, Turnstile; order limits per verified customer per night to stop abuse.
- CSP with nonces, HSTS, Dependabot, branch protection.
- Privacy: PIPEDA-friendly policy stating exactly what is kept; addresses and logs have retention limits; delete-on-request.
- Honest note for the client: no system is unbreachable. This one stores very little, limits each account, and restores from backup in hours.

### Migration from Squarespace
1. Confirm who controls `paynpuffvapes.com` and its DNS; get it into the owner's account.
2. Export all DNS records first (email may run through it, though they use Gmail).
3. 301-redirect old Squarespace URLs (`/new-page`, product pages, blog posts) to the new public pages, without sending visitors to product pages.
4. Launch on a preview, switch DNS on a quiet weekday afternoon (not Fri/Sat night), cancel Squarespace after 2 weeks.

### Exit plan
- All accounts in the owner's name, Kooht as collaborator; handover = remove Kooht.
- Standard Postgres + SQL migrations + Next.js; movable to any host.
- `scripts/export-all.ts` for a full CSV + JSON export.

### Shared code note (for Kooht)
Vape Mantra and Pay N' Puff need the same compliance core (age gate, `sellable()`, ID log, flags). Extract `lib/compliance` and `lib/verification` into a private package so fixes and law changes land in both client sites at once.
