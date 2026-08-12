export type Mode = {
  id: string;
  name: string;
  icon: string;
  description: string;
  terminology: string;
  introduction: string;
  systemPrompt: string;
};

export type TemplateExample = { id: string; title: string; starter: string };

export type ClinicalTemplate = {
  id: string;
  modeIds: string[];
  name: string;
  icon: string;
  description: string;
  examples: TemplateExample[];
  quickAction?: boolean;
};

export type CustomTemplate = {
  id: string;
  modeId: string;
  name: string;
  description: string;
  content: string;
  createdAt: string;
};

export const CUSTOM_TEMPLATE_ID = "custom-template";

export const modes: Mode[] = [
  { id: "nurse", name: "Nurse", icon: "Stethoscope", description: "Bedside, long term care, and community nursing documentation.", terminology: "nursing observations, interventions, responses, and handoff language", introduction: "I'm ShiftNote, your nursing documentation assistant. I help create accurate clinical documentation from the information you provide.", systemPrompt: "Write nursing documentation focused on observed status, interventions performed, and patient response. Never diagnose." },
  { id: "physician", name: "Physician", icon: "BadgePlus", description: "Encounters, assessments, and physician documentation.", terminology: "history, examination, assessment, and plan terminology", introduction: "I'm ShiftNote, your physician documentation assistant. I help create clear encounter documentation from the clinical information you provide.", systemPrompt: "Write physician documentation using encounter-appropriate history, examination, assessment, and plan structure." },
  { id: "nurse-practitioner", name: "Nurse Practitioner", icon: "HeartPulse", description: "Advanced practice evaluation and care documentation.", terminology: "advanced practice evaluation and plan terminology", introduction: "I'm ShiftNote, your nurse practitioner documentation assistant. I help create advanced practice clinical documentation from the information you provide.", systemPrompt: "Write advanced practice documentation while keeping reported facts distinct from clinical assessment." },
  { id: "pharmacist", name: "Pharmacist", icon: "Pill", description: "Medication review, counseling, and pharmacy interventions.", terminology: "medication therapy, adherence, interactions, and counseling terminology", introduction: "I'm ShiftNote, your pharmacy documentation assistant. I help document medication reviews, counseling, interventions, adherence, and monitoring.", systemPrompt: "Write pharmacist documentation focused on medication therapy review, counseling, and documented interventions." },
  { id: "physical-therapist", name: "Physical Therapist", icon: "Accessibility", description: "Mobility, function, goals, and treatment sessions.", terminology: "mobility, functional status, assistance levels, goals, and therapeutic exercise", introduction: "I'm ShiftNote, your physical therapy documentation assistant. I help document evaluations, treatments, patient progress, and functional outcomes.", systemPrompt: "Write physical therapy documentation with objective functional measures and response to treatment." },
  { id: "respiratory-therapist", name: "Respiratory Therapist", icon: "Wind", description: "Respiratory assessment, treatments, and response.", terminology: "airway, oxygenation, ventilation, respiratory treatment, and response", introduction: "I'm ShiftNote, your respiratory therapy documentation assistant. I help document respiratory assessments, treatments, device settings, monitoring, and patient response.", systemPrompt: "Write respiratory therapy documentation focused on respiratory status, device settings, treatment, and response." },
  { id: "speech-therapist", name: "Speech Therapist", icon: "MessagesSquare", description: "Communication, cognition, swallowing, and treatment progress.", terminology: "speech, language, cognition, swallowing, cueing, and functional communication", introduction: "I'm ShiftNote, your speech therapy documentation assistant. I help document evaluations, treatment sessions, progress, and functional outcomes.", systemPrompt: "Write speech therapy documentation focused on objective findings, skilled interventions, cueing, response, and functional goals." },
  { id: "occupational-therapist", name: "Occupational Therapist", icon: "Hand", description: "Activities of daily living, participation, adaptive strategies, and progress.", terminology: "activities of daily living, participation, adaptive equipment, cueing, and functional goals", introduction: "I'm ShiftNote, your occupational therapy documentation assistant. I help document evaluations, activities of daily living, interventions, participation, and functional progress.", systemPrompt: "Write occupational therapy documentation focused on activities of daily living, participation, assistance, and progress toward goals." },
  { id: "dietitian", name: "Dietitian", icon: "Apple", description: "Nutrition assessment, intervention, and monitoring.", terminology: "intake, nutrition status, estimated needs, intervention, and monitoring", introduction: "I'm ShiftNote, your nutrition documentation assistant. I help document nutritional assessments, interventions, intake, and follow up.", systemPrompt: "Write nutrition documentation focused on assessment, intake, interventions, and monitoring." },
  { id: "cna", name: "CNA", icon: "UserRoundCheck", description: "Direct care observations and activities of daily living.", terminology: "activities of daily living, intake and output, mobility assistance, hygiene, and observed changes", introduction: "I'm ShiftNote, your CNA documentation assistant. I help create clear clinical documentation from your observations. This includes activities of daily living, mobility, hygiene, intake and output, and changes in condition.", systemPrompt: "Write concise CNA documentation limited to direct observations and care provided." },
  { id: "social-worker", name: "Social Worker", icon: "Brain", description: "Psychosocial assessment, resources, and care coordination.", terminology: "psychosocial needs, supports, barriers, resources, and care coordination", introduction: "I'm ShiftNote, your social work documentation assistant. I help document psychosocial assessments, care coordination, referrals, resources, and follow up.", systemPrompt: "Write social work documentation focused on psychosocial needs, interventions, resources, and stated outcomes." },
  { id: "home-health", name: "Home Health", icon: "HousePlus", description: "Skilled home visits, teaching, and homebound documentation.", terminology: "skilled need, homebound status, teaching, caregiver support, and visit response", introduction: "I'm ShiftNote, your home health documentation assistant. I help document skilled visits, teaching, homebound status, caregiver support, and patient response.", systemPrompt: "Write home health documentation focused on skilled need, teaching, response, and the home setting." },
];

export const customClinicalTemplate: ClinicalTemplate = {
  id: CUSTOM_TEMPLATE_ID,
  modeIds: modes.map((mode) => mode.id),
  name: "Custom Template",
  icon: "FilePlus2",
  description: "Describe your needs naturally and let ShiftNote create the appropriate professional documentation.",
  examples: [{ id: "custom-template-start", title: "Describe your documentation", starter: "I need custom clinical documentation. Use the relevant facts and structure it for my current professional mode." }],
};

const catalog: Record<string, Array<[string, string]>> = {
  nurse: [["Skilled Nursing Note", "Document skilled assessment, interventions, teaching, and response."], ["General Progress Note", "Create a concise chronological nursing progress note."], ["Medication Administration", "Record medication administration, refusal, and response."], ["Pain Assessment", "Document findings, intervention, and reassessment."], ["Change of Condition", "Capture clinical change, notifications, and response."], ["Incident Report", "Build an objective event record."], ["Hospice Note", "Document symptoms, comfort interventions, and support."], ["Skin Assessment", "Describe skin integrity and related care."], ["Shift Summary", "Create a focused end of shift handoff."], ["Admission Report", "Document admission findings, history, assessment, and immediate care needs."], ["Discharge Report", "Document discharge status, care summary, instructions, and disposition."]],
  physician: [["SOAP Note", "Structure subjective, objective, assessment, and plan."], ["Progress Note", "Document interval progress and current plan."], ["History & Physical", "Create a complete history and physical."], ["Consult Note", "Document the consult question, findings, and recommendations."], ["Procedure Note", "Record procedure details and outcome."], ["Discharge Summary", "Summarize course, condition, and follow up."], ["Patient Education", "Document education, understanding, and next steps."]],
  "nurse-practitioner": [["SOAP Note", "Structure an advanced practice patient encounter."], ["Progress Note", "Document interval evaluation and plan."], ["History & Physical", "Create a focused history and physical."], ["Medication Management", "Document medication evaluation and changes."], ["Procedure Note", "Record an office procedure and response."], ["Discharge Summary", "Summarize care and follow up."], ["Patient Education", "Document counseling and understanding."]],
  pharmacist: [["Medication Review", "Assess the complete medication regimen."], ["Medication Reconciliation", "Reconcile reported and active medications."], ["Drug Therapy Intervention", "Document a medication related intervention."], ["Medication Counseling", "Capture counseling and patient understanding."], ["Drug Interaction", "Document an identified interaction and action."], ["Medication Monitoring", "Record efficacy and safety monitoring."], ["Controlled Substance Review", "Document controlled substance review."]],
  "respiratory-therapist": [["Respiratory Assessment", "Document a focused respiratory assessment."], ["Oxygen Therapy", "Record device, flow, response, and monitoring."], ["Nebulizer Treatment", "Document treatment and response."], ["Ventilator Management", "Record settings, checks, and tolerance."], ["Tracheostomy Care", "Document airway and tracheostomy care."], ["ABG Review", "Record ABG values and reported escalation."], ["Pulmonary Rehabilitation", "Document session activities and tolerance."]],
  "speech-therapist": [["Speech Evaluation", "Document communication and cognitive-linguistic findings."], ["Swallow Evaluation", "Record swallowing assessment findings and recommendations."], ["Daily Therapy Note", "Document skilled treatment and response."], ["Cognitive Therapy", "Record cognitive-linguistic intervention and cueing."], ["Communication Treatment", "Document functional communication goals and progress."], ["Discharge Summary", "Summarize progress and recommendations."]],
  "physical-therapist": [["PT Evaluation", "Document baseline function and therapy plan."], ["Daily Therapy Note", "Record skilled treatment and response."], ["Mobility Assessment", "Describe transfers, mobility, and assistance."], ["Balance Assessment", "Document balance findings and safety."], ["Gait Training", "Record gait training and performance."], ["Exercise Session", "Document therapeutic exercise and tolerance."], ["Discharge Therapy Summary", "Summarize progress and disposition."]],
  "occupational-therapist": [["OT Evaluation", "Document occupational profile and evaluation."], ["ADL Assessment", "Record activity performance and assistance."], ["Cognitive Therapy", "Document cognitive intervention and response."], ["Upper Extremity Therapy", "Record skilled upper extremity treatment."], ["Adaptive Equipment Training", "Document equipment training and carryover."], ["Discharge OT Summary", "Summarize functional progress and recommendations."]],
  cna: [["Daily Care Note", "Summarize direct care and observations."], ["Bathing Assistance", "Document bathing care and assistance level."], ["Feeding Assistance", "Record feeding assistance and intake."], ["Toileting", "Document toileting care and output observations."], ["Mobility Assistance", "Record transfers, ambulation, and assistance."], ["Behavior Observation", "Describe objective behavior observations."], ["Intake and Output", "Document measured intake and output."]],
  dietitian: [["Nutrition Assessment", "Create a comprehensive nutrition assessment."], ["Diet Follow-up", "Document response to the nutrition plan."], ["Tube Feeding", "Record enteral regimen and tolerance."], ["Weight Monitoring", "Document weight trend and related findings."], ["Nutrition Counseling", "Capture education and understanding."], ["Meal Intake Review", "Summarize meal intake and barriers."]],
  "social-worker": [["Psychosocial Assessment", "Document needs, supports, and barriers."], ["Family Meeting", "Record participants, discussion, and outcomes."], ["Discharge Planning", "Document disposition planning and barriers."], ["Community Resources", "Record resources discussed and referrals."], ["Counseling Note", "Document the encounter and stated response."], ["Care Coordination", "Capture coordination activities and outcomes."]],
  "home-health": [["Home Visit", "Document skilled services and patient response."], ["Medication Compliance", "Record medication review and adherence teaching."], ["Safety Assessment", "Document risks and safety education."], ["Caregiver Education", "Capture caregiver teaching and understanding."], ["Home Environment Assessment", "Document relevant home environment findings."], ["Follow-up Visit", "Record progress and continuing skilled need."]],
};

const icons = ["ClipboardPlus", "FileText", "Pill", "Gauge", "Activity", "TriangleAlert", "HeartHandshake", "Scan", "Clock3"];

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function examplesFor(id: string, name: string): TemplateExample[] {
  const scenarios = name === "Admission Report"
    ? ["New admission", "Hospital admission", "Facility admission", "Initial assessment", "Admission after transfer"]
    : name === "Discharge Report"
      ? ["Routine discharge", "Hospital transfer", "Home discharge", "Hospice discharge", "Discharge summary"]
      : ["Initial documentation", "Routine follow-up", "Change in status", "Care coordination", "Outcome review"];
  return scenarios.map((title, index) => ({
    id: `${id}-${index + 1}`,
    title,
    starter: `Create a ${name} for ${title.toLowerCase()}. Ask only for missing facts and never invent clinical details.`,
  }));
}

export const templates: ClinicalTemplate[] = Object.entries(catalog).flatMap(([modeId, entries]) =>
  entries.map(([name, description], index) => {
    const id = `${modeId}-${slug(name)}`;
    return { id, modeIds: [modeId], name, description, icon: icons[index % icons.length], examples: examplesFor(id, name), quickAction: index < 4 };
  }),
);

export function getMode(id: string) {
  return modes.find((mode) => mode.id === id) ?? modes[0];
}

export function getTemplatesForMode(modeId: string) {
  return templates.filter((template) => template.modeIds.includes(modeId));
}

export function getQuickActionsForMode(modeId: string) {
  return getTemplatesForMode(modeId).filter((template) => template.quickAction);
}

export function getTemplate(id: string) {
  if (id === CUSTOM_TEMPLATE_ID) return customClinicalTemplate;
  return templates.find((template) => template.id === id) ?? getTemplatesForMode("nurse")[0];
}
