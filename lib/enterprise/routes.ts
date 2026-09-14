/** Separate Enterprise namespace; workspace access is checked on the server. */
export function isEnterprisePath(pathname: string) {
  return pathname === "/enterprise" || pathname.startsWith("/enterprise/");
}
