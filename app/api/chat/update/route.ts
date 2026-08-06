import { requireRevenueCatPro } from "@/lib/server/revenuecat";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getMode, getTemplate } from "@/lib/product-data";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(request: Request) {
  try { await requireRevenueCatPro(request); } catch (error) { const code = error instanceof Error ? error.message : ""; return Response.json({ error: code === "PRO_REQUIRED" ? "ShiftNote Pro is required." : "Sign in to use AI Copilot." }, { status: code === "PRO_REQUIRED" ? 403 : 401 }); }
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
  }: {
    existingNote?: string;
    newInformation?: string;
    modeId?: string;
    templateId?: string;
  } = await request.json();

  if (!existingNote?.trim() || !newInformation?.trim() || !modeId || !templateId) {
    return Response.json({ error: "Existing documentation, new information, mode, and template are required." }, { status: 400 });
  }

  const mode = getMode(modeId);
  const template = getTemplate(templateId);
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL),
    temperature: 0.1,
    system: `You update existing clinical documentation and do not generate an unrelated replacement.
Professional mode: ${mode.name}. Use only ${mode.terminology}.
Document type: ${template.name}.
Preserve accurate existing content, incorporate only the supplied new information, and do not invent facts.
Use natural professional writing and do not use dash based lists.
Return only the complete updated documentation with no preamble or commentary.`,
    prompt: `EXISTING DOCUMENTATION:
${existingNote}

NEW INFORMATION:
${newInformation}`,
  });

  return result.toTextStreamResponse();
}
