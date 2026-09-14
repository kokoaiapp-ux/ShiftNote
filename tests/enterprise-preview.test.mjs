import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createSetupPreviewToken, verifySetupPreviewToken, previewLifetimeMs } from '../lib/enterprise/setup-preview-token.ts';

test('preview credentials last seven days and are purpose-separated from activation tokens', () => {
  const key = randomBytes(32).toString('hex'), id = randomUUID(), now = Date.now();
  const { token, expiresAt } = createSetupPreviewToken(id, key, now);
  assert.equal(expiresAt - now, 7 * 24 * 60 * 60 * 1000);
  assert.equal(verifySetupPreviewToken(token, key, now).organizationId, id);
  assert.ok(verifySetupPreviewToken(token, key, expiresAt - 1));
  assert.equal(verifySetupPreviewToken(token, key, expiresAt), null);
  assert.equal(verifySetupPreviewToken(token, key, now - 1), null);
  assert.equal(verifySetupPreviewToken(token, 'wrong-key', now), null);
  assert.equal(verifySetupPreviewToken(token, '', now), null);
  assert.equal(verifySetupPreviewToken(token.slice(0, -1), key, now), null);
  assert.equal(verifySetupPreviewToken(randomBytes(32).toString('hex'), key, now), null);
  assert.doesNotMatch(token, /^[a-f0-9]{64}$/);
  assert.equal(previewLifetimeMs, expiresAt - now);
});

test('preview payload tampering cannot change the organization or expiration', () => {
  const key = randomBytes(32).toString('hex'), now = Date.now();
  const { token } = createSetupPreviewToken(randomUUID(), key, now);
  const parts = token.split('.');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  claims.organizationId = randomUUID(); claims.expiresAt += previewLifetimeMs;
  parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
  assert.equal(verifySetupPreviewToken(parts.join('.'), key, now), null);
});

test('preview validation only reads its marked, inactive organization; completion has no API call', () => {
  const route = readFileSync('app/api/enterprise/setup-preview/validate/route.ts', 'utf8');
  assert.match(route, /organization\.status !== 'New'/);
  assert.match(route, /previewAuditAction/);
  assert.match(route, /Math\.min\(claims\.expiresAt/);
  assert.doesNotMatch(route, /\.auth\.|\.insert\(|\.update\(|\.delete\(|setup\/finish/);
  const wizard = readFileSync('components/enterprise/SetupWizard.tsx', 'utf8');
  assert.match(wizard, /previewOnly=false/);
  assert.match(wizard, /if\(previewOnly\)\{setPreviewComplete\(true\);setPassword\(''\);setConfirm\(''\);return;\}/);
  assert.ok(wizard.indexOf('if(previewOnly){') < wizard.indexOf("'setup/finish'"));
  const preview = readFileSync('components/enterprise/SetupPreview.tsx', 'utf8');
  assert.match(preview, /window\.location\.hash/);
  assert.doesNotMatch(preview + wizard, /localStorage|sessionStorage/);
});
