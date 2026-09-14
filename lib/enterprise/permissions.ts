export const internalRoles = ['shiftnote_owner', 'shiftnote_admin', 'shiftnote_sales', 'shiftnote_support'] as const;
export type InternalRole = typeof internalRoles[number];
export function isInternalRole(role: string): role is InternalRole {
  return (internalRoles as readonly string[]).includes(role);
}
export function managesEnterprise(role: string) {
  return role === 'shiftnote_owner' || role === 'shiftnote_admin';
}
export function canViewAdminSection(role: string, section: string) {
  if (!isInternalRole(role)) return false;
  if (managesEnterprise(role)) return ['dashboard','leads','organizations','contracts','payments','integrations','support','audit-logs','settings'].includes(section);
  if (role === 'shiftnote_sales') return ['dashboard','leads','organizations','contracts'].includes(section);
  return ['dashboard','organizations','integrations','support'].includes(section);
}
export function canPerformAdminAction(role: string, action: string) {
  if (managesEnterprise(role)) return ['approve','reissue','lead','organization-status','contract','ticket'].includes(action);
  return (role === 'shiftnote_sales' && action === 'lead') || (role === 'shiftnote_support' && action === 'ticket');
}
