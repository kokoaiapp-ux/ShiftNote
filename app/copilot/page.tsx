"use client";

import { RotateCcw } from "lucide-react";
import { ChatInterface } from "@/components/floating-assistant/ChatInterface";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";

export default function CopilotPage() {
  const product = useProduct();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-[var(--muted-foreground)]">Current Mode</p>
          <p className="truncate text-sm font-semibold">{product.mode.name}</p>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10px] text-[var(--muted-foreground)]">Current Template</p>
          <p className="truncate text-sm font-semibold">{product.template.name}</p>
        </div>
        <Button className="shrink-0" onClick={() => product.clearChat()} size="sm" variant="outline"><RotateCcw className="size-4" /><span className="hidden sm:inline">New Conversation</span></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-card)]">
        <ChatInterface error={product.error} floating messages={product.messages} onSend={product.sendMessage} status={product.status} workspace />
      </div>
    </div>
  );
}