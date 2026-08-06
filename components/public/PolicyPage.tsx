"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "./PublicChrome";

export function PolicyPage({ title, intro, sections }: { title:string; intro:string; sections:Array<[string,React.ReactNode]> }) {
  const router=useRouter();
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><header className="border-b border-[var(--border)]"><div className="mx-auto max-w-4xl px-5 py-4 lg:px-8"><Brand/></div></header><div className="mx-auto max-w-4xl px-5 lg:px-8" style={{paddingTop:"32px",paddingBottom:"8px"}}><button aria-label="Go back" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]" onClick={()=>router.back()}><ArrowLeft className="size-5"/></button></div><main className="mx-auto max-w-4xl px-5 py-16 lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--primary)]">Legal</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1><p className="mt-3 text-sm text-[var(--muted-foreground)]">Effective August 1, 2026</p><p className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 leading-7">{intro}</p><div className="mt-10 space-y-10">{sections.map(([heading,body])=><section key={heading}><h2 className="text-xl font-semibold">{heading}</h2><div className="mt-3 space-y-3 text-sm leading-7 text-[var(--muted-foreground)]">{body}</div></section>)}</div></main></div>;
}
