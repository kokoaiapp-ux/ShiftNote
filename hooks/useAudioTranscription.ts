"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onTranscript: (text: string) => void;
  onEnd?: (text: string) => void;
};

export type RecordingDiagnostics = {
  bytes: number;
  chunks: number;
  durationMs: number;
  extension: string;
  mimeType: string;
  peakLevel: number;
};

const TRANSCRIPTION_TIMEOUT_MS = 45_000;
const SUPPORTED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
];

export function useAudioTranscription({ onTranscript, onEnd }: Options) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const completedSegmentsRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onEndRef = useRef(onEnd);
  const cancelledRef = useRef(false);
  const startedAtRef = useRef(0);
  const peakLevelRef = useRef(0);
  const meterFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugRecordingUrl, setDebugRecordingUrl] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<RecordingDiagnostics | null>(null);
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
  );
  const supportMessage = typeof window !== "undefined" && !window.isSecureContext
    ? "Voice recording requires HTTPS or localhost. Open ShiftNote over a secure connection and try again."
    : "Voice recording is not supported by this browser. Use the latest Microsoft Edge or Google Chrome.";

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onEndRef.current = onEnd;
  }, [onEnd, onTranscript]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const releaseMeter = useCallback(() => {
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const replaceDebugRecording = useCallback((blob: Blob) => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    const url = URL.createObjectURL(blob);
    recordingUrlRef.current = url;
    setDebugRecordingUrl(url);
  }, []);

  const transcribe = useCallback(async () => {
    const segments = completedSegmentsRef.current;
    if (!segments.length || segments.every((segment) => segment.size === 0)) {
      setError("No audio was recorded. Speak after recording starts, then tap Stop.");
      onEndRef.current?.("");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), TRANSCRIPTION_TIMEOUT_MS);
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      segments.forEach((segment, index) => {
        const extension = extensionForMimeType(segment.type);
        const file = new File([segment], `recording-${index + 1}.${extension}`, {
          type: segment.type || mimeTypeForExtension(extension),
          lastModified: Date.now(),
        });
        console.info("Audio upload file created:", { bytes: file.size, extension, mimeType: file.type, name: file.name });
        formData.append("audio", file);
      });
      console.info("OpenAI transcription upload started:", { files: segments.length, totalBytes: segments.reduce((sum, item) => sum + item.size, 0) });
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as { error?: string; text?: string } | null;
      console.info("OpenAI transcription upload completed:", { status: response.status, ok: response.ok, transcriptCharacters: payload?.text?.length ?? 0 });
      if (!response.ok) {
        const silentSignal = response.status === 422 && peakLevelRef.current < 0.008;
        throw new Error(silentSignal
          ? "Audio was recorded, but the selected microphone produced a silent signal. Download the recording to confirm it, then select the correct Windows input device."
          : payload?.error ?? "Audio transcription failed. Please try again.");
      }

      const transcript = payload?.text?.trim() ?? "";
      if (!transcript) throw new Error("OpenAI did not detect any speech in the recording. Try again and speak clearly after recording starts.");
      console.info("Transcript received:", transcript);
      onTranscriptRef.current(transcript);
      onEndRef.current?.(transcript);
    } catch (caught) {
      if (cancelledRef.current) return;
      const timedOut = controller.signal.aborted && controller.signal.reason === "timeout";
      setError(timedOut
        ? "Transcription timed out. Check your connection and try a shorter recording."
        : caught instanceof Error ? caught.message : "Unable to transcribe the recording. Please try again.");
      onEndRef.current?.("");
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
      setIsTranscribing(false);
    }
  }, []);

  const startListening = useCallback(async (append = false) => {
    if (!isSupported) {
      setError(supportMessage);
      return false;
    }
    if (recorderRef.current?.state === "recording") return true;

    cancelledRef.current = false;
    setError(null);
    if (!append) {
      completedSegmentsRef.current = [];
      setDiagnostics(null);
      peakLevelRef.current = 0;
    }
    currentChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const permission = await navigator.permissions?.query({ name: "microphone" as PermissionName }).catch(() => null);
      const track = stream.getAudioTracks()[0];
      console.info("Microphone permission status:", permission?.state ?? "granted by active stream");
      console.info("Selected input device:", { label: track?.label || "Browser default microphone", settings: track?.getSettings() });
      track?.addEventListener("mute", () => console.warn("Microphone track muted"));
      track?.addEventListener("unmute", () => console.info("Microphone track unmuted"));
      track?.addEventListener("ended", () => console.warn("Microphone track ended"));

      const AudioContextClass = window.AudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        audioContextRef.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const measure = () => {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const sample of samples) {
            const normalized = (sample - 128) / 128;
            sum += normalized * normalized;
          }
          peakLevelRef.current = Math.max(peakLevelRef.current, Math.sqrt(sum / samples.length));
          meterFrameRef.current = requestAnimationFrame(measure);
        };
        measure();
      }
      const mimeType = SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 128_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        console.info("MediaRecorder chunk received:", { bytes: event.data.size, index: currentChunksRef.current.length, type: event.data.type });
        if (event.data.size > 0) currentChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("The browser could not record audio. Close other apps using the microphone and try again.");
        setIsListening(false);
        releaseMeter();
        releaseStream();
      };
      recorder.start(1000);
      startedAtRef.current = performance.now();
      setIsListening(true);
      console.info("MediaRecorder started:", {
        mimeType: recorder.mimeType || "browser default",
        microphone: stream.getAudioTracks()[0]?.getSettings(),
      });
      return true;
    } catch (caught) {
      releaseMeter();
      releaseStream();
      const name = caught instanceof DOMException ? caught.name : "";
      setError(name === "NotAllowedError"
        ? "Microphone access was denied. Allow microphone access for ShiftNote in browser settings, then try again."
        : name === "NotFoundError"
          ? "No microphone was found. Connect or enable a microphone, then try again."
          : name === "NotReadableError"
            ? "The microphone is busy or unavailable. Close other apps using it, then try again."
            : "Unable to start audio recording. Check the microphone and try again.");
      return false;
    }
  }, [isSupported, releaseMeter, releaseStream, supportMessage]);

  const stopListening = useCallback(async (_reason = "user-stop", transcribeAfterStop = true) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    console.info("MediaRecorder stop requested:", _reason);
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => {
        const durationMs = Math.max(0, Math.round(performance.now() - startedAtRef.current));
        const type = recorder.mimeType || "audio/webm";
        const segment = new Blob(currentChunksRef.current, { type });
        const nextDiagnostics = {
          bytes: segment.size,
          chunks: currentChunksRef.current.length,
          durationMs,
          extension: extensionForMimeType(type),
          mimeType: type,
          peakLevel: peakLevelRef.current,
        };
        console.info("MediaRecorder stopped and finalized:", nextDiagnostics);
        setDiagnostics(nextDiagnostics);
        replaceDebugRecording(segment);
        if (segment.size > 0) completedSegmentsRef.current.push(segment);
        currentChunksRef.current = [];
        recorderRef.current = null;
        releaseMeter();
        releaseStream();
        resolve();
      }, { once: true });
      recorder.requestData();
      recorder.stop();
      setIsListening(false);
    });
    if (!cancelledRef.current && transcribeAfterStop) await transcribe();
  }, [releaseMeter, releaseStream, replaceDebugRecording, transcribe]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort("cancelled");
    abortRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    currentChunksRef.current = [];
    completedSegmentsRef.current = [];
    setIsListening(false);
    setIsTranscribing(false);
    setError(null);
    releaseMeter();
    releaseStream();
  }, [releaseMeter, releaseStream]);

  const toggleListening = useCallback(async () => {
    if (isListening) await stopListening();
    else await startListening(false);
  }, [isListening, startListening, stopListening]);

  useEffect(() => () => {
    cancelledRef.current = true;
    abortRef.current?.abort("unmounted");
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    releaseStream();
    releaseMeter();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
  }, [releaseMeter, releaseStream]);

  return {
    cancel,
    debugRecordingUrl,
    diagnostics,
    error,
    isListening,
    isSupported,
    isTranscribing,
    startListening,
    stopListening,
    supportMessage,
    transcribeRecording: transcribe,
    toggleListening,
  };
}

function extensionForMimeType(type: string) {
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  return "webm";
}

function mimeTypeForExtension(extension: string) {
  if (extension === "wav") return "audio/wav";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "m4a") return "audio/mp4";
  return "audio/webm";
}
