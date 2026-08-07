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

test("protects the clinical copilot and keeps the compact template switcher wired", async () => {
  const response = await render();
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /\/login\?returnTo=%2Fcopilot/);
  const chat = await readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8");
  assert.match(chat, /ShiftNote AI Clinical Copilot/);
  assert.match(chat, /Current template/i);
  assert.match(chat, /Type or dictate the clinical information you want documented/);
  assert.match(chat, /aria-label="Message ShiftNote"/);
  assert.match(chat, /aria-label="Send message"/);
  assert.match(chat, /aria-label="Select template"/);
  assert.doesNotMatch(chat, /Initial Documentation|Routine Follow-up|Change in Status/);
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
  assert.match(chat, /console\.info\("Input state updated:", \{ characters: input\.length \}\)/);
  assert.match(chat, /console\.info\("Send button enabled:", true\)/);
  assert.match(chat, /console\.info\("Message successfully sent:", \{ characters: value\.length, attachments: attachments\.length \}\)/);
  assert.match(chat, /onChange=\{\(event\) => \{ setInput\(event\.target\.value\)/);
});

test("dashboard metrics use authenticated Supabase counts without dummy values", async () => {
  const [dashboard, route, provider, migration] = await Promise.all([
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/dashboard/metrics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608070001_dashboard_metrics_indexes.sql", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(dashboard, /length \|\| 7|38 min|length \|\| 5|length \|\| 12/);
  assert.match(dashboard, /timeSavedMinutes/);
  assert.match(dashboard, /new Date\(now\.getFullYear\(\), now\.getMonth\(\), now\.getDate\(\)\)/);
  assert.match(route, /generatedToday \* 5/);
  assert.match(route, /count: "exact", head: true/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /\.eq\("role", "assistant"\)/);
  assert.match(provider, /notifyDashboardMetricsChanged/);
  assert.match(migration, /where role = 'assistant'/);
});

test("secret credentials remain server-only and sensitive content is not logged", async () => {
  const [chat, recorder, auth, provider, guard] = await Promise.all([
    readFile(new URL("../components/floating-assistant/ChatInterface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../hooks/useAudioTranscription.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/AuthProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify-secret-boundaries.mjs", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(chat, /console\.info\("Input state updated:", input\)/);
  assert.doesNotMatch(chat, /console\.info\("Message successfully sent:", value\)/);
  assert.doesNotMatch(recorder, /console\.info\("Transcript received:", transcript\)/);
  assert.doesNotMatch(recorder, /deviceId: device\.deviceId|track\?\.getSettings\(\)/);
  assert.doesNotMatch(provider, /console\.error\([^\n]*, error\)/);
  assert.match(auth, /return "Authentication could not be completed\. Please try again\."/);
  for (const secret of ["OPENAI_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "REVENUECAT_SECRET_API_KEY", "REVENUECAT_WEBHOOK_AUTH"]) {
    assert.match(guard, new RegExp(`"${secret}"`));
  }
  assert.match(guard, /NEXT_PUBLIC_\(\?:OPENAI\|STRIPE_SECRET/);
  assert.match(guard, /configuredSecretValues/);
  assert.match(guard, /--git-history/);
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
  assert.match(chat, /stopSpeechListening\("maximum-duration", false\)/);
  assert.match(chat, /\.then\(\(\) => setRecordingPhase\("paused"\)\)/);
  assert.match(chat, /recordingSeconds < MAX_RECORDING_SECONDS && <button[\s\S]*>Continue<\/button>/);
  assert.doesNotMatch(chat, /setRecordingPhase\("transcribing"\);\s*void stopSpeechListening\("maximum-duration"/);
});

test("production authentication and billing redirects use the canonical ShiftNote origin", async () => {
  const [origin, auth, billing] = await Promise.all([
    readFile(new URL("../lib/app-url.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/AuthProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/server/billing.ts", import.meta.url), "utf8"),
  ]);
  assert.match(origin, /PRODUCTION_APP_URL = "https:\/\/shiftnote\.care"/);
  assert.match(origin, /"shiftnote\.care", "www\.shiftnote\.care"/);
  assert.match(origin, /return window\.location\.origin/);
  assert.match(auth, /new URL\("\/auth\/callback", browserAppUrl\(\)\)/);
  assert.match(auth, /emailRedirectTo: `\$\{browserAppUrl\(\)\}\/auth\/callback/);
  assert.match(auth, /redirectTo: `\$\{browserAppUrl\(\)\}\/auth\/callback/);
  assert.doesNotMatch(auth, /location\.origin/);
  assert.match(billing, /process\.env\.NODE_ENV === "production" \? PRODUCTION_APP_URL/);
  assert.doesNotMatch(billing, /NEXT_PUBLIC_APP_URL/);
});
test("PIP opens at the wider default size", async () => {
  const pip = await readFile(new URL("../hooks/useDocumentPip.ts", import.meta.url), "utf8");
  assert.match(pip, /width: 680/);
  assert.match(pip, /height: 760/);
  assert.match(pip, /colorSchemeMeta\.name = "color-scheme"/);
  assert.match(pip, /themeColorMeta\.name = "theme-color"/);
  assert.match(pip, /style\.colorScheme = isDark \? "dark" : "light"/);
  assert.match(pip, /themeColorMeta\.content = background/);
  assert.match(pip, /new MutationObserver\(syncPipTheme\)/);
  assert.match(pip, /isMobileDevice\(\)/);
  assert.match(pip, /if \(isMobileDevice\(\)\) return/);
  assert.match(pip, /MOBILE_VIEWPORT = "\(max-width: 767px\)"/);
  const floating = await readFile(new URL("../components/floating-assistant/FloatingAssistant.tsx", import.meta.url), "utf8");
  assert.match(floating, /if \(pip\.isMobile\) return null/);
  assert.match(floating, /hidden items-center[^"]*lg:flex/);
});

test("history, favorites, auto-save, manual save, and AI update paths remain wired", async () => {
  const [provider, workspace, favoriteEditor] = await Promise.all([
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/HistoryWorkspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/favorites/[id]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(provider, /persistNote\(requireSupabase\(\)/);
  assert.match(provider, /addFavoriteRecord\(requireSupabase\(\)/);
  assert.match(provider, /updateStoredNote\(requireSupabase\(\)/);
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
  assert.match(subscription, /Billed \$83\.94 every 6 months/);
  assert.match(subscription, /Includes a 3 day free trial\./);
  assert.match(subscription, /Save 30%/);
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

test("unconfigured authentication supports the temporary preview navigation flow", async () => {
  const [authCard, authProvider, onboarding, subscription] = await Promise.all([
    readFile(new URL("../components/auth/AuthCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/AuthProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/subscription/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(authCard, /if\(!auth\.configured\)\{router\.push\(target\);return;\}/);
  assert.match(authCard, /auth\.signInGoogle\(target\)/);
  assert.match(authCard, /emailConfirmationRequired/);
  assert.match(authCard, /type="submit"/);
  assert.match(authCard, /type="button"/);
  assert.match(authCard, /\/Mac\/i\.test\(platform\)&&navigator\.maxTouchPoints<2/);
  assert.match(authCard, /showApple&&<button/);
  assert.match(authCard, /noValidate=\{!auth\.configured\}/);
  assert.match(authCard, /required=\{auth\.configured\}/);
  assert.match(authCard, /mode === "signup" \? \(params\.get\("returnTo"\) \|\| "\/onboarding"\)/);
  assert.match(authCard, /params\.get\("returnTo"\) \|\| "\/dashboard"/);
  assert.match(authProvider, /shiftnote-onboarding-draft/);
  assert.doesNotMatch(authProvider, /from\("profiles"\)\.update/);
  assert.match(authProvider, /signInWithPassword/);
  assert.doesNotMatch(authProvider, /firebase/i);
  assert.match(onboarding, /router\.push\("\/subscription\?source=onboarding"\)/);
  assert.match(onboarding, /modes\.find\(mode=>mode\.name===updated\.profession\)/);
  assert.match(onboarding, /localStorage\.setItem\("shiftnote-mode",selectedMode\.id\)/);
  assert.match(onboarding, /product\.setMode\(selectedMode\.id\)/);
  assert.match(subscription, /if \(!auth\.configured\)[\s\S]*router\.push\("\/dashboard"\)/);
});

test("subscription flow gates the primary paywall, preserves the discount until a primary purchase, and is tracked", async () => {
  const [flow, subscription, discount, signup, chrome, shell, settings, pipSettings, env] = await Promise.all([
    readFile(new URL("../lib/first-time-flow.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/subscription/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/discount/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/signup/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/public/PublicChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/product/AppShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/floating-assistant/PipShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.match(flow, /hasPurchasedPrimaryPaywall/);
  assert.match(flow, /shiftnote-onboarding-complete/);
  assert.match(flow, /localStorage\.setItem\(PRIMARY_PAYWALL_PURCHASE_FLAG, "true"\)/);
  assert.match(flow, /shiftnote:analytics/);
  for (const event of ["paywall_view", "discount_view", "purchase_started", "purchase_completed", "purchase_failed", "paywall_declined", "discount_dismissed"]) assert.match(flow, new RegExp(event));
  assert.match(subscription, /stage === "entry"/);
  assert.match(subscription, /Continue through onboarding/);
  assert.doesNotMatch(subscription, /Maybe later|Skip|Not Now/);
  assert.match(subscription, /router\.push\("\/discount"\)/);
  assert.match(subscription, /aria-label="View discount offer"/);
  assert.match(subscription, /flow\.stage === "post-onboarding"/);
  assert.match(subscription, /subscriptionSource === "settings"/);
  assert.match(subscription, /aria-label="Go back"/);
  assert.match(subscription, /<Brand\/><\/div><\/header><div[^>]*paddingTop:"32px"[^>]*><button aria-label="Go back"/);
  assert.match(subscription, /subscriptionSource==="settings"\?"\/settings":"\/"/);
  assert.doesNotMatch(subscription, /<PublicPage>/);
  assert.match(subscription, /subscriptionSource === "onboarding"/);
  assert.match(settings, /\/subscription\?source=settings/);
  assert.match(subscription, /markPrimaryPaywallPurchased\(\)/);
  assert.match(discount, /40% OFF/);
  assert.match(discount, /Limited Offer Today/i);
  assert.match(discount, />ShiftNote Pro</);
  assert.doesNotMatch(discount, />6-Month ShiftNote Pro</);
  assert.doesNotMatch(discount, /first-time offer|one-time offer|first-time ShiftNote|new users/i);
  assert.match(discount, /\$11\.99/);
  assert.match(discount, /Billed \$71\.94 every 6 months/);
  assert.match(discount, /This limited price is only available if you subscribe today\./);
  assert.match(discount, /Spend less time documenting with today&apos;s limited offer\./);
  assert.match(discount, /Unlock 40% Discount/);
  assert.match(discount, /aria-label="Close discount offer"/);
  assert.match(discount, /function dismiss\(\) \{ trackPaywallEvent\("discount_dismissed"\); router\.push\("\/dashboard"\); \}/);
  assert.doesNotMatch(discount, /markPrimaryPaywallPurchased|completeFirstTimeFlow/);
  assert.match(signup, /<AuthCard mode="signup"/);
  assert.doesNotMatch(signup, /isFirstTimeFlowPending|router\.replace\("\/subscription/);
  assert.match(chrome, /subscription\?flow=first-time&stage=entry/);
  assert.match(chrome, /a\[href="\/signup"\]/);
  assert.match(shell, /"\/discount"/);
  assert.match(shell, /"\/onboarding"/);
  for (const label of ["Subscription", "Contact Support", "Privacy Policy", "Terms of Service"]) assert.match(settings, new RegExp(label));
  for (const label of ["Contact Support", "Privacy Policy", "Terms of Service"]) assert.doesNotMatch(pipSettings, new RegExp(label));
  assert.match(env, /STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRODUCT_ID=/);
  assert.match(env, /STRIPE_PROMOTIONAL_SIX_MONTH_DISCOUNT_PRICE_ID=/);
  assert.match(env, /STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRODUCT_ID=/);
  assert.match(env, /STRIPE_PROMOTIONAL_SIX_MONTH_RETENTION_PRICE_ID=/);
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

test("Supabase billing architecture keeps Stripe billing and synchronizes RevenueCat entitlements", async () => {
  const [schema, stripeSchema, settings, billing, portal, checkout, account, stripeWebhook, revenueCatWebhook, product, pkg] = await Promise.all([
    readFile(new URL("../supabase/migrations/202608040001_initial_shift_note.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608050003_stripe_billing.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/billing/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/billing/checkout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/stripe/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/revenuecat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/product/ProductProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  for (const table of ["profiles", "onboarding_answers", "conversations", "messages", "favorites", "custom_templates", "user_preferences", "subscription_cache"]) assert.match(schema, new RegExp(`create table public.${table}`));
  assert.doesNotMatch(schema, /create table public\.(subscriptions|billing_webhook_events)/);
  assert.equal((schema.match(/enable row level security/g) || []).length, 8);
  assert.match(schema, /references auth\.users\(id\) on delete cascade/g);
  assert.match(schema, /create trigger on_auth_user_created/);
  assert.match(schema, /create or replace function public\.complete_onboarding/);
  assert.match(schema, /subscription_cache_select_own/);
  assert.doesNotMatch(schema, /subscription_cache_(insert|update|delete)_own/);
  for (const label of ["Account", "Billing"]) assert.match(settings, new RegExp(label));
  for (const label of ["Thinking about leaving", "Pause Subscription for 1 Month", "You&apos;ll lose access", "Too expensive", "Special Offer"]) assert.match(billing, new RegExp(label));
  assert.match(billing, /\$9\.99\/month/); assert.match(billing, /Billed \$59\.94 every 6 months/); assert.match(billing, /Save 50% compared to the monthly plan/);
  assert.match(billing, /Switch to 6 Months<\/span><span>\$13\.99\/month \(Save 30%\)/);
  assert.match(billing, /\$13\.99\/month/); assert.match(billing, /Billed \$83\.94 every 6 months/);
  assert.match(billing, /whitespace-normal/); assert.match(billing, /min-h-12/);
  assert.doesNotMatch(billing, /RefreshCw/); assert.match(billing, /min-h-11/);
  assert.match(billing, /text-red-700/); assert.match(billing, /dark:text-red-400/);
  assert.match(billing, /variant="outline">Cancel Subscription<\/Button>/);
  assert.match(billing, /function Actions[\s\S]*mt-6 grid gap-3/);
  assert.match(portal, /payment_method_update/); assert.match(portal, /subscription_cancel/);
  assert.match(checkout, /mode: "subscription"/); assert.match(checkout, /client_reference_id: user.id/);
  assert.match(account, /admin.auth.admin.deleteUser/); assert.match(account, /cancel_at_period_end: true/);
  assert.match(account, /stripe\.subscriptions\.search/); assert.match(account, /renewalCanceled/);
  assert.match(stripeSchema, /create table public\.stripe_customers/);
  assert.match(stripeSchema, /create table public\.stripe_subscriptions/);
  assert.match(stripeSchema, /create table public\.stripe_webhook_events/);
  assert.match(stripeWebhook, /constructEvent/); assert.match(stripeWebhook, /submitStripeSubscription/);
  assert.match(revenueCatWebhook, /x-revenuecat-webhook-signature/); assert.match(revenueCatWebhook, /syncRevenueCatSubscriber/);
  assert.match(product, /loadWorkspace\(requireSupabase\(\)/); assert.doesNotMatch(product, /user_workspaces/);
  assert.match(pkg, /@supabase\/supabase-js/); assert.doesNotMatch(pkg, /"firebase"/);
});
