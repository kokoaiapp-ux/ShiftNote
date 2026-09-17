import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SmartConnection, SmartDatabase, SmartLaunch } from '@/types/smart';
import { encryptionKey, hash, unseal } from './crypto';
import { getCookie, sessionCookie, smartHandlers, safeFailureReason, type SmartStore, type TokenBundle, type ClinicianIdentity } from './core';
import { providerClient } from './exchange';
import { epicSandboxCredentials, epicSandboxVendor } from './epic-sandbox';

function client() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('SMART persistence is not configured.');
  return createClient<SmartDatabase>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function checked<T>(result:{data:T;error:unknown}) {if(result.error)throw new Error('SMART persistence unavailable.');return result.data;}
function store():SmartStore {
  const db=client();
  async function connection(field:'id'|'issuer',value:string) {
    const row=checked(await db.from('smart_connections').select('*').eq(field,value).eq('enabled',true).maybeSingle());
    if(!row)return null;
    const resolved=row.vendor===epicSandboxVendor?{...row,client_id:epicSandboxCredentials(row as SmartConnection,process.env).clientId}:row;
    const org=checked(await db.from('organizations').select('status').eq('id',row.organization_id).maybeSingle());
    return org?.status==='Active'?resolved as SmartConnection:null;
  }
  return {
    connectionByIssuer:issuer=>connection('issuer',issuer),connectionById:id=>connection('id',id),
    async createLaunch(launch){checked(await db.from('smart_launch_sessions').insert(launch));},
    async claim(stateHash,browserHash){
      const result=checked(await db.rpc('smart_claim_launch',{p_state_hash:stateHash,p_browser_hash:browserHash}));
      if(!result||typeof result!=='object'||Array.isArray(result)||typeof result.reason!=='string')throw new Error('Invalid SMART claim result.');
      return result as unknown as {reason:string;launch?:SmartLaunch};
    },
    async complete(launch,sessionHash,encrypted,expiresAt){checked(await db.rpc('smart_complete_callback',{p_launch_id:launch.id,p_session_hash:sessionHash,p_encrypted_payload:encrypted,p_expires_at:expiresAt}));},
    async audit(reason,launch){checked(await db.from('enterprise_audit_logs').insert({organization_id:launch?.organization_id||null,action:`SMART Authorization Failed: ${safeFailureReason(reason)}`,entity_table:'smart_launch_sessions',entity_id:launch?.id||null}));}
  };
}
export function smartService() {
  const provider=providerClient(connection=>{
    if(connection.vendor===epicSandboxVendor){
      const {secret}=epicSandboxCredentials(connection,process.env);
      return {[connection.id]:secret};
    }
    const raw=process.env.SMART_CLIENT_SECRETS_JSON;
    if(!raw)return {};
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string'))throw new Error('SMART client secrets are invalid.');
    return value as Record<string,string>;
  });
  return smartHandlers({store:store(),key:()=>encryptionKey(process.env.SMART_SESSION_ENCRYPTION_KEY),...provider});
}
// Server-only handoff/session accessor. Never serialize this object into client props or API responses.
export async function getSmartSession(request:Request) {
  const handle=getCookie(request,sessionCookie);if(!handle)return null;
  const db=client(),sessionHash=hash(handle);
  const session=checked(await db.from('smart_sessions').select('*').eq('session_hash',sessionHash).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle());
  if(!session)return null;
  const connection=await store().connectionById(session.connection_id);if(!connection||connection.organization_id!==session.organization_id)return null;
  const launch=checked(await db.from('smart_launch_sessions').select('connection_version').eq('id',session.launch_id).single());
  if(!launch||Date.parse(launch.connection_version)!==Date.parse(connection.updated_at))return null;
  const payload=unseal<{tokens:TokenBundle;identity:ClinicianIdentity;issuer:string;clientId:string}>(session.encrypted_payload,encryptionKey(process.env.SMART_SESSION_ENCRYPTION_KEY),`session:${sessionHash}:${session.organization_id}`);
  if(payload.clientId!==connection.client_id)return null;
  return {organizationId:session.organization_id,expiresAt:session.expires_at,...payload};
}
