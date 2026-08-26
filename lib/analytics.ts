"use client";

import { sendGAEvent } from "@next/third-parties/google";

type AnalyticsParameters = Record<string, unknown>;

export const gaMeasurementId = "G-GWBM5SN1X2";
export const analyticsEnabled = process.env.NODE_ENV === "production";

export function trackEvent(name: string, parameters: AnalyticsParameters = {}) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  sendGAEvent("event", name, parameters);
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  trackEvent("page_view", { page_location: `${window.location.origin}${path}`, page_path: path, page_title: document.title });
}

export function trackOnce(key: string, name: string, parameters: AnalyticsParameters = {}) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  const storageKey = `shiftnote-ga:${key}`;
  if (window.sessionStorage.getItem(storageKey)) return;
  window.sessionStorage.setItem(storageKey, "1");
  trackEvent(name, parameters);
}

export function setPendingAuthEvent(event: "login" | "sign_up", method: string) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  window.sessionStorage.setItem("shiftnote-ga:pending-auth", JSON.stringify({ event, method }));
}

export function consumePendingAuthEvent() {
  if (!analyticsEnabled || typeof window === "undefined") return;
  const key = "shiftnote-ga:pending-auth";
  const value = window.sessionStorage.getItem(key);
  if (!value) return;
  window.sessionStorage.removeItem(key);
  try {
    const pending = JSON.parse(value) as { event?: "login" | "sign_up"; method?: string };
    if (pending.event) trackEvent(pending.event, { method: pending.method || "oauth" });
  } catch { /* Ignore malformed browser state. */ }
}
