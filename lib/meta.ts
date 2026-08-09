"use client";

export type MetaEvent = "PageView" | "ViewContent" | "CompleteRegistration" | "Login" | "CompleteOnboarding" | "ViewPaywall" | "InitiateCheckout" | "Purchase" | "SubscriptionRenewed" | "SubscriptionCancelled";
type MetaProperties = Record<string, unknown>;
declare global { interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown; } }

export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
export const metaEnabled = process.env.NODE_ENV === "production" && Boolean(metaPixelId);
const standard = new Set<MetaEvent>(["PageView", "ViewContent", "CompleteRegistration", "InitiateCheckout", "Purchase"]);
export function newMetaEventId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }

export function trackMeta(event: MetaEvent, properties: MetaProperties = {}, eventId = newMetaEventId(event.toLowerCase())) {
  if (!metaEnabled || typeof window === "undefined") return eventId;
  window.fbq?.(standard.has(event) ? "track" : "trackCustom", event, properties, { eventID: eventId });
  void fetch("/api/events/meta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, eventId, properties, path: window.location.pathname }), keepalive: true }).catch(() => {});
  return eventId;
}

export function trackMetaPixelOnly(event: MetaEvent, properties: MetaProperties, eventId: string) {
  if (!metaEnabled || typeof window === "undefined") return;
  window.fbq?.(standard.has(event) ? "track" : "trackCustom", event, properties, { eventID: eventId });
}

export function setPendingMetaAuthEvent(event: "CompleteRegistration" | "Login") { if (metaEnabled && typeof window !== "undefined") sessionStorage.setItem("shiftnote-meta:pending-auth", event); }
export function consumePendingMetaAuthEvent() { if (!metaEnabled || typeof window === "undefined") return; const event = sessionStorage.getItem("shiftnote-meta:pending-auth") as "CompleteRegistration" | "Login" | null; if (!event) return; sessionStorage.removeItem("shiftnote-meta:pending-auth"); trackMeta(event); }
