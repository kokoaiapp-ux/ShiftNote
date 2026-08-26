-- Persist onboarding acquisition attribution on the authenticated user's profile.

alter table public.profiles
  add column if not exists discovery_source text;

grant update (discovery_source) on public.profiles to authenticated;

alter table public.profiles
  drop constraint if exists profiles_discovery_source_check;

alter table public.profiles
  add constraint profiles_discovery_source_check
  check (discovery_source is null or discovery_source in ('tiktok','instagram','facebook','reddit','flyer','friend','google_search','other'));

update public.profiles p
set discovery_source = a.discovery_source
from public.onboarding_answers a
where a.user_id = p.auth_user_id
  and p.discovery_source is null
  and a.discovery_source is not null;

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
  selected_discovery_source text := case
    when payload ->> 'discovery_source' in ('tiktok','instagram','facebook','reddit','flyer','friend','google_search','other') then payload ->> 'discovery_source'
    else null
  end;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.onboarding_answers (
    user_id, profession, specialty, workplace_type, years_of_experience, emr_platform,
    other_emr, documentation_goal, discovery_source, preferred_default_mode, onboarding_completed, completed_at, answers
  ) values (
    uid, selected_profession, nullif(payload ->> 'specialty', ''), selected_workplace,
    nullif(payload ->> 'experience', ''), case when selected_emr in ('Epic','PointClickCare','Cerner','Meditech','eClinicalWorks','Athena','Other') then selected_emr else 'Other' end,
    case when selected_emr is not null and selected_emr not in ('Epic','PointClickCare','Cerner','Meditech','eClinicalWorks','Athena') then selected_emr end,
    nullif(payload ->> 'documentation', ''), selected_discovery_source, selected_mode, true, now(), payload
  ) on conflict (user_id) do update set
    profession = excluded.profession, specialty = excluded.specialty, workplace_type = excluded.workplace_type,
    years_of_experience = excluded.years_of_experience, emr_platform = excluded.emr_platform,
    other_emr = excluded.other_emr, documentation_goal = excluded.documentation_goal,
    discovery_source = excluded.discovery_source, preferred_default_mode = excluded.preferred_default_mode,
    onboarding_completed = true, completed_at = now(), answers = excluded.answers;
  update public.profiles
  set profession = selected_profession,
      emr = selected_emr,
      place_of_work = selected_workplace,
      workplace = selected_workplace,
      default_mode = selected_mode,
      discovery_source = selected_discovery_source
  where auth_user_id = uid;
  insert into public.user_preferences (user_id, default_mode, last_selected_mode, onboarding_completed)
  values (uid, selected_mode, selected_mode, true)
  on conflict (user_id) do update set default_mode = excluded.default_mode, last_selected_mode = excluded.last_selected_mode, onboarding_completed = true;
end;
$$;
