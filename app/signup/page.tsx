"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Brand } from "@/components/public/PublicChrome";
import { isFirstTimeFlowPending } from "@/lib/first-time-flow";

export default function SignupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isFirstTimeFlowPending()) { router.replace("/subscription?flow=first-time&stage=entry"); return; }
    queueMicrotask(() => setReady(true));
  }, [router]);
  if (!ready) return <main className="min-h-screen bg-[var(--background)]" />;
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8"><div className="mx-auto max-w-7xl"><Brand /><div className="grid min-h-[calc(100vh-7rem)] place-items-center"><AuthCard mode="signup" /></div></div></main>;
}
