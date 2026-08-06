-- ShiftNote production Supabase schema.
-- Authentication is owned by auth.users. Payment providers are intentionally not integrated here.

create extension if not exists pgcrypto;

create type public.message_role as enum ('user', 'assistant');
create type public.app_theme as enum ('light', 'dark', 'system');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  profession text,
  workplace text,
  default_mode text not null default 'nurse',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  profession text,
  specialty text,
  workplace_type text,
  years_of_experience text,
  emr_platform text check (emr_platform is null or emr_platform in ('Epic','PointClickCare','Cerner','Meditech','eClinicalWorks','Athena','Other')),
  other_emr text,
  documentation_goal text,
  preferred_default_mode text,
  onboarding_completed boolean not null default false,
  completed_at timestamptz,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  selected_mode text not null,
  selected_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.message_role not null,
  message text not null check (char_length(message) > 0),
  edited_message text,
  copied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete cascade
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, message_id),
  foreign key (message_id, user_id) references public.messages(id, user_id) on delete cascade
);

create table public.custom_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  template_name text not null check (char_length(template_name) between 1 and 160),
  template_content text not null check (char_length(template_content) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_mode text not null default 'nurse',
  last_selected_mode text not null default 'nurse',
  last_selected_template text not null default 'custom-template',
  theme public.app_theme not null default 'system',
  microphone_enabled boolean not null default true,
  onboarding_completed boolean not null default false,
  compact_mode boolean not null default false,
  primary_color text not null default '#176b4c' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscription_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement text,
  subscription_status text,
  product_id text,
  billing_provider text,
  expiration_date timestamptz,
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index conversations_user_title_search_idx on public.conversations using gin (to_tsvector('english', title));
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_user_created_idx on public.messages (user_id, created_at desc);
create index messages_search_idx on public.messages using gin (to_tsvector('english', coalesce(edited_message, message)));
create index favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index custom_templates_user_mode_idx on public.custom_templates (user_id, mode, updated_at desc);
create index onboarding_answers_user_idx on public.onboarding_answers (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger onboarding_answers_set_updated_at before update on public.onboarding_answers for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger messages_set_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger custom_templates_set_updated_at before update on public.custom_templates for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'display_name');
  insert into public.profiles (auth_user_id, full_name, email)
  values (new.id, display_name, coalesce(new.email, ''))
  on conflict (auth_user_id) do update set email = excluded.email, full_name = coalesce(public.profiles.full_name, excluded.full_name);
  insert into public.onboarding_answers (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (auth_user_id, full_name, email)
select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'display_name'), coalesce(email, '')
from auth.users
on conflict (auth_user_id) do nothing;
insert into public.onboarding_answers (user_id) select id from auth.users on conflict (user_id) do nothing;
insert into public.user_preferences (user_id) select id from auth.users on conflict (user_id) do nothing;

create or replace function public.complete_onboarding(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  selected_profession text := nullif(payload ->> 'profession', '');
  selected_workplace text := nullif(payload ->> 'workplace', '');
  selected_mode text := coalesce(nullif(payload ->> 'preferred_default_mode', ''), nullif(payload ->> 'default_mode', ''), selected_profession, 'nurse');
  selected_emr text := nullif(payload ->> 'emr', '');
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.onboarding_answers (
    user_id, profession, specialty, workplace_type, years_of_experience, emr_platform,
    other_emr, documentation_goal, preferred_default_mode, onboarding_completed, completed_at, answers
  ) values (
    uid, selected_profession, nullif(payload ->> 'specialty', ''), selected_workplace,
    nullif(payload ->> 'experience', ''), case when selected_emr in ('Epic','PointClickCare','Cerner','Meditech','eClinicalWorks','Athena','Other') then selected_emr else 'Other' end,
    case when selected_emr is not null and selected_emr not in ('Epic','PointClickCare','Cerner','Meditech','eClinicalWorks','Athena') then selected_emr end,
    nullif(payload ->> 'documentation', ''), selected_mode, true, now(), payload
  ) on conflict (user_id) do update set
    profession = excluded.profession, specialty = excluded.specialty, workplace_type = excluded.workplace_type,
    years_of_experience = excluded.years_of_experience, emr_platform = excluded.emr_platform,
    other_emr = excluded.other_emr, documentation_goal = excluded.documentation_goal,
    preferred_default_mode = excluded.preferred_default_mode, onboarding_completed = true,
    completed_at = now(), answers = excluded.answers;
  update public.profiles set profession = selected_profession, workplace = selected_workplace, default_mode = selected_mode where auth_user_id = uid;
  insert into public.user_preferences (user_id, default_mode, last_selected_mode, onboarding_completed)
  values (uid, selected_mode, selected_mode, true)
  on conflict (user_id) do update set default_mode = excluded.default_mode, last_selected_mode = excluded.last_selected_mode, onboarding_completed = true;
end;
$$;

alter table public.profiles enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.custom_templates enable row level security;
alter table public.user_preferences enable row level security;
alter table public.subscription_cache enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = auth_user_id);
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
create policy onboarding_select_own on public.onboarding_answers for select to authenticated using (auth.uid() = user_id);
create policy onboarding_insert_own on public.onboarding_answers for insert to authenticated with check (auth.uid() = user_id);
create policy onboarding_update_own on public.onboarding_answers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy conversations_select_own on public.conversations for select to authenticated using (auth.uid() = user_id);
create policy conversations_insert_own on public.conversations for insert to authenticated with check (auth.uid() = user_id);
create policy conversations_update_own on public.conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy conversations_delete_own on public.conversations for delete to authenticated using (auth.uid() = user_id);
create policy messages_select_own on public.messages for select to authenticated using (auth.uid() = user_id);
create policy messages_insert_own on public.messages for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy messages_update_own on public.messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy messages_delete_own on public.messages for delete to authenticated using (auth.uid() = user_id);
create policy favorites_select_own on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy favorites_insert_own on public.favorites for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.messages m where m.id = message_id and m.user_id = auth.uid()));
create policy favorites_delete_own on public.favorites for delete to authenticated using (auth.uid() = user_id);
create policy custom_templates_select_own on public.custom_templates for select to authenticated using (auth.uid() = user_id);
create policy custom_templates_insert_own on public.custom_templates for insert to authenticated with check (auth.uid() = user_id);
create policy custom_templates_update_own on public.custom_templates for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy custom_templates_delete_own on public.custom_templates for delete to authenticated using (auth.uid() = user_id);
create policy preferences_select_own on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy preferences_insert_own on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy preferences_update_own on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy subscription_cache_select_own on public.subscription_cache for select to authenticated using (auth.uid() = user_id);

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.onboarding_answers to authenticated;
grant select, insert, update, delete on public.conversations, public.messages, public.custom_templates to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select on public.subscription_cache to authenticated;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;