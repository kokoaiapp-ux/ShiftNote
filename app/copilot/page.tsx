"use client";

import { ChatInterface } from "@/components/floating-assistant/ChatInterface";
import { useProduct } from "@/components/product/ProductProvider";

export default function CopilotPage() {
  const product = useProduct();
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-card)]">
      <ChatInterface error={product.error} floating messages={product.messages} onNewConversation={() => product.clearChat()} onSend={product.sendMessage} status={product.status} workspace />
    </div>
  );
}