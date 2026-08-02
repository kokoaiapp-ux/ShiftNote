"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Purchases } from "@revenuecat/purchases-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { Brand } from "@/components/public/PublicChrome";
import { StatusMessage } from "@/components/ui/status-message";
import { completeFirstTimeFlow, hasCompletedFirstTimeFlow, isFirstTimeFlowPending, trackPaywallEvent } from "@/lib/first-time-flow";

export default function DiscountPage() {
  const auth = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (hasCompletedFirstTimeFlow() || !isFirstTimeFlowPending()) { router.replace("/dashboard"); return; }
    trackPaywallEvent("discount_view");
    queueMicrotask(() => setReady(true));
  }, [router]);
  function dismiss() { trackPaywallEvent("discount_dismissed"); completeFirstTimeFlow(); router.push("/dashboard"); }
  async function purchase() {
    setMessage("");
    trackPaywallEvent("purchase_started", { plan: "first-time-six-month", source: "discount" });
    if (!auth.configured) { completeFirstTimeFlow(); trackPaywallEvent("purchase_completed", { plan: "first-time-six-month", mode: "preview" }); router.push("/dashboard"); return; }
    if (!auth.user) { router.push("/login?returnTo=/discount"); return; }
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY;
    if (!apiKey) { setMessage("The discount checkout is not configured yet."); return; }
    setBusy(true);
    try {
      const purchases = Purchases.configure({ apiKey, appUserId: auth.user.uid });
      const offering = (await purchases.getOfferings()).current;
      if (!offering) throw new Error("No current RevenueCat offering is configured.");
      const wanted = process.env.NEXT_PUBLIC_REVENUECAT_DISCOUNT_PACKAGE_ID || "first_time_discount";
      const rcPackage = offering.availablePackages.find((item) => item.identifier === wanted);
      if (!rcPackage) throw new Error("The first-time discount package is not available in the current RevenueCat offering.");
      await purchases.purchase({ rcPackage, customerEmail: auth.user.email || undefined });
      completeFirstTimeFlow();
      trackPaywallEvent("purchase_completed", { plan: "first-time-six-month" });
      router.push("/dashboard");
    } catch (error) {
      trackPaywallEvent("purchase_failed", { plan: "first-time-six-month" });
      setMessage(error instanceof Error ? error.message : "The purchase could not be completed. Please try again.");
    } finally { setBusy(false); }
  }
  if (!ready) return <main className="min-h-screen bg-[var(--background)]" />;
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)]"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><Brand /><button aria-label="Close discount offer" className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]" onClick={dismiss}><X className="size-5" /></button></div><div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center py-10"><section className="w-full rounded-[30px] border border-[var(--primary)] bg-[var(--card)] p-7 text-center shadow-2xl sm:p-10"><span className="inline-flex rounded-full bg-[var(--primary)] px-5 py-2 text-xl font-bold text-white">40% OFF</span><p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-[var(--primary)]">Limited first-time offer</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Unlock more time for patient care</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">This special savings is available only once to first-time ShiftNote users.</p>{message && <StatusMessage variant="error" className="mt-6" title="Offer unavailable">{message}</StatusMessage>}<div className="mt-8 rounded-2xl bg-[var(--primary-soft)] p-6 text-left"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">6-Month Plan</h2><p className="mt-3 text-4xl font-semibold">$11.99<span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">/month</span></p><p className="mt-2 text-sm font-medium">Billed $71.94 today</p></div><Check className="size-6 text-[var(--primary)]" /></div></div><button disabled={busy} className="mt-7 h-12 w-full rounded-xl bg-[var(--primary)] font-semibold text-white shadow-md disabled:opacity-60" onClick={() => void purchase()}>{busy ? "Opening secure checkout…" : "Unlock 40% Savings"}</button><p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">Available only during your first-time onboarding subscription flow.</p></section></div></div></main>;
}
