import "server-only";

type ServerAnalyticsEvent = {
  name: "subscription_renewed" | "subscription_cancelled";
  eventId: string;
  parameters?: Record<string, string | number | boolean>;
};

export async function sendGaServerEvent({ name, eventId, parameters = {} }: ServerAnalyticsEvent) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
  const apiSecret = process.env.GA4_API_SECRET?.trim() ?? "";
  if (!/^G-[A-Z0-9]+$/.test(measurementId) || !apiSecret) return;

  try {
    const endpoint = new URL("https://www.google-analytics.com/mp/collect");
    endpoint.searchParams.set("measurement_id", measurementId);
    endpoint.searchParams.set("api_secret", apiSecret);
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "shiftnote-server",
        events: [{ name, params: { ...parameters, event_id: eventId, engagement_time_msec: 1 } }],
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* Analytics delivery must never affect Stripe webhook processing. */ }
}
