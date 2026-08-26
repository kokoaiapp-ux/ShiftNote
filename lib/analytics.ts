"use client";

type AnalyticsParameters = Record<string, unknown>;
type GtagFunction = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: GtagFunction };

const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
export const gaMeasurementId = /^G-[A-Z0-9]+$/.test(configuredMeasurementId) ? configuredMeasurementId : "";
export const analyticsEnabled = process.env.NODE_ENV === "production" && Boolean(gaMeasurementId);

function browserGtag(): GtagFunction | null {
  if (!analyticsEnabled || typeof window === "undefined") return null;
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.gtag = analyticsWindow.gtag || function (...args: unknown[]) { analyticsWindow.dataLayer?.push(args); };
  return analyticsWindow.gtag;
}

export function trackEvent(name: string, parameters: AnalyticsParameters = {}) {
  try { browserGtag()?.("event", name, parameters); } catch { /* Analytics must never affect the application. */ }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  trackEvent("page_view", { page_location: `${window.location.origin}${path}`, page_path: path, page_title: document.title });
}

export function trackOnce(key: string, name: string, parameters: AnalyticsParameters = {}) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  try {
    const storageKey = `shiftnote-ga:${key}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");
    trackEvent(name, parameters);
  } catch { /* Analytics must never affect the application. */ }
}

export function setPendingAuthEvent(event: "login" | "sign_up", method: string) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  try { window.sessionStorage.setItem("shiftnote-ga:pending-auth", JSON.stringify({ event, method })); } catch { /* Analytics must never affect authentication. */ }
}

export function consumePendingAuthEvent() {
  if (!analyticsEnabled || typeof window === "undefined") return;
  try {
    const key = "shiftnote-ga:pending-auth";
    const value = window.sessionStorage.getItem(key);
    if (!value) return;
    window.sessionStorage.removeItem(key);
    const pending = JSON.parse(value) as { event?: "login" | "sign_up"; method?: string };
    if (pending.event) trackEvent(pending.event, { method: pending.method || "oauth" });
  } catch { /* Ignore unavailable storage or malformed browser state. */ }
}
