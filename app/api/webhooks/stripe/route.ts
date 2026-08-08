import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, getSupabaseAdmin, syncStripeSubscription } from "@/lib/server/billing";
import { revenueCatConfigured, submitStripeSubscription } from "@/lib/server/revenuecat";
import { markSubscriptionPaid, markSubscriptionPaidByCustomer } from "@/lib/server/subscription-access";

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
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) { const subscription = event.data.object as Stripe.Subscription; const row = await syncStripeSubscription(subscription); if (row && revenueCatConfigured()) await submitStripeSubscription(row.user_id, subscription.id).catch(() => console.error("RevenueCat receipt sync failed", { subscriptionId: subscription.id })); }
    if (["invoice.paid", "invoice.payment_succeeded"].includes(event.type)) { const invoice = event.data.object as Stripe.Invoice; const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id; if (customerId && invoice.amount_paid > 0) await markSubscriptionPaidByCustomer(admin, customerId, new Date((invoice.status_transitions.paid_at || invoice.created) * 1000)); }
    if (event.type === "customer.deleted") { const customer = event.data.object; await admin.from("stripe_customers").delete().eq("stripe_customer_id", customer.id); }
    return NextResponse.json({ received: true });
  } catch {
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
