import { NextResponse } from "next/server";
import { billingError, getStripe, requireApiUser } from "@/lib/server/billing";

export async function GET(request: Request) {
  try {
    const { user } = await requireApiUser(request);
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId?.startsWith("cs_")) return NextResponse.json({ error: "A valid checkout session is required." }, { status: 400 });
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== user.id || session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) {
      return NextResponse.json({ error: "The completed payment could not be verified." }, { status: 409 });
    }
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
    const invoiceId = typeof subscription?.latest_invoice === "string" ? subscription.latest_invoice : subscription?.latest_invoice?.id;
    return NextResponse.json({
      transactionId: invoiceId || session.id,
      eventId: `stripe-invoice-${invoiceId || session.id}`,
      currency: (session.currency || "usd").toUpperCase(),
      value: (session.amount_total || 0) / 100,
      plan: session.metadata?.plan || "shiftnote_pro",
      paid: session.payment_status === "paid",
      subscriptionStatus: subscription?.status || null,
    });
  } catch (error) {
    const result = billingError(error, "The completed payment could not be verified.");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
