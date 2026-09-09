import Link from "next/link";
import { EnterpriseBrand } from "./ui";

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return <>
    <header className="border-b border-[var(--border)] bg-[var(--card)]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8"><EnterpriseBrand /><nav aria-label="Enterprise website" className="flex flex-wrap items-center gap-5 text-sm"><Link href="/">Professional</Link><Link href="/enterprise">Enterprise</Link><Link href="/enterprise/subscription">Enterprise Features</Link><Link href="/enterprise/demo" className="font-semibold text-[var(--primary)]">Explore Demo</Link></nav></div></header>
    <main>{children}</main>
    <footer className="border-t border-[var(--border)]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-8 lg:px-8"><EnterpriseBrand /><p className="text-xs text-[var(--muted-foreground)]">Enterprise preview · Built around your organization.</p><div className="flex gap-5 text-sm"><Link href="/enterprise/request-demo">Request a demo</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div></footer>
  </>;
}
