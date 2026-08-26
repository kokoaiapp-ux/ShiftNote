import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getSupabaseAdmin, syncStripeSubscription } from "@/lib/server/billing";
import { revenueCatConfigured, submitStripeSubscription } from "@/lib/server/revenuecat";
import { markSubscriptionPaid, markSubscriptionPaidByCustomer } from "@/lib/server/subscription-access";
import { sendTikTokServerEvent } from "@/lib/server/tiktok";
import { sendMetaServerEvent } from "@/lib/server/meta";
import { sendGaServerEvent } from "@/lib/server/google-analytics";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 }); }
  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type, livemode: event.livemode });
  if (insertError?.code === "23505") return NextResponse.json({ received: true });
  if (insertError) return NextResponse.json({ error: "Webhook could not be recorded." }, { status: 500 });
  try {
    if (event.type === "checkout.session.completed") { const session = event.data.object; const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id; if (id) { const row = await syncStripeSubscription(await getStripe().subscriptions.retrieve(id), session.client_reference_id || session.metadata?.supabase_user_id || undefined); if (row && session.payment_status === "paid") await markSubscriptionPaid(admin, row.user_id, new Date(session.created * 1000)); if (row && revenueCatConfigured()) await submitStripeSubscription(row.user_id, id).catch(() => console.error("RevenueCat receipt sync failed", { subscriptionId: id })); } }
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) { const subscription = event.data.object as Stripe.Subscription; const row = await syncStripeSubscription(subscription); if (row && revenueCatConfigured()) await submitStripeSubscription(row.user_id, subscription.id).catch(() => console.error("RevenueCat receipt sync failed", { subscriptionId: subscription.id })); if (event.type === "customer.subscription.deleted" || subscription.cancel_at_period_end) { const eventId = `stripe-cancel-${subscription.id}-${subscription.items.data[0]?.current_period_end || 0}`; await sendTikTokServerEvent({ event: "SubscriptionCancellation", eventId, properties: { content_id: row?.plan || "shiftnote_pro", content_type: "product" }, path: "/billing" }).catch(() => console.error("TikTok cancellation event delivery failed", { subscriptionId: subscription.id })); await sendMetaServerEvent({ event: "SubscriptionCancelled", eventId, properties: { content_ids: [row?.plan || "shiftnote_pro"], content_type: "product" }, path: "/billing" }).catch(() => console.error("Meta cancellation event delivery failed", { subscriptionId: subscription.id })); await sendGaServerEvent({ name: "subscription_cancelled", eventId, parameters: { plan: row?.plan || "shiftnote_pro" } }).catch(() => console.error("GA4 cancellation event delivery failed", { subscriptionId: subscription.id })); } }
    if (["invoice.paid", "invoice.payment_succeeded"].includes(event.type)) { const invoice = event.data.object as Stripe.Invoice; const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id; if (customerId && invoice.amount_paid > 0) await markSubscriptionPaidByCustomer(admin, customerId, new Date((invoice.status_transitions.paid_at || invoice.created) * 1000)); if (event.type === "invoice.paid" && invoice.amount_paid > 0) { const renewal = invoice.billing_reason === "subscription_cycle"; const eventId = `stripe-invoice-${invoice.id}`; const properties = { currency: invoice.currency.toUpperCase(), value: invoice.amount_paid / 100, content_ids: ["shiftnote_pro"], content_type: "product" }; await sendTikTokServerEvent({ event: renewal ? "SubscriptionRenewal" : "CompletePayment", eventId, properties: { ...properties, content_id: "shiftnote_pro" }, path: "/billing" }).catch(() => console.error("TikTok payment event delivery failed", { invoiceId: invoice.id })); await sendMetaServerEvent({ event: renewal ? "SubscriptionRenewed" : "Purchase", eventId, properties, path: "/billing" }).catch(() => console.error("Meta payment event delivery failed", { invoiceId: invoice.id })); if (renewal) await sendGaServerEvent({ name: "subscription_renewed", eventId, parameters: { currency: invoice.currency.toUpperCase(), value: invoice.amount_paid / 100 } }).catch(() => console.error("GA4 renewal event delivery failed", { invoiceId: invoice.id })); if (!renewal) await sendMetaServerEvent({ event: "SubscriptionCreated", eventId: `stripe-subscription-created-${invoice.id}`, properties, path: "/billing" }).catch(() => console.error("Meta subscription-created event delivery failed", { invoiceId: invoice.id })); } }
    if (event.type === "customer.deleted") { const customer = event.data.object; await admin.from("stripe_customers").delete().eq("stripe_customer_id", customer.id); }
    return NextResponse.json({ received: true });
  } catch {
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
