"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { portalRequest } from './PortalAuth';
import { canViewAdminSection } from '@/lib/enterprise/permissions';
export const adminSections=['Dashboard','Enterprise Leads','Organizations','Contracts','Payments','Integrations','Support','Audit Logs','Settings'];
export const adminPaths=['','leads','organizations','contracts','payments','integrations','support','audit-logs','settings'];
export function AdminShell({children,role}:{children:React.ReactNode;role:string}){
  const path=usePathname();const [error,setError]=useState('');
  return <><header className="border-b border-[var(--border)] bg-[var(--card)] px-5 py-5"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/admin" className="font-semibold">KOKO LABS <span className="text-xs text-[var(--muted-foreground)]">Internal Admin</span></Link><button className="text-sm" onClick={async()=>{try{await portalRequest('admin','logout',{});window.location.assign('/admin/login');}catch(e){setError(e instanceof Error?e.message:'Unable to sign out.');}}}>Log out</button></div><nav aria-label="KOKO LABS administration" className="mx-auto mt-5 flex max-w-7xl flex-wrap gap-2">{adminSections.map((name,i)=>canViewAdminSection(role,adminPaths[i]||'dashboard')&&<Link key={name} href={`/admin${adminPaths[i]?'/'+adminPaths[i]:''}`} aria-current={path===`/admin${adminPaths[i]?'/'+adminPaths[i]:''}`?'page':undefined} className={`rounded-lg px-3 py-2 text-xs ${path===`/admin${adminPaths[i]?'/'+adminPaths[i]:''}`?'bg-[var(--primary-soft)] text-[var(--primary)]':'hover:bg-[var(--muted)]'}`}>{name}</Link>)}</nav></header><main className="mx-auto max-w-7xl p-5 md:p-8">{error&&<p role="alert">{error}</p>}{children}</main></>;
}
