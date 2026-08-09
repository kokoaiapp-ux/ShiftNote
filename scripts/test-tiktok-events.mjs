import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const pixel = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const token = process.env.TIKTOK_EVENTS_API_TOKEN;
const testCode = process.env.TIKTOK_TEST_EVENT_CODE;
if (!pixel || !token || !testCode) {
  console.error("NEXT_PUBLIC_TIKTOK_PIXEL_ID, TIKTOK_EVENTS_API_TOKEN, and TIKTOK_TEST_EVENT_CODE are required for TikTok Test Events verification.");
  process.exit(1);
}
const eventId = `shiftnote-test-${Date.now()}`;
const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
  method: "POST",
  headers: { "Access-Token": token, "Content-Type": "application/json" },
  body: JSON.stringify({ event_source: "web", event_source_id: pixel, test_event_code: testCode, data: [{ event: "PageView", event_time: Math.floor(Date.now() / 1000), event_id: eventId, user: {}, page: { url: "https://shiftnote.care/" }, properties: {} }] }),
});
const result = await response.json().catch(() => null);
if (!response.ok || result?.code !== 0) {
  console.error(`TikTok Test Event was rejected (HTTP ${response.status}, request ${result?.request_id || "unknown"}).`);
  process.exit(1);
}
console.log(`TikTok Test Event accepted. Event ID: ${eventId}; Request ID: ${result.request_id}`);
