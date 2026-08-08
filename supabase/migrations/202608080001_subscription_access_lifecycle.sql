create table public.subscription_lifecycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_subscribed_before boolean not null default false,
  first_paid_at timestamptz,
  paid_history_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not has_subscribed_before or first_paid_at is not null)
);

create trigger subscription_lifecycle_set_updated_at
before update on public.subscription_lifecycle
for each row execute function public.set_updated_at();

alter table public.subscription_lifecycle enable row level security;
create policy subscription_lifecycle_select_own
on public.subscription_lifecycle for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.subscription_lifecycle to authenticated;
revoke insert, update, delete on public.subscription_lifecycle from anon, authenticated;

comment on table public.subscription_lifecycle is
  'Server-managed permanent paid-subscription history used for Pro access and discount eligibility.';
