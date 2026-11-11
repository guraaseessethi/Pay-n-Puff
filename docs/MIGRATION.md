# Migration

## From the mockup to Phase 2

1. Create Supabase projects (preview + production, Canada region if available). Write SQL migrations for the data model in `ARCHITECTURE.md`, with RLS and the constraints listed there.
2. Implement `SupabaseRepository` against `lib/data/repository.ts`. Point `getRepository()` at it when `NEXT_PUBLIC_DATA_SOURCE=supabase`. Move server-side reads (catalogue, settings, sessions) from the seed/cookies to the database.
3. Replace the demo role picker with Supabase Auth (TOTP for owner/counter, device-bound driver sessions).
4. Remove the demo shortcuts: `demoStaffVerifiedSignIn`, `DemoProvider` (it already refuses to run when the data source is `supabase`), the demo outbox links, the "Concept preview" ribbon.
5. Wire Resend + Twilio behind the outbox (`send()`), Turnstile on the wholesale form, Sentry.
6. If the owner picks `id_provider`, add `DiditProvider` or `VeriffProvider` implementing `AgeVerificationProvider`, with webhook signature checks.
7. Load the real product list (`docs/CONTENT_TODO.md`).

## From Squarespace

1. Confirm who controls `paynpuffvapes.com` and its DNS; get it into the owner's account.
2. **Export all DNS records first** (email may run through it, though they use Gmail).
3. 301-redirect old Squarespace URLs (`/new-page`, product pages, blog posts) to the new **public** pages (home, `/visit`, `/delivery`, `/wholesale`). Never redirect visitors to product pages. Put the redirect map in `next.config.ts` → `redirects()`.
4. Remove the "vapecave.ca" leftover and the empty wholesale link (gone in this build).
5. Launch on a preview URL, switch DNS on a **quiet weekday afternoon** (not Friday/Saturday night), keep Squarespace for 2 weeks, then cancel.

Kooht does not touch the live domain until the owner approves the cut-over.
