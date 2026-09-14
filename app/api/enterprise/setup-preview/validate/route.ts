import { body, checked, enterpriseService, failure, json, limit } from '@/lib/server/enterprise-auth';
import { EnterpriseError } from '@/lib/enterprise/validation';
import { previewAuditAction, previewLifetimeMs, verifySetupPreviewToken } from '@/lib/enterprise/setup-preview-token';

export async function POST(request: Request) {
  try {
    const data = await body(request);
    const claims = verifySetupPreviewToken(data.token, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    if (!claims) throw new EnterpriseError('Invalid or expired preview link.', 410);
    await limit(request, 'enterprise:setup-preview', 30);
    const service = enterpriseService();
    const organization = checked(await service.from('organizations').select('id,name,status,country,state').eq('id', claims.organizationId).maybeSingle());
    const marker = checked(await service.from('enterprise_audit_logs').select('created_at').eq('organization_id', claims.organizationId).eq('entity_id', claims.organizationId).eq('entity_table', 'organizations').eq('action', previewAuditAction).order('created_at').limit(1).maybeSingle());
    const expiresAt = Math.min(claims.expiresAt, marker ? Date.parse(marker.created_at) + previewLifetimeMs : 0);
    if (!organization || organization.status !== 'New' || !marker || expiresAt <= Date.now()) throw new EnterpriseError('Invalid or expired preview link.', 410);
    // No Auth calls or setup writes: signed preview credentials only disclose this test organization.
    return json({ organization, email: 'preview@example.invalid', preview: true, expiresAt: new Date(expiresAt).toISOString() });
  } catch (error) { return failure(error); }
}
