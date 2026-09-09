import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const fieldClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]";
export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]";
export function EnterpriseBrand() {
  return <Link href="/enterprise" className="flex shrink-0 items-center gap-2.5"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-white"><Sparkles className="size-5" /></span><span><span className="block font-semibold tracking-tight">ShiftNote</span><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--primary)]">Enterprise</span></span></Link>;
}
export function DemoLink({ children = "Request Enterprise Demo", className }: { children?: React.ReactNode; className?: string }) {
  return <Link href="/enterprise/request-demo" className={cn(buttonClass, className)}>{children}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>;
}
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] md:p-6", className)}>{children}</section>;
}
export function Badge({ children = "Coming Soon" }: { children?: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--primary)]">{children}</span>;
}
export function PageIntro({ title, description }: { title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--primary)]">Enterprise workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p></div>;
}
