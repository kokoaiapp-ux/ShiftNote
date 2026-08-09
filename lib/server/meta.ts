import "server-only";
import { createHash } from "node:crypto";

type ServerEvent = { event: string; eventId: string; properties?: Record<string, unknown>; path?: string };
export function metaServerConfigured() { return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CONVERSIONS_API_TOKEN); }
export async function sendMetaServerEvent(input: ServerEvent) {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  if (!pixel || !token) return { configured: false };
  const safePath = input.path?.startsWith("/") && !input.path.includes("?") ? input.path : "/";
  const anonymousEventMatchKey = createHash("sha256").update(input.eventId).digest("hex");
  const response = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: [{ event_name: input.event, event_time: Math.floor(Date.now() / 1000), event_id: input.eventId, action_source: "website", event_source_url: `https://shiftnote.care${safePath}`, user_data: { external_id: [anonymousEventMatchKey] }, custom_data: input.properties || {} }], test_event_code: "TEST18912" }) });
  const result = await response.json().catch(() => null) as { events_received?: number; fbtrace_id?: string; error?: { message?: string } } | null;
  if (!response.ok || !result?.events_received) throw new Error(`META_CONVERSIONS_API_FAILED:${result?.fbtrace_id || response.status}`);
  return { configured: true, eventsReceived: result.events_received, traceId: result.fbtrace_id };
}
