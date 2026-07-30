"use client";

import { RotateCcw } from "lucide-react";
import { ChatInterface } from "@/components/floating-assistant/ChatInterface";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CopilotPage() {
  const product = useProduct();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="AI workspace" title="Clinical Copilot" description="A guided workspace that adapts its vocabulary, questions, and output to your profession and selected documentation format." />
        <Button className="mb-7" onClick={product.clearChat} variant="outline"><RotateCcw className="size-4" /> New conversation</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[700px] overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-card)]">
          <ChatInterface error={product.error} floating messages={product.messages} onSend={product.sendMessage} status={product.status} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Active context</p>
            <div className="mt-4"><Badge>{product.mode.name} Mode</Badge><h2 className="mt-3 font-semibold">{product.template.name}</h2><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{product.template.description}</p></div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <p className="text-xs font-semibold">Clinical safety</p>
            <p className="mt-2 text-xs leading-5 opacity-75">Use de-identified information in this prototype. Verify every fact and never place unreviewed output in a clinical record.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
