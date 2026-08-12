"use client";

import { createPortal } from "react-dom";
import { ChatInterface } from "./ChatInterface";
import { useDocumentPip } from "@/hooks/useDocumentPip";
import { useProduct } from "@/components/product/ProductProvider";
import { PipShell } from "./PipShell";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { proPaywallHref } from "@/lib/subscription-access-client";
import { useSubscriptionAccess } from "@/components/subscription/SubscriptionAccessProvider";

export function FloatingAssistant() {
  const router = useRouter();
  const auth = useAuth();
  const pip = useDocumentPip();
  const chat = useProduct();
  const subscription = useSubscriptionAccess();

  async function openAssistant() {
    if (!auth.configured) { await pip.toggle(); return; }
    try {
      const result = subscription.access || await subscription.refresh();
      const state = result?.state;
      if (state === "activeSubscription") await pip.toggle();
      else router.push(proPaywallHref());
    } catch {
      router.push(`${proPaywallHref()}&access=expired`);
    }
  }

  if (pip.isMobile) return null;

  const chatInterface = (
    <ChatInterface
      error={chat.error}
      floating={Boolean(pip.portalRoot)}
      messages={chat.messages}
      onClose={pip.close}
      onSend={chat.sendMessage}
      status={chat.status}
    />
  );
  const assistant = pip.portalRoot ? <PipShell>{chatInterface}</PipShell> : chatInterface;

  return (
    <>
      {pip.isOpen && pip.portalRoot && createPortal(assistant, pip.portalRoot)}
      {pip.isOpen && !pip.portalRoot && (
        <div className="fixed bottom-5 right-5 z-50">{assistant}</div>
      )}
      {!pip.isOpen && (
        <button
          aria-label="Open ShiftNote assistant"
          className="fixed bottom-5 right-5 z-50 hidden items-center gap-3 rounded-2xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-xl transition lg:flex hover:-translate-y-0.5 hover:brightness-95"
          onClick={() => void openAssistant()}
          type="button"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-white/15 text-lg">✦</span>
          <span>ShiftNote</span>
          {pip.isSupported && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">PiP</span>}
        </button>
      )}
    </>
  );
}
