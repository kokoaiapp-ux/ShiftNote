"use client";

import { ArrowLeft, Check, Clock3, Copy, CopyPlus, FileStack, Heart, Menu, MessageSquareText, Settings, Stethoscope, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useProduct } from "@/components/product/ProductProvider";
import { ProductIcon } from "@/components/product/Icon";
import { CUSTOM_TEMPLATE_ID, getTemplatesForMode, modes } from "@/lib/product-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HistoryWorkspace } from "@/components/product/HistoryWorkspace";

type View = "copilot" | "modes" | "templates" | "favorites" | "history" | "settings";

const nav = [
  ["copilot", "AI Copilot", MessageSquareText],
  ["modes", "Modes", Stethoscope],
  ["templates", "Templates", FileStack],
  ["favorites", "Favorites", Heart],
  ["history", "History", Clock3],
  ["settings", "Settings", Settings],
] as const;

export function PipShell({ children }: { children: React.ReactNode }) {
  const product = useProduct();
  const [view, setView] = useState<View>("copilot");
  const [drawerOpen, setDrawerOpen] = useState(false);

  function selectTemplate(id: string) {
    product.setTemplate(id);
    product.clearChat(false);
    setView("copilot");
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {drawerOpen && (
        <aside className="absolute inset-y-0 left-0 z-30 w-56 border-r border-[var(--border)] bg-[var(--sidebar)] p-3 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-2"><span className="text-sm font-semibold">ShiftNote</span><button aria-label="Close navigation" className="grid size-8 place-items-center rounded-lg hover:bg-[var(--muted)]" onClick={() => setDrawerOpen(false)}><X className="size-4" /></button></div>
          <nav className="mt-3 space-y-1">{nav.map(([id, label, Icon]) => <button className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]", view === id && "bg-[var(--primary-soft)] text-[var(--primary)]")} key={id} onClick={() => { setView(id); setDrawerOpen(false); }}><Icon className="size-4" />{label}</button>)}</nav>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3">
          <button aria-label="Open navigation" className="grid size-8 place-items-center rounded-lg hover:bg-[var(--muted)]" onClick={() => setDrawerOpen(true)}><Menu className="size-4" /></button>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{nav.find(([id]) => id === view)?.[1]}</p>
          <span className="truncate text-[10px] text-[var(--muted-foreground)]">{product.mode.name}</span>
        </div>

        {view === "copilot" && <div className="min-h-0 flex-1">{children}</div>}
        {view === "modes" && <MiniList title="Choose Mode">{modes.map((mode) => <button className={cn("flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left text-xs", product.mode.id === mode.id && "border-[var(--primary)] bg-[var(--primary-soft)]")} key={mode.id} onClick={() => { product.setMode(mode.id); setView("copilot"); }}><ProductIcon className="size-4 text-[var(--primary)]" name={mode.icon} /><span className="font-medium">{mode.name}</span></button>)}</MiniList>}
        {view === "templates" && <MiniList title={`${product.mode.name} Templates`}>
          <button className={cn("flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-3 text-left text-xs", product.template.id === CUSTOM_TEMPLATE_ID && "border-[var(--primary)] bg-[var(--primary-soft)]")} onClick={() => selectTemplate(CUSTOM_TEMPLATE_ID)}><ProductIcon className="size-4 text-[var(--primary)]" name="FilePlus2" /><span className="font-medium">★ Custom Template (Recommended)</span></button>
          {getTemplatesForMode(product.mode.id).map((template) => <button className={cn("flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-left text-xs", product.template.id === template.id && "border-[var(--primary)] bg-[var(--primary-soft)]")} key={template.id} onClick={() => selectTemplate(template.id)}><ProductIcon className="size-4 text-[var(--primary)]" name={template.icon} /><span className="font-medium">{template.name}</span></button>)}
        </MiniList>}
        {view === "favorites" && <PipFavorites />}
        {view === "history" && <PipHistory />}
        {view === "settings" && <PipSettings />}
      </div>
    </div>
  );
}

function PipFavorites() {
  const product = useProduct();
  const [openId, setOpenId] = useState<string | null>(null);
  const favorite = product.favorites.find((item) => item.id === openId);
  if (favorite) {
    return <MiniList title=""><button className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--primary)]" onClick={() => setOpenId(null)}><ArrowLeft className="size-3.5" /> Favorites</button><input className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--primary)]" onChange={(event) => product.updateFavorite(favorite.id, { favoriteName: event.target.value })} value={favorite.favoriteName || favorite.title} /><textarea className="mt-2 min-h-72 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-5 outline-none focus:border-[var(--primary)]" onChange={(event) => product.updateFavorite(favorite.id, { preview: event.target.value })} value={favorite.preview} /><p className="mt-2 text-[10px] text-[var(--muted-foreground)]">Changes auto-save locally.</p><div className="mt-3 flex gap-2"><Button onClick={() => product.duplicateFavorite(favorite.id)} size="sm" variant="outline"><CopyPlus className="size-3.5" />Duplicate</Button><Button onClick={() => { product.deleteFavorite(favorite.id); setOpenId(null); }} size="sm" variant="destructive"><Trash2 className="size-3.5" />Delete</Button></div></MiniList>;
  }
  return <MiniList title="Favorites">{product.favorites.length ? product.favorites.map((item) => <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3" key={item.id}><p className="text-xs font-medium">{item.favoriteName || item.title}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[10px] leading-4 text-[var(--muted-foreground)]">{item.preview}</p><div className="mt-2 flex gap-1"><Button onClick={() => setOpenId(item.id)} size="sm" variant="outline">Open / Edit</Button><Button aria-label="Duplicate favorite" onClick={() => product.duplicateFavorite(item.id)} size="icon" variant="ghost"><CopyPlus className="size-3.5" /></Button><Button aria-label="Delete favorite" onClick={() => product.deleteFavorite(item.id)} size="icon" variant="ghost"><Trash2 className="size-3.5" /></Button></div></div>) : <Empty text="No favorites yet." />}</MiniList>;
}

function PipHistory() {
  const product = useProduct();
  const [openId, setOpenId] = useState<string | null>(null);
  const note = product.history.find((item) => item.id === openId);
  if (note) return <MiniList title=""><button className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--primary)]" onClick={() => setOpenId(null)}><ArrowLeft className="size-3.5" /> History</button><HistoryWorkspace compact noteId={note.id} onDeleted={() => setOpenId(null)} /></MiniList>;
  return <MiniList title="History">{product.history.length ? product.history.map((item) => <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3" key={item.id}><p className="text-xs font-medium">{item.title}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted-foreground)]">{item.preview}</p><div className="mt-2 flex gap-1"><Button onClick={() => setOpenId(item.id)} size="sm" variant="outline">Open / Edit</Button><Button aria-label="Copy history" onClick={() => navigator.clipboard.writeText(item.preview)} size="icon" variant="ghost"><Copy className="size-3.5" /></Button><Button aria-label="Duplicate history" onClick={() => product.saveToHistory({ ...item, id: crypto.randomUUID(), title: `${item.title} copy`, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() })} size="icon" variant="ghost"><CopyPlus className="size-3.5" /></Button><Button aria-label="Delete history" onClick={() => product.deleteHistory(item.id)} size="icon" variant="ghost"><Trash2 className="size-3.5" /></Button></div></div>) : <Empty text="No saved history yet." />}</MiniList>;
}

function PipSettings() {
  const product = useProduct();
  const themes = ["light", "dark", "system"] as const;
  return <MiniList title="Settings"><section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="text-xs font-semibold">Appearance</p><div className="mt-2 grid grid-cols-3 gap-1">{themes.map((theme) => <button className={cn("rounded-lg border border-[var(--border)] px-2 py-2 text-[10px] capitalize", product.theme === theme && "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]")} key={theme} onClick={() => product.setTheme(theme)}>{theme}{product.theme === theme && <Check className="ml-1 inline size-3" />}</button>)}</div></section><section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="text-xs font-semibold">Primary Color</p><div className="mt-3 flex gap-3">{["#176b4c", "#2563eb", "#7c3aed", "#c55a2d"].map((color) => <button aria-label={`Use ${color}`} className={cn("size-9 rounded-full border-4 border-[var(--card)] shadow", product.primaryColor === color && "ring-2 ring-[var(--primary)]")} key={color} onClick={() => product.setPrimaryColor(color)} style={{ backgroundColor: color }} />)}</div></section><section className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><div><p className="text-xs font-semibold">Compact Mode</p><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Reduce interface spacing.</p></div><button aria-pressed={product.compact} className={cn("relative h-7 w-12 rounded-full bg-[var(--muted)] transition", product.compact && "bg-[var(--primary)]")} onClick={() => product.setCompact(!product.compact)}><span className={cn("absolute left-1 top-1 size-5 rounded-full bg-white shadow transition", product.compact && "translate-x-5")} /></button></section><section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="text-xs font-semibold">Language</p><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">English (US) · More languages coming soon.</p></section></MiniList>;
}

function MiniList({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-4">{title && <h2 className="mb-3 text-sm font-semibold">{title}</h2>}<div className="space-y-2">{children}</div></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted-foreground)]">{text}</p>;
}
