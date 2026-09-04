"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { clearSubscriptionAccessCache, loadSubscriptionAccess, type AccessResult } from "@/lib/subscription-access-client";
import { requireSupabase } from "@/lib/supabase";

type AccessContext = {
  access: AccessResult | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<AccessResult | null>;
};

const SubscriptionAccessContext = createContext<AccessContext | null>(null);
const REVALIDATE_INTERVAL_MS = 60_000;

export function SubscriptionAccessProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id || "";
  const [access, setAccess] = useState<AccessResult | null>(null);
  const [accessUserId, setAccessUserId] = useState("");
  const [loading, setLoading] = useState(Boolean(auth.configured));
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!auth.configured || !userId) return null;
    const currentRequest = ++requestId.current;
    setRefreshing(true);
    try {
      const result = await loadSubscriptionAccess(true);
      if (currentRequest === requestId.current) { setAccess(result); setAccessUserId(userId); }
      return result;
    } catch {
      return null;
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [auth.configured, userId]);

  useEffect(() => {
    requestId.current += 1;
    if (auth.loading) return;
    if (!auth.configured || !userId) {
      clearSubscriptionAccessCache();
      queueMicrotask(() => { setAccess(null); setAccessUserId(""); setLoading(false); setRefreshing(false); });
      return;
    }
    queueMicrotask(() => { setLoading(true); void refresh(); });
  }, [auth.configured, auth.loading, refresh, userId]);

  useEffect(() => {
    if (!userId) return;
    const interval = window.setInterval(() => void refresh(), REVALIDATE_INTERVAL_MS);
    const revalidateVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", revalidateVisible);
    document.addEventListener("visibilitychange", revalidateVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", revalidateVisible);
      document.removeEventListener("visibilitychange", revalidateVisible);
    };
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId) return;
    const client = requireSupabase();
    const channel = client.channel(`subscription-access-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_subscriptions", filter: `user_id=eq.${userId}` }, () => void refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `auth_user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [refresh, userId]);

  useEffect(() => {
    if (!access?.expiresAt) return;
    const delay = Math.max(0, new Date(access.expiresAt).getTime() - Date.now() + 250);
    if (delay > 2_147_483_647) return;
    const timer = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [access?.expiresAt, refresh]);

  const currentAccess = accessUserId === userId ? access : null;
  return <SubscriptionAccessContext.Provider value={{ access: currentAccess, loading: Boolean(userId) && !currentAccess ? true : loading, refreshing, refresh }}>{children}</SubscriptionAccessContext.Provider>;
}

export function useSubscriptionAccess() {
  const value = useContext(SubscriptionAccessContext);
  if (!value) throw new Error("useSubscriptionAccess must be used inside SubscriptionAccessProvider");
  return value;
}
