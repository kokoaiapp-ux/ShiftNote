# Stripe production setup

ShiftNote uses Supabase Auth for identity, Stripe Checkout and Customer Portal for billing, and RevenueCat for entitlement synchronization.

## Environment variables

Copy the Stripe variables from `.env.local.example` into `.env.local` (and your production host's encrypted environment settings). Use IDs from the same Stripe mode: live keys with live products/prices, or test keys with test products/prices. Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the browser.

## Stripe catalog

Create four recurring prices:

- Monthly: USD $19.99, recurring monthly.
- Six Month: USD $83.94, recurring every 6 months.
- Promotional Six Month (Discount Paywall): configure its dedicated recurring product and price.
- Promotional Six Month (Retention Offer): USD $59.94, recurring every 6 months, using a separate product and price.

Put each Product ID and Price ID into the matching environment variables. The standard six-month 3-day trial is assigned by the server during Checkout.

## Customer Portal

In Stripe Dashboard, open Settings > Billing > Customer portal. Activate a configuration that allows customers to:

- update payment methods;
- view and download invoice history;
- cancel subscriptions at the end of the billing period.

Plan switching is handled by ShiftNote's authenticated server endpoint. If using a dedicated portal configuration, set `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID`; otherwise leave it blank.

## Webhook

Create an HTTPS webhook endpoint at:

`https://YOUR_DOMAIN/api/webhooks/stripe`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.deleted`

Copy that endpoint's signing secret to `STRIPE_WEBHOOK_SECRET`. Do not use a Stripe CLI signing secret in production.

## Redirect URL

Production billing redirects are fixed to `https://shiftnote.care`; no public application URL variable is used.
