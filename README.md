# Pay N' Puff Vapes: Phase 1 mockup

A clickable mockup of the new site and back office for **Pay N' Puff Vapes**, 15 Dunlop St E, Barrie. Built by Kooht Studio. Sample data only.

The approved design is `reference/pay-n-puff-concept.html` (not shipped). Compliance is the point of this rebuild: read **[docs/COMPLIANCE.md](docs/COMPLIANCE.md)** first.

## Tap-through (on a phone)

1. Open the site → answer the 19+ pop-up.
2. **Shop** → "Demo: continue as a verified adult" (the default mode is staff-verified sign-in; the online ID check demo is on the same page).
3. Add items → **Delivery** → postal code `L4M 1A2` (try `L3Y 1A1` to see an out-of-zone refusal) → Book.
4. Footer → **Staff login** → **Owner** → **Deliveries**: assign Driver 1 → Take off.
5. **Switch role** → **Driver 1** → At the door → ID type, age, name matches → hand over.
6. Back as Owner → **Compliance**: the door check is in the log. Try "Don't hand over" on another order to see it return and restock.

Add `?review=1` to any URL to see every `[verify]` item (list in [docs/CONTENT_TODO.md](docs/CONTENT_TODO.md)).

## Develop

```bash
pnpm install
cp .env.example .env.local   # optional in dev; set VERIFY_COOKIE_SECRET for production
pnpm dev
```

| Command | What |
|---|---|
| `pnpm typecheck` / `pnpm lint` | TypeScript strict, ESLint (zero warnings) |
| `pnpm test` | Vitest unit tests (compliance, hours past midnight, zones, tax-in pricing, wholesale rules, repository, tokens) |
| `pnpm build && pnpm e2e` | Playwright smoke + axe on every public page + no-leak + full flow |
| `pnpm build && pnpm screenshots` | Screenshots at 360/768/1280 → `docs/screenshots/` |

## Docs

[ARCHITECTURE](docs/ARCHITECTURE.md) · [COMPLIANCE](docs/COMPLIANCE.md) · [SECURITY](docs/SECURITY.md) · [COSTS](docs/COSTS.md) · [MIGRATION](docs/MIGRATION.md) · [CONTENT_TODO](docs/CONTENT_TODO.md) · [image slots](public/images/README.md)

## Deploy (Vercel)

Import the repo in Vercel, set `VERIFY_COOKIE_SECRET` (e.g. `openssl rand -base64 48`), `NEXT_PUBLIC_DATA_SOURCE=mock`, and `NEXT_PUBLIC_SITE_URL` to the preview URL. Don't attach `paynpuffvapes.com` until the owner approves the cut-over (docs/MIGRATION.md).
