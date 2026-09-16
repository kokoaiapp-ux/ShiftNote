import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverEpicSandbox, epicSandboxDiscovery, epicSandboxIssuer, epicSandboxVendor, epicSandboxClientReference, epicSandboxCredentials, validateEpicSandboxScopes } from '../lib/server/smart/epic-sandbox';
import type { SmartConnection } from '../types/smart';

const root = 'https://fhir.epic.com/interconnect-fhir-oauth';
const metadata = { authorization_endpoint: `${root}/oauth2/authorize`, token_endpoint: `${root}/oauth2/token`, issuer: `${root}/oauth2`, jwks_uri: `${root}/keys`, code_challenge_methods_supported: ['S256'], capabilities: ['launch-ehr', 'permission-v1', 'permission-v2'], token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'] };
const scopes = (suffix: string) => ['openid', 'fhirUser', 'launch', `patient/Patient.${suffix}`, `patient/Encounter.${suffix}`, `user/Practitioner.${suffix}`];
const connection: SmartConnection = { id: 'test-connection', organization_id: 'test-org', vendor: epicSandboxVendor, enabled: true, issuer: epicSandboxIssuer, authorization_endpoint: metadata.authorization_endpoint, token_endpoint: metadata.token_endpoint, oidc_issuer: metadata.issuer, jwks_uri: metadata.jwks_uri, client_id: 'synthetic-client-id', client_auth_method: 'client_secret_basic', scopes: scopes('read'), created_at: '', updated_at: '' };
const env = { EPIC_SANDBOX_CLIENT_ID: 'synthetic-client-id', EPIC_SANDBOX_CLIENT_SECRET: 'synthetic-secret' };

test('sandbox discovery uses one pinned URL, no credentials, redirects disabled, and discovered endpoints', async () => {
  let calls = 0;
  const result = await discoverEpicSandbox(async (input, init) => {
    calls++; assert.equal(input, epicSandboxDiscovery); assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).has('Authorization'), false);
    assert.equal(init?.body, undefined);
    return Response.json(metadata);
  });
  assert.equal(calls, 1); assert.equal(result.token_endpoint, metadata.token_endpoint); assert.equal(result.oidc_issuer, metadata.issuer);
});
test('discovery rejects missing PKCE, missing endpoints, redirects, oversized metadata and off-sandbox endpoints', async () => {
  for (const data of [{ ...metadata, code_challenge_methods_supported: [] }, { ...metadata, issuer: null }, { ...metadata, jwks_uri: 'https://other.example.com/keys' }, { ...metadata, token_endpoint: 'https://fhir.epic.com/production/token' }, { ...metadata, token_endpoint: `${root}/token?unsafe=value` }]) {
    await assert.rejects(discoverEpicSandbox(async () => Response.json(data)));
  }
  await assert.rejects(discoverEpicSandbox(async () => new Response('', { status: 302 })));
  await assert.rejects(discoverEpicSandbox(async () => new Response('x'.repeat(65537))));
});
test('scope version is explicit, read-only, and limited to selected R4 resources', () => {
  validateEpicSandboxScopes(scopes('read'), '1'); validateEpicSandboxScopes(scopes('r'), '2');
  for (const values of [scopes('read'), [...scopes('r'), 'user/Patient.write'], [...scopes('r'), 'offline_access'], [...scopes('r'), 'user/Observation.r'], ['openid', 'fhirUser', 'launch'], [...scopes('r'), 'openid']]) assert.throws(() => validateEpicSandboxScopes(values, '2'));
  assert.throws(() => validateEpicSandboxScopes(scopes('rs'), '1'));
});
test('environment credentials only serve the matching reviewed sandbox registration', () => {
  assert.equal(epicSandboxCredentials(connection, env).clientId, env.EPIC_SANDBOX_CLIENT_ID);
  assert.equal(epicSandboxCredentials(connection, env).secret, env.EPIC_SANDBOX_CLIENT_SECRET);
  assert.equal(epicSandboxCredentials({...connection,client_id:epicSandboxClientReference},env).clientId,env.EPIC_SANDBOX_CLIENT_ID);
  for (const changed of [{ ...connection, vendor: 'smart' }, { ...connection, client_id: 'other-id' }, { ...connection, client_auth_method: 'none' as const }, { ...connection, issuer: 'https://ehr.example.com/fhir' }, { ...connection, token_endpoint: 'https://other.example.com/token' }]) {
    assert.throws(() => epicSandboxCredentials(changed, env), error => error instanceof Error && !error.message.includes(env.EPIC_SANDBOX_CLIENT_ID) && !error.message.includes(env.EPIC_SANDBOX_CLIENT_SECRET));
  }
  assert.throws(() => epicSandboxCredentials(connection, {}));
});
