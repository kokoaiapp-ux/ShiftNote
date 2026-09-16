import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { smartHandlers, callbackUrl, launchCookie, sessionCookie, safeEndpoint, type SmartStore, type TokenBundle } from '../lib/server/smart/core';
import { challenge, hash, seal, unseal } from '../lib/server/smart/crypto';
import type { SmartConnection, SmartLaunch } from '../types/smart';

const sampleTokens:TokenBundle={access_token:'test-access-token',id_token:'test-id-token',token_type:'Bearer',expires_in:3600};
async function fixture() {
  const clock={value:Date.now()},key=randomBytes(32);
  const connection:SmartConnection={id:randomUUID(),organization_id:randomUUID(),enabled:true,vendor:'smart',issuer:'https://ehr.example.com/fhir',authorization_endpoint:'https://auth.example.com/authorize',token_endpoint:'https://auth.example.com/token',oidc_issuer:'https://auth.example.com',jwks_uri:'https://auth.example.com/jwks',client_id:'unit-test-client',client_auth_method:'none',scopes:['openid','fhirUser','launch'],created_at:new Date(clock.value).toISOString(),updated_at:new Date(clock.value).toISOString()};
  const launches:SmartLaunch[]=[],audit:string[]=[],sessions:{hash:string;encrypted:string}[]=[],calls:{code:string;verifier:string}[]=[];
  let rejectExchange=false,rejectIdentity=false,rejectSave=false;
  const store:SmartStore={
    async connectionByIssuer(issuer){return connection.enabled&&issuer===connection.issuer?connection:null;},
    async connectionById(id){return connection.enabled&&id===connection.id?connection:null;},
    async createLaunch(value){launches.push({...value,updated_at:value.created_at,consumed_at:null});},
    async claim(stateHash,browserHash){
      const launch=launches.find(l=>l.state_hash===stateHash);
      if(!launch)return {reason:'invalid_state'};
      if(launch.browser_hash!==browserHash)return {reason:'browser_mismatch'};
      if(launch.consumed_at)return {reason:'reused_state'};
      if(Date.parse(launch.expires_at)<=clock.value)return {reason:'expired_state'};
      launch.consumed_at=new Date(clock.value).toISOString();return {reason:'ok',launch};
    },
    async complete(_launch,sessionHash,encrypted){if(rejectSave)throw new Error('Test database unavailable');sessions.push({hash:sessionHash,encrypted});audit.push('success');},
    async audit(reason){audit.push(reason);}
  };
  const handlers=smartHandlers({store,key:()=>key,now:()=>clock.value,async exchange(_connection,code,verifier){calls.push({code,verifier});if(rejectExchange)throw new Error('Sensitive provider error must not escape');return sampleTokens;},async identity(){if(rejectIdentity)throw new Error('Invalid signature');return {subject:'test-subject',fhirUser:'https://ehr.example.com/fhir/Practitioner/test'};}});
  const start=await handlers.launch(new Request('https://www.shiftnote.care/fhir/launch?'+new URLSearchParams({iss:connection.issuer,launch:'test-launch-context'})));
  const authorization=new URL(start.headers.get('location')!);
  const state=authorization.searchParams.get('state')!,cookie=start.headers.get('set-cookie')!.split(';')[0];
  function request(params:Record<string,string>={state,code:'test-authorization-code'},binding=cookie) {return new Request(callbackUrl+'?'+new URLSearchParams(params),{headers:{cookie:binding}});}
  return {handlers,clock,key,connection,launches,audit,sessions,calls,authorization,state,cookie,request,failExchange(){rejectExchange=true;},failIdentity(){rejectIdentity=true;},failSave(){rejectSave=true;}};
}
async function errorResponse(response:Response) {
  assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://www.shiftnote.care/fhir/error');
  assert.equal(await response.text(),'');assert.match(response.headers.get('cache-control')!,/no-store/);
  assert.equal(response.headers.get('set-cookie'),null);
}
test('valid callback uses S256 PKCE, encrypts tokens, audits success, and redirects safely',async()=>{
  const f=await fixture(),response=await f.handlers.callback(f.request());
  assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://www.shiftnote.care/enterprise/clinician');
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].code,'test-authorization-code');
  assert.equal(f.authorization.searchParams.get('code_challenge_method'),'S256');
  assert.equal(f.authorization.searchParams.get('code_challenge'),challenge(f.calls[0].verifier));
  assert.deepEqual(f.audit,['success']);assert.equal(f.sessions.length,1);
  assert.ok(!f.sessions[0].encrypted.includes(sampleTokens.access_token));
  assert.ok(!f.launches[0].encrypted_payload.includes(f.calls[0].verifier));
  const cookie=response.headers.getSetCookie().find(v=>v.startsWith(sessionCookie+'='))!;
  assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);assert.match(cookie,/Path=\//);
  const handle=cookie.split(';')[0].split('=')[1];assert.equal(hash(handle),f.sessions[0].hash);
  const payload=unseal<{tokens:TokenBundle}>(f.sessions[0].encrypted,f.key,`session:${hash(handle)}:${f.connection.organization_id}`);
  assert.equal(payload.tokens.access_token,sampleTokens.access_token);
  assert.ok(!JSON.stringify([...response.headers]).includes(sampleTokens.access_token));
});
test('missing state is denied and audited without an exchange',async()=>{const f=await fixture();await errorResponse(await f.handlers.callback(f.request({code:'test'})));assert.deepEqual(f.audit,['missing_state']);assert.equal(f.calls.length,0);});
test('invalid or unknown state is denied',async()=>{const f=await fixture();await errorResponse(await f.handlers.callback(f.request({state:randomBytes(32).toString('base64url'),code:'test'})));assert.deepEqual(f.audit,['invalid_state']);});
test('expired state is denied',async()=>{const f=await fixture();f.clock.value+=600000;await errorResponse(await f.handlers.callback(f.request()));assert.deepEqual(f.audit,['expired_state']);});
test('reused state never exchanges twice',async()=>{const f=await fixture();await f.handlers.callback(f.request());await errorResponse(await f.handlers.callback(f.request()));assert.equal(f.calls.length,1);assert.equal(f.audit.at(-1),'reused_state');});
test('simultaneous callbacks exchange exactly once',async()=>{const f=await fixture();await Promise.all([f.handlers.callback(f.request()),f.handlers.callback(f.request())]);assert.equal(f.calls.length,1);assert.equal(f.sessions.length,1);});
test('missing code consumes valid state and cannot be retried',async()=>{const f=await fixture();await errorResponse(await f.handlers.callback(f.request({state:f.state})));await errorResponse(await f.handlers.callback(f.request()));assert.deepEqual(f.audit,['missing_code','reused_state']);assert.equal(f.calls.length,0);});
test('OAuth errors are generic, audited, and do not exchange codes',async()=>{const f=await fixture();await errorResponse(await f.handlers.callback(f.request({state:f.state,error:'access_denied',error_description:'secret provider details'})));assert.deepEqual(f.audit,['oauth_error']);assert.equal(f.calls.length,0);});
test('token exchange failures do not leak error details and cannot be retried',async()=>{const f=await fixture();f.failExchange();await errorResponse(await f.handlers.callback(f.request()));await errorResponse(await f.handlers.callback(f.request()));assert.deepEqual(f.audit,['token_exchange_failed','reused_state']);assert.equal(f.calls.length,1);});
test('browser binding must match, and a mismatch does not consume another browser state',async()=>{const f=await fixture();await errorResponse(await f.handlers.callback(f.request(undefined,launchCookie+'='+randomBytes(32).toString('base64url'))));assert.equal(f.launches[0].consumed_at,null);assert.equal(f.calls.length,0);assert.equal((await f.handlers.callback(f.request())).headers.get('location'),'https://www.shiftnote.care/enterprise/clinician');});
test('missing cookie, duplicate parameters, and issuer mixup are rejected',async()=>{
  const f=await fixture();await errorResponse(await f.handlers.callback(f.request(undefined,'')));
  await errorResponse(await f.handlers.callback(new Request(callbackUrl+'?state='+f.state+'&state='+f.state,{headers:{cookie:f.cookie}})));
  await errorResponse(await f.handlers.callback(f.request({state:f.state,code:'test',iss:'https://attacker.example.com'})));assert.equal(f.calls.length,0);
});
test('identity verification and session persistence failures cannot create authenticated cookies',async()=>{
  const f=await fixture();f.failIdentity();await errorResponse(await f.handlers.callback(f.request()));assert.equal(f.sessions.length,0);assert.equal(f.audit.at(-1),'identity_verification_failed');
  const other=await fixture();other.failSave();await errorResponse(await other.handlers.callback(other.request()));assert.equal(other.audit.at(-1),'callback_unavailable');
});
test('disabled or changed connections revoke the pending authorization',async()=>{
  const f=await fixture();f.connection.enabled=false;await errorResponse(await f.handlers.callback(f.request()));assert.equal(f.calls.length,0);
  const other=await fixture();other.connection.updated_at=new Date(other.clock.value+1000).toISOString();await errorResponse(await other.handlers.callback(other.request()));assert.equal(other.calls.length,0);
});
test('encrypted payload authentication binds organization and record context',()=>{
  const key=randomBytes(32),value=seal({secret:'test'},key,'session:a:organization-a');
  assert.throws(()=>unseal(value,key,'session:a:organization-b'));assert.throws(()=>unseal(value,randomBytes(32),'session:a:organization-a'));
});
test('token endpoint policy rejects insecure and local destinations',()=>{
  for(const url of ['http://example.com/token','https://127.0.0.1/token','https://localhost/token','https://example.com:444/token','https://user:pass@example.com/token','https://example.com/token#fragment','https://[::1]/token'])assert.throws(()=>safeEndpoint(url));
});
