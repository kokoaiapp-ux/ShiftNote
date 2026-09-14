import { redirect } from 'next/navigation';
import { requirePortal } from '@/lib/server/enterprise-auth';
import { EnterpriseError } from '@/lib/enterprise/validation';
import { AdminShell } from '@/components/enterprise/AdminShell';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){
  let role='';
  try{role=(await requirePortal('admin')).role;}catch(error){if(error instanceof EnterpriseError&&(error.status===401||error.status===403))redirect('/admin/login');throw error;}
  return <AdminShell role={role}>{children}</AdminShell>;
}
