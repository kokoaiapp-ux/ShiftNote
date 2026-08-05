"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { markOnboardingComplete } from "@/lib/first-time-flow";
import { requireSupabase, supabase, supabaseConfigured } from "@/lib/supabase";

type OnboardingData = { profession: string; workplace: string; experience: string; emr: string; documentation: string };
export type AuthUser = User & { uid: string; displayName: string | null };
type AuthContextValue = { user: AuthUser | null; loading: boolean; configured: boolean; signInEmail(email: string, password: string): Promise<void>; signUpEmail(name: string, email: string, password: string): Promise<void>; signInGoogle(): Promise<void>; signInApple(): Promise<void>; resetPassword(email: string): Promise<void>; signOut(): Promise<void>; accessToken(): Promise<string | null>; saveOnboarding(data: OnboardingData): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
function adapt(user: User | null): AuthUser | null { if (!user) return null; return Object.assign(user, { uid: user.id, displayName: String(user.user_metadata?.display_name || user.user_metadata?.full_name || "") || null }); }
export function friendlyAuthError(error: unknown) { const message = error instanceof Error ? error.message : "Authentication could not be completed."; if (/invalid login credentials/i.test(message)) return "The email or password is incorrect."; if (/already registered|already exists/i.test(message)) return "An account already uses this email."; if (/password/i.test(message) && /weak|characters/i.test(message)) return "Use a password with at least 8 characters."; return message; }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  useEffect(() => { if (!supabase) return; void supabase.auth.getSession().then(({ data }) => { setUser(adapt(data.session?.user ?? null)); setLoading(false); }); const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(adapt(session?.user ?? null)); setLoading(false); }); return () => data.subscription.unsubscribe(); }, []);
  const value: AuthContextValue = {
    user, loading, configured: supabaseConfigured,
    async signInEmail(email, password) { const { error } = await requireSupabase().auth.signInWithPassword({ email, password }); if (error) throw error; },
    async signUpEmail(name, email, password) { const client = requireSupabase(); const { error } = await client.auth.signUp({ email, password, options: { data: { display_name: name } } }); if (error) throw error; },
    async signInGoogle() { const { error } = await requireSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/dashboard` } }); if (error) throw error; },
    async signInApple() { const { error } = await requireSupabase().auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${location.origin}/dashboard` } }); if (error) throw error; },
    async resetPassword(email) { const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login` }); if (error) throw error; },
    async signOut() { const { error } = await requireSupabase().auth.signOut(); if (error) throw error; },
    async accessToken() { return (await requireSupabase().auth.getSession()).data.session?.access_token ?? null; },
    async saveOnboarding(data) { if (!supabaseConfigured) { markOnboardingComplete(); return; } if (!user) throw new Error("Sign in before saving onboarding."); const { error } = await requireSupabase().from("profiles").update({ onboarding: data, onboarding_complete: true, updated_at: new Date().toISOString() }).eq("id", user.id); if (error) throw error; markOnboardingComplete(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }