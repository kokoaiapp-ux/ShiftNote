// Explicit operator provisioning using the same Supabase service-role pattern as
// enterpriseService/create-enterprise-manual-preview. Never run from builds.
// No Management API SQL, Auth API, SMTP, checkout, contracts, or activation links.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const name = 'ShiftNote Epic Sandbox Test';
const marker = 'Epic Sandbox Test Organization Created - Non-production, No Customer Billing';
let organizationId;
let stage = 'environment preflight';
function checked(result) {
  if (result.error) throw new Error('Enterprise service operation failed.');
  return result.data;
}

async function main() {
  const env = parseEnv(readFileSync('.env.local', 'utf8'));
  if (env.SUPABASE_PROJECT_REF !== 'qzdvfmtfjasdeqrfdspm' || new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'qzdvfmtfjasdeqrfdspm.supabase.co' || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Wrong project or missing service configuration.');
  const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  stage = 'existing organization lookup';
  const existing = checked(await service.from('organizations').select('id,name,status,subscription_status,contract_start,contract_end').eq('name', name));
  if (existing.length > 1) throw new Error('Ambiguous sandbox organizations; no changes made.');
  if (existing.length) {
    organizationId = existing[0].id;
    const priorMarker = checked(await service.from('enterprise_audit_logs').select('id').eq('organization_id', organizationId).eq('entity_id', organizationId).eq('action', marker).limit(1));
    if (!priorMarker.length) throw new Error('Existing organization is not this marked sandbox; no changes made.');
  } else {
    if (!process.argv.includes('--create')) {
      console.log('Preflight passed: no existing sandbox organization. Use --create for the explicitly authorized provisioning.');
      return;
    }
    stage = 'sandbox organization creation';
    organizationId = randomUUID();
    checked(await service.from('organizations').insert({ id: organizationId, name, status: 'Active', subscription_status: 'pending' }));
    stage = 'sandbox audit marker';
    checked(await service.from('enterprise_audit_logs').insert({ organization_id: organizationId, actor_id: null, action: marker, entity_table: 'organizations', entity_id: organizationId }));
  }
  stage = 'read-back verification';
  const org = checked(await service.from('organizations').select('id,name,status,subscription_status,contract_start,contract_end').eq('id', organizationId).single());
  if (org.name !== name || org.status !== 'Active' || org.subscription_status !== 'pending' || org.contract_start || org.contract_end) throw new Error('Sandbox organization configuration mismatch.');
  const counts = {};
  for (const table of ['enterprise_contracts', 'enterprise_admins', 'enterprise_activation_links', 'enterprise_integrations', 'smart_connections']) {
    const result = await service.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', organizationId);
    checked(result);
    counts[table] = result.count;
    if (result.count !== 0) throw new Error('Unexpected associated records; nothing was removed or modified.');
  }
  const audit = checked(await service.from('enterprise_audit_logs').select('id').eq('organization_id', organizationId).eq('action', marker));
  if (audit.length !== 1) throw new Error('Sandbox marker verification failed.');
  console.log(JSON.stringify({ organizationId: org.id, name: org.name, status: org.status, subscriptionStatus: org.subscription_status, sandboxAuditMarkerVerified: true, associatedRecordCounts: counts, credentialsWrittenToDatabase: false, emailsSent: false, authAccountsChanged: false, retainedForSandboxTesting: true }, null, 2));
}

main().catch(() => {
  console.error(`Sandbox provisioning stopped during ${stage}; sensitive details withheld. No automatic cleanup was performed.`);
  if (organizationId) console.error(`Organization ID to inspect: ${organizationId}`);
  process.exitCode = 1;
});
