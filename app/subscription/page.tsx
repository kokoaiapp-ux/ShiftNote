"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Brand, PublicPage } from "@/components/public/PublicChrome";
import { StatusMessage } from "@/components/ui/status-message";
import { beginFirstTimeFlow, hasCompletedOnboarding, hasPurchasedPrimaryPaywall, markPrimaryPaywallPurchased, trackPaywallEvent } from "@/lib/first-time-flow";

const benefits = ["Save up to 1 hour of documentation every shift with AI.", "Access every professional mode", "Unlimited clinical documentation templates", "Edit, regenerate, save, favorite, and organize your documentation"] as const;
const plans = [
  { id: "monthly", name: "Monthly", price: "$19.99", detail: "per month", button: "Choose Monthly" },
  { id: "six-month", name: "Six Month", price: "$13.99", detail: "per month", billing: "$83.94 billed every 6 months", trial: "Includes a 3 day free trial.", savings: "Save over 30% compared to paying monthly.", badge: "Best Value", button: "Start 3 Day Free Trial" },
] as const;

export default function SubscriptionPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const requestedFirstTime = params.get("flow") === "first-time";
  const subscriptionSource = params.get("source");
  const requestedStage = params.get("stage") === "entry" ? "entry" : "post-onboarding";
  const [flow, setFlow] = useState<{ active: boolean; stage: "entry" | "post-onboarding" } | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (requestedFirstTime && requestedStage === "entry") {
      if (hasPurchasedPrimaryPaywall() || hasCompletedOnboarding()) { router.replace("/dashboard"); return; }
      beginFirstTimeFlow();
      queueMicrotask(() => setFlow({ active: true, stage: "entry" }));
      trackPaywallEvent("paywall_view", { stage: "entry" });
      return;
    }
    if (subscriptionSource === "onboarding") {
      queueMicrotask(() => setFlow({ active: true, stage: "post-onboarding" }));
      trackPaywallEvent("paywall_view", { stage: "post-onboarding", source: "onboarding" });
      return;
    }
    if (subscriptionSource === "settings") {
      queueMicrotask(() => setFlow({ active: false, stage: "post-onboarding" }));
      trackPaywallEvent("paywall_view", { stage: "standard", source: "settings" });
      return;
    }
    if (hasPurchasedPrimaryPaywall()) {
      queueMicrotask(() => setFlow({ active: false, stage: "post-onboarding" }));
      trackPaywallEvent("paywall_view", { stage: "standard" });
      return;
    }
    queueMicrotask(() => setFlow({ active: false, stage: "post-onboarding" }));
    trackPaywallEvent("paywall_view", { stage: "standard" });
  }, [requestedFirstTime, requestedStage, router, subscriptionSource]);

  async function buy(planId: string) {
    setMessage("");
    trackPaywallEvent("purchase_started", { plan: planId, source: flow?.active ? "first-time" : "standard" });
    if (!auth.configured) { if (flow?.active) markPrimaryPaywallPurchased(); trackPaywallEvent("purchase_completed", { plan: planId, mode: "preview" }); router.push("/dashboard"); return; }
    if (!auth.user) { router.push(flow?.active ? "/signup?returnTo=/onboarding" : "/login?returnTo=/subscription"); return; }
    setBusy(planId);
    try {
      const token = await auth.accessToken();
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ plan: planId === "monthly" ? "monthly" : "six_month" }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Secure checkout is unavailable.");
      location.assign(payload.url);
    } catch (error) {
      trackPaywallEvent("purchase_failed", { plan: planId });
      setMessage(error instanceof Error ? error.message : "The purchase could not be started. Please try again.");
    } finally { setBusy(""); }
  }

  function continueFlow() {
    if (flow?.stage !== "entry") return;
    trackPaywallEvent("paywall_declined", { stage: "entry" });
    router.push("/signup?returnTo=/onboarding");
  }

  function showDiscount() {
    trackPaywallEvent("paywall_declined", { stage: "post-onboarding" });
    router.push("/discount");
  }

  if (!flow) return <main className="min-h-screen bg-[var(--background)]" />;
  const content = <main className="mx-auto max-w-5xl px-5 py-16 lg:px-8"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--primary)]">ShiftNote Pro</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose the plan that works best for you</h1><p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">Spend less time documenting and more time caring for patients with ShiftNote Pro.</p></div>{message && <StatusMessage variant="error" className="mx-auto mt-8 max-w-2xl" title="Subscription unavailable">{message}</StatusMessage>}<div className="mx-auto mt-10 grid max-w-3xl items-stretch gap-5 md:grid-cols-2">{plans.map((plan) => { const featured = plan.id === "six-month"; return <article className={`relative flex h-full rounded-[28px] border bg-[var(--card)] p-7 shadow-lg ${featured ? "border-[var(--primary)] shadow-xl ring-1 ring-[var(--primary)]/15 md:-translate-y-1" : "border-[var(--border)]"}`} key={plan.id}><div className="flex w-full flex-col">{"badge" in plan && <span className="absolute right-5 top-5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{plan.badge}</span>}<h2 className="text-lg font-semibold">{plan.name}</h2><div className="mt-5 flex items-end gap-2"><p className="text-4xl font-semibold tracking-tight">{plan.price}</p><p className="pb-1 text-sm text-[var(--muted-foreground)]">{plan.detail}</p></div>{"billing" in plan && <p className="mt-2 text-sm font-medium">{plan.billing}</p>}{"trial" in plan && <p className="mt-1 text-xs font-medium text-[var(--primary)]">{plan.trial}</p>}{"savings" in plan && <p className="mt-2 inline-flex self-start rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{plan.savings}</p>}<ul className="mt-7 space-y-3 text-sm">{benefits.map((benefit) => <li className="flex gap-2" key={benefit}><Check className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />{benefit}</li>)}</ul><div className="mt-auto pt-7"><button disabled={Boolean(busy)} onClick={() => void buy(plan.id)} className={`h-12 w-full rounded-xl font-semibold disabled:opacity-60 ${featured ? "bg-[var(--primary)] text-white shadow-md" : "border border-[var(--primary)] bg-[var(--card)] text-[var(--primary)]"}`}>{busy === plan.id ? "Opening secure checkout…" : plan.button}</button></div></div></article>; })}</div>{flow.active && flow.stage === "entry" && <div className="mt-6 text-center"><button className="text-sm font-medium text-[var(--muted-foreground)] underline-offset-4 hover:underline" onClick={continueFlow}>Continue through onboarding</button></div>}<div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl bg-[var(--primary-soft)] p-5 text-sm"><Sparkles className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" /><p><strong>Clinical responsibility stays with you.</strong> ShiftNote drafts documentation from the facts you provide. Review and attest every note before clinical use.</p></div></main>;
  if (!flow.active) return <PublicPage>{content}</PublicPage>;
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"><header className="border-b border-[var(--border)]"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 lg:px-8"><Brand />{flow.stage === "post-onboarding" && <button aria-label="View discount offer" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]" onClick={showDiscount}><X className="size-5" /></button>}</div></header>{content}</div>;
}
