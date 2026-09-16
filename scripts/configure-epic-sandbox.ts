// Operator-only provisioning. No OAuth request, account creation, or automatic enablement.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { callbackUrl } from '../lib/server/smart/core';
import { encryptionKey } from '../lib/server/smart/crypto';
import { discoverEpicSandbox, epicSandboxVendor, epicSandboxClientReference, validateEpicSandboxScopes } from '../lib/server/smart/epic-sandbox';
import type { SmartDatabase } from '../types/smart';

async function main() {
  const env = { ...process.env, ...parseEnv(readFileSync('.env.local', 'utf8')) };
  const args = process.argv.slice(2);
  const option = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const organization = option('organization-id');
  const version = option('scope-version');
  const method = option('client-auth-method');
  const scopes = (option('scopes') || '').split(/\s+/).filter(Boolean);
  if (!organization || !/^[a-f0-9-]{36}$/i.test(organization) || !['1', '2'].includes(version || '') || !['client_secret_basic', 'client_secret_post'].includes(method || '') || option('registered-callback') !== callbackUrl) {
    throw new Error('Provide the Active test organization ID, registered scope version/scopes, symmetric authentication method, and exact registered callback.');
  }
  validateEpicSandboxScopes(scopes, version as '1' | '2');
  encryptionKey(env.SMART_SESSION_ENCRYPTION_KEY);
  if (!env.EPIC_SANDBOX_CLIENT_ID || !env.EPIC_SANDBOX_CLIENT_SECRET) throw new Error('Epic sandbox credentials are missing.');
  if (env.SUPABASE_PROJECT_REF !== 'qzdvfmtfjasdeqrfdspm' || new URL(env.NEXT_PUBLIC_SUPABASE_URL || '').hostname !== 'qzdvfmtfjasdeqrfdspm.supabase.co' || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Expected ShiftNote Supabase configuration is required.');
  const { authMethods, capabilities, ...metadata } = await discoverEpicSandbox();
  if (!authMethods.includes(method!) || !capabilities.includes(`permission-v${version}`)) throw new Error('Discovery does not support the registered configuration.');
  const db = createClient<SmartDatabase>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const org = await db.from('organizations').select('status').eq('id', organization).single();
  if (org.error || org.data?.status !== 'Active') throw new Error('The selected organization must already be Active.');
  const existing = await db.from('smart_connections').select('id').eq('issuer', metadata.issuer).maybeSingle();
  if (existing.error) throw new Error('SMART migration or database access is unavailable.');
  if (existing.data) throw new Error('An Epic sandbox connection already exists; it will not be overwritten.');
  if (!args.includes('--apply')) {
    console.log('PASS: discovery and disabled-connection preflight. Nothing was written; registration and production log redaction still require independent verification.');
    return;
  }
  const result = await db.from('smart_connections').insert({
    organization_id: organization, vendor: epicSandboxVendor, enabled: false, ...metadata,
    client_id: epicSandboxClientReference, client_auth_method: method as 'client_secret_basic' | 'client_secret_post', scopes,
  }).select('id,organization_id,vendor,enabled,issuer,client_id,client_auth_method,scopes').single();
  if (result.error) throw new Error('Unable to create the disabled sandbox connection.');
  if(!result.data || result.data.enabled || result.data.client_id!==epicSandboxClientReference)throw new Error('Sandbox connection verification failed.');
  console.log(JSON.stringify({connectionId:result.data.id,organizationId:result.data.organization_id,enabled:result.data.enabled,issuer:result.data.issuer,authenticationMethod:result.data.client_auth_method,scopes:result.data.scopes,credentialsInEnvironmentOnly:true}));
  console.log('Created a DISABLED sandbox connection. No OAuth exchange was attempted. Enable only after all production prerequisites are verified.');
}
// Never print raw fetch, provider, SQL, or SDK errors (may contain credentials).
main().catch(() => {
  console.error('Sandbox provisioning stopped. Check the required operator arguments, encryption/credentials, migration, discovery, and Active organization. No secrets are printed.');
  process.exitCode = 1;
});
