"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { Purchases } from "@revenuecat/purchases-js";
import { useAuth } from "@/components/auth/AuthProvider";
import { PublicPage } from "@/components/public/PublicChrome";
import { StatusMessage } from "@/components/ui/status-message";

const benefits = [
  "Save up to 1 hour of documentation every shift with AI.",
  "Access every professional mode",
  "Unlimited clinical documentation templates",
  "Edit, regenerate, save, favorite, and organize your documentation",
] as const;

const plans = [
  { id: "monthly", name: "Monthly", price: "$19.99", detail: "per month", button: "Choose Monthly" },
  {
    id: "six-month",
    name: "Six Month",
    price: "$13.99",
    detail: "per month",
    billing: "$83.94 billed every 6 months",
    trial: "Includes a 3 day free trial.",
    savings: "Save over 30% compared to paying monthly.",
    badge: "Best Value",
    button: "Start 3 Day Free Trial",
  },
] as const;

export default function SubscriptionPage() {
  const auth = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function buy(planId: string) {
    setMessage("");
    if (!auth.configured) {
      router.push("/dashboard");
      return;
    }
    if (!auth.user) {
      router.push("/login?returnTo=/subscription");
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY;
    if (!apiKey) {
      setMessage("Subscriptions are not configured yet. Add NEXT_PUBLIC_REVENUECAT_WEB_API_KEY and the package identifiers described in .env.example.");
      return;
    }
    setBusy(planId);
    try {
      const purchases = Purchases.configure({ apiKey, appUserId: auth.user.uid });
      const offering = (await purchases.getOfferings()).current;
      if (!offering) throw new Error("No current RevenueCat offering is configured.");
      const wanted = planId === "monthly"
        ? (process.env.NEXT_PUBLIC_REVENUECAT_MONTHLY_PACKAGE_ID || "$rc_monthly")
        : (process.env.NEXT_PUBLIC_REVENUECAT_SIX_MONTH_PACKAGE_ID || "six_month");
      const rcPackage = offering.availablePackages.find((item) => item.identifier === wanted);
      if (!rcPackage) throw new Error(`The ${planId} package is not available in the current RevenueCat offering.`);
      await purchases.purchase({ rcPackage, customerEmail: auth.user.email || undefined });
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The purchase could not be completed. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <PublicPage>
      <main className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--primary)]">ShiftNote Pro</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Choose the plan that works best for you</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">Spend less time documenting and more time caring for patients with ShiftNote Pro.</p>
        </div>
        {message && <StatusMessage variant="error" className="mx-auto mt-8 max-w-2xl" title="Subscription unavailable">{message}</StatusMessage>}
        <div className="mx-auto mt-10 grid max-w-3xl items-stretch gap-5 md:grid-cols-2">
          {plans.map((plan) => {
            const featured = plan.id === "six-month";
            return (
              <article className={`relative flex h-full rounded-[28px] border bg-[var(--card)] p-7 shadow-lg ${featured ? "border-[var(--primary)] shadow-xl ring-1 ring-[var(--primary)]/15 md:-translate-y-1" : "border-[var(--border)]"}`} key={plan.id}>
                <div className="flex w-full flex-col">
                  {"badge" in plan && <span className="absolute right-5 top-5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{plan.badge}</span>}
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <div className="mt-5 flex items-end gap-2"><p className="text-4xl font-semibold tracking-tight">{plan.price}</p><p className="pb-1 text-sm text-[var(--muted-foreground)]">{plan.detail}</p></div>
                  {"billing" in plan && <p className="mt-2 text-sm font-medium">{plan.billing}</p>}
                  {"trial" in plan && <p className="mt-1 text-xs font-medium text-[var(--primary)]">{plan.trial}</p>}
                  {"savings" in plan && <p className="mt-2 inline-flex self-start rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{plan.savings}</p>}
                  <ul className="mt-7 space-y-3 text-sm">
                    {benefits.map((benefit) => <li className="flex gap-2" key={benefit}><Check className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />{benefit}</li>)}
                  </ul>
                  <div className="mt-auto pt-7">
                    <button disabled={Boolean(busy)} onClick={() => void buy(plan.id)} className={`h-12 w-full rounded-xl font-semibold disabled:opacity-60 ${featured ? "bg-[var(--primary)] text-white shadow-md" : "border border-[var(--primary)] bg-[var(--card)] text-[var(--primary)]"}`}>
                      {busy === plan.id ? "Opening secure checkout…" : plan.button}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl bg-[var(--primary-soft)] p-5 text-sm"><Sparkles className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" /><p><strong>Clinical responsibility stays with you.</strong> ShiftNote drafts documentation from the facts you provide. Review and attest every note before clinical use.</p></div>
      </main>
    </PublicPage>
  );
}
