# Compliance

Kooht Studio isn't a law firm. The owner should review this site with Simcoe Muskoka District Health Unit, and confirm house-brand and wholesale obligations with the CRA and Health Canada, before launch.

This file explains what the site does to stay inside the rules, where each rule lives in the code, and what the owner still has to settle. It's written so the owner can hand it to the health unit.

## What the public can see

Before a real age-and-identity check, the site shows only: name, address, hours, email, directions, store rules, delivery rules in plain words, the wholesale consultation form (no product list), the Health Canada quit-support link, and the verify/sign-in button.

- Product names, prices, flavours and images are **never sent** to an unverified browser. The catalogue lives in `lib/data/mock/seed.server.ts`, which is marked `server-only` and can't be bundled into client JavaScript. `/shelf` checks the signed cookie on the server before loading anything (`app/(public)/shelf/page.tsx`).
- This is tested: `tests/e2e/no-leak.spec.ts` visits every public page, records every HTML, JS and RSC response, tries `/shelf` with and without a forged cookie, and fails if any product name or price appears.
- `Store` JSON-LD has address, email and hours only. No products, offers or prices. `/shelf`, `/admin` and `/driver` are `noindex` and excluded from the sitemap.
- No reviews, testimonials, people, characters, lifestyle images or flavour imagery. The cartoon lettering stays inside the logo.

## Age gate modes (`AGE_GATE_MODE`, admin → Settings)

| Mode | What it does | Risk |
|---|---|---|
| `info_only` | Yes/no pop-up. No online shelf or ordering. | Lowest |
| `staff_verified` (default) | Staff check photo ID once (counter, or driver on the first delivery), then send a sign-in link. Re-check every 12 months. | Low, $0 |
| `id_provider` | Online ID + selfie (Didit/Veriff). | Low, ~$0.33–0.80 per check |
| `self_declare` | Yes/no pop-up unlocks the shelf. | **Highest** |

`self_declare` stays available because the owner asked for the choice, but admin shows a permanent warning while it's on: *"Health Canada says a checkbox or birthday isn't enough to show vaping products online, and Ontario requires a process to verify a buyer's age before an online sale. You're choosing this at your own risk."* Who turned it on and when is recorded (`selfDeclareAck` in settings + the audit log).

In **every** mode the counter check on every sale and the door check on every delivery still happen (`lib/compliance/ageGate.ts → requiresInPersonIdCheck`).

Code: `lib/compliance/ageGate.ts` (`canViewShelf`, `canOrderOnline`), tests in `tests/unit/compliance.test.ts`.

## Minimum age (`MIN_AGE`)

One setting, default 19. Ontario Bill 125 would raise it to 21; switch it in Settings or with the `MIN_AGE` env var. The pop-up, strip, rules, door/counter checks and sessions all read it. A session verified at 19 stops working if the minimum becomes 21.

## Health warnings

Every verified-only page shows a Health Canada warning bar (`components/ui/HealthWarning.tsx`), rotating the two warnings from the concept:

- "WARNING: Vaping products contain nicotine, a highly addictive chemical."
- "WARNING: Vaping products release chemicals that may harm your health."

**Before launch, confirm against the Vaping Products Promotion Regulations (SOR/2020-143) and Health Canada's current guidance.** Our reading, to check with the health unit: the nicotine warning is the one required when nicotine products are shown, the second wording is for products without nicotine, and the warning has to take up a set share of the promotion's area (20% for most promotions). If so, the shelf should show the nicotine warning permanently at the required size instead of rotating. Record the source and date here once confirmed:

- Source: _to fill in_
- Confirmed by / date: _to fill in_

## Delivery (Smoke-Free Ontario Act, 2017: remote sales)

- Age is verified **before** the sale: only a verified session can place an order (`app/actions/order.ts → placeOrder` re-checks the cookie, flags, sellable products and zone on the server; prices come from the server, never the browser).
- The **recipient is the verified customer**. It isn't a form field; the server copies the verified name onto the order.
- The driver checks photo ID at the door against that name. The door form records **ID type, age in years, name matches yes/no, result**. Photo ID is required at the door every time; "clearly 25+" isn't accepted there.
- No ID, under age, wrong person, or any staff refusal = no handoff. The order goes to **Returned** and the stock is put back (once).
- Every door check goes in the same log as counter checks.
- Bags are labelled "Must be received by a person 19 years of age or older".
- Delivery area is a postal-code (FSA) allow-list with a fee and minimum, in Settings (`lib/delivery/zones.ts`).

## Feature flags for Bill 125

`DELIVERY_ENABLED` and `RESERVATIONS_ENABLED` (env defaults, overridable in Settings). Bill 125 as introduced would ban selling or offering to sell vapour products online. If it passes, switch both off: the shelf stops taking orders, delivery copy changes to "paused", and the site becomes store info plus the compliance back office. No rebuild.

## Never sellable

`lib/compliance/flags.ts` and `sellable.ts` (same logic as the concept's `flag()`/`sellable()`):

- nicotine over **20 mg/mL** (`NICOTINE_CAP_MG_ML`);
- **Canada-only stamp** where the Ontario stamp is required;
- **unstamped** liquid products;
- a flavour family not allowed for the store type (`FLAVOUR_POLICY`).

The same function hides products from the shelf (they're never sent), blocks them at the till, flags them in inventory and on intake, and blocks them from wholesale quotes. The mock repository refuses them too, mirroring the Phase 2 database constraint.

## Wholesale

`lib/compliance/wholesaleRules.ts`:

- Quote only retailers whose registration is **Verified**, and only with a record of **how** it was checked (method, who, when). Every saved quote stores that record.
- **Convenience and other non-specialty retailers** can only be quoted tobacco, mint and menthol (and bare hardware), at 20 mg/mL or less. Flavoured stock is specialty-vape-store only.
- The quote builder only lists products the buyer can legally sell, shows why the others are missing, and the server re-validates the whole quote (`app/actions/staff.ts → priceQuote`).

## Promotions (`PROMOTIONS_ENABLED = false`)

No loyalty rewards, volume discounts to consumers, sticker trade-ins or gifts on the public or verified site. The current site runs loyalty-style deals (6th purchase, sticker credit). The Tobacco and Vaping Products Act restricts promotion of vaping products and the Smoke-Free Ontario Act restricts promotions at retail; the owner must confirm with Simcoe Muskoka District Health Unit what, if anything, is allowed. The flag is hard-wired off in `lib/compliance/policy.ts` and shown locked in Settings. Changing it needs a code change and a note here.

## Personal information

- **Never stored:** ID numbers, full dates of birth, ID photos, selfies. The forms don't have fields for them, and the ID-check schema is `.strict()`, so an extra field such as a DOB is rejected (tested).
- **Verified customer:** verified yes/no, age band passed, timestamp, provider/staff reference, expiry; name and contact for the sign-in link.
- **At the door / counter:** ID type, age in years, name match, result, reason, staff, time.
- Staff are shown a "born on or before" date for the minimum age, so they can read the age off the ID without typing the birth date.
- Drivers see first name + initial, address, items, total and payment method. No customer history.

## Opening/closing checklist (admin → Compliance)

Age and health warning signs; nothing visible from Dunlop St; outside sign shows the name only; Ontario stamp on all shelf stock; delivery bags labelled; two staff after 10 pm Fri/Sat; testing rules posted (two people, own device or disposable mouthpiece); specialty vape store registration on file.

## Owner must settle before launch (these block launch)

1. **House brand "Pay N' Puff 30K".** Under the federal excise framework, anyone who manufactures (including filling or packaging) vaping products, or imports them for stamping, needs a CRA vaping product licence, and unstamped products can't be sold or possessed outside licensed channels. Confirm who makes, packages and stamps it, and who holds the licence. Health Canada labelling and reporting rules also apply to manufacturers and importers.
2. **Wholesale.** Confirm what licences or registrations apply to selling to other retailers, and keep the flavour/nicotine rules per buyer type.
3. **Promotions.** Confirm with the health unit before any loyalty, rewards or trade-in offers.
4. **Delivery.** Confirm the delivery area and hours with the health unit, train drivers, and write the door-check procedure down.
5. **Health warning** wording, size and placement (above).
6. **Existing channels.** Take down the "Younginz" wording, "luxury vape destination", the speed claim in the old logo, and pick one price for the 30K.
