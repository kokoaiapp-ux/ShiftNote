"use client";

import { createPortal } from "react-dom";
import { ChatInterface } from "./ChatInterface";
import { useDocumentPip } from "@/hooks/useDocumentPip";
import { useProduct } from "@/components/product/ProductProvider";

export function FloatingAssistant() {
  const pip = useDocumentPip();
  const chat = useProduct();

  const assistant = (
    <ChatInterface
      error={chat.error}
      floating={Boolean(pip.portalRoot)}
      messages={chat.messages}
      onClose={pip.close}
      onSend={chat.sendMessage}
      status={chat.status}
    />
  );

  return (
    <>
      {pip.isOpen && pip.portalRoot && createPortal(assistant, pip.portalRoot)}
      {pip.isOpen && !pip.portalRoot && (
        <div className="fixed bottom-5 right-5 z-50">{assistant}</div>
      )}
      {!pip.isOpen && (
        <button
          aria-label="Open ShiftNote assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-[#176b4c] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(23,107,76,0.32)] transition hover:-translate-y-0.5 hover:bg-[#105a3e]"
          onClick={pip.toggle}
          type="button"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-white/15 text-lg">✦</span>
          <span>Ask ShiftNote</span>
          {pip.isSupported && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">PiP</span>}
        </button>
      )}
    </>
  );
}
