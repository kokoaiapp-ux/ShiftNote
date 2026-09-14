import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';
loadEnvFile('.env.local');
const email=process.argv.find(arg=>arg.startsWith('--email='))?.slice(8).toLowerCase();
if(!email)throw new Error('Specify the explicitly authorized existing account using --email=...');
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
let target=null;
for(let page=1;page<=1000;page++){
 const {data,error}=await client.auth.admin.listUsers({page,perPage:100});if(error)throw new Error('Unable to inspect Supabase users.');
 target=data.users.find(u=>u.email?.toLowerCase()===email);if(target||data.users.length<100)break;
}
if(!target?.email_confirmed_at)throw new Error('The account must already exist and have a verified email.');
if(!process.argv.includes('--apply')){console.log('Verified account located. No role was changed. Add --apply only after the user authorizes this account.');process.exit(0);}
const {error}=await client.from('koko_admins').upsert({user_id:target.id,role:'shiftnote_owner'});if(error)throw new Error('Unable to grant the role. Apply the Enterprise migration first.');
const {error:auditError}=await client.from('enterprise_audit_logs').insert({actor_id:target.id,action:'Initial KOKO LABS Owner Provisioned',entity_table:'koko_admins',entity_id:target.id});
if(auditError)throw new Error('Role created but audit recording failed; verify the audit table before continuing.');
console.log('Authorized KOKO LABS owner role provisioned.');
