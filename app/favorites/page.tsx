"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMode, getTemplate } from "@/lib/product-data";

export default function FavoritesPage() {
  const router = useRouter();
  const product = useProduct();
  function reuse(modeId: string, templateId: string, preview: string) {
    product.setMode(modeId);
    product.setTemplate(templateId, `Reuse this previously generated note as a starting point. Ask what has changed before revising it: ${preview}`);
    product.clearChat();
    router.push("/copilot");
  }
  return (
    <>
      <PageHeader eyebrow="Reusable notes" title="Favorites" description="Favorites are generated notes you want to reuse and update—not generic blank templates." />
      {product.favorites.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-[var(--border)]"><div className="text-center"><Heart className="mx-auto size-8 text-[var(--muted-foreground)]" /><h2 className="mt-4 font-semibold">No favorite notes yet</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Favorite a generated note from the copilot to reuse it here.</p></div></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {product.favorites.map((note) => <Card key={note.id}><CardContent><p className="text-xs text-[var(--primary)]">{getMode(note.modeId).name} · {getTemplate(note.templateId).name}</p><h2 className="mt-2 font-semibold">{note.title}</h2><p className="mt-3 line-clamp-4 text-xs leading-5 text-[var(--muted-foreground)]">{note.preview}</p><Button className="mt-5" onClick={() => reuse(note.modeId, note.templateId, note.preview)} size="sm">Reuse and update</Button></CardContent></Card>)}
        </div>
      )}
    </>
  );
}
