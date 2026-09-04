import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe, getSupabaseAdmin, syncStripeSubscription, type BillingPlan } from "@/lib/server/billing";
import { markSubscriptionPaid } from "@/lib/server/subscription-access";
import { sendTikTokServerEvent } from "@/lib/server/tiktok";
import { sendMetaServerEvent } from "@/lib/server/meta";
import { sendGaServerEvent } from "@/lib/server/google-analytics";
import type { Database } from "@/types/database";

function analyticsPlan(plan: BillingPlan | null | undefined) {
  return plan === "monthly" ? "monthly" : "six_month";
}

async function analyticsUser(admin: SupabaseClient<Database>, userId: string) {
  const { data } = await admin.from("profiles").select("role,discovery_source").eq("auth_user_id", userId).maybeSingle();
  return { user_role: data?.role || "user", discovery_source: data?.discovery_source || "unknown" };
}

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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (id) {
        const subscription = await getStripe().subscriptions.retrieve(id);
        const row = await syncStripeSubscription(subscription, session.client_reference_id || session.metadata?.supabase_user_id || undefined);
        if (row && subscription.status === "trialing") {
          const user = await analyticsUser(admin, row.user_id);
          await sendGaServerEvent({
            name: "trial_started",
            eventId: `stripe-trial-${subscription.id}`,
            parameters: { plan: analyticsPlan(row.plan), value: 0, currency: "USD", trial: true, ...user },
          });
        }
      }
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const subscription = event.data.object as Stripe.Subscription;
      const { data: previous } = await admin.from("stripe_subscriptions").select("cancel_at_period_end,canceled_at,status").eq("stripe_subscription_id", subscription.id).maybeSingle();
      const row = await syncStripeSubscription(subscription);
      const cancelledNow = event.type === "customer.subscription.deleted" || subscription.cancel_at_period_end;
      const alreadyCancelled = Boolean(previous?.cancel_at_period_end || previous?.canceled_at || previous?.status === "canceled");
      if (row && cancelledNow && !alreadyCancelled) {
        const eventId = `stripe-cancel-${subscription.id}`;
        const user = await analyticsUser(admin, row.user_id);
        const analytics = { plan: analyticsPlan(row.plan), value: (row.unit_amount || 0) / 100, currency: (row.currency || "usd").toUpperCase(), trial: row.status === "trialing" || previous?.status === "trialing", ...user };
        await sendTikTokServerEvent({ event: "SubscriptionCancellation", eventId, properties: { content_id: row.plan || "shiftnote_pro", content_type: "product" }, path: "/billing" }).catch(() => console.error("TikTok cancellation event delivery failed", { subscriptionId: subscription.id }));
        await sendMetaServerEvent({ event: "SubscriptionCancelled", eventId, properties: { content_ids: [row.plan || "shiftnote_pro"], content_type: "product" }, path: "/billing" }).catch(() => console.error("Meta cancellation event delivery failed", { subscriptionId: subscription.id }));
        await sendGaServerEvent({ name: "subscription_cancelled", eventId, parameters: analytics });
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId && invoice.amount_paid > 0) {
        const { data: customer } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
        if (customer?.user_id) {
          const { data: lifecycle } = await admin.from("subscription_lifecycle").select("has_subscribed_before").eq("user_id", customer.user_id).maybeSingle();
          const firstPayment = !lifecycle?.has_subscribed_before;
          await markSubscriptionPaid(admin, customer.user_id, new Date((invoice.status_transitions.paid_at || invoice.created) * 1000));
          const subscriptionRef = invoice.parent?.subscription_details?.subscription;
          const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
          const subscription = subscriptionId ? await getStripe().subscriptions.retrieve(subscriptionId) : null;
          const row = subscription ? await syncStripeSubscription(subscription, customer.user_id) : (await admin.from("stripe_subscriptions").select("*").eq("user_id", customer.user_id).order("updated_at", { ascending: false }).limit(1).maybeSingle()).data;
          const user = await analyticsUser(admin, customer.user_id);
          const plan = analyticsPlan(row?.plan as BillingPlan | null);
          const currency = invoice.currency.toUpperCase();
          const value = invoice.amount_paid / 100;
          const eventId = `stripe-invoice-${invoice.id}`;
          const properties = { currency, value, content_ids: [row?.plan || "shiftnote_pro"], content_type: "product" };
          await sendTikTokServerEvent({ event: firstPayment ? "CompletePayment" : "SubscriptionRenewal", eventId, properties: { ...properties, content_id: row?.plan || "shiftnote_pro" }, path: "/billing" }).catch(() => console.error("TikTok payment event delivery failed", { invoiceId: invoice.id }));
          await sendMetaServerEvent({ event: firstPayment ? "Purchase" : "SubscriptionRenewed", eventId, properties, path: "/billing" }).catch(() => console.error("Meta payment event delivery failed", { invoiceId: invoice.id }));
          if (subscription?.status === "active") await sendGaServerEvent({ name: firstPayment ? "subscription_purchased" : "subscription_renewed", eventId, parameters: { plan, value, currency, trial: false, ...user } });
          if (firstPayment) await sendMetaServerEvent({ event: "SubscriptionCreated", eventId: `stripe-subscription-created-${invoice.id}`, properties, path: "/billing" }).catch(() => console.error("Meta subscription-created event delivery failed", { invoiceId: invoice.id }));
        }
      }
    }

    if (event.type === "customer.deleted") {
      const customer = event.data.object;
      await admin.from("stripe_customers").delete().eq("stripe_customer_id", customer.id);
    }
    return NextResponse.json({ received: true });
  } catch {
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
