"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { markOnboardingComplete } from "@/lib/first-time-flow";
import { browserAppUrl } from "@/lib/app-url";
import { modes } from "@/lib/product-data";
import { getSupabase, requireSupabase, supabaseConfigured } from "@/lib/supabase";
import type { Json, Tables } from "@/types/database";

type OnboardingData = { profession: string; workplace: string; experience: string; emr: string; documentation: string; specialty?: string };
export type AuthUser = User & { uid: string; displayName: string | null };
type SignUpResult = { emailConfirmationRequired: boolean };
type AccountData = { profile: Tables<"profiles"> | null; onboarding: Tables<"onboarding_answers"> | null; preferences: Tables<"user_preferences"> | null };
type AuthContextValue = AccountData & { user: AuthUser | null; loading: boolean; configured: boolean; signInEmail(email: string, password: string): Promise<void>; signUpEmail(name: string, email: string, password: string): Promise<SignUpResult>; signInGoogle(next?: string): Promise<void>; signInApple(next?: string): Promise<void>; resetPassword(email: string): Promise<void>; updatePassword(password: string): Promise<void>; signOut(): Promise<void>; accessToken(): Promise<string | null>; saveOnboarding(data: OnboardingData): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
const emptyAccount: AccountData = { profile: null, onboarding: null, preferences: null };

function adapt(user: User | null): AuthUser | null { if (!user) return null; return Object.assign(user, { uid: user.id, displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || "") || null }); }
function safeNext(value = "/dashboard") { return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"; }
export function friendlyAuthError(error: unknown) { const message = error instanceof Error ? error.message : "Authentication could not be completed."; if (/invalid login credentials/i.test(message)) return "The email or password is incorrect."; if (/email not confirmed/i.test(message)) return "Verify your email address before signing in."; if (/already registered|already exists/i.test(message)) return "An account already uses this email."; if (/password/i.test(message) && /weak|characters/i.test(message)) return "Use a password with at least 8 characters."; return "Authentication could not be completed. Please try again."; }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [account, setAccount] = useState<AccountData>(emptyAccount);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    const supabaseClient = client;
    let active = true;
    async function load(nextUser: User | null) {
      if (!active) return;
      setUser(adapt(nextUser));
      if (!nextUser) { setAccount(emptyAccount); setLoading(false); return; }
      const [profile, onboarding, preferences] = await Promise.all([
        supabaseClient.from("profiles").select("*").eq("auth_user_id", nextUser.id).maybeSingle(),
        supabaseClient.from("onboarding_answers").select("*").eq("user_id", nextUser.id).maybeSingle(),
        supabaseClient.from("user_preferences").select("*").eq("user_id", nextUser.id).maybeSingle(),
      ]);
      if (!active) return;
      setAccount({ profile: profile.data, onboarding: onboarding.data, preferences: preferences.data });
      setLoading(false);
    }
    void supabaseClient.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => { void load(session?.user ?? null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function oauth(provider: "google" | "apple", next = "/dashboard") { const callback = new URL("/auth/callback", browserAppUrl()); callback.searchParams.set("next", safeNext(next)); const { error } = await requireSupabase().auth.signInWithOAuth({ provider, options: { redirectTo: callback.toString() } }); if (error) throw error; }
  const value: AuthContextValue = {
    user, loading, configured: supabaseConfigured, ...account,
    async signInEmail(email, password) { const { error } = await requireSupabase().auth.signInWithPassword({ email, password }); if (error) throw error; },
    async signUpEmail(name, email, password) { const { data, error } = await requireSupabase().auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${browserAppUrl()}/auth/callback?next=${encodeURIComponent("/onboarding")}` } }); if (error) throw error; return { emailConfirmationRequired: !data.session }; },
    signInGoogle(next) { return oauth("google", next); },
    signInApple(next) { return oauth("apple", next); },
    async resetPassword(email) { const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${browserAppUrl()}/auth/callback?next=${encodeURIComponent("/update-password")}` }); if (error) throw error; },
    async updatePassword(password) { const { error } = await requireSupabase().auth.updateUser({ password }); if (error) throw error; },
    async signOut() { const { error } = await requireSupabase().auth.signOut({ scope: "local" }); if (error) throw error; },
    async accessToken() { const { data, error } = await requireSupabase().auth.getSession(); if (error) throw error; return data.session?.access_token ?? null; },
    async saveOnboarding(data) {
      const selectedMode = modes.find((mode) => mode.name === data.profession)?.id ?? "nurse";
      const payload = { ...data, preferred_default_mode: selectedMode, default_mode: selectedMode } as unknown as Json;
      const { error } = await requireSupabase().rpc("complete_onboarding", { payload });
      if (error) throw error;
      localStorage.setItem("shiftnote-onboarding-draft", JSON.stringify(data));
      markOnboardingComplete();
      setAccount((current) => ({
        ...current,
        profile: current.profile ? { ...current.profile, profession: data.profession, emr: data.emr, place_of_work: data.workplace, workplace: data.workplace, default_mode: selectedMode } : current.profile,
        preferences: current.preferences ? { ...current.preferences, default_mode: selectedMode, last_selected_mode: selectedMode, onboarding_completed: true } : current.preferences,
      }));
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }