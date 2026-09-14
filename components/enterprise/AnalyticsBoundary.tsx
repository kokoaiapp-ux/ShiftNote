"use client";
import { usePathname } from 'next/navigation';
export function AnalyticsBoundary({children}:{children:React.ReactNode}) {
  const path=usePathname();
  // Keep setup tokens, staff pages, and organization data out of advertising analytics.
  if(path==='/admin'||path.startsWith('/admin/')||path==='/enterprise'||path.startsWith('/enterprise/'))return null;
  return <>{children}</>;
}
