import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const digest=value=>createHash('sha256').update(value).digest('hex');
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
  await db.exec(await readFile('supabase/migrations/20260911234416_enterprise_backend.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20260916071317_smart_callback.sql','utf8'));
  const org=(await db.query("insert into public.organizations(name,status) values('SMART SQL Test','Active') returning id")).rows[0].id;
  const other=(await db.query("insert into public.organizations(name,status) values('Other SQL Test','Active') returning id")).rows[0].id;
  const connection=(await db.query("insert into public.smart_connections(organization_id,enabled,issuer,authorization_endpoint,token_endpoint,oidc_issuer,jwks_uri,client_id) values($1,true,'https://ehr.example.com/fhir','https://auth.example.com/authorize','https://auth.example.com/token','https://auth.example.com','https://auth.example.com/jwks','test-client') returning *",[org])).rows[0];
  async function launch(label,expiry="now()+interval '10 minutes'",organization=org) {
    return (await db.query(`insert into public.smart_launch_sessions(organization_id,connection_id,state_hash,browser_hash,encrypted_payload,connection_version,expires_at,created_at) values($1,$2,$3,$4,'encrypted-test-payload',$5,${expiry},now()) returning id`,[organization,connection.id,digest(label),digest('browser'),connection.updated_at])).rows[0].id;
  }
  async function claim(label,browser='browser'){return (await db.query('select public.smart_claim_launch($1,$2) as result',[digest(label),digest(browser)])).rows[0].result;}
  async function complete(id,label='session'){return db.query("select public.smart_complete_callback($1,$2,'encrypted-token-payload',now()+interval '1 hour')",[id,digest(label)]);}
  const first=await launch('valid');assert.equal((await claim('valid','wrong')).reason,'browser_mismatch');assert.equal((await claim('valid')).reason,'ok');assert.equal((await claim('valid')).reason,'reused_state');
  await complete(first);await assert.rejects(complete(first,'duplicate'));
  assert.equal((await db.query('select encrypted_payload from public.smart_launch_sessions where id=$1',[first])).rows[0].encrypted_payload,'');
  assert.equal((await db.query("select count(*)::int n from public.enterprise_audit_logs where action='SMART Callback Succeeded'")).rows[0].n,1);
  assert.equal((await claim('unknown')).reason,'invalid_state');
  const expired=await launch('expired');await db.query("update public.smart_launch_sessions set created_at=now()-interval '11 minutes',expires_at=now()-interval '1 minute' where id=$1",[expired]);assert.equal((await claim('expired')).reason,'expired_state');
  await assert.rejects(launch('too-long',"now()+interval '11 minutes'"));
  await assert.rejects(launch('cross-organization',undefined,other));
  const pending=await launch('pending');await assert.rejects(complete(pending));
  await db.query("update public.organizations set status='Suspended' where id=$1",[org]);assert.equal((await claim('pending')).reason,'connection_unavailable');
  await db.query("update public.organizations set status='Active' where id=$1",[org]);
  const raced=await launch('raced');const results=await Promise.all([claim('raced'),claim('raced')]);assert.deepEqual(results.map(r=>r.reason).sort(),['ok','reused_state']);
  await db.query('update public.smart_connections set enabled=false where id=$1',[connection.id]);await assert.rejects(complete(raced));
  for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    for(const table of ['smart_connections','smart_launch_sessions','smart_sessions'])await assert.rejects(db.query('select * from public.'+table));
    await assert.rejects(db.query('select public.smart_claim_launch($1,$2)',[digest('valid'),digest('browser')]));
    await assert.rejects(db.query("select public.smart_complete_callback($1,$2,'encrypted',now()+interval '1 hour')",[first,digest('x')]));
    await db.exec('reset role');
  }
  assert.equal((await db.query("select count(*)::int n from pg_class where relnamespace='public'::regnamespace and relname in ('smart_connections','smart_launch_sessions','smart_sessions') and relrowsecurity")).rows[0].n,3);
  await db.query('delete from public.organizations where id=$1',[org]);
  for(const table of ['smart_connections','smart_launch_sessions','smart_sessions'])assert.equal((await db.query('select count(*)::int n from public.'+table)).rows[0].n,0);
  await db.exec(await readFile('scripts/sql/test-smart-live-rollback.sql','utf8'));
  assert.equal((await db.query("select count(*)::int n from public.organizations where name like 'SMART rollback verification %'")).rows[0].n,0);
  console.log('PASS SMART migration, RLS denial, cross-organization FKs, atomic single-use state, expiry, disabled connections, encrypted-payload erasure, success audit, cascade cleanup, and rollback-only live verification SQL.');
}finally{await db.close();}
