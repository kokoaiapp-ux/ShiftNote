import "server-only";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export function getStripe() { const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error("Stripe is not configured."); return new Stripe(key); }
export function getSupabaseAdmin() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error("Supabase server credentials are not configured."); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function requireApiUser(request: Request) { const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); if (!token) throw new Error("AUTH_REQUIRED"); const admin = getSupabaseAdmin(); const { data, error } = await admin.auth.getUser(token); if (error || !data.user) throw new Error("AUTH_REQUIRED"); return { admin, user: data.user }; }
export function appUrl(request: Request) { return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin; }