create table public.revenuecat_webhook_events (
  id text primary key,
  event_type text not null,
  environment text,
  processed_at timestamptz not null default now()
);
alter table public.revenuecat_webhook_events enable row level security;
revoke all on public.revenuecat_webhook_events from anon, authenticated;
comment on table public.revenuecat_webhook_events is 'Private idempotency ledger for authenticated RevenueCat webhook deliveries.';