import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (Boolean(url) !== Boolean(publishableKey)) {
  throw new Error("Supabase Auth is partially configured. Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabaseConfigured = Boolean(url && publishableKey);
let browserClient: SupabaseClient<Database> | null = null;

export function getSupabase() {
  if (!supabaseConfigured) return null;
  browserClient ??= createBrowserClient<Database>(url!, publishableKey!);
  return browserClient;
}

export const supabase = typeof window === "undefined" ? null : getSupabase();

export function requireSupabase() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  return client;
}
