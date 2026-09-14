import { AdminWorkspace } from '@/components/enterprise/AdminWorkspace';
import { notFound } from 'next/navigation';
import { requirePortal } from '@/lib/server/enterprise-auth';
import { canViewAdminSection } from '@/lib/enterprise/permissions';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['leads','organizations','contracts','payments','integrations','support','audit-logs','settings'].includes(section))notFound();const {role}=await requirePortal('admin');if(!canViewAdminSection(role,section))notFound();return <AdminWorkspace view={section}/>;}
