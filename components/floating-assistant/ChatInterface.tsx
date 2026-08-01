"use client";

import type { UIMessage } from "ai";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FilePlus2, LoaderCircle, Mic, Paperclip, Pencil, Plus, RefreshCw, Save, Send, Square, Star, X } from "lucide-react";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { useProduct, type SavedNote } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { CUSTOM_TEMPLATE_ID, getTemplatesForMode } from "@/lib/product-data";
import { cn } from "@/lib/utils";

type Props = {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  onSend: (text: string, files?: FileList) => void;
  onClose?: () => void;
  floating: boolean;
};

const MAX_RECORDING_SECONDS = 300;
type RecordingPhase = "idle" | "recording" | "paused" | "transcribing";

export function messageText(message?: UIMessage) {
  if (!message) return "";
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatInterface({ messages, status, error, onSend, onClose, floating }: Props) {
  const product = useProduct();
  const [input, setInput] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>("idle");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechBaseRef = useRef("");
  const recordingOriginRef = useRef("");
  const recordingOffsetRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const latestText = messageText(latestAssistant);
  const isGenerating = status === "submitted" || status === "streaming";
  const hasValidInput = input.trim().length > 0 || attachments.length > 0;
  const canSend = !isGenerating && hasValidInput;

  const handleTranscript = useCallback((text: string) => {
    setInput([speechBaseRef.current, text].filter(Boolean).join(" "));
  }, []);
  const handleSpeechEnd = useCallback((text: string) => {
    if (text) {
      setInput([speechBaseRef.current, text].filter(Boolean).join(" "));
    }
    setRecordingPhase(text ? "paused" : "idle");
  }, []);
  const speech = useAudioTranscription({ onTranscript: handleTranscript, onEnd: handleSpeechEnd });
  const stopSpeechListening = speech.stopListening;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!input) return;
    console.info("Input state updated:", input);
  }, [input]);

  useEffect(() => {
    if (!canSend) return;
    console.info("Send button enabled:", true);
  }, [canSend]);

  useEffect(() => {
    if (recordingPhase !== "recording") return;
    const startedAt = Date.now();
    const baseSeconds = recordingOffsetRef.current;
    const timer = window.setInterval(() => {
      const next = baseSeconds + Math.floor((Date.now() - startedAt) / 1000);
      setRecordingSeconds(Math.min(next, MAX_RECORDING_SECONDS));
      if (next >= MAX_RECORDING_SECONDS) {
        window.clearInterval(timer);
        setRecordingPhase("transcribing");
        void stopSpeechListening("maximum-duration");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recordingPhase, stopSpeechListening]);

  function showSuccess(action: string) {
    setActionSuccess(action);
    window.setTimeout(() => setActionSuccess((current) => current === action ? null : current), 2000);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!canSend) return;
    const transfer = new DataTransfer();
    attachments.forEach((file) => transfer.items.add(file));
    onSend(value, transfer.files.length ? transfer.files : undefined);
    console.info("Message successfully sent:", value);
    setInput("");
    setAttachments([]);
    setRecordingPhase("idle");
    setRecordingSeconds(0);
    recordingOffsetRef.current = 0;
  }

  function makeNote(): SavedNote {
    return {
      id: crypto.randomUUID(),
      title: product.template.name,
      favoriteName: product.template.name,
      preview: latestText,
      modeId: product.mode.id,
      templateId: product.template.id,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  function addToFavorites() {
    const note = makeNote();
    const favoriteName = window.prompt("Favorite name", note.favoriteName)?.trim();
    if (!favoriteName) return;
    product.addFavorite({ ...note, favoriteName });
    showSuccess("favorite");
  }

  async function copyNote() {
    await navigator.clipboard.writeText(latestText);
    showSuccess("copy");
  }

  async function startRecording() {
    recordingOriginRef.current = input.trim();
    speechBaseRef.current = input.trim();
    setRecordingSeconds(0);
    recordingOffsetRef.current = 0;
    setRecordingPhase(await speech.startListening(false) ? "recording" : "idle");
  }

  async function stopRecording() {
    setRecordingPhase("transcribing");
    await speech.stopListening("user-stop");
  }

  async function continueRecording() {
    recordingOffsetRef.current = recordingSeconds;
    setRecordingPhase(await speech.startListening(true) ? "recording" : "paused");
  }

  function cancelRecording() {
    setRecordingPhase("idle");
    setRecordingSeconds(0);
    recordingOffsetRef.current = 0;
    speech.cancel();
    setInput(recordingOriginRef.current);
  }

  function saveCustomTemplate() {
    if (!customName.trim()) return;
    product.saveCustomTemplate({
      name: customName.trim(),
      description: customDescription.trim() || "Custom documentation template",
      content: latestText,
      modeId: product.mode.id,
    });
    setTemplateDialogOpen(false);
    setCustomName("");
    setCustomDescription("");
    showSuccess("template");
  }

  function selectTemplate(templateId: string) {
    product.setTemplate(templateId);
    product.clearChat();
    setTemplatePickerOpen(false);
  }

  return (
    <section
      aria-label="ShiftNote AI Clinical Copilot"
      className={floating
        ? "relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
        : "relative flex h-[min(700px,calc(100vh-100px))] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-[0_28px_80px_rgba(0,0,0,0.22)]"}
    >
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-xl bg-[var(--primary)] font-semibold text-white">
              S<span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--card)] bg-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">ShiftNote AI Clinical Copilot</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{product.mode.name} Mode</p>
            </div>
          </div>
          {onClose && <button aria-label="Close assistant" className="grid size-9 place-items-center rounded-full hover:bg-[var(--muted)]" onClick={onClose}><X className="size-4" /></button>}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--muted)] px-3 py-2 text-[11px]">
          <span className="text-[var(--muted-foreground)]">Current template</span>
          <span className="truncate font-semibold">{product.template.name}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-2xl text-[var(--primary)]">✦</span>
            <h3 className="mt-4 text-center text-lg font-semibold tracking-tight">Start your {product.template.name}</h3>
            <p className="mx-auto mt-2 max-w-[290px] text-center text-xs leading-5 text-[var(--muted-foreground)]">
              Type or dictate the clinical information you want documented.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const text = messageText(message);
              if (!text) return null;
              return (
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                  <div className={message.role === "user"
                    ? "max-w-[87%] rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-3 text-sm leading-6 text-white"
                    : "max-w-[94%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6"}>
                    {text}
                  </div>
                </div>
              );
            })}
            {(status === "submitted" || (status === "streaming" && !messageText(messages.at(-1)))) && (
              <div className="flex w-fit gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4">
                {[0, 1, 2].map((dot) => <span className="size-1.5 animate-pulse rounded-full bg-[var(--primary)]" key={dot} style={{ animationDelay: `${dot * 120}ms` }} />)}
              </div>
            )}
            {latestText && status === "ready" && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Note actions</p>
                <div className="flex flex-wrap gap-1">
                  <ActionButton active={actionSuccess === "copy"} icon={Copy} label="Copy" successLabel="Copied" onClick={copyNote} />
                  <ActionButton active={actionSuccess === "save"} icon={Save} label="Save" successLabel="Saved" onClick={() => { product.saveToHistory(makeNote()); showSuccess("save"); }} />
                  <ActionButton active={actionSuccess === "favorite"} icon={Star} label="Favorite" successLabel="Added to Favorites" onClick={addToFavorites} />
                  <ActionButton active={actionSuccess === "template"} icon={FilePlus2} label="Template" successLabel="Saved as Template" onClick={() => { setCustomName(product.template.name); setTemplateDialogOpen(true); }} />
                  <ActionButton active={actionSuccess === "edit"} icon={Pencil} label="Edit" successLabel="Changes Saved" onClick={() => { setInput(`Revise this ${product.template.name}: `); showSuccess("edit"); }} />
                  <ActionButton active={actionSuccess === "regenerate"} icon={RefreshCw} label="Regenerate" successLabel="Regenerating" onClick={() => { product.regenerate(); showSuccess("regenerate"); }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--card)] p-4">
        {(speech.error || error) && <StatusMessage className="mb-2" title="Unable to use voice input" variant="error">{speech.error ?? error?.message}</StatusMessage>}
        {!speech.isSupported && !speech.error && <StatusMessage className="mb-2" title="Voice input unavailable" variant="warning">{speech.supportMessage}</StatusMessage>}
        {speech.debugRecordingUrl && speech.diagnostics && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-[10px] text-[var(--foreground)]">
            <span>{(speech.diagnostics.bytes / 1024).toFixed(1)} KB · {(speech.diagnostics.durationMs / 1000).toFixed(1)} sec · {speech.diagnostics.mimeType}</span>
            <a className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" download={`debug_recording.${speech.diagnostics.extension}`} href={speech.debugRecordingUrl}><Download className="size-3" />Download Recording</a>
          </div>
        )}
        {recordingPhase !== "idle" && (
          <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--primary)]/40 bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] px-3.5 py-3 text-xs text-[var(--foreground)] shadow-sm">
            <span className={cn("size-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary)]/15", recordingPhase === "recording" && "animate-pulse")} />
            <div className="min-w-0">
              <p className="font-semibold">{recordingPhase === "recording" ? "Recording…" : recordingPhase === "transcribing" ? "Transcribing audio…" : "Recording stopped"}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{recordingPhase === "recording" ? "Audio is recorded locally until you stop" : recordingPhase === "transcribing" ? "Uploading securely to OpenAI" : "Edit the transcript or send when ready"}</p>
            </div>
            <span className="rounded-lg border border-[var(--primary)]/25 bg-[var(--card)] px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--primary)]">{Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
            <span className="flex-1" />
            {recordingPhase === "recording" && <>
              <button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 font-semibold text-white shadow-sm hover:brightness-95" onClick={stopRecording} type="button"><Square className="size-3 fill-current" /> Stop</button>
            </>}
            {recordingPhase === "paused" && <>
              <button className="rounded-lg bg-[var(--primary)] px-3 py-2 font-semibold text-white shadow-sm hover:brightness-95" onClick={continueRecording} type="button">Continue</button>
              <button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button>
            </>}
            {recordingPhase === "transcribing" && <><LoaderCircle className="size-4 animate-spin text-[var(--primary)]" /><button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button></>}
          </div>
        )}
        {attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{attachments.map((file, index) => <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[var(--primary-soft)] px-2.5 py-1.5 text-[10px] text-[var(--primary)]" key={`${file.name}-${index}`}><span className="truncate">{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={() => setAttachments((files) => files.filter((_, itemIndex) => itemIndex !== index))} type="button"><X className="size-3" /></button></span>)}</div>}
        <form className="flex items-end gap-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 focus-within:border-[var(--primary)]" onSubmit={submit}>
          <input accept=".pdf,.doc,.docx,.txt,image/*" className="hidden" multiple onChange={(event) => { const next = Array.from(event.target.files ?? []); setAttachments((current) => [...current, ...next]); event.target.value = ""; }} ref={fileInputRef} type="file" />
          <button aria-label="Attach files" className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-[0.6]" disabled={recordingPhase === "recording"} onClick={() => fileInputRef.current?.click()} type="button"><Paperclip className="size-[18px]" /></button>
          <button aria-label="Select template" className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] disabled:opacity-[0.6]" disabled={recordingPhase === "recording"} onClick={() => setTemplatePickerOpen(true)} type="button"><Plus className="size-[18px]" /></button>
          <input aria-label="Message ShiftNote" autoComplete="off" className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-[var(--muted-foreground)]" onChange={(event) => setInput(event.target.value)} placeholder={recordingPhase === "recording" ? "Recording…" : recordingPhase === "transcribing" ? "Transcribing…" : "Describe the clinical facts…"} value={input} />
          {recordingPhase === "idle" && (speech.isSupported ? <button aria-label="Start voice input" className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" onClick={startRecording} type="button"><Mic className="size-[18px]" /></button> : <span className="grid size-10 place-items-center text-[var(--muted-foreground)]" title="Voice input is not supported in this browser"><Mic className="size-[18px] opacity-60" /></span>)}
          <button aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-[0.65]" disabled={!canSend} type="submit"><Send className="size-4" /></button>
        </form>
        <p className="mt-2 text-center text-[10px] text-[var(--muted-foreground)]">Review and attest every AI-generated note before clinical use.</p>
      </div>
      {templateDialogOpen && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Save as Template</h3><button aria-label="Close" onClick={() => setTemplateDialogOpen(false)}><X className="size-4" /></button></div>
            <label className="mt-4 block text-xs text-[var(--muted-foreground)]">Template Name<input className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" onChange={(event) => setCustomName(event.target.value)} value={customName} /></label>
            <label className="mt-3 block text-xs text-[var(--muted-foreground)]">Description<textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]" onChange={(event) => setCustomDescription(event.target.value)} value={customDescription} /></label>
            <Button className="mt-4 w-full" disabled={!customName.trim()} onClick={saveCustomTemplate}>Save</Button>
          </div>
        </div>
      )}
      {templatePickerOpen && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="max-h-[80%] w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] text-[var(--muted-foreground)]">Current Mode</p><h3 className="text-sm font-semibold">{product.mode.name}</h3></div>
              <button aria-label="Close template picker" onClick={() => setTemplatePickerOpen(false)} type="button"><X className="size-4" /></button>
            </div>
            <div className="mt-4 space-y-1.5">
              {getTemplatesForMode(product.mode.id).map((template) => (
                <button className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs ${product.template.id === template.id ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`} key={template.id} onClick={() => selectTemplate(template.id)} type="button">
                  <span className="font-medium">{template.name}</span>
                  {product.template.id === template.id && <Check className="size-4" />}
                </button>
              ))}
              <button className={`flex w-full items-center justify-between rounded-xl border border-dashed p-3 text-left text-xs ${product.template.id === CUSTOM_TEMPLATE_ID ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`} onClick={() => selectTemplate(CUSTOM_TEMPLATE_ID)} type="button">
                <span className="font-medium">Custom Template</span><Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ActionButton({ active, icon: Icon, label, successLabel, onClick }: { active: boolean; icon: typeof Copy; label: string; successLabel: string; onClick: () => void | Promise<void> }) {
  return <Button className={active ? "text-[var(--primary)]" : ""} onClick={onClick} size="sm" variant="ghost">{active ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}{active ? successLabel : label}</Button>;
}
