"use client";

import { Check, Copy, CopyPlus, FilePlus2, Mic, Save, Sparkles, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProduct, type SavedNote, type StoredAttachment } from "./ProductProvider";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { getMode, getTemplate } from "@/lib/product-data";

export function HistoryWorkspace({ noteId, compact = false, onDeleted }: { noteId: string; compact?: boolean; onDeleted?: () => void }) {
  const product = useProduct();
  const updateHistoryNote = product.updateHistoryNote;
  const note = product.history.find((item) => item.id === noteId);
  const [draft, setDraft] = useState(() => note?.preview ?? "");
  const [newInformation, setNewInformation] = useState(() => note?.pendingInformation ?? "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingChangesRef = useRef<Partial<Pick<SavedNote, "preview" | "attachments" | "pendingInformation">>>({});
  const voiceBaseRef = useRef("");

  const handleTranscript = useCallback((text: string) => {
    const value = [voiceBaseRef.current, text].filter(Boolean).join(" ");
    setNewInformation(value);
    setSaveStatus("saving");
    pendingChangesRef.current = { ...pendingChangesRef.current, pendingInformation: value };
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const changes = pendingChangesRef.current;
      pendingChangesRef.current = {};
      updateHistoryNote(noteId, changes, "auto-save");
      setSaveStatus("saved");
    }, 1200);
  }, [noteId, updateHistoryNote]);
  const speech = useAudioTranscription({ onTranscript: handleTranscript });

  const flushPending = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (Object.keys(pendingChangesRef.current).length) {
      const changes = pendingChangesRef.current;
      pendingChangesRef.current = {};
      updateHistoryNote(noteId, changes, "auto-save");
    }
  }, [noteId, updateHistoryNote]);

  useEffect(() => {
    window.addEventListener("pagehide", flushPending);
    return () => {
      window.removeEventListener("pagehide", flushPending);
      flushPending();
    };
  }, [flushPending]);

  if (!note) return <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted-foreground)]">History note not found.</p>;

  function scheduleSave(changes: Partial<Pick<SavedNote, "preview" | "attachments" | "pendingInformation">>) {
    setSaveStatus("saving");
    pendingChangesRef.current = { ...pendingChangesRef.current, ...changes };
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const pending = pendingChangesRef.current;
      pendingChangesRef.current = {};
      product.updateHistoryNote(note!.id, pending, "auto-save");
      setSaveStatus("saved");
    }, 1200);
  }

  function changeDraft(value: string) {
    setDraft(value);
    scheduleSave({ preview: value });
  }

  function saveNow(source: "manual" | "restore" = "manual", value = draft) {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingChangesRef.current = {};
    product.updateHistoryNote(note!.id, { preview: value }, source);
    setSaveStatus("saved");
  }

  async function updateWithAI() {
    if (!newInformation.trim()) return;
    setIsUpdating(true);
    setError(null);
    saveNow();
    try {
      const updated = await product.updateHistoryWithAI(note!.id, newInformation.trim(), draft);
      setDraft(updated);
      setNewInformation("");
      setSaveStatus("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this note.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    setSaveStatus("saving");
    try {
      const stored = await Promise.all(Array.from(files).map(fileToStoredAttachment));
      const attachments = [...(note!.attachments ?? []), ...stored];
      product.updateHistoryNote(note!.id, { attachments }, "auto-save");
      setSaveStatus("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to attach this file.");
      setSaveStatus("saved");
    }
  }

  function removeAttachment(id: string) {
    product.updateHistoryNote(note!.id, { attachments: (note!.attachments ?? []).filter((item) => item.id !== id) }, "auto-save");
    setSaveStatus("saved");
  }

  function addFavorite() {
    product.addFavorite({ ...note!, id: crypto.randomUUID(), preview: draft, favoriteName: note!.title, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() });
  }

  function restoreVersion(versionId: string) {
    const version = note!.versions?.find((item) => item.id === versionId);
    if (!version) return;
    setDraft(version.preview);
    saveNow("restore", version.preview);
    setSelectedVersion(null);
  }

  const version = note.versions?.find((item) => item.id === selectedVersion);

  return (
    <div className={compact ? "space-y-3" : "grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"}>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">{getMode(note.modeId).name} · {getTemplate(note.templateId).name}</span>
          <span aria-live="polite" className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[var(--foreground)]">{saveStatus === "saving" ? "Saving…" : <><Check className="size-3 text-[var(--primary)]" />Saved</>}</span>
        </div>
        <textarea className={compact ? "min-h-64 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-5 outline-none focus:border-[var(--primary)]" : "min-h-[480px] w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7 outline-none focus:border-[var(--primary)]"} onChange={(event) => changeDraft(event.target.value)} value={draft} />
        {(note.attachments?.length ?? 0) > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{note.attachments?.map((item) => <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-soft)] px-2.5 py-1.5 text-[10px] text-[var(--primary)]" key={item.id}>{item.name}<button aria-label={`Remove ${item.name}`} onClick={() => removeAttachment(item.id)}><X className="size-3" /></button></span>)}</div>}
        <div className="mt-3 flex flex-wrap gap-1">
          <Button onClick={() => navigator.clipboard.writeText(draft)} size="sm" variant="ghost"><Copy className="size-3.5" />Copy</Button>
          <Button onClick={() => saveNow()} size="sm" variant="ghost"><Save className="size-3.5" />Save</Button>
          <Button onClick={addFavorite} size="sm" variant="ghost"><Star className="size-3.5" />Favorite</Button>
          <Button onClick={() => product.saveCustomTemplate({ modeId: note.modeId, name: note.title, description: "Created from a saved history note", content: draft })} size="sm" variant="ghost"><FilePlus2 className="size-3.5" />Template</Button>
          <Button onClick={() => product.saveToHistory({ ...note, id: crypto.randomUUID(), title: `${note.title} copy`, preview: draft, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() })} size="sm" variant="ghost"><CopyPlus className="size-3.5" />Duplicate</Button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-xs font-medium hover:bg-[var(--muted)]">Attach<input accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" multiple onChange={(event) => { void addAttachments(event.target.files); event.target.value = ""; }} type="file" /></label>
          <Button onClick={() => { product.deleteHistory(note.id); onDeleted?.(); }} size="sm" variant="ghost"><Trash2 className="size-3.5" />Delete</Button>
        </div>
      </section>

      <aside className="space-y-3">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold">Update with AI</h3>
          <p className="mt-1 text-[11px] leading-4 text-[var(--muted-foreground)]">Add only the new information. Existing sections are preserved unless affected.</p>
          <textarea className="mt-3 min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-xs leading-5 outline-none focus:border-[var(--primary)]" onChange={(event) => { setNewInformation(event.target.value); scheduleSave({ pendingInformation: event.target.value }); }} placeholder="Type or dictate additional information…" value={newInformation} />
          <div className="mt-2 flex gap-2">
            <Button disabled={speech.isTranscribing} onClick={() => {
              if (speech.isListening) void speech.stopListening();
              else { voiceBaseRef.current = newInformation.trim(); setVoiceStarted(true); void speech.startListening(voiceStarted); }
            }} size="sm" variant={speech.isListening ? "default" : "outline"}><Mic className="size-3.5" />{speech.isTranscribing ? "Transcribing…" : speech.isListening ? "Stop" : voiceStarted ? "Continue" : "Voice"}</Button>
            {voiceStarted && <Button onClick={() => { speech.cancel(); setNewInformation(voiceBaseRef.current); setVoiceStarted(false); }} size="sm" variant="ghost">Cancel</Button>}
          </div>
          {(error || speech.error) && <StatusMessage className="mt-2" title="Unable to update note" variant="error">{error || speech.error}</StatusMessage>}
          <Button className="mt-3 w-full" disabled={!newInformation.trim() || isUpdating || speech.isListening || speech.isTranscribing} onClick={updateWithAI}><Sparkles className="size-4" />{isUpdating ? "Updating…" : "Update with AI"}</Button>
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold">Version History</h3>
          <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">{note.versions?.length ? note.versions.map((item) => <button className="w-full rounded-lg border border-[var(--border)] p-2 text-left text-[10px] hover:bg-[var(--muted)]" key={item.id} onClick={() => setSelectedVersion(item.id)}><span className="font-medium capitalize">{item.source}</span><span className="ml-2 text-[var(--muted-foreground)]">{new Date(item.savedAt).toLocaleString()}</span></button>) : <p className="text-[11px] text-[var(--muted-foreground)]">Previous versions will appear after edits.</p>}</div>
          {version && <div className="mt-3 rounded-xl bg-[var(--muted)] p-3"><p className="text-[10px] font-semibold">Previous version</p><p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] leading-4 text-[var(--muted-foreground)]">{version.preview}</p><div className="mt-2 flex gap-2"><Button onClick={() => restoreVersion(version.id)} size="sm">Restore</Button><Button onClick={() => setSelectedVersion(null)} size="sm" variant="ghost">Close comparison</Button></div></div>}
        </section>
      </aside>
    </div>
  );
}

function fileToStoredAttachment(file: File): Promise<StoredAttachment> {
  if (file.size > 2_000_000) return Promise.reject(new Error(`${file.name} exceeds the 2 MB local-storage limit.`));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  });
}
