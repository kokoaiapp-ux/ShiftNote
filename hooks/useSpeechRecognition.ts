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
  const finalTranscriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onEndRef = useRef(onEnd);
  const eventSequenceRef = useRef<string[]>([]);
  const stopReasonRef = useRef("browser");
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
    onTranscriptRef.current = onTranscript;
    onEndRef.current = onEnd;
  }, [onEnd, onTranscript]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    console.info("SpeechRecognition initialized:", {
      constructor: window.SpeechRecognition ? "SpeechRecognition" : "webkitSpeechRecognition",
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      lang: recognition.lang,
      maxAlternatives: recognition.maxAlternatives,
    });

    const trace = (eventName: string) => {
      eventSequenceRef.current.push(eventName);
      console.info(`SpeechRecognition event: ${eventName}`);
    };

    recognition.onstart = () => {
      trace("onstart");
      console.info("SpeechRecognition started");
    };
    recognition.onaudiostart = () => trace("onaudiostart");
    recognition.onsoundstart = () => trace("onsoundstart");
    recognition.onspeechstart = () => trace("onspeechstart");
    recognition.onresult = (event) => {
      trace("onresult");
      console.info("onresult fired");
      const finalSegments: string[] = [];
      const interimSegments: string[] = [];
      const resultDetails: Array<{ index: number; isFinal: boolean; transcript: string }> = [];

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results.item?.(i) ?? event.results[i];
        const alternative = result?.item?.(0) ?? result?.[0];
        const segment = alternative?.transcript?.trim() ?? "";
        resultDetails.push({ index: i, isFinal: Boolean(result?.isFinal), transcript: segment });
        if (!segment) continue;
        if (result.isFinal) finalSegments.push(segment);
        else interimSegments.push(segment);
      }

      if (finalSegments.length) {
        finalTranscriptRef.current = [finalTranscriptRef.current, ...finalSegments].filter(Boolean).join(" ").trim();
      }
      const transcript = [finalTranscriptRef.current, ...interimSegments].filter(Boolean).join(" ").trim();
      console.info("SpeechRecognition result details:", {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length,
        results: resultDetails,
      });
      if (!transcript) {
        console.warn("SpeechRecognition onresult contained no transcript text.");
        return;
      }
      console.info("Transcript received:", transcript);
      transcriptRef.current = transcript;
      onTranscriptRef.current(transcript);
    };
    recognition.onnomatch = (event) => {
      trace("onnomatch");
      console.warn("SpeechRecognition onnomatch:", event);
    };
    recognition.onerror = (event) => {
      trace(`onerror:${event.error}`);
      console.error("SpeechRecognition onerror:", {
        error: event.error,
        message: event.message,
        sequence: [...eventSequenceRef.current],
      });
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
    recognition.onspeechend = () => trace("onspeechend");
    recognition.onsoundend = () => trace("onsoundend");
    recognition.onaudioend = () => trace("onaudioend");
    recognition.onend = () => {
      trace("onend");
      console.info("SpeechRecognition event sequence:", [...eventSequenceRef.current]);
      console.info("SpeechRecognition stop reason:", stopReasonRef.current);
      setIsListening(false);
      // Some browsers finish the final recognition result immediately before
      // `end`. Re-emit the last non-empty transcript so a stop event cannot
      // leave the controlled chat input stale.
      if (transcriptRef.current) {
        onTranscriptRef.current(transcriptRef.current);
      } else if (eventSequenceRef.current.includes("onresult")) {
        setError(`Microsoft Edge returned speech result events, but they contained no transcript text. This is not a microphone-permission failure. Event sequence: ${eventSequenceRef.current.join(" → ")}.`);
      } else {
        setError(`Speech recognition ended without returning a transcript. Confirm microphone access, speak after recording starts, and try again. Event sequence: ${eventSequenceRef.current.join(" → ") || "no events"}.`);
      }
      onEndRef.current?.(transcriptRef.current);
    };
    recognitionRef.current = recognition;
    return () => {
      console.info("SpeechRecognition instance cleanup");
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [language]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError(supportMessage);
      return false;
    }
    setError(null);
    transcriptRef.current = "";
    finalTranscriptRef.current = "";
    eventSequenceRef.current = [];
    stopReasonRef.current = "browser";
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

  const stopListening = useCallback((reason = "user-stop") => {
    const recognition = recognitionRef.current;
    if (recognition) {
      stopReasonRef.current = reason;
      console.info("SpeechRecognition stop requested:", reason);
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
