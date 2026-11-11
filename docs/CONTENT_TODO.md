# Content to confirm

Everything here shows a `[verify]` tag when you open any page with `?review=1` (turn it off with `?review=0`). Sample values are in the code so the mockup works; none of them are confirmed.

| Item | Where it lives | Current sample | Ask the owner |
|---|---|---|---|
| **Hours** | `lib/hours/hours.ts` → `DEFAULT_HOURS`; editable in Settings | Sun 12–8, **Mon unconfirmed (shown closed)**, Tue–Wed 12–9, Thu 12–10, Fri–Sat 12 pm–1 am | Monday hours? Holiday hours? Are Google hours right? |
| **Delivery area** | Settings → Delivery zone; default in `lib/settings/schema.ts` | FSAs L4M, L4N, L9J (central/south Barrie) | Real zone. The current site mentions Bradford, Newmarket, Sharon, Holland Landing, Aurora and London: still served? |
| Delivery fee, minimum, hours | Same | $5 fee, $30 minimum, 4 windows to midnight | Real fee, minimum, cut-off, delivery hours |
| **Products** | `lib/data/mock/seed.server.ts` | Names and tax-in prices from the current site (2023–24); nicotine, stamps, flavour families, stock, par, costs are placeholders | Current stock list with nicotine, stamp, flavour family, price, cost, supplier |
| **House brand "Pay N' Puff 30K"** | Same | $45 (Instagram says $35.99) | Who makes, packages and stamps it? One price. (See COMPLIANCE.md) |
| Payment methods | Settings → Delivery; Checkout | Delivery: cash, e-Transfer. Counter: card, cash, e-Transfer | Confirm. The current site lists e-Transfer and cash. |
| Wholesale terms | `lib/content/store.ts` → `WHOLESALE_SERVICES` | Fair-price review, price match/beat, market overview | Who they sell to, minimums, terms, registration they hold |
| Phone number | `lib/content/store.ts` → `STORE.phone` | none (no click-to-call shown) | Add a number for click-to-call? |
| Device/battery recycling | Two-ways section | "Device and battery drop-off for recycling" | Do they actually take them? |
| Map pin coordinates | `STORE.geo` | Approximate | Check pin |
| Logo | `components/ui/Logo.tsx` | Redrawn stand-in | Original vector file (see `public/images/README.md`) |
| Storefront photo | not used | none | Optional exterior photo, name sign only |
| Staff rota, training | Admin → Late shifts | Sample | Real names stay out of the mockup |
