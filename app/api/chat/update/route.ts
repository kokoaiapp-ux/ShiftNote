import { requireProAccess } from "@/lib/server/subscription-access";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getMode, getTemplate } from "@/lib/product-data";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(request: Request) {
  try { await requireProAccess(request); } catch (error) { const code = error instanceof Error ? error.message : ""; return Response.json({ error: code === "PRO_REQUIRED" ? "ShiftNote Pro is required." : code === "SUBSCRIPTION_ACCESS_UNAVAILABLE" ? "Subscription access is temporarily unavailable." : "Sign in to use AI Copilot." }, { status: code === "PRO_REQUIRED" ? 403 : code === "SUBSCRIPTION_ACCESS_UNAVAILABLE" ? 503 : 401 }); }
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    return Response.json(
      { error: "AI is not configured. Add OPENAI_API_KEY and OPENAI_MODEL to .env.local." },
      { status: 503 },
    );
  }

  const {
    existingNote,
    newInformation,
    modeId,
    templateId,
    operation,
  }: {
    existingNote?: string;
    newInformation?: string;
    modeId?: string;
    templateId?: string;
    operation?: "update" | "summarize";
  } = await request.json();

  const isSummarize = operation === "summarize";
  if (!existingNote?.trim() || (!isSummarize && !newInformation?.trim()) || !modeId || !templateId) {
    return Response.json({ error: "Existing documentation, new information, mode, and template are required." }, { status: 400 });
  }

  const mode = getMode(modeId);
  const template = getTemplate(templateId);
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL),
    temperature: 0.1,
    system: isSummarize ? `You concisely rewrite existing clinical documentation.
Professional mode: ${mode.name}. Use only ${mode.terminology}.
Document type: ${template.name}.
Preserve every important clinical fact, chronology, professional term, and medically relevant detail.
Do not invent facts. Remove unnecessary headings, repetition, spacing, and paragraph breaks.
Return one continuous polished professional note suitable for EMR or EHR copy and paste, with no preamble or commentary.` : `You update existing clinical documentation and do not generate an unrelated replacement.
Professional mode: ${mode.name}. Use only ${mode.terminology}.
Document type: ${template.name}.
Preserve accurate existing content, incorporate only the supplied new information, and do not invent facts.
Use natural professional writing and do not use dash based lists.
Return only the complete updated documentation with no preamble or commentary.`,
    prompt: isSummarize ? `DOCUMENTATION TO SUMMARIZE:
${existingNote}` : `EXISTING DOCUMENTATION:
${existingNote}

NEW INFORMATION:
${newInformation}`,
  });

  return result.toTextStreamResponse();
}
