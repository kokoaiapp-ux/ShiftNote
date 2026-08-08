import { requireSupabase } from "@/lib/supabase";
import type { SubscriptionAccessState } from "@/lib/server/subscription-access";

type AccessResult = { state: SubscriptionAccessState; hasSubscribedBefore: boolean };
let cached: { userId: string; result: AccessResult; expiresAt: number } | null = null;
let pending: Promise<AccessResult> | null = null;

export async function loadSubscriptionAccess(force = false): Promise<AccessResult> {
  const { data } = await requireSupabase().auth.getSession();
  const session = data.session;
  if (!session) throw new Error("AUTH_REQUIRED");
  if (!force && cached?.userId === session.user.id && cached.expiresAt > Date.now()) return cached.result;
  if (!force && pending) return pending;
  pending = fetch("/api/subscription/access", { headers: { Authorization: `Bearer ${session.access_token}` } })
    .then(async (response) => {
      if (!response.ok) throw new Error("SUBSCRIPTION_ACCESS_UNAVAILABLE");
      const result = await response.json() as AccessResult;
      cached = { userId: session.user.id, result, expiresAt: Date.now() + 60_000 };
      return result;
    })
    .finally(() => { pending = null; });
  return pending;
}

export function proPaywallHref() {
  return "/subscription?source=pro-gate";
}

export function clearSubscriptionAccessCache() {
  cached = null;
  pending = null;
}
