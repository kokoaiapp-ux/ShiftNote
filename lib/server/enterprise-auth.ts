import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import type { EnterpriseDatabase } from '@/types/enterprise';
import { EnterpriseError, object } from '@/lib/enterprise/validation';
import { isInternalRole } from '@/lib/enterprise/permissions';

export type Portal = 'enterprise'|'admin';
export const portalCookie = (portal:Portal) => `shiftnote-${portal}-auth`;
export function enterpriseService() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new EnterpriseError('Enterprise service is not configured.',503);
  return createClient<EnterpriseDatabase>(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function portalClient(portal:Portal) {
  const jar=await cookies(); const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new EnterpriseError('Authentication is not configured.',503);
  return createServerClient<EnterpriseDatabase>(url,key,{
    cookieOptions:{name:portalCookie(portal),httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{getAll:()=>jar.getAll(),setAll:values=>{try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components use refreshed cookies from the portal proxy. */}}}
  });
}
export async function requirePortal(portal:Portal) {
  const client=await portalClient(portal); const {data:{user},error}=await client.auth.getUser();
  if(error||!user) throw new EnterpriseError('Please sign in.',401);
  if(portal==='admin') { const {data,error:roleError}=await client.from('koko_admins').select('role').eq('user_id',user.id).maybeSingle(); if(roleError) throw new EnterpriseError('Unable to verify access.',503); if(!data || !isInternalRole(data.role)) throw new EnterpriseError('KOKO LABS access required.',403); return {client,user,organizationId:null,role:data.role}; }
  const {data:membership,error:membershipError}=await client.from('enterprise_admins').select('organization_id').eq('user_id',user.id).maybeSingle();
  if(membershipError) throw new EnterpriseError('Unable to verify access.',503);
  if(!membership) throw new EnterpriseError('Enterprise administrator access required.',403);
  const {data:org,error:orgError}=await client.from('organizations').select('id,status').eq('id',membership.organization_id).maybeSingle();
  if(orgError) throw new EnterpriseError('Unable to verify organization.',503);
  if(!org||org.status!=='Active') throw new EnterpriseError('Your organization is not active. Contact KOKO LABS.',403);
  return {client,user,organizationId:org.id,role:'admin'};
}
export function checkOrigin(request:Request) {
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin) throw new EnterpriseError('Invalid request origin.',403);
}
export async function body(request:Request) {
  checkOrigin(request);
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new EnterpriseError('JSON required.',415);
  const reader=request.body?.getReader(); if(!reader) throw new EnterpriseError('Request body required.');
  let size=0; const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000){await reader.cancel();throw new EnterpriseError('Request too large.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return object(JSON.parse(new TextDecoder().decode(bytes)));}catch(error){if(error instanceof EnterpriseError)throw error;throw new EnterpriseError('Invalid JSON.');}
}
export async function limit(request:Request,action:string,max=15) {
  const ip=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const bucket=createHash('sha256').update(`${action}:${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex');
  const {data,error}=await enterpriseService().rpc('enterprise_rate_limit',{p_bucket:bucket,p_limit:max,p_seconds:900});
  if(error) throw new EnterpriseError('Please try again later.',503); if(!data) throw new EnterpriseError('Too many attempts. Please try later.',429);
}
export function json(value:unknown,status=200) { return Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}); }
export function failure(error:unknown) { if(error instanceof EnterpriseError)return json({error:error.message},error.status); return json({error:'Unable to complete this request. Please try again.'},500); }
export function checked<T>(result:{data:T;error:unknown}):T { if(result.error) throw new EnterpriseError('Unable to save or load Enterprise data.',503);return result.data; }
