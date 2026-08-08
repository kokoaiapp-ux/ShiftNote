import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { currentSubscription, getStripe } from "@/lib/server/billing";

export type SubscriptionAccessState = "neverSubscribed" | "activeSubscription" | "expiredSubscription";

const stripeAccessStatuses = new Set(["active", "trialing", "paused"]);
const revenueCatAccessStatuses = new Set(["active", "trial", "canceling", "billing_issue"]);

function hasNotExpired(expiration: string | null | undefined) {
  return !expiration || new Date(expiration).getTime() > Date.now();
}

export async function markSubscriptionPaid(admin: SupabaseClient<Database>, userId: string, paidAt = new Date()) {
  const { data: existing, error: readError } = await admin.from("subscription_lifecycle").select("first_paid_at").eq("user_id", userId).maybeSingle();
  if (readError) throw readError;
  const { error } = await admin.from("subscription_lifecycle").upsert({
    user_id: userId,
    has_subscribed_before: true,
    first_paid_at: existing?.first_paid_at || paidAt.toISOString(),
    paid_history_checked_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function markSubscriptionPaidByCustomer(admin: SupabaseClient<Database>, customerId: string, paidAt = new Date()) {
  const { data, error } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  if (data?.user_id) await markSubscriptionPaid(admin, data.user_id, paidAt);
}

export async function resolveSubscriptionAccess(admin: SupabaseClient<Database>, userId: string) {
  const [stripeSubscription, lifecycleResult, cacheResult, customerResult] = await Promise.all([
    currentSubscription(admin, userId),
    admin.from("subscription_lifecycle").select("has_subscribed_before,first_paid_at,paid_history_checked_at").eq("user_id", userId).maybeSingle(),
    admin.from("subscription_cache").select("subscription_status,expiration_date").eq("user_id", userId).maybeSingle(),
    admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (lifecycleResult.error) throw lifecycleResult.error;
  if (cacheResult.error) throw cacheResult.error;
  if (customerResult.error) throw customerResult.error;

  const stripeActive = Boolean(stripeSubscription && stripeAccessStatuses.has(stripeSubscription.status) && hasNotExpired(stripeSubscription.current_period_end));
  const revenueCatActive = Boolean(cacheResult.data?.subscription_status && revenueCatAccessStatuses.has(cacheResult.data.subscription_status) && hasNotExpired(cacheResult.data.expiration_date));
  let hasSubscribedBefore = lifecycleResult.data?.has_subscribed_before || false;

  if (!hasSubscribedBefore && !lifecycleResult.data?.paid_history_checked_at) {
    let firstPaidAt: Date | null = null;
    if (customerResult.data?.stripe_customer_id) {
      const invoices = await getStripe().invoices.list({ customer: customerResult.data.stripe_customer_id, status: "paid", limit: 100 });
      const paidInvoices = invoices.data.filter((invoice) => invoice.amount_paid > 0);
      const firstPaid = paidInvoices.at(-1);
      if (firstPaid) firstPaidAt = new Date(firstPaid.created * 1000);
    }
    if (firstPaidAt) {
      await markSubscriptionPaid(admin, userId, firstPaidAt);
      hasSubscribedBefore = true;
    } else {
      const { error } = await admin.from("subscription_lifecycle").upsert({ user_id: userId, paid_history_checked_at: new Date().toISOString() });
      if (error) throw error;
    }
  }

  const state: SubscriptionAccessState = stripeActive || revenueCatActive
    ? "activeSubscription"
    : hasSubscribedBefore
      ? "expiredSubscription"
      : "neverSubscribed";
  return { state, hasSubscribedBefore };
}
