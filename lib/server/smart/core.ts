import { randomUUID } from 'node:crypto';
import type { SmartConnection, SmartLaunch } from '@/types/smart';
import { challenge, hash, opaque, seal, unseal } from './crypto';

export const appOrigin='https://www.shiftnote.care';
export const callbackUrl=`${appOrigin}/fhir/callback`;
export const launchCookie='__Host-shiftnote-smart-launch';
export const sessionCookie='__Host-shiftnote-smart-session';
export const privacyHeaders={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
const opaquePattern=/^[A-Za-z0-9_-]{43}$/;
export type LaunchSecret={verifier:string;nonce:string};
export type TokenBundle={access_token:string;token_type:string;expires_in:number;id_token:string;refresh_token?:string;scope?:string;patient?:string;encounter?:string};
export type ClinicianIdentity={subject:string;fhirUser:string};
export interface SmartStore {
  connectionByIssuer(issuer:string):Promise<SmartConnection|null>;
  connectionById(id:string):Promise<SmartConnection|null>;
  createLaunch(launch:Omit<SmartLaunch,'updated_at'|'consumed_at'>):Promise<void>;
  claim(stateHash:string,browserHash:string):Promise<{reason:string;launch?:SmartLaunch}>;
  complete(launch:SmartLaunch,sessionHash:string,encrypted:string,expiresAt:string):Promise<void>;
  audit(reason:string,launch?:SmartLaunch):Promise<void>;
}
export type SmartDependencies={store:SmartStore;key:()=>Buffer;now?:()=>number;exchange:(connection:SmartConnection,code:string,verifier:string)=>Promise<TokenBundle>;identity:(connection:SmartConnection,tokens:TokenBundle,nonce:string)=>Promise<ClinicianIdentity>};
const safeFailureReasons = new Set([
  'invalid_configuration', 'invalid_response', 'invalid_launch', 'unknown_connection',
  'launch_unavailable', 'missing_state', 'invalid_state', 'browser_mismatch',
  'reused_state', 'expired_state', 'connection_unavailable', 'oauth_error',
  'missing_code', 'invalid_code', 'issuer_mismatch', 'token_exchange_failed',
  'invalid_token_response', 'identity_verification_failed', 'callback_unavailable',
]);
// Runtime allowlist: exception/audit text must never inherit provider-controlled data.
export function safeFailureReason(reason:unknown):string {
  return typeof reason==='string'&&safeFailureReasons.has(reason)?reason:'callback_unavailable';
}
export class SmartFailure extends Error {
  public reason:string;
  constructor(reason:string){super('SMART authorization failed.');this.reason=safeFailureReason(reason);}
}
export function getCookie(request:Request,name:string) {
  const values=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
  const value=values.length===1?values[0].slice(name.length+1):'';return opaquePattern.test(value)?value:null;
}
function cookie(name:string,value:string,seconds:number) { return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`; }
export function redirect(path:string) { return new Response(null,{status:303,headers:{...privacyHeaders,Location:appOrigin+path}}); }
export function safeEndpoint(value:string) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||!url.hostname.includes('.')||/^\d+\./.test(url.hostname)||url.hostname.includes(':')||/\.(local|internal|localhost|invalid|test)$/.test(url.hostname))throw new SmartFailure('invalid_configuration');
  return url;
}
export function validateConnection(connection:SmartConnection) {
  for(const endpoint of [connection.issuer,connection.authorization_endpoint,connection.token_endpoint,connection.oidc_issuer,connection.jwks_uri])safeEndpoint(endpoint);
  if(!connection.enabled||!connection.client_id||!connection.scopes.includes('openid')||!connection.scopes.includes('fhirUser')||!connection.scopes.includes('launch'))throw new SmartFailure('invalid_configuration');
  // This milestone never requests chart-writing permissions or offline access.
  if(connection.scopes.some(s=>!['openid','fhirUser','launch','launch/patient','launch/encounter','online_access'].includes(s)&&! /^(patient|user)\/[A-Za-z*]+\.(read|rs|r|s)$/.test(s)))throw new SmartFailure('invalid_configuration');
}
function one(params:URLSearchParams,name:string) {const values=params.getAll(name);if(values.length>1)throw new SmartFailure('invalid_response');return values[0]||null;}

export function smartHandlers(deps:SmartDependencies) {
  const now=deps.now||Date.now;
  async function denied(reason:string,launch?:SmartLaunch) {
    // Audit only fixed internal reason strings. Never record URLs, codes, tokens, or provider errors.
    try{await deps.store.audit(safeFailureReason(reason),launch);}catch{/* Database outages fail closed without logging request data. */}
    return redirect('/fhir/error');
  }
  return {
    async launch(request:Request) {
      try {
        const params=new URL(request.url).searchParams;
        const issuer=one(params,'iss'),context=one(params,'launch');
        if(!issuer||issuer.length>2048||!context||context.length>4096)throw new SmartFailure('invalid_launch');
        // Never discover/fetch arbitrary incoming issuers. Exact pre-approved tenant registry only.
        const connection=await deps.store.connectionByIssuer(issuer);
        if(!connection)throw new SmartFailure('unknown_connection');validateConnection(connection);
        const key=deps.key(),state=opaque(),browser=opaque(),verifier=opaque(),nonce=opaque(),id=randomUUID(),started=now();
        await deps.store.createLaunch({id,organization_id:connection.organization_id,connection_id:connection.id,state_hash:hash(state),browser_hash:hash(browser),encrypted_payload:seal({verifier,nonce},key,`launch:${id}:${connection.organization_id}`),connection_version:connection.updated_at,created_at:new Date(started).toISOString(),expires_at:new Date(started+600000).toISOString()});
        const target=new URL(connection.authorization_endpoint);
        for(const [name,value] of Object.entries({response_type:'code',client_id:connection.client_id,redirect_uri:callbackUrl,scope:connection.scopes.join(' '),state,aud:connection.issuer,launch:context,code_challenge:challenge(verifier),code_challenge_method:'S256',nonce}))target.searchParams.set(name,value);
        return new Response(null,{status:303,headers:{...privacyHeaders,Location:target.toString(),'Set-Cookie':cookie(launchCookie,browser,600)}});
      } catch(error){return denied(error instanceof SmartFailure?error.reason:'launch_unavailable');}
    },
    async callback(request:Request) {
      let launch:SmartLaunch|undefined;
      try {
        const params=new URL(request.url).searchParams;
        const state=one(params,'state');
        if(!state)throw new SmartFailure('missing_state');
        if(!opaquePattern.test(state))throw new SmartFailure('invalid_state');
        const browser=getCookie(request,launchCookie);if(!browser)throw new SmartFailure('browser_mismatch');
        const claimed=await deps.store.claim(hash(state),hash(browser));
        const allowedReasons=['invalid_state','reused_state','expired_state','browser_mismatch','connection_unavailable'];
        if(claimed.reason!=='ok'||!claimed.launch)throw new SmartFailure(allowedReasons.includes(claimed.reason)?claimed.reason:'invalid_state');
        launch=claimed.launch;
        const error=one(params,'error'),code=one(params,'code'),issuer=one(params,'iss');
        if(error)throw new SmartFailure('oauth_error');
        if(!code)throw new SmartFailure('missing_code');
        if(code.length>4096)throw new SmartFailure('invalid_code');
        const connection=await deps.store.connectionById(launch.connection_id);
        if(!connection||connection.organization_id!==launch.organization_id||Date.parse(connection.updated_at)!==Date.parse(launch.connection_version))throw new SmartFailure('connection_unavailable');
        validateConnection(connection);
        if(issuer&&issuer!==connection.oidc_issuer)throw new SmartFailure('issuer_mismatch');
        const key=deps.key(),secret=unseal<LaunchSecret>(launch.encrypted_payload,key,`launch:${launch.id}:${launch.organization_id}`);
        if(!opaquePattern.test(secret.verifier)||!opaquePattern.test(secret.nonce))throw new SmartFailure('invalid_launch');
        let tokens:TokenBundle;
        try{tokens=await deps.exchange(connection,code,secret.verifier);}catch{throw new SmartFailure('token_exchange_failed');}
        const receivedAt=now();
        if(!tokens.access_token||!tokens.id_token||tokens.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0)throw new SmartFailure('invalid_token_response');
        let identity:ClinicianIdentity;
        try{identity=await deps.identity(connection,tokens,secret.nonce);}catch{throw new SmartFailure('identity_verification_failed');}
        const expiresMs=receivedAt+Math.min(Math.floor(tokens.expires_in),28800)*1000;
        const session=opaque(),seconds=Math.floor((expiresMs-now())/1000);
        if(seconds<1)throw new SmartFailure('invalid_token_response');
        const sessionHash=hash(session),expiresAt=new Date(expiresMs).toISOString();
        const encrypted=seal({tokens,identity,issuer:connection.issuer,clientId:connection.client_id},key,`session:${sessionHash}:${launch.organization_id}`);
        await deps.store.complete(launch,sessionHash,encrypted,expiresAt);
        const response=redirect('/enterprise/clinician');
        response.headers.append('Set-Cookie',cookie(sessionCookie,session,seconds));
        response.headers.append('Set-Cookie',cookie(launchCookie,'',0));
        return response;
      }catch(error){return denied(error instanceof SmartFailure?error.reason:'callback_unavailable',launch);}
    }
  };
}
