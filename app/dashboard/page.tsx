"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Clock3, FileText, Heart, Sparkles, TimerReset } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProductIcon } from "@/components/product/Icon";
import { useProduct } from "@/components/product/ProductProvider";
import { Card, CardContent } from "@/components/ui/card";
import { getQuickActionsForMode } from "@/lib/product-data";
import { DASHBOARD_METRICS_CHANGED } from "@/lib/dashboard-metrics";
import { requireSupabase } from "@/lib/supabase";

type DashboardMetrics = { generatedToday: number; generatedYesterday: number; timeSavedMinutes: number; favoriteDocumentation: number; recentActivity: number };
const emptyMetrics: DashboardMetrics = { generatedToday: 0, generatedYesterday: 0, timeSavedMinutes: 0, favoriteDocumentation: 0, recentActivity: 0 };

function localDateRanges() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    todayStart,
    tomorrowStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    yesterdayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    recentStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const product = useProduct();
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const quickTemplates = getQuickActionsForMode(product.mode.id);

  const loadMetrics = useCallback(async () => {
    if (!auth.user) { setMetrics(emptyMetrics); return; }
    const { data } = await requireSupabase().auth.getSession();
    if (!data.session?.access_token) return;
    const parameters = new URLSearchParams();
    for (const [name, date] of Object.entries(localDateRanges())) parameters.set(name, date.toISOString());
    const response = await fetch(`/api/dashboard/metrics?${parameters}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
    if (!response.ok) return;
    setMetrics(await response.json() as DashboardMetrics);
  }, [auth.user]);

  useEffect(() => {
    if (auth.loading) return;
    queueMicrotask(() => { void loadMetrics(); });
    const refresh = () => { void loadMetrics(); };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    let midnightTimer = 0;
    const scheduleMidnightRefresh = () => {
      const { tomorrowStart } = localDateRanges();
      midnightTimer = window.setTimeout(() => { refresh(); scheduleMidnightRefresh(); }, tomorrowStart.getTime() - Date.now() + 1000);
    };
    scheduleMidnightRefresh();
    window.addEventListener(DASHBOARD_METRICS_CHANGED, refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener(DASHBOARD_METRICS_CHANGED, refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [auth.loading, loadMetrics]);

  const differenceFromYesterday = metrics.generatedToday - metrics.generatedYesterday;
  const todayHint = differenceFromYesterday === 0 ? "Same as yesterday" : `${Math.abs(differenceFromYesterday)} ${differenceFromYesterday > 0 ? "more" : "fewer"} than yesterday`;

  function openTemplate(id: string) {
    product.setTemplate(id);
    product.clearChat(false);
    router.push("/copilot");
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] bg-[var(--primary)] px-7 py-8 text-white shadow-xl md:px-10 md:py-10">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <p className="text-sm text-white/70">Good morning, Maria</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Ready to simplify your documentation?</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Choose a structured workflow or open the copilot and describe the clinical facts in your own words.</p>
        <button className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--card)] px-5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5" onClick={() => { product.clearChat(); router.push("/copilot"); }} style={{ color: "var(--primary-readable)" }}>
          <Sparkles className="size-4" /> Open AI Copilot
        </button>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Quick actions</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Start documentation</h2></div>
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
            { label: "Documentation generated today", value: String(metrics.generatedToday), icon: FileText, hint: todayHint },
            { label: "Time saved", value: `${metrics.timeSavedMinutes} min`, icon: TimerReset, hint: "Estimated today" },
            { label: "Favorite documentation", value: String(metrics.favoriteDocumentation), icon: Heart, hint: "Ready to reuse" },
            { label: "Recent activity", value: String(metrics.recentActivity), icon: Clock3, hint: "Last 7 days" },
          ].map((stat) => (
            <Card key={stat.label}><CardContent><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{stat.value}</p><p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{stat.hint}</p></div><stat.icon className="size-5 text-[var(--primary)]" /></div></CardContent></Card>
          ))}
        </div>
      </section>
    </>
  );
}
