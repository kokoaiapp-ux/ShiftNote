import "server-only";
import Stripe from "stripe";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { PRODUCTION_APP_URL } from "@/lib/app-url";

export type BillingPlan = "monthly" | "six_month" | "promotional_six_month_discount" | "promotional_six_month_retention";
const planCatalog: Record<BillingPlan, { productEnv: string; priceEnv: string }> = {
  monthly: { productEnv: "STRIPE_MONTHLY_PRODUCT_ID", priceEnv: "STRIPE_MONTHLY_PRICE_ID" },
  six_month: { productEnv: "STRIPE_SIX_MONTH_PRODUCT_ID", priceEnv: "STRIPE_SIX_MONTH_PRICE_ID" },
  promotional_six_month_discount: { productEnv: "STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRODUCT_ID", priceEnv: "STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRICE_ID" },
  promotional_six_month_retention: { productEnv: "STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRODUCT_ID", priceEnv: "STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRICE_ID" },
};
const activeStatuses = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

export function getStripe() { const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error("STRIPE_NOT_CONFIGURED"); return new Stripe(key); }
export function getSupabaseAdmin() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED"); return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function requireApiUser(request: Request) { const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); if (!token) throw new Error("AUTH_REQUIRED"); const admin = getSupabaseAdmin(); const { data, error } = await admin.auth.getUser(token); if (error || !data.user) throw new Error("AUTH_REQUIRED"); return { admin, user: data.user }; }
export function appUrl(request: Request) { return process.env.NODE_ENV === "production" ? PRODUCTION_APP_URL : new URL(request.url).origin; }
export function isBillingPlan(value: unknown): value is BillingPlan { return typeof value === "string" && value in planCatalog; }
export async function priceForPlan(plan: BillingPlan) { const entry = planCatalog[plan]; const product = process.env[entry.productEnv]; const priceId = process.env[entry.priceEnv]; if (!product || !priceId) throw new Error("PRICE_NOT_CONFIGURED"); const price = await getStripe().prices.retrieve(priceId); const actualProduct = typeof price.product === "string" ? price.product : price.product.id; if (!price.active || !price.recurring || actualProduct !== product) throw new Error("PRICE_CONFIGURATION_INVALID"); return price.id; }
export function planForPrice(priceId: string | null | undefined): BillingPlan | null { if (!priceId) return null; return (Object.keys(planCatalog) as BillingPlan[]).find((plan) => process.env[planCatalog[plan].priceEnv] === priceId) || null; }
export function billingError(error: unknown, fallback: string) { const code = error instanceof Error ? error.message : ""; if (code === "AUTH_REQUIRED") return { status: 401, error: "Sign in to manage your subscription." }; if (["STRIPE_NOT_CONFIGURED", "SUPABASE_NOT_CONFIGURED", "PRICE_NOT_CONFIGURED", "PRICE_CONFIGURATION_INVALID"].includes(code)) return { status: 503, error: "Subscription billing is not configured yet." }; return { status: 500, error: fallback }; }

export async function getOrCreateStripeCustomer(admin: SupabaseClient<Database>, user: User) {
  const { data, error } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const stripe = getStripe();
  const existing = await stripe.customers.search({ query: `metadata['supabase_user_id']:'${user.id}'`, limit: 1 });
  const customer = existing.data[0] || await stripe.customers.create({ email: user.email, name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined, metadata: { supabase_user_id: user.id } }, { idempotencyKey: `supabase-customer-${user.id}` });
  const { error: saveError } = await admin.from("stripe_customers").upsert({ user_id: user.id, stripe_customer_id: customer.id });
  if (saveError) throw saveError;
  return customer.id;
}

export async function currentSubscription(admin: SupabaseClient<Database>, userId: string) {
  const live = await admin.from("stripe_subscriptions").select("*").eq("user_id", userId).in("status", ["active", "trialing", "past_due", "unpaid", "paused"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (live.error) throw live.error;
  if (live.data) return live.data;
  const latest = await admin.from("stripe_subscriptions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw latest.error;
  return latest.data;
}

export async function requireOwnedStripeSubscription(admin: SupabaseClient<Database>, user: User) {
  const stored = await currentSubscription(admin, user.id);
  if (!stored?.stripe_subscription_id) throw new Error("SUBSCRIPTION_NOT_FOUND");
  const subscription = await getStripe().subscriptions.retrieve(stored.stripe_subscription_id);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (subscription.metadata.supabase_user_id !== user.id && customerId !== stored.stripe_customer_id) throw new Error("SUBSCRIPTION_NOT_FOUND");
  return subscription;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, suppliedUserId?: string) {
  const admin = getSupabaseAdmin();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  let userId: string | undefined = suppliedUserId || subscription.metadata.supabase_user_id || undefined;
  if (!userId) { const { data } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle(); userId = data?.user_id; }
  if (!userId) { console.info("Ignoring Stripe subscription without an active Supabase user mapping", { subscriptionId: subscription.id }); return null; }
  await admin.from("stripe_customers").upsert({ user_id: userId, stripe_customer_id: customerId });
  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;
  const productId = typeof item?.price.product === "string" ? item.price.product : item?.price.product?.id;
  const row = { user_id: userId, stripe_subscription_id: subscription.id, stripe_customer_id: customerId, stripe_product_id: productId || null, stripe_price_id: item?.price.id || null, plan: planForPrice(item?.price.id), status: subscription.status, cancel_at_period_end: subscription.cancel_at_period_end, current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null, current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null, trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null, canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null, currency: item?.price.currency || null, unit_amount: item?.price.unit_amount || null, interval: item?.price.recurring?.interval || null, interval_count: item?.price.recurring?.interval_count || null, quantity: item?.quantity || null, pause_collection_behavior: subscription.pause_collection?.behavior || null, pause_resumes_at: subscription.pause_collection?.resumes_at ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString() : null, metadata: subscription.metadata };
  const { error } = await admin.from("stripe_subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) throw error;
  return row;
}

export function hasLiveSubscription(status: string) { return activeStatuses.has(status); }