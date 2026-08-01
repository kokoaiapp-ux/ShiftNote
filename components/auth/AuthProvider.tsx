"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  OAuthProvider, browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider,
  onAuthStateChanged, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword,
  signInWithPopup, signOut as firebaseSignOut, updateProfile, type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseConfigured, firestore } from "@/lib/firebase";

type OnboardingData = { profession: string; workplace: string; experience: string; emr: string; documentation: string };
type AuthContextValue = {
  user: User | null; loading: boolean; configured: boolean;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInGoogle(): Promise<void>; signInApple(): Promise<void>;
  resetPassword(email: string): Promise<void>; signOut(): Promise<void>;
  saveOnboarding(data: OnboardingData): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth() {
  if (!firebaseAuth || !firestore) throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values described in .env.example and restart the app.");
  return { auth: firebaseAuth, db: firestore };
}
async function ensureProfile(user: User, extra: Record<string, unknown> = {}) {
  const { db } = requireAuth();
  await setDoc(doc(db, "users", user.uid), { email: user.email, displayName: user.displayName, updatedAt: serverTimestamp(), ...extra }, { merge: true });
}

export function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.", "auth/email-already-in-use": "An account already uses this email.",
    "auth/weak-password": "Use a password with at least 8 characters.", "auth/popup-closed-by-user": "Sign-in was cancelled before it finished.",
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
    "auth/network-request-failed": "The authentication service could not be reached. Check your connection and try again.",
  };
  return messages[code] || (error instanceof Error ? error.message : "Authentication could not be completed.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  useEffect(() => {
    if (!firebaseAuth) return;
    void setPersistence(firebaseAuth, browserLocalPersistence);
    return onAuthStateChanged(firebaseAuth, (next) => { setUser(next); setLoading(false); });
  }, []);
  const value: AuthContextValue = {
    user, loading, configured: firebaseConfigured,
    async signInEmail(email, password) { const { auth } = requireAuth(); await signInWithEmailAndPassword(auth, email, password); },
    async signUpEmail(name, email, password) { const { auth } = requireAuth(); const result = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(result.user, { displayName: name }); await ensureProfile(result.user, { displayName: name, onboardingComplete: false, createdAt: serverTimestamp() }); },
    async signInGoogle() { const { auth } = requireAuth(); const result = await signInWithPopup(auth, new GoogleAuthProvider()); await ensureProfile(result.user, { createdAt: serverTimestamp() }); },
    async signInApple() { const { auth } = requireAuth(); const provider = new OAuthProvider("apple.com"); provider.addScope("email"); provider.addScope("name"); const result = await signInWithPopup(auth, provider); await ensureProfile(result.user, { createdAt: serverTimestamp() }); },
    async resetPassword(email) { const { auth } = requireAuth(); await sendPasswordResetEmail(auth, email); },
    async signOut() { const { auth } = requireAuth(); await firebaseSignOut(auth); },
    async saveOnboarding(data) { if (!user) throw new Error("Sign in before saving onboarding."); const { db } = requireAuth(); await setDoc(doc(db, "users", user.uid), { onboarding: data, onboardingComplete: true, updatedAt: serverTimestamp() }, { merge: true }); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
