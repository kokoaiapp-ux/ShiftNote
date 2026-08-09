import { NextResponse } from "next/server";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { sendMetaServerEvent } from "@/lib/server/meta";

const allowed = new Set(["PageView", "ViewContent", "CompleteRegistration", "Login", "CompleteOnboarding", "ViewPaywall", "InitiateCheckout", "Purchase", "SubscriptionCreated", "SubscriptionRenewed", "SubscriptionCancelled"]);
const productionOrigins = new Set([PRODUCTION_APP_URL, "https://www.shiftnote.care"]);
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (process.env.NODE_ENV === "production" && (!origin || !productionOrigins.has(origin))) return NextResponse.json({ error: "Invalid event origin." }, { status: 403 });
    const body = await request.json() as { event?: string; eventId?: string; properties?: unknown; path?: string };
    if (!body.event || !allowed.has(body.event) || !body.eventId || body.eventId.length > 128) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    const properties = body.properties && typeof body.properties === "object" && !Array.isArray(body.properties) ? body.properties as Record<string, unknown> : {};
    const result = await sendMetaServerEvent({ event: body.event, eventId: body.eventId, properties, path: body.path });
    return NextResponse.json({ accepted: true, configured: result.configured, eventsReceived: result.eventsReceived || 0 });
  } catch { return NextResponse.json({ error: "Event delivery failed." }, { status: 502 }); }
}
