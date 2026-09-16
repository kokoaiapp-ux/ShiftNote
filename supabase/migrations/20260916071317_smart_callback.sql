-- Isolated SMART sessions: no Supabase Auth identities or Professional records are changed.
create table public.smart_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor text not null default 'smart', enabled boolean not null default false,
  issuer text not null unique check(issuer ~ '^https://'),
  authorization_endpoint text not null check(authorization_endpoint ~ '^https://'),
  token_endpoint text not null check(token_endpoint ~ '^https://'),
  oidc_issuer text not null check(oidc_issuer ~ '^https://'),
  jwks_uri text not null check(jwks_uri ~ '^https://'),
  client_id text not null check(length(client_id) between 1 and 512),
  client_auth_method text not null default 'none' check(client_auth_method in ('none','client_secret_basic','client_secret_post')),
  scopes text[] not null default array['openid','fhirUser','launch'],
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id)
);
comment on table public.smart_connections is 'Operator-reviewed endpoint allowlist. No client secrets. Disabled until explicitly configured and enabled.';
create table public.smart_launch_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  state_hash text not null unique check(state_hash ~ '^[a-f0-9]{64}$'),
  browser_hash text not null check(browser_hash ~ '^[a-f0-9]{64}$'),
  encrypted_payload text not null, connection_version timestamptz not null,
  expires_at timestamptz not null, consumed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(connection_id,organization_id) references public.smart_connections(id,organization_id) on delete cascade,
  unique(id,connection_id,organization_id), check(expires_at>created_at and expires_at<=created_at+interval '10 minutes')
);
create table public.smart_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null, launch_id uuid not null unique,
  session_hash text not null unique check(session_hash ~ '^[a-f0-9]{64}$'),
  encrypted_payload text not null, expires_at timestamptz not null, revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(launch_id,connection_id,organization_id) references public.smart_launch_sessions(id,connection_id,organization_id) on delete cascade,
  check(expires_at>created_at and expires_at<=created_at+interval '8 hours')
);
create function public.smart_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function public.smart_touch_updated_at() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['smart_connections','smart_launch_sessions','smart_sessions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create trigger smart_updated before update on public.%I for each row execute function public.smart_touch_updated_at()',t);
    execute format('create index on public.%I(organization_id)',t);
  end loop;
end $$;
create index on public.smart_launch_sessions(expires_at);
create index on public.smart_sessions(expires_at);

-- Consume before token exchange. A racing callback can never exchange the same code twice.
create function public.smart_claim_launch(p_state_hash text,p_browser_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare launch public.smart_launch_sessions; connection public.smart_connections;
begin
  select * into launch from public.smart_launch_sessions where state_hash=p_state_hash for update;
  if not found then return jsonb_build_object('reason','invalid_state'); end if;
  if launch.browser_hash<>p_browser_hash then return jsonb_build_object('reason','browser_mismatch'); end if;
  if launch.consumed_at is not null then return jsonb_build_object('reason','reused_state'); end if;
  if launch.expires_at<=now() then return jsonb_build_object('reason','expired_state'); end if;
  update public.smart_launch_sessions set consumed_at=now() where id=launch.id;
  select * into connection from public.smart_connections where id=launch.connection_id;
  if not connection.enabled or connection.updated_at<>launch.connection_version or not exists(select 1 from public.organizations where id=launch.organization_id and status='Active') then
    return jsonb_build_object('reason','connection_unavailable');
  end if;
  return jsonb_build_object('reason','ok','launch',to_jsonb(launch));
end $$;

-- Session creation and successful callback auditing commit together.
create function public.smart_complete_callback(p_launch_id uuid,p_session_hash text,p_encrypted_payload text,p_expires_at timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare launch public.smart_launch_sessions; session_id uuid;
begin
  select * into launch from public.smart_launch_sessions where id=p_launch_id for update;
  if not found or launch.consumed_at is null or launch.expires_at<=now() then raise exception 'Invalid SMART launch'; end if;
  if not exists(select 1 from public.smart_connections c join public.organizations o on o.id=c.organization_id where c.id=launch.connection_id and c.enabled and c.updated_at=launch.connection_version and o.status='Active') then raise exception 'SMART connection unavailable'; end if;
  insert into public.smart_sessions(organization_id,connection_id,launch_id,session_hash,encrypted_payload,expires_at)
  values(launch.organization_id,launch.connection_id,launch.id,p_session_hash,p_encrypted_payload,least(p_expires_at,now()+interval '8 hours')) returning id into session_id;
  insert into public.enterprise_audit_logs(organization_id,action,entity_table,entity_id)
  values(launch.organization_id,'SMART Callback Succeeded','smart_sessions',session_id);
  -- Erase the no-longer-needed PKCE verifier/nonce ciphertext, retaining replay protection.
  update public.smart_launch_sessions set encrypted_payload='' where id=launch.id;
  return session_id;
end $$;
revoke all on function public.smart_claim_launch(text,text),public.smart_complete_callback(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.smart_claim_launch(text,text),public.smart_complete_callback(uuid,text,text,timestamptz) to service_role;
