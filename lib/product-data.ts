export type Mode = {
  id: string;
  name: string;
  icon: string;
  description: string;
  terminology: string;
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
  { id: "nurse", name: "Nurse", icon: "Stethoscope", description: "Bedside, long-term care, and community nursing documentation.", terminology: "nursing observations, interventions, responses, and handoff language", systemPrompt: "Write nursing documentation focused on observed status, interventions performed, and patient response. Never diagnose." },
  { id: "physician", name: "Physician", icon: "BadgePlus", description: "Encounter notes, assessments, and physician documentation.", terminology: "history, examination, assessment, and plan terminology", systemPrompt: "Write physician documentation using encounter-appropriate HPI, exam, assessment, and plan structure." },
  { id: "nurse-practitioner", name: "Nurse Practitioner", icon: "HeartPulse", description: "Advanced practice evaluation and care documentation.", terminology: "advanced practice evaluation and plan terminology", systemPrompt: "Write advanced practice documentation, keeping reported facts distinct from clinical assessment." },
  { id: "pharmacist", name: "Pharmacist", icon: "Pill", description: "Medication review, counseling, and pharmacy interventions.", terminology: "medication therapy, adherence, interactions, and counseling terminology", systemPrompt: "Write pharmacist documentation focused on medication therapy review, counseling, and documented interventions." },
  { id: "physical-therapist", name: "Physical Therapist", icon: "Accessibility", description: "Mobility, function, goals, and treatment sessions.", terminology: "mobility, functional status, assistance levels, goals, and therapeutic exercise", systemPrompt: "Write physical therapy documentation with objective functional measures and response to treatment." },
  { id: "respiratory-therapist", name: "Respiratory Therapist", icon: "Wind", description: "Respiratory assessment, treatments, and response.", terminology: "airway, oxygenation, ventilation, respiratory treatment, and response", systemPrompt: "Write respiratory therapy documentation focused on respiratory status, device settings, treatment, and response." },
  { id: "occupational-therapist", name: "Occupational Therapist", icon: "Hand", description: "ADLs, participation, adaptive strategies, and progress.", terminology: "ADLs, participation, adaptive equipment, cueing, and functional goals", systemPrompt: "Write occupational therapy documentation focused on ADLs, participation, assistance, and progress toward goals." },
  { id: "dietitian", name: "Dietitian", icon: "Apple", description: "Nutrition assessment, intervention, and monitoring.", terminology: "intake, nutrition status, estimated needs, intervention, and monitoring", systemPrompt: "Write dietitian documentation focused on nutrition assessment, intake, interventions, and monitoring." },
  { id: "cna", name: "CNA", icon: "UserRoundCheck", description: "Direct-care observations and activities of daily living.", terminology: "ADLs, intake/output, mobility assistance, hygiene, and observed changes", systemPrompt: "Write concise CNA documentation limited to direct observations and care provided." },
  { id: "social-worker", name: "Social Worker", icon: "Brain", description: "Psychosocial assessment, resources, and care coordination.", terminology: "psychosocial needs, supports, barriers, resources, and care coordination", systemPrompt: "Write social work documentation focused on psychosocial needs, interventions, resources, and stated outcomes." },
  { id: "home-health", name: "Home Health", icon: "HousePlus", description: "Skilled home visits, teaching, and homebound documentation.", terminology: "skilled need, homebound status, teaching, caregiver support, and visit response", systemPrompt: "Write home-health documentation focused on skilled need, teaching, response, and the home setting." },
];

export const customClinicalTemplate: ClinicalTemplate = {
  id: CUSTOM_TEMPLATE_ID,
  modeIds: modes.map((mode) => mode.id),
  name: "Custom Template",
  icon: "FilePlus2",
  description: "Describe your documentation naturally and let ShiftNote create the appropriate professional note.",
  examples: [{ id: "custom-template-start", title: "Describe your documentation", starter: "I need a custom clinical note. Ask me for the relevant facts and structure them for my current professional mode." }],
};

const catalog: Record<string, Array<[string, string]>> = {
  nurse: [["Skilled Nursing Note", "Document skilled assessment, interventions, teaching, and response."], ["General Progress Note", "Create a concise chronological nursing progress note."], ["Medication Administration", "Record medication administration, refusal, and response."], ["Pain Assessment", "Document findings, intervention, and reassessment."], ["Change of Condition", "Capture clinical change, notifications, and response."], ["Incident Report", "Build an objective event record."], ["Hospice Note", "Document symptoms, comfort interventions, and support."], ["Skin Assessment", "Describe skin integrity and related care."], ["Shift Summary", "Create a focused end-of-shift handoff."]],
  physician: [["SOAP Note", "Structure subjective, objective, assessment, and plan."], ["Progress Note", "Document interval progress and current plan."], ["History & Physical", "Create a complete history and physical."], ["Consult Note", "Document the consult question, findings, and recommendations."], ["Procedure Note", "Record procedure details and outcome."], ["Discharge Summary", "Summarize course, condition, and follow-up."], ["Patient Education", "Document education, understanding, and next steps."]],
  "nurse-practitioner": [["SOAP Note", "Structure an advanced-practice patient encounter."], ["Progress Note", "Document interval evaluation and plan."], ["History & Physical", "Create a focused history and physical."], ["Medication Management", "Document medication evaluation and changes."], ["Procedure Note", "Record an office procedure and response."], ["Discharge Summary", "Summarize care and follow-up."], ["Patient Education", "Document counseling and understanding."]],
  pharmacist: [["Medication Review", "Assess the complete medication regimen."], ["Medication Reconciliation", "Reconcile reported and active medications."], ["Drug Therapy Intervention", "Document a medication-related intervention."], ["Medication Counseling", "Capture counseling and patient understanding."], ["Drug Interaction", "Document an identified interaction and action."], ["Medication Monitoring", "Record efficacy and safety monitoring."], ["Controlled Substance Review", "Document controlled-substance review."]],
  "respiratory-therapist": [["Respiratory Assessment", "Document a focused respiratory assessment."], ["Oxygen Therapy", "Record device, flow, response, and monitoring."], ["Nebulizer Treatment", "Document treatment and response."], ["Ventilator Management", "Record settings, checks, and tolerance."], ["Tracheostomy Care", "Document airway and tracheostomy care."], ["ABG Review", "Record ABG values and reported escalation."], ["Pulmonary Rehabilitation", "Document session activities and tolerance."]],
  "physical-therapist": [["PT Evaluation", "Document baseline function and therapy plan."], ["Daily Therapy Note", "Record skilled treatment and response."], ["Mobility Assessment", "Describe transfers, mobility, and assistance."], ["Balance Assessment", "Document balance findings and safety."], ["Gait Training", "Record gait training and performance."], ["Exercise Session", "Document therapeutic exercise and tolerance."], ["Discharge Therapy Summary", "Summarize progress and disposition."]],
  "occupational-therapist": [["OT Evaluation", "Document occupational profile and evaluation."], ["ADL Assessment", "Record ADL performance and assistance."], ["Cognitive Therapy", "Document cognitive intervention and response."], ["Upper Extremity Therapy", "Record skilled upper-extremity treatment."], ["Adaptive Equipment Training", "Document equipment training and carryover."], ["Discharge OT Summary", "Summarize functional progress and recommendations."]],
  cna: [["Daily Care Note", "Summarize direct care and observations."], ["Bathing Assistance", "Document bathing care and assistance level."], ["Feeding Assistance", "Record feeding assistance and intake."], ["Toileting", "Document toileting care and output observations."], ["Mobility Assistance", "Record transfers, ambulation, and assistance."], ["Behavior Observation", "Describe objective behavior observations."], ["Intake and Output", "Document measured intake and output."]],
  dietitian: [["Nutrition Assessment", "Create a comprehensive nutrition assessment."], ["Diet Follow-up", "Document response to the nutrition plan."], ["Tube Feeding", "Record enteral regimen and tolerance."], ["Weight Monitoring", "Document weight trend and related findings."], ["Nutrition Counseling", "Capture education and understanding."], ["Meal Intake Review", "Summarize meal intake and barriers."]],
  "social-worker": [["Psychosocial Assessment", "Document needs, supports, and barriers."], ["Family Meeting", "Record participants, discussion, and outcomes."], ["Discharge Planning", "Document disposition planning and barriers."], ["Community Resources", "Record resources discussed and referrals."], ["Counseling Note", "Document the encounter and stated response."], ["Care Coordination", "Capture coordination activities and outcomes."]],
  "home-health": [["Home Visit", "Document skilled services and patient response."], ["Medication Compliance", "Record medication review and adherence teaching."], ["Safety Assessment", "Document risks and safety education."], ["Caregiver Education", "Capture caregiver teaching and understanding."], ["Home Environment Assessment", "Document relevant home-environment findings."], ["Follow-up Visit", "Record progress and continuing skilled need."]],
};

const icons = ["ClipboardPlus", "FileText", "Pill", "Gauge", "Activity", "TriangleAlert", "HeartHandshake", "Scan", "Clock3"];

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function examplesFor(id: string, name: string): TemplateExample[] {
  return ["Initial documentation", "Routine follow-up", "Change in status", "Care coordination", "Outcome review"].map((title, index) => ({
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
