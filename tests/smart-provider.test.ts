import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { providerClient } from '../lib/server/smart/exchange';
import { callbackUrl, type TokenBundle } from '../lib/server/smart/core';
import type { SmartConnection } from '../types/smart';

const connection:SmartConnection={id:'00000000-0000-4000-8000-000000000001',organization_id:'00000000-0000-4000-8000-000000000002',vendor:'smart',enabled:true,issuer:'https://ehr.example.com/fhir',authorization_endpoint:'https://auth.example.com/authorize',token_endpoint:'https://auth.example.com/token',oidc_issuer:'https://auth.example.com',jwks_uri:'https://auth.example.com/jwks',client_id:'unit-test-client',client_auth_method:'none',scopes:['openid','fhirUser','launch'],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
test('server token exchange sends code, redirect URI, verifier, and configured client authentication',async()=>{
  for(const method of ['none','client_secret_basic','client_secret_post'] as const){
    let calls=0;
    const provider=providerClient(()=>({[connection.id]:'test-only-client-password'}),async(input,init)=>{
      calls++;assert.equal(String(input),connection.token_endpoint);assert.equal(init?.method,'POST');assert.equal(init?.redirect,'error');
      const form=init?.body as URLSearchParams;
      assert.equal(form.get('code'),'test-code');assert.equal(form.get('code_verifier'),'test-verifier');assert.equal(form.get('redirect_uri'),callbackUrl);assert.equal(form.get('grant_type'),'authorization_code');
      const headers=new Headers(init?.headers);
      assert.equal(headers.has('authorization'),method==='client_secret_basic');assert.equal(form.has('client_secret'),method==='client_secret_post');
      assert.equal(form.has('client_id'),method!=='client_secret_basic');
      if(method==='client_secret_basic')assert.equal(headers.get('authorization'),'Basic '+Buffer.from(connection.client_id+':test-only-client-password').toString('base64'));
      return Response.json({access_token:'test-token',token_type:'Bearer',expires_in:60,id_token:'test-id'});
    });
    assert.equal((await provider.exchange({...connection,client_auth_method:method},'test-code','test-verifier')).access_token,'test-token');assert.equal(calls,1);
  }
});
test('Basic authentication form-encodes credential components and never duplicates credentials in the body',async()=>{
  const clientId='synthetic client:+/',secret='synthetic secret:+/';
  const provider=providerClient(()=>({[connection.id]:secret}),async(_input,init)=>{
    const form=init?.body as URLSearchParams;
    assert.equal(form.has('client_id'),false);assert.equal(form.has('client_secret'),false);
    assert.equal(new Headers(init?.headers).get('authorization'),'Basic '+Buffer.from('synthetic+client%3A%2B%2F:synthetic+secret%3A%2B%2F').toString('base64'));
    return Response.json({access_token:'synthetic-token',id_token:'synthetic-id',expires_in:60,token_type:'Bearer'});
  });
  await provider.exchange({...connection,client_id:clientId,client_auth_method:'client_secret_basic'},'synthetic-code','synthetic-verifier');
});
test('token endpoint errors, redirects, malformed/oversized responses, and missing confidential secrets fail closed',async()=>{
  for(const response of [Response.json({error:'invalid_grant'},{status:400}),new Response('',{status:302,headers:{Location:'https://untrusted.example.com'}}),Response.json({token_type:'Bearer'}),new Response('x'.repeat(65537))]){
    await assert.rejects(providerClient(()=>({}),async()=>response).exchange(connection,'test','test'));
  }
  let called=false;
  await assert.rejects(providerClient(()=>({}),async()=>{called=true;return new Response();}).exchange({...connection,client_auth_method:'client_secret_basic'},'test','test'));
  assert.equal(called,false);
});
test('OIDC signature, issuer, audience, nonce, expiration, and clinician claim are actually verified',async()=>{
  const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256'};
  const provider=providerClient(()=>({}),async(input,init)=>{assert.equal(String(input),connection.jwks_uri);assert.equal(init?.redirect,'error');return Response.json({keys:[jwk]});});
  async function tokens(overrides:Record<string,unknown>={}):Promise<TokenBundle> {
    const payload={iss:connection.oidc_issuer,aud:connection.client_id,sub:'test-user',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,nonce:'expected-nonce',fhirUser:connection.issuer+'/Practitioner/unit-test',...overrides};
    const id_token=await new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'test-key'}).sign(privateKey);
    return {access_token:'test-access-token',token_type:'Bearer',expires_in:300,id_token};
  }
  assert.equal((await provider.identity(connection,await tokens(),'expected-nonce')).subject,'test-user');
  for(const overrides of [{nonce:'wrong'},{iss:'https://untrusted.example.com'},{aud:'other-client'},{exp:0},{fhirUser:connection.issuer+'/Patient/not-a-clinician'},{fhirUser:'https://untrusted.example.com/Practitioner/test'},{azp:'other-client'},{aud:[connection.client_id,'other-client']},{at_hash:'invalid-token-hash'}])await assert.rejects(provider.identity(connection,await tokens(overrides),'expected-nonce'));
  const bad=await tokens();bad.id_token=bad.id_token.slice(0,-15)+'invalid';await assert.rejects(provider.identity(connection,bad,'expected-nonce'));
});
