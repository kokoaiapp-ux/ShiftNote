"use client";

import { RotateCcw } from "lucide-react";
import { ChatInterface } from "@/components/floating-assistant/ChatInterface";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export default function CopilotPage() {
  const product = useProduct();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hidden flex-wrap items-end justify-between gap-4 md:flex">
        <PageHeader eyebrow="AI workspace" title="Clinical Copilot" description="A guided workspace that adapts its vocabulary, questions, and output to your profession and selected documentation format." />
        <Button className="mb-7" onClick={() => product.clearChat()} variant="outline"><RotateCcw className="size-4" /> New conversation</Button>
      </div>
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-0 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-card)] md:min-h-[700px]">
          <ChatInterface error={product.error} floating messages={product.messages} onSend={product.sendMessage} status={product.status} />
        </div>
        <aside className="hidden space-y-4 xl:block">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Active context</p>
            <div className="mt-4"><Badge>{product.mode.name} Mode</Badge><h2 className="mt-3 font-semibold">{product.template.name}</h2><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{product.template.description}</p></div>
          </div>
          <StatusMessage className="p-5" title="Clinical safety" variant="warning">Use de-identified information in this prototype. Verify every fact and never place unreviewed output in a clinical record.</StatusMessage>
        </aside>
      </div>
    </div>
  );
}
