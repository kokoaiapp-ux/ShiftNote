import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { hasFounderRole } from "@/lib/server/roles";

type SubscriberResponse={subscriber?:{entitlements?:Record<string,{expires_date?:string|null;product_identifier?:string}>;subscriptions?:Record<string,{expires_date?:string|null;period_type?:string;unsubscribe_detected_at?:string|null;billing_issues_detected_at?:string|null;store?:string}>}};
const api="https://api.revenuecat.com/v1";
export function revenueCatConfigured(){return Boolean(process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY&&process.env.REVENUECAT_STRIPE_APP_PUBLIC_API_KEY&&process.env.REVENUECAT_SECRET_API_KEY&&process.env.REVENUECAT_PRO_ENTITLEMENT_ID)}
async function rcFetch(path:string,init:RequestInit={},key=process.env.REVENUECAT_SECRET_API_KEY){if(!key)throw new Error("REVENUECAT_NOT_CONFIGURED");const response=await fetch(`${api}${path}`,{...init,headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers||{})},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`REVENUECAT_API_${response.status}`);return response}
export async function submitStripeSubscription(userId:string,subscriptionId:string){const key=process.env.REVENUECAT_STRIPE_APP_PUBLIC_API_KEY;if(!key)throw new Error("REVENUECAT_NOT_CONFIGURED");await rcFetch("/receipts",{method:"POST",headers:{"X-Platform":"stripe"},body:JSON.stringify({app_user_id:userId,fetch_token:subscriptionId})},key)}
export async function syncRevenueCatSubscriber(admin:SupabaseClient<Database>,userId:string){const response=await rcFetch(`/subscribers/${encodeURIComponent(userId)}`);const payload=await response.json() as SubscriberResponse;const entitlementId=process.env.REVENUECAT_PRO_ENTITLEMENT_ID||"pro";const entitlement=payload.subscriber?.entitlements?.[entitlementId];const productId=entitlement?.product_identifier||null;const subscription=productId?payload.subscriber?.subscriptions?.[productId]:undefined;const expiration=entitlement?.expires_date||subscription?.expires_date||null;const active=Boolean(entitlement)&&(!expiration||new Date(expiration).getTime()>Date.now());const status=!active?"expired":subscription?.billing_issues_detected_at?"billing_issue":subscription?.unsubscribe_detected_at?"canceling":subscription?.period_type==="trial"?"trial":"active";const {error}=await admin.from("subscription_cache").upsert({user_id:userId,entitlement:entitlementId,subscription_status:status,product_id:productId,billing_provider:"stripe",expiration_date:expiration,updated_at:new Date().toISOString()});if(error)throw error;return{entitlement:entitlementId,active,status,productId,expirationDate:expiration}}
export async function requireRevenueCatPro(request:Request){
  const { requireApiUser } = await import("@/lib/server/billing");
  const { admin, user } = await requireApiUser(request);
  if (await hasFounderRole(admin,user.id)) return { admin, user };
  if (!revenueCatConfigured()) return { admin, user };
  const { data, error } = await admin.from("subscription_cache").select("subscription_status,expiration_date,entitlement").eq("user_id",user.id).maybeSingle();
  if(error)throw error;
  const current=data||await syncRevenueCatSubscriber(admin,user.id);
  const expiration="expiration_date" in current?current.expiration_date:current.expirationDate;
  const status="subscription_status" in current?current.subscription_status:current.status;
  if(["expired","canceled"].includes(status||"")||(expiration&&new Date(expiration).getTime()<=Date.now()))throw new Error("PRO_REQUIRED");
  return { admin, user };
}export async function deleteRevenueCatSubscriber(userId:string){await rcFetch(`/subscribers/${encodeURIComponent(userId)}`,{method:"DELETE"})}
