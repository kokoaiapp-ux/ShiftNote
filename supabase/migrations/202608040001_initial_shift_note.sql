create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  legacy_firebase_uid text unique,
  onboarding jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_initialized boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  favorites jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  custom_templates jsonb not null default '[]'::jsonb,
  recent_templates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revenuecat_app_user_id text not null,
  revenuecat_entitlement_id text not null default 'pro',
  entitlement_active boolean not null default false,
  plan text check (plan in ('monthly','six_month','promotional_six_month')),
  status text not null default 'expired' check (status in ('active','trial','expired','canceling')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  price_cents integer,
  currency text not null default 'usd',
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.cancellation_reasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('too_expensive','not_using_enough','missing_features','technical_issues','other')),
  created_at timestamptz not null default now()
);
create table if not exists public.billing_webhook_events (
  id text primary key,
  provider text not null check (provider in ('stripe','revenuecat')),
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_workspaces enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cancellation_reasons enable row level security;
alter table public.billing_webhook_events enable row level security;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "workspaces own row" on public.user_workspaces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions own read" on public.subscriptions for select using (auth.uid() = user_id);
create policy "reasons own insert" on public.cancellation_reasons for insert with check (auth.uid() = user_id);
create policy "reasons own read" on public.cancellation_reasons for select using (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,display_name) values (new.id,new.email,new.raw_user_meta_data->>'display_name') on conflict do nothing;
  insert into public.user_workspaces (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();