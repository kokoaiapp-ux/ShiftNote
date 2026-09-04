import { NextResponse } from "next/server";
import { getStripe, requireApiUser } from "@/lib/server/billing";
const renewableStatuses = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);
export async function DELETE(request: Request) {
  try {
    const { admin, user } = await requireApiUser(request);
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Account deletion cannot safely continue until Stripe is configured to stop subscription renewal." }, { status: 503 });
    const stripe = getStripe();
    const { data: stored } = await admin.from("stripe_subscriptions").select("stripe_subscription_id").eq("user_id", user.id);
    const subscriptionIds = new Set((stored || []).map((row) => row.stripe_subscription_id));
    const found = await stripe.subscriptions.search({ query: `metadata['supabase_user_id']:'${user.id}'`, limit: 100 });
    found.data.forEach((subscription) => subscriptionIds.add(subscription.id));
    for (const id of subscriptionIds) {
      const subscription = await stripe.subscriptions.retrieve(id);
      if (renewableStatuses.has(subscription.status)) await stripe.subscriptions.update(id, { cancel_at_period_end: true, metadata: { ...subscription.metadata, supabase_user_id: "" } });
    }
    const { error } = await admin.auth.admin.deleteUser(user.id, false);
    if (error) throw error;
    return NextResponse.json({ ok: true, renewalCanceled: subscriptionIds.size > 0 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return NextResponse.json({ error: "Sign in before deleting your account." }, { status: 401 });
    return NextResponse.json({ error: "Your account could not be deleted. No account data was removed." }, { status: 500 });
  }
}