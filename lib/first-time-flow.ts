export const FIRST_TIME_DISCOUNT_FLAG = "hasSeenFirstTimeDiscount";
export const FIRST_TIME_FLOW_KEY = "shiftnote-first-time-flow";
export const ONBOARDING_COMPLETE_KEY = "shiftnote-onboarding-complete";
const EVENT_KEY = "shiftnote-paywall-events";

export type PaywallEvent = "paywall_view" | "discount_view" | "purchase_started" | "purchase_completed" | "purchase_failed" | "paywall_declined" | "discount_dismissed";

export function hasCompletedFirstTimeFlow() {
  return typeof window !== "undefined" && localStorage.getItem(FIRST_TIME_DISCOUNT_FLAG) === "true";
}
export function beginFirstTimeFlow() { localStorage.setItem(FIRST_TIME_FLOW_KEY, "active"); }
export function isFirstTimeFlowPending() { return typeof window !== "undefined" && localStorage.getItem(FIRST_TIME_FLOW_KEY) === "active" && !hasCompletedFirstTimeFlow(); }
export function hasCompletedOnboarding() { return typeof window !== "undefined" && localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true"; }
export function markOnboardingComplete() { localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true"); }
export function completeFirstTimeFlow() { localStorage.setItem(FIRST_TIME_DISCOUNT_FLAG, "true"); localStorage.removeItem(FIRST_TIME_FLOW_KEY); }
export function trackPaywallEvent(name: PaywallEvent, details: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  const event = { name, details, at: new Date().toISOString() };
  try { const previous = JSON.parse(localStorage.getItem(EVENT_KEY) || "[]") as unknown[]; localStorage.setItem(EVENT_KEY, JSON.stringify([...previous.slice(-49), event])); }
  catch { localStorage.setItem(EVENT_KEY, JSON.stringify([event])); }
  window.dispatchEvent(new CustomEvent("shiftnote:analytics", { detail: event }));
}
