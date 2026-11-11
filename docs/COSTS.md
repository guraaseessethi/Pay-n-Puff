# Running costs (Phase 2 estimate)

Approximate list prices in USD as of late 2026; confirm before quoting the client. Phase 1 (this mockup) costs $0 on a Vercel Hobby preview, but Hobby isn't licensed for commercial use, so production needs Pro.

| Item | Plan | Monthly |
|---|---|---|
| Vercel | Pro, 1 seat | ~$20 |
| Supabase | Pro (Canada region if available) | ~$25 |
| Age & ID check | **`staff_verified` (default): staff check ID in person** | **$0** |
| | `id_provider` instead: Didit / Veriff | ~$0.33–0.80 per check (e.g. 100 new customers ≈ $33–80) |
| Email | Resend free tier (3,000/mo) | $0 |
| SMS | Twilio Canadian long code + messages (~300/mo) | ~$4–6 |
| DNS / WAF / Turnstile | Cloudflare free | $0 |
| Errors / uptime | Sentry free, UptimeRobot or Better Stack free | $0 |
| Backups | Cloudflare R2 free tier (10 GB) | $0 |
| Maps | Phone's own maps app; postal-code zone check | $0 |
| Payments | None online | $0 |
| Domain | paynpuffvapes.com renewal | ~$1–2 (billed yearly) |
| **Total (staff_verified)** | | **≈ $50–55 / month** |

Not included: Kooht's build and support fees; the in-store card terminal they already have.
