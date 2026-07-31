import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getMode, getTemplate } from "@/lib/product-data";

export const runtime = "edge";
export const maxDuration = 30;

const baseSystem = `You are ShiftNote, an AI clinical documentation copilot.
Help restructure only the facts the user provides into clear professional documentation.
Never invent patient facts, measurements, assessments, interventions, or outcomes.
Do not provide diagnoses, treatment recommendations, or medical advice.
Remind the user that they remain responsible for reviewing and attesting the final note.
Assume all examples should be de-identified.

Your response order is mandatory:
1. Generate the requested clinical note immediately using all supplied facts.
2. Add a concise "Missing or Verify" section only for relevant information that was not supplied.
3. Ask follow-up questions only when a critical missing fact makes even a safe draft impossible.

Do not conduct an interview before drafting. Sparse input should still produce the best safe draft possible, with omissions clearly listed rather than invented. Critical blockers include the identity of a medication for a medication-specific note, wound location for wound care, the event description for an incident report, or the treatment performed for a treatment note.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Add OPENAI_API_KEY to .env.local and restart the server." },
      { status: 503 },
    );
  }
  if (!process.env.OPENAI_MODEL) {
    return Response.json(
      { error: "AI model is not configured. Add OPENAI_MODEL to .env.local and restart the server." },
      { status: 503 },
    );
  }

  const {
    messages,
    modeId = "nurse",
    templateId = "general-progress-note",
  }: { messages: UIMessage[]; modeId?: string; templateId?: string } = await request.json();
  const mode = getMode(modeId);
  const template = getTemplate(templateId);
  const system = `${baseSystem}

ACTIVE PROFESSIONAL MODE: ${mode.name}
Use only ${mode.terminology}.
${mode.systemPrompt}
Never mix terminology, scope, or note conventions from another profession.

ACTIVE TEMPLATE: ${template.name}
Purpose: ${template.description}
Produce a polished ${template.name} first. Finish with a short "Missing or Verify" section only when useful. Ask a question instead of drafting only when a critical blocker prevents a safe note.`;
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse();
}
