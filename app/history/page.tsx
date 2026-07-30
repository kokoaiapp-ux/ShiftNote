"use client";

import { useRouter } from "next/navigation";
import { CopyPlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMode, getTemplate } from "@/lib/product-data";

export default function HistoryPage() {
  const router = useRouter();
  const product = useProduct();
  function reopen(modeId: string, templateId: string, preview: string) {
    product.setMode(modeId);
    product.clearChat();
    product.setTemplate(templateId, `Open this prior note and ask what should be updated: ${preview}`);
    router.push("/copilot");
  }
  return (
    <>
      <PageHeader eyebrow="Recent work" title="History" description="Review saved documentation sessions, reopen prior notes, or duplicate them into a new conversation." />
      {product.history.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-[var(--border)]"><div className="text-center"><p className="font-semibold">No saved notes yet</p><p className="mt-2 text-sm text-[var(--muted-foreground)]">Saved copilot output will appear here with its mode and template context.</p></div></div>
      ) : (
        <div className="space-y-3">
          {product.history.map((note) => (
            <Card key={note.id}><CardContent className="grid items-center gap-4 md:grid-cols-[120px_140px_160px_minmax(0,1fr)_auto]">
              <p className="text-xs text-[var(--muted-foreground)]">{new Date(note.createdAt).toLocaleDateString()}</p>
              <p className="text-sm font-medium">{getMode(note.modeId).name}</p>
              <p className="truncate text-sm">{getTemplate(note.templateId).name}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{note.preview}</p>
              <div className="flex gap-1"><Button onClick={() => reopen(note.modeId, note.templateId, note.preview)} size="sm" variant="outline">Open again</Button><Button aria-label="Duplicate" onClick={() => reopen(note.modeId, note.templateId, note.preview)} size="icon" variant="ghost"><CopyPlus className="size-4" /></Button><Button aria-label="Delete" onClick={() => product.deleteHistory(note.id)} size="icon" variant="ghost"><Trash2 className="size-4" /></Button></div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </>
  );
}
