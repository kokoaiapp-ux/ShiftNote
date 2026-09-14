import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const staff='10000000-0000-4000-8000-000000000001',one='10000000-0000-4000-8000-000000000002',two='10000000-0000-4000-8000-000000000003',clinician='10000000-0000-4000-8000-000000000004';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260911234416_enterprise_backend.sql',import.meta.url),'utf8'));
 for(const [id,email] of [[staff,'staff@example.test'],[one,'one@example.test'],[two,'two@example.test'],[clinician,'clinician@example.test']])await db.query('insert into auth.users values($1,$2)',[id,email]);
 await db.query("insert into public.koko_admins(user_id,role) values($1,'shiftnote_owner')",[staff]);
 const addLead=async email=>(await db.query("insert into public.enterprise_leads(organization_name,contact_name,job_title,work_email,country,clinicians,facilities,current_ehr,interested_in_integration,timeline) values('Test Organization','Admin','IT Admin',$1,'US',10,1,'Epic','Yes','Immediately') returning id",[email])).rows[0].id;
 const lead1=await addLead('one@example.test'),lead2=await addLead('two@example.test');
 const approve=async(id,hash)=>(await db.query('select public.enterprise_approve($1,$2,$3,48) as result',[id,staff,hash])).rows[0].result;
 const first=await approve(lead1,'a'.repeat(64)),second=await approve(lead2,'b'.repeat(64));
 const setup=JSON.stringify([{name:'Main Facility',kind:'Hospital',location:'Test',departments:['Nursing']}]);
 await db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['a'.repeat(64),one,'First Admin',setup]);
 await db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['b'.repeat(64),two,'Second Admin',setup]);
 assert.equal((await db.query('select status from public.organizations where id=$1',[first.organization_id])).rows[0].status,'Active');
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['a'.repeat(64),one,'Replay',setup]),/Invalid activation/);
 async function asUser(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);}
 await asUser(one);
 assert.equal((await db.query('select * from public.organizations')).rows.length,1);
 assert.equal((await db.query('select * from public.facilities')).rows.length,1);
 assert.equal((await db.query('select * from public.departments')).rows.length,1);
 assert.equal((await db.query('select * from public.enterprise_leads')).rows.length,0);
 assert.equal((await db.query('select * from public.koko_admins')).rows.length,0);
 await assert.rejects(db.query("update public.organizations set status='Active' where id=$1",[first.organization_id]));
 await assert.rejects(db.query('insert into public.koko_admins(user_id) values($1)',[one]));
 await assert.rejects(db.query('select * from public.enterprise_activation_links'));
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['c'.repeat(64),one,'Forbidden',setup]));
 await assert.rejects(db.query("insert into public.facilities(organization_id,name) values($1,'Intrusion')",[second.organization_id]));
 await db.query("update public.organizations set name='Updated Organization' where id=$1",[first.organization_id]);
 await db.query("insert into public.facilities(organization_id,name) values($1,'New Facility')",[first.organization_id]);
 await db.exec('reset role');
 const foreignFacility=(await db.query('select id from public.facilities where organization_id=$1',[second.organization_id])).rows[0].id;
 await asUser(one);
 await assert.rejects(db.query("insert into public.departments(organization_id,facility_id,name) values($1,$2,'Cross tenant')",[first.organization_id,foreignFacility]));
 await assert.rejects(db.query("insert into public.enterprise_audit_logs(action,entity_table) values('Fake','organizations')"));
 await asUser(clinician);
 for(const table of ['organizations','facilities','departments','enterprise_admins','enterprise_contracts','enterprise_integrations','enterprise_support_tickets','enterprise_audit_logs'])assert.equal((await db.query(`select * from public.${table}`)).rows.length,0,`Clinician denied ${table}`);
 await asUser(staff);assert.equal((await db.query('select * from public.organizations')).rows.length,2);assert.equal((await db.query('select * from public.enterprise_leads')).rows.length,2);
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
 await db.query("update public.organizations set status='Suspended' where id=$1",[first.organization_id]);
 await asUser(one);assert.equal((await db.query('select * from public.facilities')).rows.length,0,'Suspension revokes data access');
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
 const lead3=await addLead('clinician@example.test');const third=await approve(lead3,'c'.repeat(64));
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['c'.repeat(64),one,'Wrong user',setup]),/Email mismatch/);
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['c'.repeat(64),clinician,'Rollback',JSON.stringify([{name:'Valid',departments:[''] }]) ]));
 assert.equal((await db.query('select * from public.facilities where organization_id=$1',[third.organization_id])).rows.length,0,'Failed setup rolls back all changes');
 await db.query('update public.enterprise_activation_links set expires_at=now()-interval \'1 hour\' where organization_id=$1',[third.organization_id]);
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['c'.repeat(64),clinician,'Expired',setup]),/Invalid activation/);
 await db.query('select public.enterprise_reissue($1,$2,$3,48)',[third.organization_id,staff,'d'.repeat(64)]);
 await assert.rejects(db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['c'.repeat(64),clinician,'Revoked',setup]),/Invalid activation/);
 await db.query('select public.enterprise_finish_setup($1,$2,$3,$4::jsonb)',['d'.repeat(64),clinician,'New Admin',setup]);
 assert.ok((await db.query("select * from public.enterprise_audit_logs where action='Setup Completed'")).rows.length>=3);
 await db.query('delete from public.organizations where id=$1',[second.organization_id]);
 assert.equal((await db.query('select * from public.facilities where organization_id=$1',[second.organization_id])).rows.length,0,'Cascade deletion succeeds');
 const salesLead=await addLead('sales@example.test');
 await db.query("insert into public.enterprise_contracts(organization_id,start_date,end_date,status) values($1,'2026-01-01','2027-01-01','Draft')",[third.organization_id]);
 await db.query("insert into public.enterprise_support_tickets(organization_id,subject,message) values($1,'Test','Test')",[third.organization_id]);
 for(const role of ['shiftnote_owner','shiftnote_admin','shiftnote_sales','shiftnote_support']){
   await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
   await db.query('update public.koko_admins set role=$1 where user_id=$2',[role,staff]);
   const manager=['shiftnote_owner','shiftnote_admin'].includes(role);
   if(!manager)await assert.rejects(db.query('select public.enterprise_approve($1,$2,$3,48)',[salesLead,staff,'e'.repeat(64)]),/Forbidden/);
   await asUser(staff);
   assert.equal((await db.query('select public.is_koko_admin() as allowed')).rows[0].allowed,manager);
   assert.equal((await db.query('select * from public.enterprise_leads')).rows.length>0,manager||role==='shiftnote_sales');
   assert.equal((await db.query('select * from public.enterprise_contracts')).rows.length>0,manager||role==='shiftnote_sales');
   assert.equal((await db.query('select * from public.enterprise_support_tickets')).rows.length>0,manager||role==='shiftnote_support');
   await assert.rejects(db.query("update public.koko_admins set role='shiftnote_owner' where user_id=$1",[staff]));
   await assert.rejects(db.query('select * from public.enterprise_activation_links'));
   if(role==='shiftnote_sales'){
     assert.equal((await db.query("update public.enterprise_leads set status='Demo Completed' where id=$1 returning id",[salesLead])).rows.length,1);
     await assert.rejects(db.query("update public.enterprise_leads set status='Payment Received' where id=$1",[salesLead]));
     await assert.rejects(db.query("update public.enterprise_leads set organization_id=$1 where id=$2",[third.organization_id,salesLead]));
     await assert.rejects(db.query("insert into public.enterprise_contracts(organization_id,start_date,end_date,status) values($1,'2026-01-01','2027-01-01','Signed')",[third.organization_id]));
   }
   if(role==='shiftnote_support'){
     assert.equal((await db.query("update public.enterprise_support_tickets set status='Resolved' returning id")).rows.length,1);
     assert.equal((await db.query("update public.enterprise_leads set status='Demo Completed' returning id")).rows.length,0);
   }
 }
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
 const rls=(await db.query("select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity")).rows;
 assert.deepEqual(rls,[],'RLS enabled on every Enterprise table');
 console.log('Enterprise migration, roles, tenant isolation, suspension, CRUD, cross-tenant FKs, activation expiry/reissue/replay, rollback, audit protection, and cascades passed.');
}finally{await db.close();}
