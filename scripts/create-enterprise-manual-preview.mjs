// Explicit operator action, never run by builds or automated fixture cleanup.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { createSetupPreviewToken, previewAuditAction, previewLifetimeMs } from '../lib/enterprise/setup-preview-token.ts';

const env = parseEnv(readFileSync('.env.local', 'utf8'));
if (env.SUPABASE_PROJECT_REF !== 'qzdvfmtfjasdeqrfdspm') throw new Error('Only the ShiftNote project is supported.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const recipient = 'support@shiftnote.care';
const origin = 'https://www.shiftnote.care';
let orgId = process.argv.find(v => v.startsWith('--organization-id='))?.slice(18);
function checked(result) { if (result.error) throw new Error('Preview database operation failed.'); return result.data; }

try {
  if (!orgId && !process.argv.includes('--create')) throw new Error('Use --create or --organization-id for this explicit manual preview.');
  if (!orgId) {
    const owner = checked(await service.from('profiles').select('auth_user_id').eq('email', recipient).single());
    const role = checked(await service.from('koko_admins').select('role').eq('user_id', owner.auth_user_id).single());
    if (role.role !== 'shiftnote_owner') throw new Error('Expected internal owner not found.');
    const org = checked(await service.from('organizations').insert({ name: 'ShiftNote Manual Setup Preview', status: 'New', subscription_status: 'pending' }).select('id').single());
    orgId = org.id;
    checked(await service.from('enterprise_audit_logs').insert({ organization_id: orgId, actor_id: owner.auth_user_id, action: previewAuditAction, entity_table: 'organizations', entity_id: orgId }));
  }
  const org = checked(await service.from('organizations').select('id,status').eq('id', orgId).single());
  const marker = checked(await service.from('enterprise_audit_logs').select('created_at').eq('organization_id', orgId).eq('entity_id', orgId).eq('entity_table', 'organizations').eq('action', previewAuditAction).order('created_at').limit(1).single());
  if (org.status !== 'New' || Date.parse(marker.created_at) + previewLifetimeMs <= Date.now()) throw new Error('The manual preview has expired or is no longer eligible.');
  const { token } = createSetupPreviewToken(orgId, env.SUPABASE_SERVICE_ROLE_KEY);
  async function request(action) {
    return fetch(`${origin}/api/enterprise/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(20000) });
  }
  const validation = await request('setup-preview/validate');
  if (!validation.ok) throw new Error('Deployed preview validation did not pass. No email was sent.');
  const invitation = await validation.json();
  if (!invitation.preview || invitation.organization.id !== orgId) throw new Error('Preview validation mismatch.');
  for (const action of ['setup/validate', 'setup/finish']) {
    const rejected = await request(action);
    if (![400, 410].includes(rejected.status)) throw new Error('Normal setup did not reject the preview credential.');
  }
  const setupUrl = `${origin}/enterprise/setup-preview#${token}`;
  const transport = nodemailer.createTransport({ host: env.ENTERPRISE_SMTP_HOST, port: 587, secure: false, requireTLS: true, auth: { user: env.ENTERPRISE_SMTP_USER, pass: env.ENTERPRISE_SMTP_PASSWORD }, connectionTimeout: 15000, socketTimeout: 20000 });
  try {
    const result = await transport.sendMail({ from: { name: 'ShiftNote', address: recipient }, to: recipient, subject: 'Your 7-day ShiftNote Enterprise setup preview', text: `Your private manual preview is ready.\n\n${setupUrl}\n\nExpires: ${invitation.expiresAt}\n\nYou can review all seven steps and click Finish Setup safely. No account, password, facilities, or departments will be saved. The organization will not activate. Use made-up details and a made-up password. Refreshing clears your entries; you can review again until expiry. This is not a real activation or portal login link. Do not forward it.\n\nThe manual-test organization will be retained until you request cleanup.`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1>Your Enterprise setup preview</h1><p>Review all seven steps without creating an account or activating an organization.</p><p><a href="${setupUrl}" style="display:inline-block;padding:14px 22px;background:#176b4c;color:white;border-radius:10px;text-decoration:none">Open Setup Preview</a></p><p>Use made-up details and a made-up password. Nothing you enter is saved. Finish Setup only completes the preview; you can review again until expiry.</p><p>Expires: ${invitation.expiresAt}</p><p>This private link is for manual review only. Do not forward it. We will retain the test organization until you request cleanup.</p></div>` });
    if (!result.accepted?.length) throw new Error('The provider did not accept the preview email.');
    checked(await service.from('enterprise_audit_logs').insert({ organization_id: orgId, action: 'Manual Setup Preview Email Sent', entity_table: 'organizations', entity_id: orgId }));
    console.log(JSON.stringify({ organizationId: orgId, organizationName: 'ShiftNote Manual Setup Preview', expiresAt: invitation.expiresAt, recipient, emailAccepted: true, retainedForManualReview: true, normalActivationDenied: true }));
  } finally { transport.close(); }
} catch {
  // Never emit token-bearing URLs, SMTP errors, request bodies, or credentials.
  console.error('Manual preview creation or delivery failed. Any created organization is retained; no accounts were created or modified.');
  if (orgId) console.error('Retained preview organization ID: ' + orgId);
  process.exitCode = 1;
}
