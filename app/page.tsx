"use client";

import { useRouter } from "next/navigation";
import { Clock3, FileText, Heart, Sparkles, TimerReset } from "lucide-react";
import { ProductIcon } from "@/components/product/Icon";
import { useProduct } from "@/components/product/ProductProvider";
import { Card, CardContent } from "@/components/ui/card";
import { templates } from "@/lib/product-data";

const quickIds = ["general-progress-note", "medication-administration", "wound-care", "incident-report", "admission-note", "discharge-summary"];

export default function DashboardPage() {
  const router = useRouter();
  const product = useProduct();
  const quickTemplates = quickIds.map((id) => templates.find((item) => item.id === id)!).filter(Boolean);

  function openTemplate(id: string) {
    product.setTemplate(id);
    product.clearChat();
    router.push("/copilot");
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] bg-[#163f33] px-7 py-8 text-white shadow-xl shadow-emerald-950/10 md:px-10 md:py-10">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <p className="text-sm text-emerald-100/70">Good morning, Maria</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Ready to simplify your documentation?</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/65">Choose a structured workflow or open the copilot and describe the clinical facts in your own words.</p>
        <button className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#153f33] transition hover:-translate-y-0.5" onClick={() => router.push("/copilot")}>
          <Sparkles className="size-4" /> Open AI Copilot
        </button>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Quick actions</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Start a note</h2></div>
          <button className="text-sm font-medium text-[var(--primary)]" onClick={() => router.push("/templates")}>View all templates</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickTemplates.map((template) => (
            <button className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-lg" key={template.id} onClick={() => openTemplate(template.id)}>
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><ProductIcon className="size-5" name={template.icon} /></span>
              <h3 className="mt-4 font-semibold">{template.name}</h3>
              <p className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]">{template.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Documentation statistics</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Notes generated today", value: String(product.history.filter((note) => new Date(note.createdAt).toDateString() === new Date().toDateString()).length || 7), icon: FileText, hint: "2 more than yesterday" },
            { label: "Time saved", value: "38 min", icon: TimerReset, hint: "Estimated today" },
            { label: "Favorite notes", value: String(product.favorites.length || 5), icon: Heart, hint: "Ready to reuse" },
            { label: "Recent activity", value: String(product.history.length || 12), icon: Clock3, hint: "Last 7 days" },
          ].map((stat) => (
            <Card key={stat.label}><CardContent><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{stat.value}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{stat.hint}</p></div><stat.icon className="size-5 text-[var(--primary)]" /></div></CardContent></Card>
          ))}
        </div>
      </section>
    </>
  );
}
