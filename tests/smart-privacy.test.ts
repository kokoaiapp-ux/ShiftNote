import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { inspect } from 'node:util';
import { smartHandlers, SmartFailure, safeFailureReason, callbackUrl, type SmartStore, type TokenBundle } from '../lib/server/smart/core';
import { hash, unseal } from '../lib/server/smart/crypto';
import { readJson } from '../lib/server/smart/exchange';
import type { SmartConnection, SmartLaunch } from '../types/smart';

// Synthetic only. No environment credentials or real provider requests are used.
const markers={code:'synthetic-private-code',launch:'synthetic-private-launch',access:'synthetic-private-access',refresh:'synthetic-private-refresh',secret:'synthetic-private-secret'};
const basic='Basic '+Buffer.from('synthetic-client:'+markers.secret).toString('base64');
const bearer='Bearer '+markers.access;
const sensitiveError=()=>new Error(JSON.stringify({...markers,Authorization:basic,bearer}),{cause:{...markers}});

test('audit and exception reasons accept only fixed internal labels',()=>{
  for(const value of [...Object.values(markers),basic,bearer,'oauth_error\n'+markers.secret,{},null]) {
    assert.equal(safeFailureReason(value),'callback_unavailable');
  }
  const failure=new SmartFailure(markers.secret);
  assert.equal(failure.reason,'callback_unavailable');
  assert.ok(!inspect(failure).includes(markers.secret));
  assert.equal(safeFailureReason('token_exchange_failed'),'token_exchange_failed');
});

test('malformed token JSON does not escape through parser exception messages, stacks, or causes',async()=>{
  await assert.rejects(readJson(new Response(markers.access+' '+markers.refresh)),error=>{
    assert.ok(error instanceof Error);
    assert.equal(error.message,'Invalid SMART provider JSON.');
    assert.equal(error.cause,undefined);
    for(const marker of Object.values(markers))assert.ok(!inspect(error).includes(marker));
    return true;
  });
});

test('callback logs, audits, storage, responses and clean redirects suppress sensitive values on success and every failure boundary',async(t)=>{
  const logged:unknown[]=[];
  for(const method of ['log','info','warn','error','debug','trace','dir','table'] as const)t.mock.method(console,method,(...args:unknown[])=>{logged.push(args);});
  for(const mode of ['success','oauth','exchange','identity','complete','claim','connection','audit','unsafe_reason']) {
    const key=randomBytes(32),now=Date.now();
    const connection:SmartConnection={id:randomUUID(),organization_id:randomUUID(),enabled:true,vendor:'smart',issuer:'https://ehr.example.com/fhir',authorization_endpoint:'https://ehr.example.com/authorize',token_endpoint:'https://ehr.example.com/token',oidc_issuer:'https://ehr.example.com',jwks_uri:'https://ehr.example.com/jwks',client_id:'synthetic-client',client_auth_method:'client_secret_basic',scopes:['openid','fhirUser','launch'],created_at:new Date(now).toISOString(),updated_at:new Date(now).toISOString()};
    let launch:SmartLaunch|undefined;
    const audits:string[]=[],sessions:{hash:string;encrypted:string}[]=[];
    const store:SmartStore={
      async connectionByIssuer(){return connection;},
      async connectionById(){if(mode==='connection')throw sensitiveError();if(mode==='unsafe_reason')throw new SmartFailure(markers.secret);return connection;},
      async createLaunch(value){launch={...value,updated_at:value.created_at,consumed_at:null};},
      async claim(stateHash){if(mode==='claim')throw sensitiveError();assert.equal(stateHash,launch?.state_hash);return {reason:'ok',launch};},
      async complete(_launch,sessionHash,encrypted){if(mode==='complete')throw sensitiveError();sessions.push({hash:sessionHash,encrypted});audits.push('success');},
      async audit(reason){if(mode==='audit')throw sensitiveError();audits.push(reason);},
    };
    const tokens:TokenBundle={access_token:markers.access,refresh_token:markers.refresh,id_token:'synthetic-private-id-token',token_type:'Bearer',expires_in:3600};
    const handlers=smartHandlers({store,key:()=>key,now:()=>now,async exchange(_connection,code){assert.equal(code,markers.code);if(mode==='exchange')throw sensitiveError();return tokens;},async identity(){if(mode==='identity')throw sensitiveError();return {subject:'synthetic-subject',fhirUser:'https://ehr.example.com/fhir/Practitioner/synthetic'};}});
    const start=await handlers.launch(new Request('https://www.shiftnote.care/fhir/launch?'+new URLSearchParams({iss:connection.issuer,launch:markers.launch})));
    const state=new URL(start.headers.get('location')!).searchParams.get('state')!;
    const params=new URLSearchParams({state,code:markers.code,launch:markers.launch});
    if(mode==='oauth'||mode==='audit'){params.set('error',markers.secret);params.set('error_description',JSON.stringify(markers));}
    const response=await handlers.callback(new Request(callbackUrl+'?'+params,{headers:{cookie:start.headers.get('set-cookie')!.split(';')[0],authorization:mode==='success'?basic:bearer}}));
    assert.equal(response.status,303);
    assert.equal(response.headers.get('location'),'https://www.shiftnote.care'+(mode==='success'?'/enterprise/clinician':'/fhir/error'));
    assert.equal(new URL(response.headers.get('location')!).search,'');
    assert.equal(response.headers.get('referrer-policy'),'no-referrer');
    assert.match(response.headers.get('cache-control')!,/no-store/);
    const body=await response.text();assert.equal(body,'');
    const persistedAndVisible=JSON.stringify({launch,sessions,audits,headers:[...response.headers],body})+inspect(logged,{depth:10});
    for(const marker of [...Object.values(markers),basic,bearer,state,tokens.id_token])assert.ok(!persistedAndVisible.includes(marker),'Sensitive synthetic data escaped in '+mode);
    if(mode==='success'){
      assert.equal(sessions.length,1);
      const payload=unseal<{tokens:TokenBundle}>(sessions[0].encrypted,key,`session:${sessions[0].hash}:${connection.organization_id}`);
      assert.equal(payload.tokens.refresh_token,markers.refresh);
      assert.equal(payload.tokens.access_token,markers.access);
      assert.equal(launch?.state_hash,hash(state));
    }else assert.equal(sessions.length,0);
  }
  assert.deepEqual(logged,[]);
});
