"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/product/PageHeader";
import { useProduct } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Badge } from "@/components/ui/badge";
import { UpdateVoiceRecorder } from "@/components/product/UpdateVoiceRecorder";
import { GenerationIndicator } from "@/components/product/GenerationIndicator";
import { getMode, getTemplate } from "@/lib/product-data";

export default function FavoriteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const product = useProduct();
  const favorite = product.favorites.find((item) => item.id === id);
  const [newInformation, setNewInformation] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!favorite) {
    return <div className="grid min-h-80 place-items-center"><div className="text-center"><h1 className="font-semibold">Favorite not found</h1><Link className="mt-3 inline-block text-sm text-[var(--primary)]" href="/favorites">Back to Favorites</Link></div></div>;
  }

  async function updateWithAI(information = newInformation) {
    if (!information.trim()) return;
    setIsUpdating(true);
    setError(null);
    try {
      await product.updateFavoriteWithAI(favorite!.id, information.trim());
      setNewInformation("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the documentation.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]" href="/favorites"><ArrowLeft className="size-4" /> Favorites</Link>
      <PageHeader eyebrow="Local editor" title={favorite.favoriteName || favorite.title} description="Changes are auto-saved on this device. Manual editing and dictation do not contact the AI." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="favorite-name">Favorite name</label>
          <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--primary)]" id="favorite-name" onChange={(event) => product.updateFavorite(favorite.id, { favoriteName: event.target.value })} value={favorite.favoriteName || favorite.title} />
          <div className="mt-5 flex items-center justify-between"><label className="text-xs font-medium text-[var(--muted-foreground)]" htmlFor="favorite-note">Saved documentation</label><span aria-live="polite" className="flex items-center gap-1 text-[11px] font-medium text-[var(--foreground)]"><Save className="size-3" /> Auto-saved</span></div>
          <div className="relative">
            <textarea className="mt-2 min-h-[480px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 outline-none focus:border-[var(--primary)]" id="favorite-note" onChange={(event) => product.updateFavorite(favorite.id, { preview: event.target.value })} value={favorite.preview} />
            {isUpdating && <GenerationIndicator className="absolute left-3 top-5" />}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Saved context</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge>{getMode(favorite.modeId).name}</Badge><Badge>{getTemplate(favorite.templateId).name}</Badge></div>
            <dl className="mt-4 space-y-2 text-xs text-[var(--muted-foreground)]"><div className="flex justify-between"><dt>Created</dt><dd>{new Date(favorite.createdAt).toLocaleDateString()}</dd></div><div className="flex justify-between"><dt>Updated</dt><dd>{new Date(favorite.lastUpdated || favorite.createdAt).toLocaleDateString()}</dd></div></dl>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="font-semibold">Update with AI</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Only this action sends the existing documentation, new information, mode, and template to the AI.</p>
            <div className="relative mt-4">
              <textarea className="min-h-36 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 pr-11 text-sm leading-6 outline-none focus:border-[var(--primary)]" onChange={(event) => setNewInformation(event.target.value)} placeholder="Describe only what changed…" value={newInformation} />
            </div>
            <UpdateVoiceRecorder disabled={isUpdating} onBusyChange={setIsVoiceBusy} onSend={async (transcript) => {
              const information = [newInformation.trim(), transcript].filter(Boolean).join(" ");
              setNewInformation(information);
              await updateWithAI(information);
            }} />
            {error && <StatusMessage className="mt-2" title="Unable to update favorite" variant="error">{error}</StatusMessage>}
            <Button className="mt-4 w-full" disabled={!newInformation.trim() || isUpdating || isVoiceBusy} onClick={() => void updateWithAI()}><Sparkles className="size-4" />{isUpdating ? "Updating…" : "Update with AI"}</Button>
          </div>
        </aside>
      </div>
    </>
  );
}
