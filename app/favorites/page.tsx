"use client";

import Link from "next/link";
import { CopyPlus, Heart, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMode, getTemplate } from "@/lib/product-data";

export default function FavoritesPage() {
  const product = useProduct();
  return (
    <>
      <PageHeader eyebrow="Saved documentation" title="Favorites" description="Favorites contain complete generated documentation stored locally. Opening or editing an item never makes an AI request." />
      {product.favorites.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-[var(--border)]"><div className="text-center"><Heart className="mx-auto size-8 text-[var(--muted-foreground)]" /><h2 className="mt-4 font-semibold">No favorite documentation yet</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Favorite generated documentation from the copilot to save its complete content here.</p></div></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {product.favorites.map((note) => (
            <Card key={note.id}><CardContent>
              <p className="text-xs text-[var(--primary)]">{getMode(note.modeId).name} · {getTemplate(note.templateId).name}</p>
              <h2 className="mt-2 font-semibold">{note.favoriteName || note.title}</h2>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Updated {new Date(note.lastUpdated || note.createdAt).toLocaleString()}</p>
              <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-[var(--muted-foreground)]">{note.preview}</p>
              <div className="mt-5 flex gap-1"><Link className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--muted)]" href={`/favorites/${note.id}`}>Open / Edit</Link><Button aria-label="Duplicate favorite" onClick={() => product.duplicateFavorite(note.id)} size="icon" variant="ghost"><CopyPlus className="size-4" /></Button><Button aria-label="Delete favorite" onClick={() => product.deleteFavorite(note.id)} size="icon" variant="ghost"><Trash2 className="size-4" /></Button></div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </>
  );
}
