alter table public.profiles
  add column role text not null default 'user'
  check (role in ('user', 'founder'));

update public.profiles
set role = case when lower(email) = 'kokoaiapp@gmail.com' then 'founder' else 'user' end;

create or replace function public.sync_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'display_name'),
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = 'kokoaiapp@gmail.com' then 'founder' else 'user' end
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$;

create trigger on_auth_user_profile_role
after insert or update of email, last_sign_in_at on auth.users
for each row execute function public.sync_profile_role();

revoke update on public.profiles from authenticated;
grant update (full_name, profession, workplace, default_mode, emr, place_of_work)
on public.profiles to authenticated;
revoke execute on function public.sync_profile_role() from public, anon, authenticated;

comment on column public.profiles.role is
  'Server-managed authorization role. Clients cannot modify this column.';
