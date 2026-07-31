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

test("status messages use shared theme-aware accessible styles", async () => {
  const [css, chat, history, favorite, copilot, statusComponent] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/HistoryWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/favorites/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/copilot/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/status-message.tsx", import.meta.url), "utf8"),
  ]);

  for (const variant of ["error", "warning", "success", "info", "neutral"]) {
    assert.match(css, new RegExp(`\\.status-message--${variant}`));
    assert.match(css, new RegExp(`\\.dark \\.status-message--${variant}`));
  }
  assert.match(statusComponent, /role=\{variant === "error" \? "alert" : "status"\}/);
  assert.match(statusComponent, /aria-live=\{variant === "error" \? "assertive" : "polite"\}/);
  assert.match(chat, /StatusMessage[\s\S]*variant="error"/);
  assert.match(chat, /StatusMessage[\s\S]*variant="warning"/);
  assert.match(history, /StatusMessage[\s\S]*variant="error"/);
  assert.match(favorite, /StatusMessage[\s\S]*variant="error"/);
  assert.match(copilot, /StatusMessage[\s\S]*variant="warning"/);
  assert.doesNotMatch([chat, history, favorite, copilot].join("\n"), /text-red-600|bg-red-50|bg-amber-50/);

  const contrastPairs = [
    ["#7f1d1d", "#fff1f2"], ["#fecaca", "#450a0a"],
    ["#78350f", "#fffbeb"], ["#fde68a", "#451a03"],
    ["#14532d", "#f0fdf4"], ["#bbf7d0", "#052e16"],
    ["#1e3a8a", "#eff6ff"], ["#bfdbfe", "#172554"],
    ["#334155", "#f8fafc"], ["#e2e8f0", "#1e293b"],
    ["#586b63", "#f6f8f7"], ["#586b63", "#ffffff"],
  ];
  for (const [foreground, background] of contrastPairs) {
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background} must meet WCAG AA`);
  }
  for (const accent of ["#176b4c", "#2563eb", "#7c3aed", "#a94720"]) {
    assert.ok(contrastRatio("#ffffff", accent) >= 4.5, `white text on ${accent} must meet WCAG AA`);
  }
});

function contrastRatio(first, second) {
  const high = Math.max(relativeLuminance(first), relativeLuminance(second));
  const low = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (high + 0.05) / (low + 0.05);
}

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
