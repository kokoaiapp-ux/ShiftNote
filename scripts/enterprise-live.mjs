import { loadEnvFile } from 'node:process';
import { readFile, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

loadEnvFile('.env.local');
const ref = process.env.SUPABASE_PROJECT_REF;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (ref !== 'qzdvfmtfjasdeqrfdspm' || new URL(url).hostname !== ref + '.supabase.co') throw new Error('Refusing to access any project other than ShiftNote.');
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required.');
const tables = ['organizations','facilities','departments','enterprise_admins','enterprise_leads','enterprise_contracts','enterprise_activation_links','enterprise_integrations','enterprise_audit_logs','koko_admins','enterprise_support_tickets','enterprise_rate_limits'];
async function management(path, method='GET', body) {
  const result = await fetch('https://api.supabase.com/v1/projects/' + ref + path, {
    method, headers: { Authorization: 'Bearer ' + token, 'Content-Type':'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
  });
  // Never print response bodies: configuration endpoints can contain secrets.
  const data = await result.json().catch(() => null);
  return {status:result.status,ok:result.ok,data};
}
const service = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const publicClient = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const project = await management('');
console.log(JSON.stringify({check:'project',status:project.status,name:project.data?.name}));
if (!project.ok || project.data?.name !== 'ShiftNote') throw new Error('ShiftNote project verification failed.');
const migrations = await management('/database/migrations');
if (!migrations.ok || !Array.isArray(migrations.data)) throw new Error('Unable to verify migration history.');
let installed = migrations.data.find(m => m.name === 'enterprise_backend');
console.log(JSON.stringify({check:'migration_history',status:migrations.status,enterpriseApplied:Boolean(installed),version:installed?.version}));
if (process.argv.includes('--apply') && !installed) {
  for (const table of tables) {
    const {error} = await service.from(table).select('*').limit(1);
    if (!error || error.code !== 'PGRST205') {
      console.log(JSON.stringify({check:'preflight_table',table,errorCode:error?.code||null}));
      throw new Error('Existing or inaccessible Enterprise schema detected; inspect before applying migration.');
    }
  }
  const files = (await readdir('supabase/migrations')).filter(file => /^\d+_enterprise_backend\.sql$/.test(file));
  if (files.length !== 1) throw new Error('Expected exactly one Enterprise migration.');
  const query = await readFile('supabase/migrations/' + files[0],'utf8');
  const result = await management('/database/migrations','POST',{name:'enterprise_backend',query});
  console.log(JSON.stringify({check:'apply_migration',status:result.status,success:result.ok}));
  if (!result.ok) {
    process.exitCode=1;
  } else {
    const verified = await management('/database/migrations');
    installed = verified.data?.find(m => m.name === 'enterprise_backend');
    if (!installed) throw new Error('Migration response succeeded but history could not be verified. Do not retry automatically.');
    console.log(JSON.stringify({check:'applied_version',version:installed.version}));
  }
}
for (const table of tables) {
  const {error} = await service.from(table).select('*').limit(1);
  const denied = await publicClient.from(table).select('*').limit(1);
  console.log(JSON.stringify({check:'table',table,exists:!error,serviceError:error?.code,anonymousDenied:denied.error?.code==='42501',anonymousError:denied.error?.code}));
  if(installed && (error || denied.error?.code!=='42501'))process.exitCode=1;
}
const smtp = await management('/config/auth');
console.log(JSON.stringify({check:'supabase_smtp',status:smtp.status,hostConfigured:smtp.ok?Boolean(smtp.data.smtp_host):null,userConfigured:smtp.ok?Boolean(smtp.data.smtp_user):null,senderConfigured:smtp.ok?Boolean(smtp.data.smtp_admin_email):null}));
console.log(JSON.stringify({check:'application_smtp',hostConfigured:Boolean(process.env.ENTERPRISE_SMTP_HOST),userConfigured:Boolean(process.env.ENTERPRISE_SMTP_USER),passwordConfigured:Boolean(process.env.ENTERPRISE_SMTP_PASSWORD)}));
let owner;
for(let page=1;page<=1000;page++){
  const {data,error}=await service.auth.admin.listUsers({page,perPage:100});
  if(error)throw new Error('Unable to verify the requested owner account.');
  owner=data.users.find(user=>user.email?.toLowerCase()==='support@shiftnote.care');
  if(owner||data.users.length<100)break;
}
console.log(JSON.stringify({check:'requested_owner',exists:Boolean(owner),verified:owner?Boolean(owner.email_confirmed_at):null}));
// Provisioning requires the explicit bootstrap command, never a placeholder user.
