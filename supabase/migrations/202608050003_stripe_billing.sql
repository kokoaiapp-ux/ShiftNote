create table public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique, stripe_customer_id text not null, stripe_product_id text, stripe_price_id text,
  plan text check (plan in ('monthly', 'six_month', 'promotional_six_month')), status text not null,
  cancel_at_period_end boolean not null default false, current_period_start timestamptz, current_period_end timestamptz,
  trial_end timestamptz, canceled_at timestamptz, currency text, unit_amount integer, interval text, interval_count integer,
  quantity integer, pause_collection_behavior text, pause_resumes_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  id text primary key, event_type text not null, livemode boolean not null, processed_at timestamptz not null default now()
);

create index stripe_subscriptions_user_status_idx on public.stripe_subscriptions (user_id, status, updated_at desc);
create index stripe_subscriptions_customer_idx on public.stripe_subscriptions (stripe_customer_id);
create trigger stripe_customers_set_updated_at before update on public.stripe_customers for each row execute function public.set_updated_at();
create trigger stripe_subscriptions_set_updated_at before update on public.stripe_subscriptions for each row execute function public.set_updated_at();
alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;
create policy stripe_customers_select_own on public.stripe_customers for select to authenticated using ((select auth.uid()) = user_id);
create policy stripe_subscriptions_select_own on public.stripe_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.stripe_customers, public.stripe_subscriptions to authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
comment on table public.stripe_customers is 'Server-managed mapping between Supabase Auth users and Stripe customers.';
comment on table public.stripe_subscriptions is 'Server-managed Stripe subscription projection. Stripe webhooks are authoritative.';
comment on table public.stripe_webhook_events is 'Private idempotency ledger for verified Stripe webhook events.';