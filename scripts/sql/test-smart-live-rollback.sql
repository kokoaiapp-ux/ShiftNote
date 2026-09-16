-- Run on the intended live database only inside this transaction. Never COMMIT.
begin;
set local statement_timeout = '20s';
do $test$
declare
  org_a uuid; org_b uuid; conn uuid; launch uuid; expired uuid; version timestamptz;
  result jsonb; tbl text; denied boolean;
  state_hash text := md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
  browser_hash text := repeat('a',64);
begin
  insert into public.organizations(name,status) values('SMART rollback verification A','Active') returning id into org_a;
  insert into public.organizations(name,status) values('SMART rollback verification B','Active') returning id into org_b;
  insert into public.smart_connections(organization_id,issuer,authorization_endpoint,token_endpoint,oidc_issuer,jwks_uri,client_id,enabled)
    values(org_a,'https://rollback.example.com/'||org_a,'https://rollback.example.com/auth','https://rollback.example.com/token','https://rollback.example.com','https://rollback.example.com/keys','synthetic-verification-client',true) returning id,updated_at into conn,version;
  denied := false;
  begin
    insert into public.smart_launch_sessions(organization_id,connection_id,state_hash,browser_hash,encrypted_payload,connection_version,expires_at)
      values(org_b,conn,state_hash,browser_hash,'synthetic',version,now()+interval '5 minutes');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'Cross-organization launch accepted'; end if;
  insert into public.smart_launch_sessions(organization_id,connection_id,state_hash,browser_hash,encrypted_payload,connection_version,expires_at)
    values(org_a,conn,state_hash,browser_hash,'synthetic',version,now()+interval '5 minutes') returning id into launch;
  if public.smart_claim_launch(state_hash,repeat('b',64))->>'reason' <> 'browser_mismatch' then raise exception 'Browser binding failed'; end if;
  result := public.smart_claim_launch(state_hash,browser_hash);
  if result->>'reason' <> 'ok' then raise exception 'Valid state rejected'; end if;
  if public.smart_claim_launch(state_hash,browser_hash)->>'reason' <> 'reused_state' then raise exception 'Replay allowed'; end if;
  denied := false;
  begin
    insert into public.smart_sessions(organization_id,connection_id,launch_id,session_hash,encrypted_payload,expires_at)
      values(org_b,conn,launch,repeat('c',64),'synthetic',now()+interval '1 hour');
  exception when foreign_key_violation then denied := true;
  end;
  if not denied then raise exception 'Cross-organization session accepted'; end if;
  perform public.smart_complete_callback(launch,repeat('d',64),'synthetic encrypted test data',now()+interval '1 hour');
  if (select encrypted_payload from public.smart_launch_sessions where id=launch) <> '' then raise exception 'Spent verifier not cleared'; end if;
  if not exists(select 1 from public.enterprise_audit_logs where organization_id=org_a and action='SMART Callback Succeeded') then raise exception 'Audit missing'; end if;
  insert into public.smart_launch_sessions(organization_id,connection_id,state_hash,browser_hash,encrypted_payload,connection_version,created_at,expires_at)
    values(org_a,conn,repeat('e',64),browser_hash,'synthetic',version,now()-interval '6 minutes',now()-interval '1 minute') returning id into expired;
  if public.smart_claim_launch(repeat('e',64),browser_hash)->>'reason' <> 'expired_state' then raise exception 'Expired state accepted'; end if;
  foreach tbl in array array['smart_connections','smart_launch_sessions','smart_sessions'] loop
    execute 'set local role anon';
    denied := false;
    begin execute format('select id from public.%I limit 1',tbl); exception when insufficient_privilege then denied := true; end;
    execute 'reset role';
    if not denied then raise exception 'Anonymous read accepted'; end if;
    execute 'set local role authenticated';
    denied := false;
    begin execute format('select id from public.%I limit 1',tbl); exception when insufficient_privilege then denied := true; end;
    execute 'reset role';
    if not denied then raise exception 'Authenticated browser read accepted'; end if;
  end loop;
end;
$test$;
rollback;
