import "server-only";

const measurementId = "G-GWBM5SN1X2";

type ServerAnalyticsEvent = {
  name: "subscription_renewed" | "subscription_cancelled";
  eventId: string;
  parameters?: Record<string, string | number | boolean>;
};

export async function sendGaServerEvent({ name, eventId, parameters = {} }: ServerAnalyticsEvent) {
  const apiSecret = process.env.GA4_API_SECRET;
  if (!apiSecret) return;
  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", apiSecret);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: "shiftnote-server",
      events: [{ name, params: { ...parameters, event_id: eventId, engagement_time_msec: 1 } }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GA4_MEASUREMENT_PROTOCOL_${response.status}`);
}
