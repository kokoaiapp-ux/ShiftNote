import "server-only";

type ServerEvent = { event: string; eventId: string; properties?: Record<string, unknown>; path?: string };
export function tikTokServerConfigured() { return Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID && process.env.TIKTOK_EVENTS_API_TOKEN); }

export async function sendTikTokServerEvent(input: ServerEvent) {
  const pixel = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_API_TOKEN;
  if (!pixel || !token) return { configured: false };
  const safePath = input.path?.startsWith("/") && !input.path.includes("?") ? input.path : "/";
  const body = {
    event_source: "web",
    event_source_id: pixel,
    ...(process.env.TIKTOK_TEST_EVENT_CODE ? { test_event_code: process.env.TIKTOK_TEST_EVENT_CODE } : {}),
    data: [{ event: input.event, event_time: Math.floor(Date.now() / 1000), event_id: input.eventId, user: {}, page: { url: `https://shiftnote.care${safePath}` }, properties: input.properties || {} }],
  };
  const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", { method: "POST", headers: { "Access-Token": token, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => null) as { code?: number; request_id?: string } | null;
  if (!response.ok || result?.code !== 0) throw new Error(`TIKTOK_EVENTS_API_FAILED:${result?.request_id || response.status}`);
  return { configured: true, requestId: result.request_id };
}
