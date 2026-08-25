"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSubscriptionAccess } from "@/components/subscription/SubscriptionAccessProvider";
import { trackOnce } from "@/lib/analytics";
import { trackTikTokPixelOnly } from "@/lib/tiktok";
import { trackMetaPixelOnly } from "@/lib/meta";

export function DashboardCheckoutReturn() {
  const auth = useAuth();
  const params = useSearchParams();
  const { refresh } = useSubscriptionAccess();

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (params.get("checkout") !== "success" || !sessionId || !auth.user) return;
    let active = true;
    const refreshTimer = window.setTimeout(() => void refresh(), 1000);
    void auth.accessToken()
      .then((token) => fetch(`/api/billing/checkout/verify?session_id=${encodeURIComponent(sessionId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }))
      .then(async (response) => response.ok ? response.json() as Promise<{ transactionId: string; eventId: string; currency: string; value: number; plan: string }> : null)
      .then((payment) => {
        if (!active || !payment) return;
        trackOnce(`purchase:${payment.transactionId}`, "purchase", {
          transaction_id: payment.transactionId, currency: payment.currency, value: payment.value,
          items: [{ item_id: payment.plan, item_name: "ShiftNote Pro" }],
        });
        trackTikTokPixelOnly("CompletePayment", { currency: payment.currency, value: payment.value, content_id: payment.plan, content_type: "product" }, payment.eventId);
        trackMetaPixelOnly("Purchase", { currency: payment.currency, value: payment.value, content_ids: [payment.plan], content_type: "product" }, payment.eventId);
      }).catch(() => {});
    return () => { active = false; window.clearTimeout(refreshTimer); };
  }, [auth, params, refresh]);

  return null;
}
