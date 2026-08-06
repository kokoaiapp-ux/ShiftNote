# Supabase and Stripe production setup

RevenueCat is intentionally not integrated at this stage. Use `docs/STRIPE_SETUP.md` as the authoritative Stripe configuration guide.

ShiftNote supports four independently configured Stripe products and recurring prices:

1. Monthly
2. Standard Six Months
3. Promotional Six Months — Discount Paywall
4. Promotional Six Months — Retention Offer

All purchases, plan changes, validation, webhook synchronization, and Customer Portal sessions use Supabase Auth ownership checks and the server-only Stripe integration.