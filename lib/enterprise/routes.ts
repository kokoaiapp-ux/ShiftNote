/** Public prototype boundary; does not grant access to Professional routes. */
export function isEnterprisePath(pathname: string) {
  return pathname === "/enterprise" || pathname.startsWith("/enterprise/");
}
