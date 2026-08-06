import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const login = new URL("/login", url.origin);
  login.searchParams.set("error", "Authentication could not be completed. Please try again.");
  return NextResponse.redirect(login);
}
