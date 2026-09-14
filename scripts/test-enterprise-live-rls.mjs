import { loadEnvFile } from 'node:process';
import { randomUUID, randomBytes } from 'node:crypto';
loadEnvFile('.env.local');
const ref=process.env.SUPABASE_PROJECT_REF;
if(ref!=='qzdvfmtfjasdeqrfdspm')throw new Error('ShiftNote project required.');
const a=randomUUID(),b=randomUUID(),outsider=randomUUID(),h1=randomBytes(32).toString('hex'),h2=randomBytes(32).toString('hex'),h3=randomBytes(32).toString('hex'),h4=randomBytes(32).toString('hex');
const claim=id=>`reset role; select set_config('request.jwt.claim.sub','${id}',true); select set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated"}',true); set local role authenticated;`;
const rollbackQuery=`
begin;
set local statement_timeout='25s';
create temp table enterprise_verification_state (owner_id uuid, org1 uuid, org2 uuid, lead3 uuid, org3 uuid, facility1 uuid, facility2 uuid);
grant select on enterprise_verification_state to authenticated;
insert into enterprise_verification_state(owner_id)
 select u.id from auth.users u join public.koko_admins k on k.user_id=u.id where lower(u.email)='support@shiftnote.care' and k.role='shiftnote_owner';
do $$ begin if (select count(*) from enterprise_verification_state)<>1 then raise exception 'Owner assignment missing'; end if; end $$;
insert into auth.users(id,email,raw_user_meta_data)
 values ('${a}','${a}@enterprise-verification.invalid','{}'),('${b}','${b}@enterprise-verification.invalid','{}'),('${outsider}','${outsider}@enterprise-verification.invalid','{}');
do $$ declare lead uuid; result jsonb; s record; begin
 select * into s from enterprise_verification_state;
 insert into public.enterprise_leads(organization_name,contact_name,job_title,work_email,country,clinicians,facilities,current_ehr,interested_in_integration,timeline)
 values('ROLLBACK Enterprise Verification A','Verification','IT','${a}@enterprise-verification.invalid','US',1,1,'Other','No','Just Exploring') returning id into lead;
 result=public.enterprise_approve(lead,s.owner_id,'${h1}',48);
 update enterprise_verification_state set org1=(result->>'organization_id')::uuid;
 insert into public.enterprise_leads(organization_name,contact_name,job_title,work_email,country,clinicians,facilities,current_ehr,interested_in_integration,timeline)
 values('ROLLBACK Enterprise Verification B','Verification','IT','${b}@enterprise-verification.invalid','US',1,1,'Other','No','Just Exploring') returning id into lead;
 result=public.enterprise_approve(lead,s.owner_id,'${h2}',48);
 update enterprise_verification_state set org2=(result->>'organization_id')::uuid;
 perform public.enterprise_finish_setup('${h1}','${a}','Verification Admin A','[{"name":"Facility A","departments":["Nursing"]}]');
 perform public.enterprise_finish_setup('${h2}','${b}','Verification Admin B','[{"name":"Facility B","departments":["Nursing"]}]');
 begin perform public.enterprise_finish_setup('${h1}','${a}','Replay','[]');raise exception 'Replay was accepted' using errcode='P0004';exception when sqlstate 'P0001' then if sqlerrm<>'Invalid activation' then raise;end if;end;
 update enterprise_verification_state set facility1=(select id from public.facilities where organization_id=org1 limit 1),facility2=(select id from public.facilities where organization_id=org2 limit 1);
end $$;
${claim(a)}
do $$ declare s record; new_facility uuid; new_department uuid; begin
 select * into s from enterprise_verification_state;
 if not exists(select 1 from public.organizations where id=s.org1) or exists(select 1 from public.organizations where id=s.org2) then raise exception 'Organization isolation failed';end if;
 if exists(select 1 from public.facilities where organization_id=s.org2) or exists(select 1 from public.departments where organization_id=s.org2) then raise exception 'Structure isolation failed';end if;
 if exists(select 1 from public.enterprise_admins where user_id='${b}') then raise exception 'Membership isolation failed';end if;
 insert into public.facilities(organization_id,name) values(s.org1,'CRUD facility') returning id into new_facility;
 update public.facilities set name='Updated facility' where id=new_facility;
 if not exists(select 1 from public.facilities where id=new_facility and name='Updated facility') then raise exception 'Facility update failed';end if;
 insert into public.departments(organization_id,facility_id,name) values(s.org1,new_facility,'CRUD department') returning id into new_department;
 update public.departments set name='Updated department' where id=new_department;
 if not exists(select 1 from public.departments where id=new_department and name='Updated department') then raise exception 'Department update failed';end if;
 delete from public.departments where id=new_department;
 delete from public.facilities where id=new_facility;
 if exists(select 1 from public.facilities where id=new_facility) or exists(select 1 from public.departments where id=new_department) then raise exception 'CRUD delete failed';end if;
 begin insert into public.facilities(organization_id,name) values(s.org2,'Intrusion');raise exception 'Cross-organization insert allowed' using errcode='P0004';exception when insufficient_privilege then null;end;
 begin insert into public.departments(organization_id,facility_id,name) values(s.org1,s.facility2,'Intrusion');raise exception 'Cross-organization FK allowed' using errcode='P0004';exception when foreign_key_violation then null;end;
 begin insert into public.koko_admins(user_id,role) values('${a}','shiftnote_owner');raise exception 'Role escalation allowed' using errcode='P0004';exception when insufficient_privilege then null;end;
 begin perform * from public.enterprise_activation_links;raise exception 'Activation hashes exposed' using errcode='P0004';exception when insufficient_privilege then null;end;
 begin perform public.enterprise_finish_setup('${h3}','${a}','Unauthorized','[]');raise exception 'Provisioning RPC exposed' using errcode='P0004';exception when insufficient_privilege then null;end;
 update public.facilities set name='Intrusion' where organization_id=s.org2;
 if found then raise exception 'Cross-organization update allowed';end if;
 delete from public.departments where organization_id=s.org2;
 if found then raise exception 'Cross-organization delete allowed';end if;
end $$;
${claim(b)}
do $$ begin if exists(select 1 from public.organizations where id=(select org1 from enterprise_verification_state)) then raise exception 'Reverse isolation failed';end if;end $$;
${claim(outsider)}
do $$ begin
 if exists(select 1 from public.organizations) or exists(select 1 from public.koko_admins) or exists(select 1 from public.enterprise_admins) then raise exception 'Non-member access allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$ declare lead uuid; result jsonb; s record; begin
 select * into s from enterprise_verification_state;
 insert into public.enterprise_leads(organization_name,contact_name,job_title,work_email,country,clinicians,facilities,current_ehr,interested_in_integration,timeline)
 values('ROLLBACK Expiration Verification','Verification','IT','${outsider}@enterprise-verification.invalid','US',1,1,'Other','No','Just Exploring') returning id into lead;
 result=public.enterprise_approve(lead,s.owner_id,'${h3}',1);
 update enterprise_verification_state set lead3=lead,org3=(result->>'organization_id')::uuid;
 update public.enterprise_activation_links set expires_at=now()-interval '1 minute' where token_hash='${h3}';
 begin perform public.enterprise_finish_setup('${h3}','${outsider}','Expired','[]');raise exception 'Expired token accepted' using errcode='P0004';exception when sqlstate 'P0001' then if sqlerrm<>'Invalid activation' then raise;end if;end;
 perform public.enterprise_reissue((result->>'organization_id')::uuid,s.owner_id,'${h4}',48);
 begin perform public.enterprise_finish_setup('${h3}','${outsider}','Revoked','[]');raise exception 'Revoked token accepted' using errcode='P0004';exception when sqlstate 'P0001' then if sqlerrm<>'Invalid activation' then raise;end if;end;
 begin perform public.enterprise_finish_setup('${h4}','${outsider}','Rollback','[{"name":"Valid","departments":[""]}]');raise exception 'Invalid setup committed' using errcode='P0004';exception when check_violation then null;end;
 if exists(select 1 from public.enterprise_admins where user_id='${outsider}') then raise exception 'Partial membership committed';end if;
 update public.organizations set status='Suspended' where id=s.org1;
end $$;
${claim(a)}
do $$ begin if exists(select 1 from public.facilities where organization_id=(select org1 from enterprise_verification_state)) then raise exception 'Suspended organization access allowed';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$ declare n integer;begin
 select count(*) into n from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname=any(array['organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_audit_logs','koko_admins','enterprise_support_tickets','enterprise_rate_limits']) and relrowsecurity;
 if n<>12 then raise exception 'RLS not enabled on all Enterprise tables';end if;
end $$;
rollback;
`;
const transactional=process.argv.includes('--transactional');
// Catalog inspection is read-only. Stateful cross-tenant testing is also
// covered through real Auth sessions by test-enterprise-live-api.mjs.
const query=transactional?rollbackQuery:`
select
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname=any(array['organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_audit_logs','koko_admins','enterprise_support_tickets','enterprise_rate_limits']) and c.relrowsecurity) as rls_tables,
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname=any(array['organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_audit_logs','koko_admins','enterprise_support_tickets','enterprise_rate_limits']) and has_table_privilege('anon',c.oid,'SELECT')) as anonymous_read_grants,
 exists(select 1 from auth.users u join public.koko_admins k on k.user_id=u.id where lower(u.email)='support@shiftnote.care' and k.role='shiftnote_owner') as owner_assigned,
 has_function_privilege('authenticated','public.enterprise_finish_setup(text,uuid,text,jsonb)','EXECUTE') as public_setup_execute,
 has_function_privilege('authenticated','public.enterprise_approve(uuid,uuid,text,integer)','EXECUTE') as public_approval_execute,
 has_function_privilege('authenticated','public.enterprise_reissue(uuid,uuid,text,integer)','EXECUTE') as public_reissue_execute;`;
const response=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{method:'POST',headers:{Authorization:'Bearer '+process.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:!transactional}),signal:AbortSignal.timeout(45000)});
if(!response.ok){const data=await response.json().catch(()=>({}));const message=String(data.message||'').replaceAll(process.env.SUPABASE_ACCESS_TOKEN,'[redacted]');console.error(JSON.stringify({passed:false,status:response.status,message:message.slice(0,500)}));process.exitCode=1;}
else if(transactional)console.log('Live owner, approval, setup, expiration, replay, revocation, CRUD, RLS, cross-organization denial, suspension, and rollback checks passed. All verification fixtures were rolled back.');
else {
 const [row]=await response.json();
 if(Number(row.rls_tables)!==12||Number(row.anonymous_read_grants)!==0||!row.owner_assigned||row.public_setup_execute||row.public_approval_execute||row.public_reissue_execute)throw new Error('Enterprise live RLS catalog verification failed.');
 console.log('Live owner assignment, RLS on all 12 tables, anonymous denial, and service-only provisioning RPC privileges verified.');
}
