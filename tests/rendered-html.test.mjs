import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/copilot") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the clinical copilot with the compact template switcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /ShiftNote AI Clinical Copilot/);
  assert.match(html, /Current template/i);
  assert.match(html, /Type or dictate the clinical information you want documented/);
  assert.match(html, /aria-label="Message ShiftNote"/);
  assert.match(html, /aria-label="Send message"/);
  assert.match(html, /aria-label="Select template"/);
  assert.doesNotMatch(html, /Initial Documentation|Routine Follow-up|Change in Status/);
});

test("template switcher is mode-scoped and clears chat without navigation", async () => {
  const chat = await readFile(
    new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url),
    "utf8",
  );

  assert.match(chat, /getTemplatesForMode\(product\.mode\.id\)\.map/);
  assert.match(chat, /selectTemplate\(CUSTOM_TEMPLATE_ID\)/);
  assert.match(chat, /product\.setTemplate\(templateId\)/);
  assert.match(chat, /product\.clearChat\(\)/);
  assert.match(chat, /setTemplatePickerOpen\(false\)/);
  assert.doesNotMatch(chat, /selectTemplate[\s\S]*router\.(?:push|replace)/);
});

test("send validity reacts to controlled text and attachments", async () => {
  const chat = await readFile(
    new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url),
    "utf8",
  );

  assert.match(chat, /const hasValidInput = input\.trim\(\)\.length > 0 \|\| attachments\.length > 0/);
  assert.match(chat, /const canSend = recordingPhase !== "recording" && !isGenerating && hasValidInput/);
  assert.match(chat, /disabled=\{!canSend\}/);
  assert.match(chat, /if \(!canSend\) return/);
  assert.match(chat, /setInput\(\[speechBaseRef\.current, text\]\.filter\(Boolean\)\.join\(" "\)\)/);
  assert.match(chat, /console\.info\("Input state updated:", input\)/);
  assert.match(chat, /console\.info\("Send button enabled:", true\)/);
  assert.match(chat, /console\.info\("Message successfully sent:", value\)/);
  assert.doesNotMatch(chat, /onKey(?:Down|Up|Press).*canSend/s);
});

test("speech recognition inserts transcripts and explains recoverable failures", async () => {
  const speech = await readFile(
    new URL("../hooks/useSpeechRecognition.ts", import.meta.url),
    "utf8",
  );

  assert.match(speech, /recognition\.interimResults = true/);
  assert.match(speech, /recognition\.continuous = true/);
  assert.match(speech, /recognition\.lang = language/);
  assert.match(speech, /recognition\.maxAlternatives = 1/);
  assert.match(speech, /const transcript = segments\.join\(" "\)\.trim\(\)/);
  assert.match(speech, /transcriptRef\.current = transcript/);
  assert.match(speech, /if \(transcriptRef\.current\) onTranscriptRef\.current\(transcriptRef\.current\)/);
  assert.match(speech, /onEndRef\.current\?\.\(transcriptRef\.current\)/);
  assert.match(speech, /console\.info\("SpeechRecognition started"\)/);
  assert.match(speech, /console\.info\("onresult fired"\)/);
  assert.match(speech, /console\.info\("Transcript received:", transcript\)/);
  assert.match(speech, /ended without returning a transcript/);
  for (const eventName of [
    "onstart",
    "onaudiostart",
    "onsoundstart",
    "onspeechstart",
    "onresult",
    "onnomatch",
    "onerror",
    "onspeechend",
    "onsoundend",
    "onaudioend",
    "onend",
  ]) {
    assert.match(speech, new RegExp(eventName));
  }
  assert.match(speech, /SpeechRecognition event sequence:/);
  assert.match(speech, /SpeechRecognition stop reason:/);
  assert.match(speech, /\}, \[language\]\)/);
  assert.match(speech, /recognition\.onend/);
  assert.match(speech, /Microphone access was denied/);
  assert.match(speech, /No working microphone was found/);
  assert.match(speech, /secure connection \(HTTPS\) or localhost/);
  assert.match(speech, /latest Chrome or Edge/);
});

test("history, favorites, auto-save, manual save, and AI update paths remain wired", async () => {
  const [provider, workspace, favoriteEditor] = await Promise.all([
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/HistoryWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/favorites/[id]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(provider, /localStorage\.setItem\("shiftnote-history"/);
  assert.match(provider, /localStorage\.setItem\("shiftnote-favorites"/);
  assert.match(provider, /updateHistoryWithAI/);
  assert.match(provider, /updateFavoriteWithAI/);
  assert.match(workspace, /"auto-save"/);
  assert.match(workspace, /"manual"/);
  assert.match(workspace, /product\.updateHistoryWithAI/);
  assert.match(favoriteEditor, /product\.updateFavorite/);
  assert.match(favoriteEditor, /product\.updateFavoriteWithAI/);
});
