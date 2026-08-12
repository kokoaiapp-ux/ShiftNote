"use client";

import { LoaderCircle, Mic, Pause, Play, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusMessage } from "@/components/ui/status-message";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import { cn } from "@/lib/utils";

const MAX_RECORDING_SECONDS = 150;
type RecordingPhase = "idle" | "recording" | "paused" | "transcribing";

export function UpdateVoiceRecorder({ disabled = false, onBusyChange, onSend }: { disabled?: boolean; onBusyChange?: (busy: boolean) => void; onSend: (transcript: string) => Promise<void> }) {
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>("idle");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const recordingOffsetRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const ignoreTranscript = useCallback(() => {}, []);
  const speech = useAudioTranscription({ onTranscript: ignoreTranscript });
  const stopListening = speech.stopListening;

  useEffect(() => {
    onBusyChange?.(recordingPhase !== "idle");
  }, [onBusyChange, recordingPhase]);

  useEffect(() => {
    if (recordingPhase !== "recording") return;
    const startedAt = Date.now();
    const baseSeconds = recordingOffsetRef.current;
    const timer = window.setInterval(() => {
      const next = baseSeconds + Math.floor((Date.now() - startedAt) / 1000);
      setRecordingSeconds(Math.min(next, MAX_RECORDING_SECONDS));
      if (next >= MAX_RECORDING_SECONDS) {
        window.clearInterval(timer);
        void stopListening("maximum-duration", false).then(() => setRecordingPhase("paused"));
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recordingPhase, stopListening]);

  async function startRecording() {
    setSendError(null);
    setRecordingSeconds(0);
    recordingOffsetRef.current = 0;
    setRecordingPhase(await speech.startListening(false) ? "recording" : "idle");
  }

  async function stopRecording() {
    await speech.stopListening("user-stop", false);
    setRecordingPhase("paused");
  }

  async function continueRecording() {
    recordingOffsetRef.current = recordingSeconds;
    setRecordingPhase(await speech.startListening(true) ? "recording" : "paused");
  }

  async function togglePreview() {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setIsPreviewPlaying(true);
    } else {
      audio.pause();
      setIsPreviewPlaying(false);
    }
  }

  function cancelRecording() {
    previewAudioRef.current?.pause();
    setIsPreviewPlaying(false);
    setRecordingPhase("idle");
    setRecordingSeconds(0);
    recordingOffsetRef.current = 0;
    setSendError(null);
    speech.cancel();
  }

  async function sendRecording() {
    previewAudioRef.current?.pause();
    setIsPreviewPlaying(false);
    setSendError(null);
    setRecordingPhase("transcribing");
    try {
      const transcript = await speech.transcribeRecording();
      if (!transcript) return;
      await onSend(transcript);
      setRecordingSeconds(0);
      recordingOffsetRef.current = 0;
    } catch (caught) {
      setSendError(caught instanceof Error ? caught.message : "Unable to update the documentation.");
    } finally {
      setRecordingPhase("idle");
    }
  }

  return <>
    {speech.isSupported && speech.inputDevices.length > 0 && recordingPhase === "idle" && (
      <label className="mt-2 hidden items-center gap-2 text-[10px] text-[var(--muted-foreground)] sm:flex">
        <span className="shrink-0">Microphone</span>
        <select aria-label="Recording microphone" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]" disabled={disabled} onChange={(event) => speech.setSelectedDeviceId(event.target.value)} value={speech.selectedDeviceId}>
          <option value="">Windows default microphone</option>
          {speech.inputDevices.filter((device) => device.deviceId && device.deviceId !== "default").map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
        </select>
      </label>
    )}
    {recordingPhase === "paused" && speech.diagnostics && speech.diagnostics.peakLevel < 0.008 && <StatusMessage className="mt-2" title="No microphone signal detected" variant="warning">The recording file is valid, but the selected microphone produced silence. Choose a different microphone above, then record again.</StatusMessage>}
    {speech.debugRecordingUrl && <audio onEnded={() => setIsPreviewPlaying(false)} ref={previewAudioRef} src={speech.debugRecordingUrl} />}
    {recordingPhase !== "idle" && <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--primary)]/40 bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] px-3.5 py-3 text-xs text-[var(--foreground)] shadow-sm">
      <span className={cn("size-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary)]/15", recordingPhase === "recording" && "animate-pulse")} />
      <div className="min-w-0"><p className="font-semibold">{recordingPhase === "recording" ? "Recording…" : recordingPhase === "transcribing" ? "Transcribing audio…" : "Recording stopped"}</p><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{recordingPhase === "recording" ? "Audio is recorded locally until you stop" : recordingPhase === "transcribing" ? "Uploading securely to OpenAI" : "Preview or send when ready"}</p></div>
      <span className="rounded-lg border border-[var(--primary)]/25 bg-[var(--card)] px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums text-[var(--primary)]">{Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
      <span className="flex-1" />
      {recordingPhase === "recording" && <><button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button><button className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 font-semibold text-white shadow-sm hover:brightness-95" onClick={() => void stopRecording()} type="button"><Square className="size-3 fill-current" /> Stop</button></>}
      {recordingPhase === "paused" && <><button className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={() => void togglePreview()} type="button">{isPreviewPlaying ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}{isPreviewPlaying ? "Pause" : "Preview"}</button>{recordingSeconds < MAX_RECORDING_SECONDS && <button className="rounded-lg bg-[var(--primary)] px-3 py-2 font-semibold text-white shadow-sm hover:brightness-95" onClick={() => void continueRecording()} type="button">Continue</button>}<button aria-label="Send voice recording" className="grid size-10 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm hover:brightness-95 disabled:opacity-60" disabled={disabled} onClick={() => void sendRecording()} type="button"><Send className="size-4" /></button><button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button></>}
      {recordingPhase === "transcribing" && <><LoaderCircle className="size-4 animate-spin text-[var(--primary)]" /><button className="rounded-lg border border-[var(--primary)]/30 bg-[var(--card)] px-3 py-2 font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]" onClick={cancelRecording} type="button">Cancel</button></>}
    </div>}
    {recordingPhase === "idle" && (speech.isSupported ? <button className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-medium hover:bg-[var(--muted)] disabled:opacity-60" disabled={disabled} onClick={() => void startRecording()} type="button"><Mic className="size-3.5" />Voice</button> : <StatusMessage className="mt-2" title="Voice input unavailable" variant="warning">{speech.supportMessage}</StatusMessage>)}
    {(sendError || speech.error) && <StatusMessage className="mt-2" title="Unable to use voice input" variant="error">{sendError || speech.error}</StatusMessage>}
  </>;
}
