alter table public.stripe_subscriptions drop constraint if exists stripe_subscriptions_plan_check;

update public.stripe_subscriptions
set plan = 'promotional_six_month_discount'
where plan = 'promotional_six_month';

alter table public.stripe_subscriptions
  add constraint stripe_subscriptions_plan_check
  check (plan in ('monthly', 'six_month', 'promotional_six_month_discount', 'promotional_six_month_retention'));