import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const previewLifetimeMs = 7 * 24 * 60 * 60 * 1000;
export const previewAuditAction = 'Manual Setup Preview Created';
const purpose = 'shiftnote-enterprise-setup-preview-v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PreviewClaims = { organizationId: string; issuedAt: number; expiresAt: number; nonce: string };

// Server/script callers supply the server-only key. Never import this from a client component.
function signature(body: string, key: string) {
  if (!key) throw new Error('Preview signing is not configured.');
  return createHmac('sha256', key).update(`${purpose}:${body}`).digest();
}

export function createSetupPreviewToken(organizationId: string, key: string, now = Date.now()) {
  if (!uuid.test(organizationId)) throw new Error('Invalid preview organization.');
  const claims: PreviewClaims = { organizationId, issuedAt: now, expiresAt: now + previewLifetimeMs, nonce: randomBytes(32).toString('hex') };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return { token: `preview.${body}.${signature(body, key).toString('hex')}`, expiresAt: claims.expiresAt };
}

export function verifySetupPreviewToken(token: unknown, key: string, now = Date.now()): PreviewClaims | null {
  if (typeof token !== 'string' || token.length > 1024 || !key) return null;
  const match = /^preview\.([A-Za-z0-9_-]+)\.([a-f0-9]{64})$/.exec(token);
  if (!match || !timingSafeEqual(signature(match[1], key), Buffer.from(match[2], 'hex'))) return null;
  try {
    const claims = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as PreviewClaims;
    if (!uuid.test(claims.organizationId) || !/^[a-f0-9]{64}$/.test(claims.nonce)
      || !Number.isSafeInteger(claims.issuedAt) || !Number.isSafeInteger(claims.expiresAt)
      || claims.issuedAt > now || claims.expiresAt <= now
      || claims.expiresAt - claims.issuedAt !== previewLifetimeMs) return null;
    return claims;
  } catch { return null; }
}
