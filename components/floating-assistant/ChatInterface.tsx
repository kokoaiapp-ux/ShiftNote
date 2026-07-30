"use client";

import type { UIMessage } from "ai";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, FilePlus2, Mic, Paperclip, Pencil, RefreshCw, Save, Send, Star, X } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useProduct, type SavedNote } from "@/components/product/ProductProvider";
import { Button } from "@/components/ui/button";

type Props = {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  onSend: (text: string) => void;
  onClose?: () => void;
  floating: boolean;
};

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
  const [speechDraft, setSpeechDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const latestText = messageText(latestAssistant);

  const handleTranscript = useCallback((text: string) => {
    setSpeechDraft(text);
    setInput(text);
  }, []);
  const speech = useSpeechRecognition({ onTranscript: handleTranscript });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value || status === "submitted" || status === "streaming") return;
    onSend(value);
    setInput("");
    setSpeechDraft("");
  }

  function makeNote(): SavedNote {
    return {
      id: crypto.randomUUID(),
      title: product.template.name,
      preview: latestText,
      modeId: product.mode.id,
      templateId: product.template.id,
      createdAt: new Date().toISOString(),
    };
  }

  async function copyNote() {
    await navigator.clipboard.writeText(latestText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function exportDoc() {
    const blob = new Blob([`<html><body><h1>${product.template.name}</h1><p>${latestText.replaceAll("\n", "<br>")}</p></body></html>`], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${product.template.id}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-label="ShiftNote AI Clinical Copilot"
      className={floating
        ? "flex h-full min-h-[500px] flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
        : "flex h-[min(700px,calc(100vh-100px))] w-[min(410px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-[0_28px_80px_rgba(8,35,28,0.24)]"}
    >
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-xl bg-[var(--primary)] font-semibold text-white">
              S<span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--card)] bg-emerald-400" />
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
              Choose a professionally structured starting point, then answer a few focused questions.
            </p>
            <div className="mt-5 grid gap-2">
              {product.template.examples.slice(0, 3).map((example) => (
                <button className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-xs font-medium transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)]" key={example.id} onClick={() => onSend(example.starter)}>
                  {example.title}
                </button>
              ))}
            </div>
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
                  <Button onClick={copyNote} size="sm" variant="ghost"><Copy className="size-3.5" />{copied ? "Copied" : "Copy"}</Button>
                  <Button onClick={() => product.saveToHistory(makeNote())} size="sm" variant="ghost"><Save className="size-3.5" />Save</Button>
                  <Button onClick={() => product.addFavorite(makeNote())} size="sm" variant="ghost"><Star className="size-3.5" />Favorite</Button>
                  <Button onClick={() => product.saveCustomTemplate(makeNote())} size="sm" variant="ghost"><FilePlus2 className="size-3.5" />Template</Button>
                  <Button onClick={() => setInput(`Revise this ${product.template.name}: `)} size="sm" variant="ghost"><Pencil className="size-3.5" />Edit</Button>
                  <Button onClick={product.regenerate} size="sm" variant="ghost"><RefreshCw className="size-3.5" />Regenerate</Button>
                  <Button onClick={() => window.print()} size="sm" variant="ghost"><Download className="size-3.5" />PDF</Button>
                  <Button onClick={exportDoc} size="sm" variant="ghost"><Download className="size-3.5" />DOCX</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--card)] p-4">
        {(speech.error || error) && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-300">{speech.error ?? error?.message}</p>}
        <form className="flex items-end gap-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 focus-within:border-[var(--primary)]" onSubmit={submit}>
          <button aria-label="Attach file (coming soon)" className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)]" title="Attachments coming soon" type="button"><Paperclip className="size-[18px]" /></button>
          <input aria-label="Message ShiftNote" autoComplete="off" className="min-h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-[var(--muted-foreground)]" onChange={(event) => setInput(event.target.value)} placeholder={speech.isListening ? "Listening…" : "Describe the clinical facts…"} value={speechDraft && speech.isListening ? speechDraft : input} />
          {speech.isSupported && <button aria-label={speech.isListening ? "Stop voice input" : "Start voice input"} aria-pressed={speech.isListening} className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${speech.isListening ? "animate-pulse bg-red-100 text-red-600" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`} onClick={speech.toggleListening} type="button"><Mic className="size-[18px]" /></button>}
          <button aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40" disabled={!input.trim() || status === "submitted" || status === "streaming"} type="submit"><Send className="size-4" /></button>
        </form>
        <p className="mt-2 text-center text-[10px] text-[var(--muted-foreground)]">Review and attest every AI-generated note before clinical use.</p>
      </div>
    </section>
  );
}
