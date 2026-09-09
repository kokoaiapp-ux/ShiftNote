"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CreditCard, Grid2X2, Headphones, LayoutDashboard, Menu, Network, Plug, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { EnterpriseBrand } from "./ui";
import { cn } from "@/lib/utils";

const links = [
  ["dashboard", "Overview", LayoutDashboard], ["organizations", "Organization", Building2],
  ["facilities", "Facilities", Grid2X2], ["departments", "Departments", Network],
  ["users", "Users", Users], ["analytics", "Analytics", BarChart3],
  ["integrations", "Integrations", Plug], ["billing", "Billing", CreditCard],
  ["support", "Support", Headphones], ["settings", "Settings", Settings],
] as const;

export function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen lg:pl-64">
    {open && <button aria-label="Close Enterprise navigation" className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setOpen(false)} />}
    <aside id="enterprise-navigation" className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] p-5 lg:flex", !open && "hidden")}>
      <div className="flex items-center justify-between"><EnterpriseBrand /><button aria-label="Close menu" className="lg:hidden" onClick={() => setOpen(false)}><X className="size-5" /></button></div>
      <p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--muted-foreground)]">Organization workspace</p>
      <nav aria-label="Enterprise workspace" className="space-y-1">{links.map(([path, title, Icon]) => <Link key={path} href={`/enterprise/${path}`} aria-current={pathname === `/enterprise/${path}` ? "page" : undefined} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--muted)]", pathname === `/enterprise/${path}` ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]")}><Icon className="size-[18px]" />{title}</Link>)}</nav>
      <div className="mt-auto pt-8"><div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="text-xs font-semibold">A workspace to explore</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Sample data only. No real organizations, users, or clinical records.</p><Link href="/enterprise" className="mt-3 block text-xs font-semibold text-[var(--primary)]">Back to Enterprise →</Link></div></div>
    </aside>
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-5 py-3 md:px-8"><div className="flex items-center gap-3"><button aria-label="Open Enterprise navigation" aria-expanded={open} aria-controls="enterprise-navigation" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg border border-[var(--border)] lg:hidden"><Menu className="size-5" /></button><span className="text-sm font-semibold">Evergreen Care Group</span></div><span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]">Visual prototype · Sample data</span></header>
    <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
  </div>;
}
