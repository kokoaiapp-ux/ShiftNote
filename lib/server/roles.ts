import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function hasFounderRole(admin: SupabaseClient<Database>, userId: string) {
  const { data, error } = await admin.from("profiles").select("role").eq("auth_user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.role === "founder";
}
