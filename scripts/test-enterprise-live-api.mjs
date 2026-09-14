import { loadEnvFile } from 'node:process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
loadEnvFile('.env.local');
if(process.env.SUPABASE_PROJECT_REF!=='qzdvfmtfjasdeqrfdspm')throw new Error('ShiftNote project required.');
const remote=process.argv.find(v=>v.startsWith('--url='))?.slice(6);
const origin=remote||'https://www.shiftnote.care';
if(remote&&origin!=='https://www.shiftnote.care')throw new Error('Only the approved production origin is supported.');
const worker=remote?null:(await import('../dist/server/index.js')).default;
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const run=randomUUID(),leadIds=[],orgIds=[],userIds=[];
const results=[];
function check(condition,label){if(!condition)throw new Error(label);results.push(label);console.log('PASS '+label);}
function db(result,label){if(result.error)throw new Error(label);return result.data;}
function identity(portal){
 const jar=new Map();
 const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookieOptions:{name:'shiftnote-'+portal+'-auth',httpOnly:true,secure:true,path:'/',sameSite:'lax'},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>value?jar.set(name,value):jar.delete(name))}});
 return {jar,client,portal};
}
async function request(path,who,body){
 const headers={Accept:path.startsWith('/api/')?'application/json':'text/html'};
 if(who)headers.Cookie=[...who.jar].map(([name,value])=>name+'='+value).join('; ');
 if(body!==undefined){headers.Origin=origin;headers['Content-Type']='application/json';}
 const init={method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'};
 const response=remote?await fetch(origin+path,{...init,signal:AbortSignal.timeout(30000)}):await worker.fetch(new Request(origin+path,init),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 if(who)for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],split=pair.indexOf('=');const name=pair.slice(0,split),value=pair.slice(split+1);if(value)who.jar.set(name,value);else who.jar.delete(name);}
 const data=path.startsWith('/api/')?await response.json().catch(()=>null):null;
 if(!path.startsWith('/api/'))await response.text();
 return {status:response.status,data,location:response.headers.get('location')};
}
async function ownerSession(){
 const who=identity('admin');
 const generated=db(await service.auth.admin.generateLink({type:'magiclink',email:'support@shiftnote.care'}),'Owner session generation');
 db(await who.client.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'magiclink'}),'Owner session verification');
 return who;
}
let owner;
try{
 owner=await ownerSession();
 let r=await request('/api/admin/session',owner);
 check(r.status===200&&r.data?.role==='shiftnote_owner','exact owner has internal owner access');
 check((await request('/admin',owner)).status===200,'owner can load /admin');
 check((await request('/api/admin/workspace',identity('admin'))).status===401,'anonymous internal API access rejected');
 const tenants=[];
 for(const label of ['a','b']){
   const email='enterprise-verification-'+run+'-'+label+'@example.invalid';
   const who=identity('enterprise'),password=randomBytes(30).toString('base64url');
   const organization='ENTERPRISE VERIFICATION '+run+' '+label;
   r=await request('/api/enterprise/leads',null,{organization,contact:'Temporary Verification Admin',jobTitle:'IT verification',email,country:'US',state:'NY',clinicians:1,facilities:1,ehr:'Other',integration:'No',professions:[],timeline:'Just Exploring',notes:'Temporary automated verification; no clinical or customer data.'});
   check(r.status===201,'lead submission '+label);
   const lead=db(await service.from('enterprise_leads').select('id').eq('organization_name',organization).single(),'Read submitted lead');
   leadIds.push(lead.id);
   // Exercise the real approval/SMTP route, but direct this verification email
   // only to the actual owner mailbox. Restore the invitation identity before
   // creating the temporary test administrator; never alter the owner password.
   db(await service.from('enterprise_leads').update({work_email:'support@shiftnote.care'}).eq('id',lead.id),'Set owned delivery address');
   r=await request('/api/admin/approve',owner,{id:lead.id});
   check(r.status===200&&typeof r.data?.setupUrl==='string','organization approval and setup link '+label);
   const token=new URL(r.data.setupUrl).pathname.split('/').at(-1);
   const hash=createHash('sha256').update(token).digest('hex');
   const link=db(await service.from('enterprise_activation_links').select('id,organization_id,expires_at,email_status').eq('token_hash',hash).single(),'Read setup metadata');
   orgIds.push(link.organization_id);
   console.log((r.data.emailSent?'PASS ':'FAIL ')+'SMTP provider acceptance for setup email '+label);
   results.push('setup_email_'+label+'='+Boolean(r.data.emailSent));
   db(await service.from('enterprise_activation_links').update({email}).eq('id',link.id),'Set isolated test invitation identity');
   db(await service.from('enterprise_leads').update({work_email:email}).eq('id',lead.id),'Restore test lead identity');
   r=await request('/api/enterprise/setup/validate',who,{token});
   check(r.status===200&&r.data?.email===email,'valid activation link '+label);
   db(await service.from('enterprise_activation_links').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',link.id),'Expire verification link');
   check((await request('/api/enterprise/setup/validate',who,{token})).status===410,'expired activation rejected '+label);
   db(await service.from('enterprise_activation_links').update({expires_at:link.expires_at}).eq('id',link.id),'Restore verification expiry');
   const payload={token,name:'Verification Admin '+label,password,facilities:[{name:'Verification Facility '+label,kind:'Other',location:'Verification only',departments:['Verification Nursing']}]};
   r=await request('/api/enterprise/setup/finish',who,payload);
   // Track any created Auth identity even when setup fails, for exact cleanup.
   const profile=db(await service.from('profiles').select('auth_user_id').eq('email',email).maybeSingle(),'Locate verification account');
   if(profile)userIds.push(profile.auth_user_id);
   check(r.status===200,'setup creates Enterprise Admin and completes wizard payload '+label);
   check((await request('/api/enterprise/setup/finish',who,payload)).status===410,'single-use link enforced '+label);
   check((await request('/enterprise/dashboard',who)).status===200,'Enterprise dashboard '+label);
   r=await request('/api/enterprise/workspace',who);
   check(r.status===200&&r.data.organization.id===link.organization_id,'organization-specific workspace '+label);
   const session=db(await who.client.auth.getSession(),'Read test session').session;
   const staffIdentity=identity('admin');db(await staffIdentity.client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}),'Set non-admin test session');
   check((await request('/api/admin/workspace',staffIdentity)).status===403,'authenticated non-admin internal API rejected '+label);
   check((await request('/admin',staffIdentity)).status===307,'authenticated non-admin /admin rejected '+label);
   tenants.push({who,email,password,userId:profile.auth_user_id,orgId:link.organization_id});
 }
 const [a,b]=tenants;
 for(const [current,other] of [[a,b],[b,a]]){
   const c=current.who.client;
   check(db(await c.from('organizations').select('id'),'Tenant organizations').every(o=>o.id===current.orgId),'live organization RLS isolation');
   check(db(await c.from('facilities').select('id').eq('organization_id',other.orgId),'Foreign facilities').length===0,'cross-organization reads denied');
   check(Boolean((await c.from('facilities').insert({organization_id:other.orgId,name:'Denied'})).error),'cross-organization inserts denied');
   let r=await request('/api/enterprise/facility',current.who,{name:'CRUD '+run,kind:'Other',location:'Verification'});
   check(r.status===200,'facility API create');
   const f=db(await c.from('facilities').select('id').eq('name','CRUD '+run).single(),'CRUD facility');
   check((await request('/api/enterprise/facility',current.who,{id:f.id,name:'Updated '+run,kind:'Other'})).status===200,'facility API update');
   check((await request('/api/enterprise/department',current.who,{facility_id:f.id,name:'CRUD '+run})).status===200,'department API create');
   const d=db(await c.from('departments').select('id').eq('facility_id',f.id).single(),'CRUD department');
   check((await request('/api/enterprise/department',current.who,{id:d.id,facility_id:f.id,name:'Updated department'})).status===200,'department API update');
   db(await c.from('departments').delete().eq('id',d.id),'Department delete');
   db(await c.from('facilities').delete().eq('id',f.id),'Facility delete');
   check(db(await c.from('departments').select('id').eq('id',d.id),'Deleted department').length===0,'department RLS delete');
   check(db(await c.from('facilities').select('id').eq('id',f.id),'Deleted facility').length===0,'facility RLS delete');
   check((await request('/api/enterprise/logout',current.who,{})).status===200,'Enterprise logout');
   check((await request('/api/enterprise/session',current.who)).status===401,'logout clears session');
   check((await request('/api/enterprise/login',current.who,{email:current.email,password:current.password})).status===200,'Enterprise password login');
   const recovery=db(await service.auth.admin.generateLink({type:'recovery',email:current.email}),'Generate test recovery');
   const recoveryWho=identity('enterprise');
   r=await request('/api/enterprise/callback?token_hash='+encodeURIComponent(recovery.properties.hashed_token),recoveryWho);
   check(r.status===303,'recovery token callback');
   const replacement=randomBytes(30).toString('base64url');
   check((await request('/api/enterprise/reset',recoveryWho,{password:replacement})).status===200,'password reset');
   const loginWho=identity('enterprise');
   check((await request('/api/enterprise/login',loginWho,{email:current.email,password:replacement})).status===200,'login after reset');
   check((await request('/api/enterprise/login',identity('enterprise'),{email:current.email,password:current.password})).status===401,'old password rejected');
 }
 // Test the actual forgot-email handler against the owner's real mailbox.
 const forgot=await request('/api/admin/forgot',null,{email:'support@shiftnote.care'});
 console.log((forgot.status===200?'PASS ':'FAIL ')+'owner forgot-password email request');
 if(forgot.status!==200||results.some(r=>r.endsWith('=false')))process.exitCode=1;
}catch(error){console.error('FAIL '+(error instanceof Error?error.message:'Enterprise verification failed'));process.exitCode=1;}
finally{
 if(owner)await request('/api/admin/logout',owner,{}).catch(()=>{});
 let cleanupFailed=false;
 for(const id of orgIds){const {error}=await service.from('organizations').delete().eq('id',id);if(error)cleanupFailed=true;}
 for(const id of leadIds){const {error}=await service.from('enterprise_leads').delete().eq('id',id);if(error)cleanupFailed=true;}
 for(const id of userIds){const {error}=await service.auth.admin.deleteUser(id);if(error)cleanupFailed=true;}
 console.log(cleanupFailed?'FAIL verification fixture cleanup':'PASS verification fixtures removed; audit entries retained');
 if(cleanupFailed)process.exitCode=1;
}
