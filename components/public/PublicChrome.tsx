/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

export function Brand() { return <Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[var(--primary)] text-white"><Sparkles className="size-4" /></span><span className="font-semibold tracking-tight">ShiftNote</span></Link>; }
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--background)]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8"><Brand /><nav className="hidden items-center gap-7 text-sm md:flex"><a href="/#features">Features</a><a href="/#professions">Professions</a><Link href="/subscription">Pricing</Link><a href="mailto:support@shiftnote.app">Support</a><Link href="/login">Log in</Link><Link href="/signup" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 font-semibold text-white">Get started</Link></nav><button aria-label="Open menu" className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>{open && <nav className="space-y-1 border-t border-[var(--border)] bg-[var(--card)] p-5 text-sm md:hidden">{[["/#features","Features"],["/#professions","Professions"],["/subscription","Pricing"],["/login","Log in"],["/signup","Get started"]].map(([href,label])=><Link className="block rounded-lg px-3 py-2 hover:bg-[var(--muted)]" href={href} key={href} onClick={()=>setOpen(false)}>{label}</Link>)}</nav>}</header>;
}
export function PublicFooter() { return <footer className="border-t border-[var(--border)]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 text-sm text-[var(--muted-foreground)] md:flex-row md:items-center md:justify-between lg:px-8"><Brand /><div className="flex flex-wrap gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@shiftnote.app">support@shiftnote.app</a></div><p>© 2026 ShiftNote. All rights reserved.</p></div></footer>; }
export function PublicPage({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><PublicHeader />{children}<PublicFooter /></div>; }
