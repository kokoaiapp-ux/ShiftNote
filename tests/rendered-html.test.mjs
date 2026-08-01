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
  assert.match(chat, /product\.clearChat\(false\)/);
  assert.match(chat, /setTemplatePickerOpen\(false\)/);
  assert.doesNotMatch(chat, /selectTemplate[\s\S]*router\.(?:push|replace)/);
});

test("new conversations reset to Custom Template and the AI stays documentation-focused", async () => {
  const [provider, route, chat] = await Promise.all([
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(provider, /useState\(CUSTOM_TEMPLATE_ID\)/);
  assert.match(provider, /setTemplateId\(CUSTOM_TEMPLATE_ID\)/);
  assert.match(provider, /clearChat: \(resetTemplate = true\)/);
  assert.match(route, /scope is strictly healthcare documentation/);
  assert.match(route, /When the user says add, remove, change, correct, revise, or update/);
  assert.match(route, /CUSTOM TEMPLATE BEHAVIOR/);
  assert.match(route, /STRUCTURED TEMPLATE BEHAVIOR/);
  assert.match(chat, /★ Custom Template/);
  assert.match(chat, /<textarea aria-label="Message ShiftNote"/);
  assert.match(chat, /max-h-32/);
  assert.match(chat, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
});

test("professional modes and generic UI use clinical documentation terminology", async () => {
  const [data, route, updateRoute, chat, dashboard, favorites, history] = await Promise.all([
    readFile(new URL("../lib/product-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/update/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/favorites/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/history/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const mode of ["nursing", "physician", "nurse practitioner", "pharmacy", "physical therapy", "respiratory therapy", "occupational therapy", "nutrition", "CNA", "social work", "home health"]) {
    assert.match(data, new RegExp(`your ${mode} documentation assistant`, "i"));
  }
  assert.match(route, /final documentation/);
  assert.match(route, /Do not use dash based lists/);
  assert.match(updateRoute, /complete updated documentation/);
  assert.match(chat, /Documentation actions/);
  assert.match(dashboard, /Start documentation/);
  assert.match(favorites, /generated documentation/);
  assert.match(history, /No saved documentation yet/);
});

test("send validity reacts to controlled text and attachments", async () => {
  const chat = await readFile(
    new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url),
    "utf8",
  );

  assert.match(chat, /const hasValidInput = input\.trim\(\)\.length > 0 \|\| attachments\.length > 0/);
  assert.match(chat, /const canSend = !isGenerating && hasValidInput/);
  assert.match(chat, /disabled=\{!canSend\}/);
  assert.match(chat, /if \(!canSend\) return/);
  assert.match(chat, /setInput\(\[speechBaseRef\.current, text\]\.filter\(Boolean\)\.join\(" "\)\)/);
  assert.match(chat, /console\.info\("Input state updated:", input\)/);
  assert.match(chat, /console\.info\("Send button enabled:", true\)/);
  assert.match(chat, /console\.info\("Message successfully sent:", value\)/);
  assert.match(chat, /onChange=\{\(event\) => \{ setInput\(event\.target\.value\)/);
});

test("MediaRecorder audio is uploaded to OpenAI and inserts the returned transcript", async () => {
  const [recorder, route, chat] = await Promise.all([
    readFile(new URL("../hooks/useAudioTranscription.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/transcribe/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(recorder, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(recorder, /new MediaRecorder/);
  assert.match(recorder, /new File\(\[segment\]/);
  assert.match(recorder, /MediaRecorder chunk received:/);
  assert.match(recorder, /MediaRecorder stopped and finalized:/);
  assert.match(recorder, /OpenAI transcription upload started:/);
  assert.match(recorder, /debugRecordingUrl/);
  assert.match(recorder, /formData\.append\("audio"/);
  assert.match(recorder, /fetch\("\/api\/transcribe"/);
  assert.match(recorder, /onTranscriptRef\.current\(transcript\)/);
  assert.match(recorder, /completedSegmentsRef\.current\.push\(segment\)/);
  assert.match(recorder, /Microphone access was denied/);
  assert.match(recorder, /requires HTTPS or localhost/);
  assert.doesNotMatch(recorder, /webkitSpeechRecognition|SpeechRecognition/);

  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /process\.env\.OPENAI_TRANSCRIPTION_MODEL \?\? "gpt-transcribe"/);
  assert.match(route, /api\.openai\.com\/v1\/audio\/transcriptions/);
  assert.match(route, /openAIForm\.append\("language", "en"\)/);
  assert.match(chat, /speech\.startListening\(true\)/);
  assert.match(chat, /setRecordingPhase\("transcribing"\)/);
  assert.match(chat, /Transcribing audio/);
  assert.doesNotMatch(chat, /Download Recording/);
  assert.match(chat, /speech\.stopListening\("user-stop", false\)/);
  assert.match(chat, /Preview/);
  assert.match(chat, /Send voice recording/);
  assert.match(chat, /Recording microphone/);
  assert.match(chat, /No microphone signal detected/);
  assert.match(chat, /speech\.transcribeRecording\(\)/);
  assert.match(chat, /onSend\(transcript/);
  assert.match(chat, /const MAX_RECORDING_SECONDS = 150/);
  assert.match(chat, /next >= MAX_RECORDING_SECONDS/);
  assert.match(chat, /stopSpeechListening\("maximum-duration"\)/);
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

test("subscription pricing and value messaging stay exact and plan benefits match", async () => {
  const subscription = await readFile(new URL("../app/subscription/page.tsx", import.meta.url), "utf8");
  assert.match(subscription, /price: "\$19\.99"/);
  assert.match(subscription, /price: "\$13\.99"/);
  assert.match(subscription, /\$83\.94 billed every 6 months/);
  assert.match(subscription, /Includes a 3 day free trial\./);
  assert.match(subscription, /Save over 30% compared to paying monthly\./);
  assert.match(subscription, /Choose Monthly/);
  assert.match(subscription, /Start 3 Day Free Trial/);
  assert.match(subscription, /Choose the plan that works best for you/);
  assert.match(subscription, /Spend less time documenting and more time caring for patients with ShiftNote Pro\./);
  for (const benefit of [
    "Save up to 1 hour of documentation every shift with AI.",
    "Access every professional mode",
    "Unlimited clinical documentation templates",
    "Edit, regenerate, save, favorite, and organize your documentation",
  ]) assert.match(subscription, new RegExp(benefit));
  assert.match(subscription, /benefits\.map/);
  assert.doesNotMatch(subscription, /min-h-\[35rem\]/);
  assert.match(subscription, /relative flex h-full/);
  assert.match(subscription, /mt-auto pt-7/);
  assert.doesNotMatch(subscription, /1 day free trial/i);
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
