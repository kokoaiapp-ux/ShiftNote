import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import { createHash } from 'node:crypto';
import type { SmartConnection } from '@/types/smart';
import { callbackUrl, safeEndpoint, type TokenBundle } from './core';

export async function readJson(response:Response) {
  if(!response.ok||!response.body)throw new Error('SMART provider request failed.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)throw new Error('SMART response exceeded limit.');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;
}
export function providerClient(secrets:(connection:SmartConnection)=>Record<string,string>,fetcher:typeof fetch=fetch) {
  return {
    async exchange(connection:SmartConnection,code:string,verifier:string):Promise<TokenBundle> {
      const body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:callbackUrl,code_verifier:verifier});
      // Basic credentials belong exclusively in the Authorization header.
      if(connection.client_auth_method!=='client_secret_basic')body.set('client_id',connection.client_id);
      const headers:Record<string,string>={'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'};
      if(connection.client_auth_method!=='none') {
        const secret=secrets(connection)[connection.id];if(!secret)throw new Error('SMART client authentication is not configured.');
        if(connection.client_auth_method==='client_secret_basic') {
          const encode=(value:string)=>new URLSearchParams({v:value}).toString().slice(2);
          headers.Authorization='Basic '+Buffer.from(`${encode(connection.client_id)}:${encode(secret)}`).toString('base64');
        } else body.set('client_secret',secret);
      }
      const response=await fetcher(safeEndpoint(connection.token_endpoint),{method:'POST',headers,body,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
      const raw=await readJson(response);
      if(typeof raw.access_token!=='string'||typeof raw.id_token!=='string'||typeof raw.token_type!=='string'||typeof raw.expires_in!=='number')throw new Error('Invalid SMART token response.');
      const tokens:TokenBundle={access_token:raw.access_token,id_token:raw.id_token,token_type:raw.token_type,expires_in:raw.expires_in};
      for(const field of ['refresh_token','scope','patient','encounter'] as const)if(typeof raw[field]==='string')tokens[field]=raw[field];
      return tokens;
    },
    async identity(connection:SmartConnection,tokens:TokenBundle,nonce:string) {
      const response=await fetcher(safeEndpoint(connection.jwks_uri),{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
      const jwks=await readJson(response);
      if(!Array.isArray(jwks.keys)||jwks.keys.length>30)throw new Error('Invalid SMART signing keys.');
      const {payload}=await jwtVerify(tokens.id_token,createLocalJWKSet(jwks as unknown as JSONWebKeySet),{issuer:connection.oidc_issuer,audience:connection.client_id,algorithms:['RS256','ES256'],requiredClaims:['sub','exp','iat','nonce'],clockTolerance:5,maxTokenAge:600});
      if(payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||typeof payload.fhirUser!=='string')throw new Error('Invalid SMART clinician identity.');
      if(payload.at_hash!==undefined&&payload.at_hash!==createHash('sha256').update(tokens.access_token).digest().subarray(0,16).toString('base64url'))throw new Error('Access token binding failed.');
      if(payload.azp!==undefined&&payload.azp!==connection.client_id)throw new Error('Invalid authorized party.');
      if(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==connection.client_id)throw new Error('Missing authorized party.');
      const base=connection.issuer.replace(/\/$/,'')+'/';
      const user=new URL(payload.fhirUser,base);
      if(!user.href.startsWith(base)||user.search||user.hash||! /^(Practitioner|PractitionerRole)\/[A-Za-z0-9.-]{1,64}$/.test(user.href.slice(base.length)))throw new Error('Not an authorized clinician identity.');
      return {subject:payload.sub,fhirUser:user.href};
    }
  };
}
