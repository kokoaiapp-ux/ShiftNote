-- Enterprise data is separate from Professional subscriptions and clinical records.
create table public.koko_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('shiftnote_owner','shiftnote_admin','shiftnote_sales','shiftnote_support')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 200),
  status text not null default 'New' check (status in ('New','Approved','Active','Suspended')),
  subscription_status text not null default 'pending' check (subscription_status in ('pending','active','expired','cancelled')),
  contract_start date, contract_end date, country text, state text, timezone text not null default 'UTC',
  reporting_period text not null default 'Monthly' check (reporting_period in ('Weekly','Monthly','Quarterly')),
  include_time_saved boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (contract_end is null or contract_start is null or contract_end >= contract_start)
);
create table public.facilities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200), kind text not null default 'Other', location text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null, name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(facility_id,organization_id) references public.facilities(id,organization_id) on delete cascade
);
create table public.enterprise_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null, role text not null default 'admin' check (role='admin'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enterprise_leads (
  id uuid primary key default gen_random_uuid(), organization_name text not null, contact_name text not null, job_title text not null,
  work_email text not null, phone text, country text not null, state text,
  clinicians integer not null check(clinicians>0), facilities integer not null check(facilities>0),
  current_ehr text not null, interested_in_integration text not null check(interested_in_integration in ('Yes','No','Not Sure')),
  professions text[] not null default '{}', timeline text not null, notes text,
  status text not null default 'New' check(status in ('New','Discovery Scheduled','Demo Completed','Contract Sent','Contract Signed','Payment Received','Approved','Active')),
  demo_scheduled_at timestamptz, organization_id uuid unique references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enterprise_contracts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  start_date date not null, end_date date not null check(end_date>=start_date),
  status text not null check(status in ('Draft','Sent','Signed','Expired','Cancelled')),
  stripe_customer_id text, stripe_subscription_id text unique,
  payment_status text not null default 'Pending' check(payment_status in ('Pending','Received','Overdue','Refunded')),
  amount_cents integer not null default 0 check(amount_cents>=0), currency text not null default 'USD' check(currency='USD'),
  payment_received_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enterprise_activation_links (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null, token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null, used_at timestamptz, revoked_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  email_status text not null default 'pending' check(email_status in ('pending','sent','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index enterprise_one_pending_activation on public.enterprise_activation_links(organization_id) where used_at is null and revoked_at is null;
create table public.enterprise_integrations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  ehr_type text not null, connection_status text not null default 'Coming Soon' check(connection_status in ('Coming Soon','Not Connected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,ehr_type)
);
comment on table public.enterprise_integrations is 'Organization-scoped metadata only. Future credentials must live in a secret vault, never this table.';
create table public.enterprise_support_tickets (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null, subject text not null, message text not null,
  status text not null default 'Open' check(status in ('Open','In Progress','Resolved')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enterprise_audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null, action text not null, entity_table text not null, entity_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enterprise_rate_limits (
  bucket text primary key, hits integer not null, expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create function public.is_koko_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.koko_admins where user_id=(select auth.uid()) and role in ('shiftnote_owner','shiftnote_admin'));
$$;
create function public.shiftnote_role_in(roles text[]) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.koko_admins where user_id=(select auth.uid()) and role=any(roles));
$$;
create function public.is_enterprise_admin(org uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.enterprise_admins a join public.organizations o on o.id=a.organization_id
    where a.user_id=(select auth.uid()) and a.organization_id=org and o.status='Active');
$$;
revoke all on function public.is_koko_admin(), public.is_enterprise_admin(uuid), public.shiftnote_role_in(text[]) from public;
grant execute on function public.is_koko_admin(), public.is_enterprise_admin(uuid), public.shiftnote_role_in(text[]) to authenticated;

do $$ declare t text; begin
  foreach t in array array['koko_admins','organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_support_tickets','enterprise_audit_logs','enterprise_rate_limits'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant select on public.koko_admins,public.organizations,public.facilities,public.departments,public.enterprise_admins,public.enterprise_leads,public.enterprise_contracts,public.enterprise_integrations,public.enterprise_support_tickets,public.enterprise_audit_logs to authenticated;
grant insert,update,delete on public.facilities,public.departments to authenticated;
grant update(name,country,state,timezone,reporting_period,include_time_saved) on public.organizations to authenticated;
grant update on public.enterprise_leads to authenticated;
grant insert,update on public.enterprise_contracts,public.enterprise_integrations to authenticated;
grant insert on public.enterprise_support_tickets to authenticated;
grant update(status) on public.enterprise_support_tickets to authenticated;
create policy staff_self on public.koko_admins for select to authenticated using(user_id=(select auth.uid()));
create policy org_read on public.organizations for select to authenticated using(public.shiftnote_role_in(array['shiftnote_owner','shiftnote_admin','shiftnote_sales','shiftnote_support']) or public.is_enterprise_admin(id));
create policy org_edit on public.organizations for update to authenticated using(public.is_koko_admin() or public.is_enterprise_admin(id)) with check(public.is_koko_admin() or public.is_enterprise_admin(id));
create policy lead_staff on public.enterprise_leads for all to authenticated using(public.is_koko_admin()) with check(public.is_koko_admin());
create policy lead_sales_read on public.enterprise_leads for select to authenticated using(public.shiftnote_role_in(array['shiftnote_sales']));
create policy lead_sales_edit on public.enterprise_leads for update to authenticated
 using(public.shiftnote_role_in(array['shiftnote_sales']) and organization_id is null and status not in ('Payment Received','Approved','Active'))
 with check(public.shiftnote_role_in(array['shiftnote_sales']) and organization_id is null and status in ('New','Discovery Scheduled','Demo Completed','Contract Sent','Contract Signed'));
create policy admins_read on public.enterprise_admins for select to authenticated using(user_id=(select auth.uid()) or public.is_koko_admin() or public.is_enterprise_admin(organization_id));
do $$ declare t text; begin
 foreach t in array array['facilities','departments'] loop
   execute format('create policy tenant_access on public.%I for all to authenticated using(public.is_koko_admin() or public.is_enterprise_admin(organization_id)) with check(public.is_koko_admin() or public.is_enterprise_admin(organization_id))',t);
 end loop;
 foreach t in array array['enterprise_contracts','enterprise_integrations'] loop
   execute format('create policy tenant_read on public.%I for select to authenticated using(public.is_koko_admin() or public.is_enterprise_admin(organization_id))',t);
   execute format('create policy staff_write on public.%I for all to authenticated using(public.is_koko_admin()) with check(public.is_koko_admin())',t);
 end loop;
end $$;
create policy contract_sales_read on public.enterprise_contracts for select to authenticated using(public.shiftnote_role_in(array['shiftnote_sales']));
create policy integration_support_read on public.enterprise_integrations for select to authenticated using(public.shiftnote_role_in(array['shiftnote_support']));
create policy support_read on public.enterprise_support_tickets for select to authenticated using(public.is_koko_admin() or public.shiftnote_role_in(array['shiftnote_support']) or public.is_enterprise_admin(organization_id));
create policy support_create on public.enterprise_support_tickets for insert to authenticated with check(public.is_enterprise_admin(organization_id) and created_by=(select auth.uid()));
create policy support_edit on public.enterprise_support_tickets for update to authenticated using(public.is_koko_admin() or public.shiftnote_role_in(array['shiftnote_support'])) with check(public.is_koko_admin() or public.shiftnote_role_in(array['shiftnote_support']));
create policy audit_read on public.enterprise_audit_logs for select to authenticated using(public.is_koko_admin() or public.is_enterprise_admin(organization_id));

create function public.enterprise_track_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb; org uuid; actor uuid; event text;
begin
 if tg_op='DELETE' then row_data=to_jsonb(old); else row_data=to_jsonb(new); end if;
 if tg_op='UPDATE' then new.updated_at=now(); end if;
 org=case when tg_table_name='organizations' then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
 if not exists(select 1 from public.organizations where id=org) then org=null; end if;
 actor=coalesce(auth.uid(),nullif(current_setting('enterprise.actor',true),'')::uuid);
 event=tg_table_name||'.'||lower(tg_op);
 if tg_table_name='organizations' and tg_op='UPDATE' then
   if new.status='Approved' and old.status is distinct from new.status then event='Organization Approved'; end if;
   if new.status='Active' and old.status is distinct from new.status then event='Setup Completed'; end if;
 end if;
 insert into public.enterprise_audit_logs(organization_id,actor_id,action,entity_table,entity_id)
 values(org,actor,event,tg_table_name,coalesce((row_data->>'id')::uuid,(row_data->>'user_id')::uuid));
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.enterprise_track_change() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_integrations','enterprise_support_tickets'] loop
   -- AFTER inserts lets the audit FK resolve the newly created organization.
   execute format('create trigger enterprise_insert_audit after insert on public.%I for each row execute function public.enterprise_track_change()',t);
   execute format('create trigger enterprise_change_audit before update or delete on public.%I for each row execute function public.enterprise_track_change()',t);
 end loop;
 foreach t in array array['facilities','departments','enterprise_admins','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_support_tickets','enterprise_audit_logs'] loop
   execute format('create index on public.%I (organization_id,created_at desc)',t);
 end loop;
end $$;
create index on public.departments(facility_id,organization_id);
create index on public.enterprise_leads(status,created_at desc);
create index on public.enterprise_audit_logs(created_at desc);
create index on public.enterprise_rate_limits(expires_at);

create function public.enterprise_rate_limit(p_bucket text,p_limit int,p_seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int; begin
 delete from public.enterprise_rate_limits where expires_at<now();
 insert into public.enterprise_rate_limits(bucket,hits,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=public.enterprise_rate_limits.hits+1,updated_at=now() returning hits into n;
 return n<=p_limit;
end $$;

create function public.enterprise_approve(p_lead uuid,p_actor uuid,p_hash text,p_hours int) returns jsonb language plpgsql security definer set search_path='' as $$
declare lead public.enterprise_leads; org uuid; activation uuid;
begin
 if not exists(select 1 from public.koko_admins where user_id=p_actor and role in ('shiftnote_owner','shiftnote_admin')) then raise exception 'Forbidden'; end if;
 if p_hours<1 or p_hours>168 then raise exception 'Invalid expiration'; end if;
 select * into lead from public.enterprise_leads where id=p_lead for update;
 if not found then raise exception 'Lead not found'; end if;
 if lead.organization_id is not null then raise exception 'Already approved; reissue the activation instead'; end if;
 perform set_config('enterprise.actor',p_actor::text,true);
 insert into public.organizations(name,country,state) values(lead.organization_name,lead.country,lead.state) returning id into org;
 update public.organizations set status='Approved' where id=org;
 update public.enterprise_leads set organization_id=org,status='Approved' where id=p_lead;
 insert into public.enterprise_activation_links(organization_id,email,token_hash,expires_at) values(org,lower(lead.work_email),p_hash,now()+make_interval(hours=>p_hours)) returning id into activation;
 insert into public.enterprise_integrations(organization_id,ehr_type) values(org,lead.current_ehr);
 return jsonb_build_object('organization_id',org,'activation_id',activation,'email',lead.work_email,'organization_name',lead.organization_name);
end $$;

create function public.enterprise_reissue(p_org uuid,p_actor uuid,p_hash text,p_hours int) returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.organizations; mail text; activation uuid;
begin
 if not exists(select 1 from public.koko_admins where user_id=p_actor and role in ('shiftnote_owner','shiftnote_admin')) then raise exception 'Forbidden'; end if;
 select * into target from public.organizations where id=p_org for update;
 if target.status is distinct from 'Approved' or p_hours<1 or p_hours>168 then raise exception 'Invalid activation'; end if;
 select lower(work_email) into mail from public.enterprise_leads where organization_id=p_org;
 update public.enterprise_activation_links set revoked_at=now(),updated_at=now() where organization_id=p_org and used_at is null and revoked_at is null;
 insert into public.enterprise_activation_links(organization_id,email,token_hash,expires_at) values(p_org,mail,p_hash,now()+make_interval(hours=>p_hours)) returning id into activation;
 insert into public.enterprise_audit_logs(organization_id,actor_id,action,entity_table,entity_id) values(p_org,p_actor,'Activation Reissued','enterprise_activation_links',activation);
 return jsonb_build_object('organization_id',p_org,'activation_id',activation,'email',mail,'organization_name',target.name);
end $$;

create function public.enterprise_finish_setup(p_hash text,p_user uuid,p_name text,p_facilities jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare link public.enterprise_activation_links; org public.organizations; mail text; facility jsonb; department jsonb; fid uuid;
begin
 select * into link from public.enterprise_activation_links where token_hash=p_hash for update;
 if not found or link.used_at is not null or link.revoked_at is not null or link.expires_at<=now() then raise exception 'Invalid activation'; end if;
 select * into org from public.organizations where id=link.organization_id for update;
 if org.status<>'Approved' then raise exception 'Organization not approved'; end if;
 select lower(email) into mail from auth.users where id=p_user;
 if mail is distinct from lower(link.email) then raise exception 'Email mismatch'; end if;
 if exists(select 1 from public.enterprise_admins where user_id=p_user) then raise exception 'Admin already assigned'; end if;
 if length(trim(p_name)) not between 1 and 200 or jsonb_typeof(p_facilities)<>'array' or jsonb_array_length(p_facilities) not between 1 and 50 then raise exception 'Invalid setup'; end if;
 perform set_config('enterprise.actor',p_user::text,true);
 insert into public.enterprise_admins(user_id,organization_id,full_name) values(p_user,org.id,p_name);
 for facility in select * from jsonb_array_elements(p_facilities) loop
   insert into public.facilities(organization_id,name,kind,location) values(org.id,facility->>'name',coalesce(facility->>'kind','Other'),facility->>'location') returning id into fid;
   if jsonb_typeof(facility->'departments') is distinct from 'array' or jsonb_array_length(facility->'departments')>50 then raise exception 'Invalid departments'; end if;
   for department in select * from jsonb_array_elements(facility->'departments') loop
     insert into public.departments(organization_id,facility_id,name) values(org.id,fid,department#>>'{}');
   end loop;
 end loop;
 update public.enterprise_activation_links set used_at=now(),used_by=p_user,updated_at=now() where id=link.id;
 update public.organizations set status='Active' where id=org.id;
 update public.enterprise_leads set status='Active' where organization_id=org.id;
 return org.id;
end $$;
revoke all on function public.enterprise_rate_limit(text,int,int),public.enterprise_approve(uuid,uuid,text,int),public.enterprise_reissue(uuid,uuid,text,int),public.enterprise_finish_setup(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.enterprise_rate_limit(text,int,int),public.enterprise_approve(uuid,uuid,text,int),public.enterprise_reissue(uuid,uuid,text,int),public.enterprise_finish_setup(text,uuid,text,jsonb) to service_role;
