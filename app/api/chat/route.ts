import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getMode, getTemplate } from "@/lib/product-data";

export const runtime = "edge";
export const maxDuration = 30;

const baseSystem = `You are ShiftNote, an AI clinical documentation copilot.
Help restructure only the facts the user provides into clear professional documentation.
Never invent patient facts, measurements, assessments, interventions, or outcomes.
If required information is missing, label it as missing and ask for it.
Do not provide diagnoses, treatment recommendations, or medical advice.
Remind the user that they remain responsible for reviewing and attesting the final note.
Assume all examples should be de-identified.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Add OPENAI_API_KEY to .env.local and restart the server." },
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
When the user selects a starter example, ask a small set of focused follow-up questions before drafting. Do not replace the workflow with an unrelated note.
Once enough facts are available, produce a polished ${template.name} and finish with a short "Missing or verify" section only when needed.`;
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4.1-mini"),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse();
}
