import { requireProAccess } from "@/lib/server/subscription-access";

export const runtime = "edge";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 50_000;
const SUPPORTED_TYPES = new Set([
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/webm;codecs=opus",
]);

export async function POST(request: Request) {
  try { await requireProAccess(request); } catch (error) { const code = error instanceof Error ? error.message : ""; return Response.json({ error: code === "PRO_REQUIRED" ? "ShiftNote Pro is required." : code === "SUBSCRIPTION_ACCESS_UNAVAILABLE" ? "Subscription access is temporarily unavailable." : "Sign in to use voice input." }, { status: code === "PRO_REQUIRED" ? 403 : code === "SUBSCRIPTION_ACCESS_UNAVAILABLE" ? 503 : 401 }); }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI transcription is not configured. Add OPENAI_API_KEY and restart ShiftNote." },
      { status: 503 },
    );
  }

  let requestData: FormData;
  try {
    requestData = await request.formData();
  } catch {
    return Response.json({ error: "The recorded audio upload could not be read. Please record again." }, { status: 400 });
  }

  const files = requestData.getAll("audio").filter((value): value is File => value instanceof File);
  if (!files.length || files.every((file) => file.size === 0)) {
    return Response.json({ error: "The recording was empty. Speak after recording starts, then tap Stop." }, { status: 400 });
  }
  if (files.some((file) => file.size > MAX_AUDIO_BYTES)) {
    return Response.json({ error: "The recording is too large to transcribe. Keep each recording under 25 MB." }, { status: 413 });
  }
  if (files.some((file) => file.type && !SUPPORTED_TYPES.has(file.type.toLowerCase()))) {
    return Response.json({ error: "This browser produced an unsupported audio format. Use current Microsoft Edge or Google Chrome." }, { status: 415 });
  }
  console.info("Transcription upload received:", files.map((file) => ({
    bytes: file.size,
    contentType: file.type,
    extension: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
    name: file.name,
  })));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const transcripts: string[] = [];
  const requestedModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-transcribe";

  try {
    for (const [index, file] of files.entries()) {
      let result = await transcribeFile(file, index, requestedModel, controller.signal);
      if (result.ok && !result.text && requestedModel !== "whisper-1") {
        console.warn("Primary transcription returned no text; retrying with whisper-1.", {
          bytes: file.size,
          contentType: file.type,
          model: requestedModel,
        });
        result = await transcribeFile(file, index, "whisper-1", controller.signal);
      }
      if (!result.ok) return Response.json({ error: transcriptionError(result.status) }, { status: result.status });
      const text = result.text;
      if (text) transcripts.push(text);
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      return Response.json({ error: "OpenAI transcription timed out. Try a shorter recording." }, { status: 504 });
    }
    return Response.json({ error: "The transcription service could not be reached. Check the network connection and try again." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  const text = transcripts.join(" ").trim();
  if (!text) {
    return Response.json({ error: "OpenAI did not detect speech in the recording. Try again and speak clearly after recording starts." }, { status: 422 });
  }
  return Response.json({ text });
}

async function transcribeFile(file: File, index: number, model: string, signal: AbortSignal) {
  const openAIForm = new FormData();
  openAIForm.append("file", file, file.name || `recording-${index + 1}.webm`);
  openAIForm.append("model", model);
  openAIForm.append("language", "en");
  openAIForm.append("prompt", "Clinical documentation dictation using standard healthcare terminology.");
  openAIForm.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: openAIForm,
    signal,
  });
  const payload = await response.json().catch(() => null) as { text?: string } | null;
  console.info("OpenAI transcription response:", {
    bytes: file.size,
    contentType: file.type,
    model,
    status: response.status,
    transcriptCharacters: payload?.text?.trim().length ?? 0,
  });
  return { ok: response.ok, status: response.status, text: payload?.text?.trim() ?? "" };
}

function transcriptionError(status: number) {
  if (status === 401) return "The existing OpenAI API key is invalid or expired. Replace OPENAI_API_KEY with a valid project key.";
  if (status === 403 || status === 404) return "The current OpenAI project cannot access the transcription model. Enable access to gpt-transcribe or set OPENAI_TRANSCRIPTION_MODEL to an available transcription model.";
  if (status === 413) return "The recording exceeds OpenAI's 25 MB transcription limit. Try a shorter recording.";
  if (status === 415) return "OpenAI rejected the recorded audio format. Use current Microsoft Edge or Google Chrome.";
  if (status === 429) return "OpenAI transcription is temporarily rate-limited or the project has insufficient quota. Check project billing and limits, then try again.";
  return "OpenAI could not transcribe this recording. Please try again.";
}
