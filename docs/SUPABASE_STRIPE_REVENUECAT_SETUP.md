# Supabase, Stripe, and RevenueCat production setup

No dashboard configuration is changed automatically. Apply these steps in a staging project first, validate, then repeat in production.

## 1. Supabase

1. Create the project and run `supabase/migrations/202608040001_initial_shift_note.sql` in the SQL editor or Supabase CLI. It creates user-owned tables, cascade deletion, an auth-user profile trigger, and RLS policies.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key to browser code.
3. Enable Email, Google, and Apple providers. Add the production site URL and `/dashboard`, `/login`, and localhost development redirect URLs to the Auth URL allowlist.
4. Export Firebase Auth users and use Supabase's official `firebase-to-supabase` auth migration tool. Password hashes can only migrate when Firebase exports include the hash parameters; otherwise users must reset passwords.
5. Export the Firestore `users` collection as JSON and run `node scripts/import-firebase-profiles.mjs path/to/users.json`. Run once in staging and compare record counts before production.

## 2. Stripe

1. Create or verify three recurring Prices: Monthly `$19.99`, Six Month `$83.94 / 6 months`, and Promotional Six Month `$59.94 / 6 months`.
2. Set their IDs in `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_SIX_MONTH_PRICE_ID`, and `STRIPE_PROMOTIONAL_SIX_MONTH_PRICE_ID`, plus the server-only `STRIPE_SECRET_KEY`.
3. Activate Customer Portal. Enable payment-method updates, invoice history, and cancellation at period end. The app deep-links payment updates and cancellation; invoice history opens the portal home because Stripe does not expose an invoice-history-only portal flow.
4. Add `/api/webhooks/stripe` for `checkout.session.completed` and `customer.subscription.created|updated|deleted`; set its signing secret as `STRIPE_WEBHOOK_SECRET`.
5. The one-month pause uses Stripe `pause_collection` with `void` and `resumes_at` 30 days later. Confirm this accounting treatment is acceptable before enabling it in production.

## 3. RevenueCat

1. Connect the same Stripe account as a Stripe Billing app. Map all three Stripe products to the `pro` entitlement.
2. Set `REVENUECAT_STRIPE_PUBLIC_API_KEY`. On Checkout completion the server posts the Checkout Session to RevenueCat's receipt API with the Supabase UUID as `app_user_id`.
3. Add `/api/webhooks/revenuecat`, configure a random authorization token, and set the same value as server-only `REVENUECAT_WEBHOOK_AUTH`.
4. Set `REVENUECAT_PRO_ENTITLEMENT_ID=pro`. RevenueCat lifecycle webhooks update the RLS-protected subscription snapshot; `entitlement_active` is the access source of truth.
5. Send test events, then complete test-mode purchases for every Price. Confirm the Supabase UUID matches the RevenueCat App User ID and Stripe subscription metadata.

## Verification before production

- Email, Google, and Apple sign-in and password recovery.
- Existing Firebase user migration and forced reset fallback.
- History/favorites/templates local import followed by cross-device reload.
- All three Stripe Checkout Prices and RevenueCat `pro` entitlement activation.
- Payment-method portal, invoice portal, cancellation portal, pause/resume, and webhook replay idempotency.
- Active-subscription account deletion is rejected; expired accounts cascade-delete through Supabase.