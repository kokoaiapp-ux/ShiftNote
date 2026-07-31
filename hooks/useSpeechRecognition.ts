"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onTranscript: (text: string) => void;
  onEnd?: (text: string) => void;
  language?: string;
};

export function useSpeechRecognition({ onTranscript, onEnd, language = "en-US" }: Options) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition),
  );
  const [error, setError] = useState<string | null>(null);
  const supportMessage = typeof window !== "undefined" && !window.isSecureContext
    ? "Voice input requires a secure connection (HTTPS) or localhost. Open ShiftNote over HTTPS, then allow microphone access."
    : "Voice input is not supported by this browser. Use the latest Chrome or Edge, then allow microphone access when prompted.";

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      const segments: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        segments.push(event.results[i][0].transcript);
      }
      const transcript = segments.join(" ").trim();
      if (!transcript) return;
      transcriptRef.current = transcript;
      onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        "not-allowed": "Microphone access was denied. Allow microphone permission for this site in your browser settings, then try again.",
        "service-not-allowed": "Browser speech recognition is blocked. Enable speech recognition and microphone access in your browser settings, then try again.",
        "audio-capture": "No working microphone was found. Connect or enable a microphone, then try again.",
        network: "Speech recognition could not reach the browser speech service. Check your internet connection, then try again.",
        "no-speech": "No speech was detected. Try again and speak after recording starts.",
      };
      setError(messages[event.error] ?? "Voice input stopped unexpectedly. Check microphone access and try again.");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      // Some browsers finish the final recognition result immediately before
      // `end`. Re-emit the last non-empty transcript so a stop event cannot
      // leave the controlled chat input stale.
      if (transcriptRef.current) onTranscript(transcriptRef.current);
      onEnd?.(transcriptRef.current);
    };
    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [language, onEnd, onTranscript]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError(supportMessage);
      return false;
    }
    setError(null);
    transcriptRef.current = "";
    try {
      recognition.start();
      setIsListening(true);
      return true;
    } catch {
      setError("Voice input could not start. Check microphone permission, then try again.");
      setIsListening(false);
      return false;
    }
  }, [supportMessage]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return { error, isListening, isSupported, startListening, stopListening, supportMessage, toggleListening };
}
