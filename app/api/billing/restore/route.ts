import { NextResponse } from "next/server";
import { billingError, getStripe, requireApiUser, syncStripeSubscription } from "@/lib/server/billing";

const activeStatuses = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

export async function POST(request: Request) {
  try {
    const { admin, user } = await requireApiUser(request);
    const { data: stored, error } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;

    let customerId = stored?.stripe_customer_id;
    if (!customerId) {
      const customers = await getStripe().customers.search({ query: `metadata['supabase_user_id']:'${user.id}'`, limit: 1 });
      customerId = customers.data[0]?.id;
    }
    if (!customerId) return NextResponse.json({ ok: true, status: null });

    const subscriptions = await getStripe().subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    const synchronized = await Promise.all(subscriptions.data.map((subscription) => syncStripeSubscription(subscription, user.id)));
    const current = synchronized.find((subscription) => subscription && activeStatuses.has(subscription.status))
      || synchronized.find((subscription) => subscription)
      || null;
    return NextResponse.json({ ok: true, status: current?.status || null });
  } catch (error) {
    const result = billingError(error, "Purchases could not be restored.");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}