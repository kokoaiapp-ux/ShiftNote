"use client";

export type TikTokEvent = "PageView" | "CompleteRegistration" | "Login" | "CompleteOnboarding" | "ViewContent" | "InitiateCheckout" | "Purchase" | "SubscriptionRenewal" | "SubscriptionCancellation";
type TikTokProperties = Record<string, unknown>;

declare global {
  interface Window {
    ttq?: { page: (properties?: TikTokProperties) => void; track: (event: string, properties?: TikTokProperties, options?: { event_id: string }) => void };
  }
}

export const tikTokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() || "";
export const tikTokEnabled = process.env.NODE_ENV === "production" && Boolean(tikTokPixelId);
export function newTikTokEventId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }

export function trackTikTok(event: TikTokEvent, properties: TikTokProperties = {}, eventId = newTikTokEventId(event.toLowerCase())) {
  if (!tikTokEnabled || typeof window === "undefined") return eventId;
  if (event === "PageView") window.ttq?.page({ event_id: eventId });
  else window.ttq?.track(event, properties, { event_id: eventId });
  void fetch("/api/events/tiktok", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, eventId, properties, path: window.location.pathname }), keepalive: true }).catch(() => {});
  return eventId;
}

export function trackTikTokPixelOnly(event: TikTokEvent, properties: TikTokProperties, eventId: string) {
  if (tikTokEnabled && typeof window !== "undefined") window.ttq?.track(event, properties, { event_id: eventId });
}

export function setPendingTikTokAuthEvent(event: "CompleteRegistration" | "Login") {
  if (tikTokEnabled && typeof window !== "undefined") sessionStorage.setItem("shiftnote-tiktok:pending-auth", event);
}

export function consumePendingTikTokAuthEvent() {
  if (!tikTokEnabled || typeof window === "undefined") return;
  const event = sessionStorage.getItem("shiftnote-tiktok:pending-auth") as "CompleteRegistration" | "Login" | null;
  if (!event) return;
  sessionStorage.removeItem("shiftnote-tiktok:pending-auth");
  trackTikTok(event);
}
