import { EnterpriseShell } from "@/components/enterprise/EnterpriseShell";
import { WorkspaceProvider } from '@/components/enterprise/WorkspaceProvider';
import { requirePortal } from '@/lib/server/enterprise-auth';
import { EnterpriseError } from '@/lib/enterprise/validation';
import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  try{await requirePortal('enterprise');}catch(error){if(error instanceof EnterpriseError&&(error.status===401||error.status===403))redirect('/enterprise/login');throw error;}
  return <WorkspaceProvider><EnterpriseShell>{children}</EnterpriseShell></WorkspaceProvider>;
}
