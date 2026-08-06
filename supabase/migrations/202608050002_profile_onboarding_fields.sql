-- Store the onboarding summary directly on each user's profile.

alter table public.profiles
  add column emr text,
  add column place_of_work text;

update public.profiles p
set
  emr = coalesce(a.other_emr, a.emr_platform),
  place_of_work = a.workplace_type,
  workplace = coalesce(p.workplace, a.workplace_type),
  profession = coalesce(p.profession, a.profession),
  default_mode = coalesce(a.preferred_default_mode, p.default_mode)
from public.onboarding_answers a
where a.user_id = p.auth_user_id;

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
  update public.profiles
  set profession = selected_profession,
      emr = selected_emr,
      place_of_work = selected_workplace,
      workplace = selected_workplace,
      default_mode = selected_mode
  where auth_user_id = uid;
  insert into public.user_preferences (user_id, default_mode, last_selected_mode, onboarding_completed)
  values (uid, selected_mode, selected_mode, true)
  on conflict (user_id) do update set default_mode = excluded.default_mode, last_selected_mode = excluded.last_selected_mode, onboarding_completed = true;
end;
$$;