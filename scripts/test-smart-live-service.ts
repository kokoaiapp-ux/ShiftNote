// Synthetic SMART database verification through the existing service-role API.
// No Epic HTTP requests, accounts, organizations, Professional data, or setup flows.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { encryptionKey, hash, opaque, seal } from '../lib/server/smart/crypto';
import type { SmartDatabase, SmartConnection } from '../types/smart';

const sandboxOrg = '976673f4-d6bc-4399-adc1-35e6e1eea0a3';
let stage = 'preflight';
const connectionId = randomUUID();
function checked<T>(r: {data:T;error:unknown}):T { if(r.error)throw new Error('Database verification failed.');return r.data; }

async function main() {
  const env = parseEnv(readFileSync('.env.local','utf8'));
  const url=env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=env.SUPABASE_SERVICE_ROLE_KEY,publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(url && serviceKey && publicKey,'Supabase service configuration is required.');
  assert.equal(env.SUPABASE_PROJECT_REF,'qzdvfmtfjasdeqrfdspm');
  assert.equal(new URL(url).hostname,'qzdvfmtfjasdeqrfdspm.supabase.co');
  const key=encryptionKey(env.SMART_SESSION_ENCRYPTION_KEY);
  const db=createClient<SmartDatabase>(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const org=checked(await db.from('organizations').select('name,status').eq('id',sandboxOrg).single());
  assert.equal(org?.name,'ShiftNote Epic Sandbox Test');assert.equal(org.status,'Active');
  const other=checked(await db.from('organizations').select('id').neq('id',sandboxOrg).limit(1));
  assert.ok(other);assert.equal(other.length,1); // Foreign ID is read-only; that organization's data is never changed.
  const issuer=`https://example.com/smart-database-verification/${connectionId}`;
  const now=()=>new Date().toISOString();
  const later=(seconds:number)=>new Date(Date.now()+seconds*1000).toISOString();
  const browser=hash(opaque());
  let fixtureCreated=false;
  try {
    stage='synthetic SMART connection';
    const connection=checked(await db.from('smart_connections').insert({id:connectionId,organization_id:sandboxOrg,vendor:'database-verification',enabled:true,issuer,authorization_endpoint:'https://example.com/authorize',token_endpoint:'https://example.com/token',oidc_issuer:'https://example.com',jwks_uri:'https://example.com/jwks',client_id:'synthetic-database-test',client_auth_method:'none',scopes:['openid','fhirUser','launch']}).select('*').single()) as SmartConnection;
    fixtureCreated=true;
    function launchRow() {
      const id=randomUUID();
      return {id,organization_id:sandboxOrg,connection_id:connectionId,state_hash:hash(opaque()),browser_hash:browser,encrypted_payload:seal({verifier:opaque(),nonce:opaque()},key,`launch:${id}:${sandboxOrg}`),connection_version:connection.updated_at,created_at:now(),expires_at:later(300)};
    }
    stage='cross-organization launch denial';
    const denied=await db.from('smart_launch_sessions').insert({...launchRow(),organization_id:other[0].id});
    assert.equal(denied.error?.code,'23503');
    const launch=launchRow();checked(await db.from('smart_launch_sessions').insert(launch));
    async function claim(stateHash:string,binding=browser) {
      return checked(await db.rpc('smart_claim_launch',{p_state_hash:stateHash,p_browser_hash:binding})) as {reason:string};
    }
    stage='state binding, single use and expiry';
    assert.equal((await claim(hash(opaque()))).reason,'invalid_state');
    assert.equal((await claim(launch.state_hash,hash(opaque()))).reason,'browser_mismatch');
    const raced=await Promise.all([claim(launch.state_hash),claim(launch.state_hash)]);
    assert.deepEqual(raced.map(r=>r.reason).sort(),['ok','reused_state']);
    const expired={...launchRow(),created_at:later(-660),expires_at:later(-60)};
    checked(await db.from('smart_launch_sessions').insert(expired));
    assert.equal((await claim(expired.state_hash)).reason,'expired_state');
    stage='cross-organization session denial';
    const sessionHash=hash(opaque());
    const encrypted=seal({synthetic:true},key,`session:${sessionHash}:${sandboxOrg}`);
    const badSession=await db.from('smart_sessions').insert({organization_id:other[0].id,connection_id:connectionId,launch_id:launch.id,session_hash:sessionHash,encrypted_payload:encrypted,expires_at:later(600)});
    assert.equal(badSession.error?.code,'23503');
    stage='successful session, replay rejection, and audit';
    const args={p_launch_id:launch.id,p_session_hash:sessionHash,p_encrypted_payload:encrypted,p_expires_at:later(600)};
    const sessionId=checked(await db.rpc('smart_complete_callback',args));
    assert.ok(sessionId);
    const duplicate=await db.rpc('smart_complete_callback',{...args,p_session_hash:hash(opaque())});
    assert.equal(duplicate.error?.code,'23505');
    const spent=checked(await db.from('smart_launch_sessions').select('encrypted_payload').eq('id',launch.id).single());
    assert.ok(spent);assert.equal(spent.encrypted_payload,'');
    const audit=checked(await db.from('enterprise_audit_logs').select('id').eq('organization_id',sandboxOrg).eq('entity_id',sessionId).eq('action','SMART Callback Succeeded'));
    assert.ok(audit);assert.equal(audit.length,1);
    checked(await db.from('enterprise_audit_logs').insert({organization_id:sandboxOrg,entity_table:'smart_sessions',entity_id:sessionId,action:'Synthetic SMART Database Verification - No Epic OAuth or Customer Data'}));
    stage='disabled connection denial';
    const pending=launchRow();checked(await db.from('smart_launch_sessions').insert(pending));
    checked(await db.from('smart_connections').update({enabled:false}).eq('id',connectionId));
    assert.equal((await claim(pending.state_hash)).reason,'connection_unavailable');
    const anon=createClient<SmartDatabase>(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
    stage='anonymous RPC denial';
    assert.equal((await anon.rpc('smart_claim_launch',{p_state_hash:launch.state_hash,p_browser_hash:browser})).error?.code,'42501');
    assert.equal((await anon.rpc('smart_complete_callback',args)).error?.code,'42501');
    console.log('PASS live service-role SMART CRUD, cross-organization launch/session denial, concurrent single-use state, expired state, encrypted verifier erasure, session replay rejection, audit, disabled connection, and anonymous RPC denial.');
  } finally {
    if(fixtureCreated) {
      checked(await db.from('smart_connections').delete().eq('id',connectionId).eq('organization_id',sandboxOrg).eq('vendor','database-verification').eq('issuer',issuer));
      for(const table of ['smart_launch_sessions','smart_sessions'] as const) {
        const remaining=checked(await db.from(table).select('id').eq('connection_id',connectionId));assert.ok(remaining);assert.equal(remaining.length,0);
      }
      const remaining=checked(await db.from('smart_connections').select('id').eq('id',connectionId));assert.ok(remaining);assert.equal(remaining.length,0);
      console.log('PASS synthetic connection/launch/session cleanup and cascades. Audit evidence retained; existing organizations, accounts, and connections unchanged.');
    }
  }
}
main().catch(()=>{console.error(`FAIL live SMART test at ${stage}; sensitive details withheld. Synthetic fixture ID for inspection: ${connectionId}`);process.exitCode=1;});
