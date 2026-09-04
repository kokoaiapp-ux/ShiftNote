-- ShiftNote subscriptions are authorized directly from Stripe webhook data stored in Supabase.
drop table if exists public.revenuecat_webhook_events;
drop table if exists public.subscription_cache;