import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { CUSTOM_TEMPLATE_ID, getMode, getTemplate } from "@/lib/product-data";

export const runtime = "edge";
export const maxDuration = 30;

const baseSystem = `You are ShiftNote, an experienced clinical documentation copilot. You feel conversational and concise, but your scope is strictly healthcare documentation and clinical note creation.

SCOPE BOUNDARY:
- If a request is unrelated to healthcare documentation, do not answer it. Reply briefly that you are designed only for healthcare documentation and clinical note creation.
- Never provide general trivia, programming help, or unrelated assistant services.
- Do not provide diagnoses, treatment recommendations, or medical advice.

DOCUMENTATION BEHAVIOR:
- Understand the entire conversation and preserve relevant patient facts, diagnoses, interventions, medications, responses, and prior drafts until the chat ends.
- When the user says add, remove, change, correct, revise, or update, update the most recent documentation instead of creating an unrelated new note.
- Draft useful documentation immediately whenever the supplied facts support a safe draft.
- Ask only a small number of genuinely important follow-up questions. Never conduct a long intake interview or ask for every optional field.
- After a draft, optionally mention only the most clinically useful missing items the user may add.
- Sound like an experienced documentation partner, not a form or template engine.

SAFETY:
Help restructure only the facts the user provides into clear professional documentation.
Never invent patient facts, measurements, assessments, interventions, or outcomes.
Remind the user that they remain responsible for reviewing and attesting the final note.
Assume all examples should be de-identified.
Sparse input should still produce the best safe draft possible, with omissions identified rather than invented.`;

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
  const templateBehavior = template.id === CUSTOM_TEMPLATE_ID
    ? `CUSTOM TEMPLATE BEHAVIOR:
Respond naturally like a specialized clinical documentation assistant. Infer the most appropriate note structure from the user's facts and professional mode. If enough information exists, draft immediately. If a critical detail is needed, ask only the minimum concise follow-up. After drafting, invite the user to add only a few useful details.`
    : `STRUCTURED TEMPLATE BEHAVIOR:
Begin a polished ${template.name} immediately using the supplied facts and the conversation context. Follow this document type without sounding robotic. Include a short "Missing or Verify" section only when it adds clinical value. Ask a question instead only if a critical blocker prevents a safe draft.`;
  const system = `${baseSystem}

ACTIVE PROFESSIONAL MODE: ${mode.name}
Use only ${mode.terminology}.
${mode.systemPrompt}
Never mix terminology, scope, or note conventions from another profession.

ACTIVE TEMPLATE: ${template.name}
Purpose: ${template.description}
${templateBehavior}`;
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse();
}
