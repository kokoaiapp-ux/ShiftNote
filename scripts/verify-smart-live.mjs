// Restricted to ShiftNote. Default: verify only. --apply applies ONLY smart_callback.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseEnv } from 'node:util';

const ref = 'qzdvfmtfjasdeqrfdspm';
const raw = readFileSync('.env.local', 'utf8');
const env = parseEnv(raw);
const tables = ['smart_connections', 'smart_launch_sessions', 'smart_sessions'];
const names = tables.map(t => `'${t}'`).join(',');
let stage = 'environment preflight';
function check(ok, message) { assert.ok(ok, message); console.log(`PASS ${message}`); }
async function management(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Management HTTP ${response.status}`);
  return response.json();
}
const query = (sql, readOnly = true) => management('/database/query', { query: sql, read_only: readOnly });
async function securitySnapshot() {
  return query(`select jsonb_build_object(
    'tables',(select jsonb_agg(to_jsonb(t) order by relname) from (select relname,relrowsecurity,relforcerowsecurity,relacl from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p') and relname not in (${names})) t),
    'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public' and tablename not in (${names})),
    'functions',(select jsonb_agg(to_jsonb(f) order by name,definition) from (select p.proname name,p.proacl,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and p.proname not like 'smart_%') f)
  ) snapshot`);
}

async function main() {
  check((raw.match(/^\s*(?:export\s+)?SUPABASE_ACCESS_TOKEN\s*=/gm) || []).length === 1, 'exactly one access-token definition');
  check(env.SUPABASE_PROJECT_REF === ref && new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname === `${ref}.supabase.co`, 'project is ShiftNote');
  stage = 'token authentication';
  check((await management('')).id === ref, 'token authenticated to ShiftNote');
  const before = await securitySnapshot();
  let history = await management('/database/migrations');
  const files = readdirSync('supabase/migrations').filter(name => /^\d+_smart_callback\.sql$/.test(name));
  check(files.length === 1, 'one local SMART migration');
  const sql = readFileSync(`supabase/migrations/${files[0]}`, 'utf8');
  const existing = history.filter(m => m.name === 'smart_callback');
  check(existing.length <= 1, 'SMART migration history is unambiguous');
  if (!existing.length) {
    check(process.argv.includes('--apply'), 'explicit migration application requested');
    const present = await query(`select relname from pg_class where relnamespace='public'::regnamespace and relname in (${names})`);
    check(present.length === 0, 'no partial SMART schema exists');
    stage = 'apply smart_callback migration';
    await management('/database/migrations', { name: 'smart_callback', query: sql });
    history = await management('/database/migrations');
  }
  const migration = history.filter(m => m.name === 'smart_callback');
  check(migration.length === 1, 'SMART migration is recorded');
  console.log(`Migration: ${migration[0].version}_${migration[0].name}.sql`);
  const applied = await management(`/database/migrations/${migration[0].version}`);
  const normalize = text => text.replace(/\r\n/g, '\n').trim();
  check(Array.isArray(applied.statements) && normalize(applied.statements.join('\n')) === normalize(sql), 'recorded migration SQL matches the local file');
  stage = 'live schema verification';
  const rows = await query(`select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in (${names}) order by relname`);
  check(rows.length === 3 && rows.every(r => r.relrowsecurity), 'all three SMART tables have RLS enabled');
  const policies = await query(`select policyname from pg_policies where schemaname='public' and tablename in (${names})`);
  check(policies.length === 0, 'SMART RLS is default-deny (no browser-access policies)');
  const grants = await query(`select r,t,has_table_privilege(r,'public.'||t,'SELECT') sel,has_table_privilege(r,'public.'||t,'INSERT') ins,has_table_privilege(r,'public.'||t,'UPDATE') upd,has_table_privilege(r,'public.'||t,'DELETE') del from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[${names}]) t`);
  check(grants.length === 9 && grants.every(g => [g.sel,g.ins,g.upd,g.del].every(v => v === (g.r === 'service_role'))), 'only service_role has SMART table CRUD privileges');
  const indexes = await query(`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in (${names})`);
  check(indexes.length === 14 && tables.every(t => indexes.some(i => i.tablename === t && i.indexdef.includes('(organization_id)'))), 'all 14 SMART indexes exist, including organization indexes');
  const functions = await query(`select proname,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and proname in ('smart_touch_updated_at','smart_claim_launch','smart_complete_callback')`);
  check(functions.length === 3 && functions.every(f => f.proconfig?.some(c => c.startsWith('search_path=') && !c.includes('public'))) && functions.filter(f => f.proname !== 'smart_touch_updated_at').every(f => f.prosecdef), 'all three SMART functions have constrained search paths');
  const execute = await query(`select r,p.proname,has_function_privilege(r,p.oid,'EXECUTE') allowed from pg_proc p cross join unnest(array['anon','authenticated','service_role']) r where p.pronamespace='public'::regnamespace and p.proname in ('smart_claim_launch','smart_complete_callback')`);
  check(execute.length === 6 && execute.every(f => f.allowed === (f.r === 'service_role')), 'SMART authorization RPCs are service-role-only');
  const triggers = await query(`select c.relname,t.tgname,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and c.relname in (${names}) and not t.tgisinternal`);
  check(triggers.length === 3 && triggers.every(t => t.tgname === 'smart_updated' && t.tgenabled === 'O'), 'all three timestamp triggers are enabled');
  const constraints = await query(`select c.relname,pg_get_constraintdef(k.oid) definition from pg_constraint k join pg_class c on c.oid=k.conrelid where c.relnamespace='public'::regnamespace and c.relname in (${names}) and k.contype='f'`);
  check(constraints.length === 5 && constraints.every(c => c.definition.includes('ON DELETE CASCADE')) && constraints.some(c => c.relname === 'smart_launch_sessions' && c.definition.includes('(connection_id, organization_id)')) && constraints.some(c => c.relname === 'smart_sessions' && c.definition.includes('(launch_id, connection_id, organization_id)')), 'cascade foreign keys bind SMART records to their organization');
  assert.deepEqual(await securitySnapshot(), before);
  console.log('PASS existing Professional/Enterprise table security, policies, and functions unchanged');
  stage = 'anonymous REST denial';
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  check(Boolean(key), 'anonymous API key available');
  for (const table of tables) {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers: { apikey: key }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    check([401,403].includes(response.status) && body.code === '42501', `anonymous SELECT denied on ${table}`);
  }
  stage = 'live rollback-only organization isolation tests';
  if(process.argv.includes('--schema-only')) {
    console.log('PASS schema/permission verification only. Run test-smart-live-service.ts separately for live write/isolation verification.');
    return;
  }
  const mode = await query("select current_setting('transaction_read_only') read_only", false);
  if (mode[0]?.read_only !== 'off') {
    console.error('BLOCKED: Management API SQL is read-only. Live rollback-only write tests require a write-capable database connection; no security settings were changed.');
    process.exitCode = 2;
    return;
  }
  await query(readFileSync('scripts/sql/test-smart-live-rollback.sql', 'utf8'), false);
  console.log('PASS live rollback-only cross-organization FKs, state expiry/replay, session creation, and role denial');
  const leftovers = await query("select count(*)::int n from public.organizations where name like 'SMART rollback verification %'");
  check(leftovers[0]?.n === 0, 'no live test organizations persisted');
}

main().catch(error => {
  // Never dump provider responses, SQL error detail, environments, or credentials.
  console.error(`FAIL during ${stage}${/^Management HTTP \d+$/.test(error?.message || '') ? ` (${error.message})` : ''}. Sensitive details withheld.`);
  process.exitCode = 1;
});
