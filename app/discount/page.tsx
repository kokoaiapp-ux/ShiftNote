"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Brand } from "@/components/public/PublicChrome";
import { StatusMessage } from "@/components/ui/status-message";
import { hasCompletedOnboarding, hasPurchasedPrimaryPaywall, isFirstTimeFlowPending, trackPaywallEvent } from "@/lib/first-time-flow";
import { loadSubscriptionAccess } from "@/lib/subscription-access-client";
import { trackEvent } from "@/lib/analytics";
import { trackTikTok } from "@/lib/tiktok";
import { trackMeta } from "@/lib/meta";

export default function DiscountPage() {
  const auth = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.configured) {
      if (hasPurchasedPrimaryPaywall() || (!isFirstTimeFlowPending() && !hasCompletedOnboarding())) { router.replace("/dashboard"); return; }
      trackPaywallEvent("discount_view"); trackEvent("view_subscription_paywall", { source: "discount" }); trackTikTok("ViewContent", { content_id: "discount_paywall", content_type: "product" }); trackMeta("ViewPaywall", { content_ids: ["discount_paywall"], content_type: "product" });
      queueMicrotask(() => setReady(true));
      return;
    }
    if (!auth.user) { router.replace("/login?returnTo=/discount"); return; }
    let current = true;
    void loadSubscriptionAccess(true).then(({ state }) => {
      if (!current) return;
      if (state !== "neverSubscribed") { router.replace("/dashboard"); return; }
      trackPaywallEvent("discount_view"); trackEvent("view_subscription_paywall", { source: "discount" }); trackTikTok("ViewContent", { content_id: "discount_paywall", content_type: "product" }); trackMeta("ViewPaywall", { content_ids: ["discount_paywall"], content_type: "product" });
      setReady(true);
    }).catch(() => { if (current) router.replace("/dashboard"); });
    return () => { current = false; };
  }, [auth.configured, auth.loading, auth.user, router]);
  function dismiss() { trackPaywallEvent("discount_dismissed"); router.push("/dashboard"); }
  async function purchase() {
    setMessage("");
    trackEvent("begin_checkout", { currency: "USD", value: 71.94, items: [{ item_id: "promotional_six_month_discount", item_name: "ShiftNote Pro Promotional Six Months" }] });
    trackTikTok("InitiateCheckout", { currency: "USD", value: 71.94, content_id: "promotional_six_month_discount", content_type: "product" });
    trackMeta("InitiateCheckout", { currency: "USD", value: 71.94, content_ids: ["promotional_six_month_discount"], content_type: "product" });
    trackPaywallEvent("purchase_started", { plan: "promotional-six-month", source: "discount" });
    if (!auth.configured) { trackPaywallEvent("purchase_completed", { plan: "promotional-six-month", mode: "preview" }); router.push("/dashboard"); return; }
    if (!auth.user) { router.push("/login?returnTo=/discount"); return; }
    setBusy(true);
    try {
      const token = await auth.accessToken();
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ plan: "promotional_six_month_discount" }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Secure checkout is unavailable.");
      location.assign(payload.url);
    } catch (error) {
      trackPaywallEvent("purchase_failed", { plan: "promotional-six-month" });
      setMessage(error instanceof Error ? error.message : "The purchase could not be started. Please try again.");
    } finally { setBusy(false); }
  }
  if (!ready) return <main className="min-h-screen bg-[var(--background)]" />;
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)]"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><Brand /><button aria-label="Close discount offer" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]" onClick={dismiss}><X className="size-5" /></button></div><div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center py-10"><section className="w-full rounded-[30px] border border-[var(--primary)] bg-[var(--card)] p-7 text-center shadow-2xl sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">🎉 Limited Offer Today</p><span className="mt-5 inline-flex rounded-full bg-[var(--primary)] px-5 py-2 text-xl font-bold text-white">40% OFF</span><h1 className="mt-6 text-3xl font-semibold tracking-tight">ShiftNote Pro</h1><p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--muted-foreground)]">This limited price is only available if you subscribe today.</p>{message && <StatusMessage variant="error" className="mt-6" title="Offer unavailable">{message}</StatusMessage>}<div className="mt-8 rounded-2xl bg-[var(--primary-soft)] p-6 text-left"><div className="flex items-start justify-between gap-4"><div><p className="text-4xl font-semibold">$11.99<span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">/month</span></p><p className="mt-2 text-sm font-medium">Billed $71.94 every 6 months</p></div><Check className="size-6 text-[var(--primary)]" /></div></div><button disabled={busy} className="mt-7 h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white shadow-md disabled:opacity-60" onClick={() => void purchase()}>{busy ? "Opening secure checkout…" : "Unlock 40% Discount"}</button><p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">Spend less time documenting with today&apos;s limited offer.</p></section></div></div></main>;
}
