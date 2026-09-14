import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { createSetupPreviewToken, previewAuditAction, previewLifetimeMs } from '../lib/enterprise/setup-preview-token.ts';

const env = parseEnv(readFileSync('.env.local', 'utf8'));
if (env.SUPABASE_PROJECT_REF !== 'qzdvfmtfjasdeqrfdspm') throw new Error('Only ShiftNote is supported.');
const base = process.argv.includes('--production') ? 'https://www.shiftnote.care' : 'http://localhost:3112';
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let orgId, browser, stage = 'isolated fixture';
const checked = result => { if (result.error) throw new Error('Verification database operation failed.'); return result.data; };
const check = (ok, label) => { if (!ok) throw new Error(label); console.log('PASS ' + label); };
try {
  const org = checked(await service.from('organizations').insert({ name: 'AUTOMATED PREVIEW VERIFICATION ' + randomUUID(), status: 'New' }).select('id').single());
  orgId = org.id;
  checked(await service.from('enterprise_audit_logs').insert({ organization_id: orgId, entity_id: orgId, entity_table: 'organizations', action: previewAuditAction }));
  const { token } = createSetupPreviewToken(orgId, env.SUPABASE_SERVICE_ROLE_KEY);
  async function request(action, credential = token) {
    const response = await fetch(`${base}/api/enterprise/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ token: credential }), signal: AbortSignal.timeout(20000) });
    console.log(action + ': HTTP ' + response.status);
    if (response.status >= 500) {
      const error = (await response.clone().json().catch(() => ({}))).error;
      const safe = ['Please try again later.', 'Unable to save or load Enterprise data.', 'Enterprise service is not configured.', 'Unable to complete this request. Please try again.'];
      if (safe.includes(error)) console.log(error);
    }
    return response;
  }
  stage = 'preview authorization';
  check((await request('setup-preview/validate')).status === 200, 'valid signed preview accepted');
  const expired = createSetupPreviewToken(orgId, env.SUPABASE_SERVICE_ROLE_KEY, Date.now() - previewLifetimeMs - 1000).token;
  check((await request('setup-preview/validate', expired)).status === 410, 'expired preview rejected');
  check((await request('setup-preview/validate', token.slice(0, -1))).status === 410, 'tampered preview rejected');
  for (const action of ['setup/validate', 'setup/finish']) check([400, 410].includes((await request(action)).status), 'preview rejected by real ' + action);
  stage = 'browser preview';
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const requests = [];
  page.on('request', request => { if (request.method() !== 'GET') requests.push(new URL(request.url()).pathname); });
  await page.goto(base + '/enterprise/setup-preview#' + token);
  await page.getByRole('heading', { name: 'Your preview link is verified' }).waitFor();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Full name').fill('Preview Review Only');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill('Made-up-preview-only-123');
  await page.getByLabel('Confirm password', { exact: true }).fill('Made-up-preview-only-123');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Review organization' }).waitFor();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel(/^name$/i).fill('Preview Facility');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel(/Departments for Preview Facility/).fill('Nursing, Rehabilitation');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('heading', { name: /^Ready to activate/ }).waitFor();
  await page.getByRole('button', { name: 'Finish Setup', exact: true }).click();
  await page.getByRole('heading', { name: 'Preview complete', exact: true }).waitFor();
  check(requests.length > 0 && requests.every(path => path === '/api/enterprise/setup-preview/validate'), 'all seven steps complete without account/setup writes or analytics requests');
  check(checked(await service.from('organizations').select('status').eq('id', orgId).single()).status === 'New', 'organization remains inactive');
  for (const table of ['enterprise_admins', 'facilities', 'departments', 'enterprise_activation_links']) check(checked(await service.from(table).select('*', { count: 'exact' }).eq('organization_id', orgId)).length === 0, 'no persisted ' + table);
  await page.getByRole('button', { name: 'Review again', exact: true }).click();
  await page.getByRole('heading', { name: 'Your preview link is verified' }).waitFor();
  check((await request('setup-preview/validate')).status === 200, 'preview remains available after simulated completion');
  await page.reload();
  await page.getByRole('heading', { name: 'Your preview link is verified' }).waitFor();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  check(await page.getByLabel('Full name').inputValue() === '', 'refresh clears unsaved preview entries');
} catch {
  console.error('FAIL preview verification at ' + stage + '; sensitive request details withheld.');
  process.exitCode = 1;
} finally {
  await browser?.close();
  // Only this invocation's separately named AUTOMATED fixture is removed. Never the manual preview.
  if (orgId) {
    const result = await service.from('organizations').delete().eq('id', orgId).like('name', 'AUTOMATED PREVIEW VERIFICATION %');
    if (result.error) { console.error('FAIL automated fixture cleanup'); process.exitCode = 1; }
    else console.log('PASS isolated automated fixture removed; manual previews untouched');
  }
}
