"use client";

import { Check, Moon, Monitor, Sun } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const product = useProduct();
  const themes = [{ id: "light" as const, label: "Light", icon: Sun }, { id: "dark" as const, label: "Dark", icon: Moon }, { id: "system" as const, label: "System", icon: Monitor }];
  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Personalize ShiftNote’s appearance and working density. Preferences are stored only on this device." />
      <div className="max-w-3xl space-y-5">
        <Card><CardContent><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Choose how ShiftNote looks on this device.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{themes.map((theme) => <button className={cn("flex items-center justify-between rounded-xl border border-[var(--border)] p-4 text-sm font-medium transition hover:bg-[var(--muted)]", product.theme === theme.id && "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]")} key={theme.id} onClick={() => product.setTheme(theme.id)}><span className="flex items-center gap-2"><theme.icon className="size-4" />{theme.label}</span>{product.theme === theme.id && <Check className="size-4" />}</button>)}</div></CardContent></Card>
        <Card><CardContent><div className="flex items-center justify-between gap-5"><div><h2 className="font-semibold">Compact mode</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Reduce spacing to show more information at once.</p></div><button aria-pressed={product.compact} className={cn("relative h-7 w-12 rounded-full bg-[var(--muted)] transition", product.compact && "bg-[var(--primary)]")} onClick={() => product.setCompact(!product.compact)}><span className={cn("absolute left-1 top-1 size-5 rounded-full bg-white shadow transition", product.compact && "translate-x-5")} /></button></div></CardContent></Card>
        <Card><CardContent><h2 className="font-semibold">Primary color</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Updates buttons, links, icons, selections, focus states, and copilot accents instantly.</p><div className="mt-4 flex gap-3">{["#176b4c", "#2563eb", "#7c3aed", "#a94720"].map((color, index) => <button aria-label={`Use primary color ${index + 1}`} aria-pressed={product.primaryColor === color} className={cn("size-9 rounded-full border-4 border-[var(--card)] shadow transition hover:scale-110", product.primaryColor === color && "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--card)]")} key={color} onClick={() => product.setPrimaryColor(color)} style={{ backgroundColor: color }} />)}</div></CardContent></Card>
        <Card><CardContent><h2 className="font-semibold">Language</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">English (US) · More languages coming soon.</p></CardContent></Card>
      </div>
    </>
  );
}
