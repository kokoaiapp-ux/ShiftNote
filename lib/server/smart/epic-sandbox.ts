import type { SmartConnection } from '@/types/smart';
import { safeEndpoint } from './core';
import { readJson } from './exchange';

// Only the public non-production discovery location is pinned. OAuth/OIDC
// endpoints come from discovery and are persisted for operator review.
export const epicSandboxIssuer = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
export const epicSandboxDiscovery = `${epicSandboxIssuer}/.well-known/smart-configuration`;
export const epicSandboxVendor = 'epic-sandbox';
export const epicSandboxClientReference = 'env:EPIC_SANDBOX_CLIENT_ID';

function sandboxEndpoint(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Epic sandbox metadata is incomplete.');
  const url = safeEndpoint(value);
  if (url.origin !== 'https://fhir.epic.com' || !url.pathname.startsWith('/interconnect-fhir-oauth/') || url.search || /%|\\/.test(value)) {
    throw new Error('Epic sandbox endpoint is outside the trusted sandbox.');
  }
  return url.href;
}

export async function discoverEpicSandbox(fetcher: typeof fetch = fetch) {
  const response = await fetcher(epicSandboxDiscovery, {
    headers: { Accept: 'application/json' }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  const metadata = await readJson(response);
  const strings = (key: string) => Array.isArray(metadata[key]) && metadata[key].every(v => typeof v === 'string') ? metadata[key] as string[] : [];
  if (!strings('code_challenge_methods_supported').includes('S256') || !strings('capabilities').includes('launch-ehr')) {
    throw new Error('Epic sandbox does not advertise the required launch/PKCE support.');
  }
  return {
    issuer: epicSandboxIssuer,
    authorization_endpoint: sandboxEndpoint(metadata.authorization_endpoint),
    token_endpoint: sandboxEndpoint(metadata.token_endpoint),
    oidc_issuer: sandboxEndpoint(metadata.issuer),
    jwks_uri: sandboxEndpoint(metadata.jwks_uri),
    authMethods: strings('token_endpoint_auth_methods_supported'),
    capabilities: strings('capabilities'),
  };
}

// Version and exact scopes must come from the app registration, NOT from the
// server's advertised capabilities (the sandbox supports both v1 and v2).
export function validateEpicSandboxScopes(scopes: string[], version: '1' | '2') {
  if (!['1', '2'].includes(version) || new Set(scopes).size !== scopes.length || !['openid', 'fhirUser', 'launch'].every(s => scopes.includes(s))) {
    throw new Error('Explicit registered SMART scopes are required.');
  }
  const resources = new Set<string>();
  for (const scope of scopes) {
    if (['openid', 'fhirUser', 'launch', 'launch/patient', 'launch/encounter', 'online_access'].includes(scope)) continue;
    const match = /^(patient|user)\/(Patient|Encounter|Practitioner)\.(read|r|rs|s)$/.exec(scope);
    if (!match || (version === '1' ? match[3] !== 'read' : match[3] === 'read')) throw new Error('Only the registered read-only R4 scopes are allowed.');
    resources.add(match[2]);
  }
  if (!['Patient', 'Encounter', 'Practitioner'].every(resource => resources.has(resource))) throw new Error('Patient, Encounter, and Practitioner scopes are required.');
}

export function epicSandboxCredentials(connection: SmartConnection, env: Record<string, string | undefined>) {
  if (connection.vendor !== epicSandboxVendor || connection.issuer !== epicSandboxIssuer) throw new Error('Not an Epic sandbox connection.');
  for (const endpoint of [connection.authorization_endpoint, connection.token_endpoint, connection.oidc_issuer, connection.jwks_uri]) sandboxEndpoint(endpoint);
  const clientId = env.EPIC_SANDBOX_CLIENT_ID;
  const secret = env.EPIC_SANDBOX_CLIENT_SECRET;
  if (!clientId || !secret || ![epicSandboxClientReference, clientId].includes(connection.client_id) || !['client_secret_basic', 'client_secret_post'].includes(connection.client_auth_method)) {
    throw new Error('Epic sandbox credentials do not match the reviewed connection.');
  }
  return { clientId, secret };
}
