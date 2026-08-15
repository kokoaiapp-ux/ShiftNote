import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { currentSubscription, getStripe, planForPrice, planForProduct, requireApiUser, isBillingPlan, type BillingPlan } from "@/lib/server/billing";
import { revenueCatConfigured, syncRevenueCatSubscriber } from "@/lib/server/revenuecat";
import { hasFounderRole } from "@/lib/server/roles";

export type SubscriptionAccessState = "neverSubscribed" | "activeSubscription" | "expiredSubscription";
export type SubscriptionProvider = "stripe" | "revenuecat" | "founder" | null;
export type SubscriptionAccess = {
  state: SubscriptionAccessState;
  hasSubscribedBefore: boolean;
  isFounder: boolean;
  isTrial: boolean;
  isPromotional: boolean;
  expiresAt: string | null;
  provider: SubscriptionProvider;
  plan: BillingPlan | null;
  status: string;
  entitlement: string | null;
};

const stripeAccessStatuses = new Set(["active", "trialing", "paused"]);
const revenueCatAccessStatuses = new Set(["active", "trial", "canceling", "billing_issue"]);
const knownCacheStatuses = new Set([...revenueCatAccessStatuses, "expired", "canceled"]);
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const revenueCatRefreshes = new Map<string, ReturnType<typeof syncRevenueCatSubscriber>>();

function developmentLog(event: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production") console.info(`[subscription-access] ${event}`, details);
}

function hasNotExpired(expiration: string | null | undefined) {
  return !expiration || new Date(expiration).getTime() > Date.now();
}

function cacheCondition(cache: { subscription_status: string | null; expiration_date: string | null; updated_at: string } | null) {
  if (!cache) return "missing" as const;
  if (!cache.subscription_status || !knownCacheStatuses.has(cache.subscription_status)) return "unknown" as const;
  if (!hasNotExpired(cache.expiration_date) || ["expired", "canceled"].includes(cache.subscription_status)) return "expired" as const;
  if (Date.now() - new Date(cache.updated_at).getTime() > CACHE_MAX_AGE_MS) return "stale" as const;
  return "valid" as const;
}

async function refreshRevenueCatOnce(admin: SupabaseClient<Database>, userId: string) {
  const existing = revenueCatRefreshes.get(userId);
  if (existing) return existing;
  const refresh = syncRevenueCatSubscriber(admin, userId).finally(() => revenueCatRefreshes.delete(userId));
  revenueCatRefreshes.set(userId, refresh);
  return refresh;
}

export async function markSubscriptionPaid(admin: SupabaseClient<Database>, userId: string, paidAt = new Date()) {
  const { data: existing, error: readError } = await admin.from("subscription_lifecycle").select("first_paid_at").eq("user_id", userId).maybeSingle();
  if (readError) throw readError;
  const { error } = await admin.from("subscription_lifecycle").upsert({ user_id: userId, has_subscribed_before: true, first_paid_at: existing?.first_paid_at || paidAt.toISOString(), paid_history_checked_at: new Date().toISOString() });
  if (error) throw error;
}

export async function markSubscriptionPaidByCustomer(admin: SupabaseClient<Database>, customerId: string, paidAt = new Date()) {
  const { data, error } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw error;
  if (data?.user_id) await markSubscriptionPaid(admin, data.user_id, paidAt);
}

export async function resolveSubscriptionAccess(admin: SupabaseClient<Database>, userId: string): Promise<SubscriptionAccess> {
  if (await hasFounderRole(admin, userId)) {
    developmentLog("Founder access granted", { userId });
    return { state: "activeSubscription", hasSubscribedBefore: false, isFounder: true, isTrial: false, isPromotional: false, expiresAt: null, provider: "founder", plan: null, status: "founder", entitlement: "pro" };
  }

  const [stripeSubscription, lifecycleResult, cacheResult, customerResult] = await Promise.all([
    currentSubscription(admin, userId),
    admin.from("subscription_lifecycle").select("has_subscribed_before,first_paid_at,paid_history_checked_at").eq("user_id", userId).maybeSingle(),
    admin.from("subscription_cache").select("subscription_status,expiration_date,entitlement,product_id,billing_provider,updated_at").eq("user_id", userId).maybeSingle(),
    admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (lifecycleResult.error) throw lifecycleResult.error;
  if (cacheResult.error) throw cacheResult.error;
  if (customerResult.error) throw customerResult.error;

  const stripeActive = Boolean(stripeSubscription && stripeAccessStatuses.has(stripeSubscription.status) && hasNotExpired(stripeSubscription.current_period_end));
  if (stripeActive) developmentLog("Stripe subscription found", { userId, status: stripeSubscription?.status });

  let cache = cacheResult.data;
  const condition = cacheCondition(cache);
  developmentLog(condition === "valid" ? "Cache hit" : condition === "missing" ? "Cache miss" : `Cache ${condition}`, { userId });
  let refreshFailed = false;
  if (condition !== "valid" && revenueCatConfigured()) {
    try {
      const refreshed = await refreshRevenueCatOnce(admin, userId);
      cache = { subscription_status: refreshed.status, expiration_date: refreshed.expirationDate, entitlement: refreshed.entitlement, product_id: refreshed.productId, billing_provider: "stripe", updated_at: new Date().toISOString() };
      developmentLog("RevenueCat refreshed", { userId, status: refreshed.status });
      developmentLog("Cache refreshed", { userId });
    } catch {
      refreshFailed = true;
    }
  }

  const revenueCatActive = Boolean(cache?.subscription_status && revenueCatAccessStatuses.has(cache.subscription_status) && hasNotExpired(cache.expiration_date));
  let hasSubscribedBefore = lifecycleResult.data?.has_subscribed_before || false;
  if (!hasSubscribedBefore && !lifecycleResult.data?.paid_history_checked_at) {
    let firstPaidAt: Date | null = null;
    if (customerResult.data?.stripe_customer_id) {
      const invoices = await getStripe().invoices.list({ customer: customerResult.data.stripe_customer_id, status: "paid", limit: 100 });
      const firstPaid = invoices.data.filter((invoice) => invoice.amount_paid > 0).at(-1);
      if (firstPaid) firstPaidAt = new Date(firstPaid.created * 1000);
    }
    if (firstPaidAt) { await markSubscriptionPaid(admin, userId, firstPaidAt); hasSubscribedBefore = true; }
    else {
      const { error } = await admin.from("subscription_lifecycle").upsert({ user_id: userId, paid_history_checked_at: new Date().toISOString() });
      if (error) throw error;
    }
  }

  if (!stripeActive && !revenueCatActive && refreshFailed) throw new Error("SUBSCRIPTION_ACCESS_UNAVAILABLE");
  const active = stripeActive || revenueCatActive;
  const provider: SubscriptionProvider = stripeActive ? "stripe" : revenueCatActive ? "revenuecat" : null;
  const plan = stripeActive ? (isBillingPlan(stripeSubscription?.plan) ? stripeSubscription.plan : planForPrice(stripeSubscription?.stripe_price_id)) : planForProduct(cache?.product_id) || planForPrice(cache?.product_id);
  const status = stripeActive ? stripeSubscription!.status : revenueCatActive ? cache!.subscription_status! : cache?.subscription_status || stripeSubscription?.status || "expired";
  const expiresAt = stripeActive ? stripeSubscription?.current_period_end || null : revenueCatActive ? cache?.expiration_date || null : null;
  const isTrial = status === "trial" || status === "trialing";
  const isPromotional = Boolean(plan?.startsWith("promotional_"));
  const state: SubscriptionAccessState = active ? "activeSubscription" : hasSubscribedBefore ? "expiredSubscription" : "neverSubscribed";
  if (active) developmentLog(isTrial ? "Trial access granted" : "Pro access granted", { userId, provider, plan });
  else developmentLog("Authorization denied", { userId, state });
  return { state, hasSubscribedBefore, isFounder: false, isTrial, isPromotional, expiresAt, provider, plan, status, entitlement: cache?.entitlement || null };
}

export async function requireProAccess(request: Request) {
  const { admin, user } = await requireApiUser(request);
  const access = await resolveSubscriptionAccess(admin, user.id);
  if (access.state !== "activeSubscription") throw new Error("PRO_REQUIRED");
  return { admin, user, access };
}
