"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onTranscript: (text: string) => void;
  onEnd?: (text: string) => void;
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
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        formData.append("audio", segment, `recording-${index + 1}.webm`);
      });
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as { error?: string; text?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Audio transcription failed. Please try again.");

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
    if (!append) completedSegmentsRef.current = [];
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
      const mimeType = SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 128_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) currentChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("The browser could not record audio. Close other apps using the microphone and try again.");
        setIsListening(false);
        releaseStream();
      };
      recorder.start(1000);
      setIsListening(true);
      console.info("MediaRecorder started:", {
        mimeType: recorder.mimeType || "browser default",
        microphone: stream.getAudioTracks()[0]?.getSettings(),
      });
      return true;
    } catch (caught) {
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
  }, [isSupported, releaseStream, supportMessage]);

  const stopListening = useCallback(async (_reason = "user-stop") => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    console.info("MediaRecorder stop reason:", _reason);
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => {
        const type = recorder.mimeType || "audio/webm";
        const segment = new Blob(currentChunksRef.current, { type });
        console.info("MediaRecorder audio captured:", { bytes: segment.size, type });
        if (segment.size > 0) completedSegmentsRef.current.push(segment);
        currentChunksRef.current = [];
        recorderRef.current = null;
        releaseStream();
        resolve();
      }, { once: true });
      recorder.stop();
      setIsListening(false);
    });
    if (!cancelledRef.current) await transcribe();
  }, [releaseStream, transcribe]);

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
    releaseStream();
  }, [releaseStream]);

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
  }, [releaseStream]);

  return {
    cancel,
    error,
    isListening,
    isSupported,
    isTranscribing,
    startListening,
    stopListening,
    supportMessage,
    toggleListening,
  };
}
