export type Mode = {
  id: string;
  name: string;
  icon: string;
  description: string;
  terminology: string;
  systemPrompt: string;
};

export type TemplateExample = {
  id: string;
  title: string;
  starter: string;
};

export type ClinicalTemplate = {
  id: string;
  modeIds: string[];
  name: string;
  icon: string;
  description: string;
  examples: TemplateExample[];
};

export const modes: Mode[] = [
  { id: "nurse", name: "Nurse", icon: "Stethoscope", description: "Bedside, long-term care, and community nursing documentation.", terminology: "nursing observations, interventions, responses, and handoff language", systemPrompt: "Write nursing documentation focused on observed status, interventions performed, and patient response. Never diagnose." },
  { id: "physician", name: "Physician", icon: "BadgePlus", description: "Encounter notes, assessments, and physician documentation.", terminology: "history, examination, assessment, and plan terminology", systemPrompt: "Write physician documentation using encounter-appropriate HPI, exam, assessment, and plan structure." },
  { id: "nurse-practitioner", name: "Nurse Practitioner", icon: "HeartPulse", description: "Advanced practice evaluation and care documentation.", terminology: "advanced practice evaluation and plan terminology", systemPrompt: "Write advanced practice nursing documentation, keeping reported facts distinct from clinical assessment." },
  { id: "pharmacist", name: "Pharmacist", icon: "Pill", description: "Medication review, counseling, and pharmacy interventions.", terminology: "medication therapy, adherence, interactions, and counseling terminology", systemPrompt: "Write pharmacist documentation focused on medication therapy review, counseling, and documented interventions." },
  { id: "physical-therapist", name: "Physical Therapist", icon: "Accessibility", description: "Mobility, function, goals, and treatment sessions.", terminology: "mobility, functional status, assistance levels, goals, and therapeutic exercise", systemPrompt: "Write physical therapy documentation with objective functional measures and response to treatment." },
  { id: "respiratory-therapist", name: "Respiratory Therapist", icon: "Wind", description: "Respiratory assessment, treatments, and response.", terminology: "airway, oxygenation, ventilation, respiratory treatment, and response", systemPrompt: "Write respiratory therapy documentation focused on respiratory status, device settings, treatment, and response." },
  { id: "occupational-therapist", name: "Occupational Therapist", icon: "Hand", description: "ADLs, participation, adaptive strategies, and progress.", terminology: "ADLs, participation, adaptive equipment, cueing, and functional goals", systemPrompt: "Write occupational therapy documentation focused on ADLs, participation, assistance, and progress toward goals." },
  { id: "dietitian", name: "Dietitian", icon: "Apple", description: "Nutrition assessment, intervention, and monitoring.", terminology: "intake, nutrition status, estimated needs, intervention, and monitoring", systemPrompt: "Write dietitian documentation focused on nutrition assessment, intake, interventions, and monitoring." },
  { id: "cna", name: "CNA", icon: "UserRoundCheck", description: "Direct-care observations and activities of daily living.", terminology: "ADLs, intake/output, mobility assistance, hygiene, and observed changes", systemPrompt: "Write concise CNA documentation limited to direct observations and care provided; do not use licensed-nurse assessment language." },
  { id: "social-worker", name: "Social Worker", icon: "Brain", description: "Psychosocial assessment, resources, and care coordination.", terminology: "psychosocial needs, supports, barriers, resources, and care coordination", systemPrompt: "Write social work documentation focused on psychosocial needs, interventions, resources, and stated outcomes." },
  { id: "home-health", name: "Home Health", icon: "HousePlus", description: "Skilled home visits, teaching, and homebound documentation.", terminology: "skilled need, homebound status, teaching, caregiver support, and visit response", systemPrompt: "Write home-health documentation focused on skilled need, teaching, patient/caregiver response, and the home setting." },
];

const scenarios: Record<string, string[]> = {
  "general-progress-note": ["Stable Patient", "Post-Fall Observation", "Medication Follow-up", "Pain Reassessment", "Behavior Monitoring"],
  "medication-administration": ["Routine Medication", "PRN Medication", "Insulin Administration", "Antibiotic Administration", "Medication Refusal"],
  "skin-assessment": ["Pressure Injury", "Skin Tear", "Dressing Change", "Redness Monitoring", "Weekly Skin Check"],
  "wound-care": ["Routine Dressing Change", "Wound Measurement", "Drainage Change", "Healing Progress", "Provider Notification"],
  "incident-report": ["Unwitnessed Fall", "Medication Variance", "Skin Injury", "Behavioral Event", "Equipment Event"],
  "admission-note": ["LTC Admission", "Post-Acute Transfer", "Home Health Start", "Hospice Admission", "Readmission"],
  "discharge-summary": ["Home Discharge", "Facility Transfer", "Goals Met", "Against Advice", "Hospice Transition"],
  "pain-assessment": ["Acute Pain", "Chronic Pain", "Post-Intervention", "Nonverbal Indicators", "PRN Follow-up"],
  "vitals-note": ["Routine Vitals", "Elevated Blood Pressure", "Fever Follow-up", "Low Oxygen Saturation", "Blood Glucose Check"],
  "change-of-condition": ["Respiratory Change", "Mental Status Change", "New Edema", "Reduced Intake", "Provider Notification"],
  "skilled-nursing-note": ["Cardiopulmonary Assessment", "Diabetes Teaching", "Medication Management", "Postoperative Care", "Safety Education"],
  "behavior-note": ["Anxiety Episode", "Refusal of Care", "Agitation", "Redirection Effective", "Sleep Pattern"],
  "hospice-note": ["Comfort Visit", "Symptom Follow-up", "Family Support", "Actively Dying", "Medication Effectiveness"],
  "communication-note": ["Provider Update", "Family Call", "Care Team Huddle", "New Order Read-back", "Case Manager Update"],
  "transfer-note": ["Emergency Transfer", "Planned Appointment", "Hospital Return", "Unit Transfer", "Transport Handoff"],
  "patient-education": ["Medication Teaching", "Fall Prevention", "Wound Care", "Diet Education", "Discharge Instructions"],
  "shift-summary": ["Stable Shift", "Change During Shift", "Pending Follow-up", "High-Acuity Handoff", "Night Shift Summary"],
};

function examplesFor(id: string, templateName: string): TemplateExample[] {
  return (scenarios[id] ?? ["Initial Evaluation", "Routine Follow-up", "Progress Update", "Care Coordination", "Discharge"]).map((title, index) => ({
    id: `${id}-${index + 1}`,
    title,
    starter: `I want to create a ${templateName} for a ${title.toLowerCase()} scenario. Ask me only for the missing clinical facts needed to customize it, one short group of questions at a time. Do not invent details.`,
  }));
}

const nurseTemplateSeed = [
  ["general-progress-note", "General Progress Note", "FileText", "Turn observations and care delivered into a concise chronological note."],
  ["skilled-nursing-note", "Skilled Nursing Note", "ClipboardPlus", "Document skilled assessment, intervention, teaching, and response."],
  ["medication-administration", "Medication Administration", "Pill", "Record administration details, response, refusal, or follow-up."],
  ["change-of-condition", "Change of Condition", "Activity", "Structure a focused change, notifications, orders, and response."],
  ["admission-note", "Admission Note", "LogIn", "Capture baseline status, risks, orders, and initial plan."],
  ["discharge-summary", "Discharge Summary", "LogOut", "Summarize status, teaching, medications, and disposition."],
  ["pain-assessment", "Pain Assessment", "Gauge", "Document pain findings, intervention, and reassessment."],
  ["vitals-note", "Vitals Note", "HeartPulse", "Record vital signs with context and relevant follow-up."],
  ["skin-assessment", "Skin Assessment", "Scan", "Describe skin integrity, location, measurements, and actions."],
  ["wound-care", "Wound Care", "Bandage", "Create a precise wound assessment and treatment note."],
  ["incident-report", "Incident Report", "TriangleAlert", "Build a factual, objective event record without conclusions."],
  ["behavior-note", "Behavior Note", "Brain", "Document observed behavior, antecedents, interventions, and response."],
  ["hospice-note", "Hospice Note", "HeartHandshake", "Capture comfort, symptoms, interventions, and family support."],
  ["communication-note", "Communication Note", "MessagesSquare", "Record who was contacted, information shared, and outcome."],
  ["transfer-note", "Transfer Note", "Ambulance", "Prepare a clear transfer summary and receiving handoff."],
  ["patient-education", "Patient Education", "GraduationCap", "Document teaching content, method, understanding, and barriers."],
  ["shift-summary", "Shift Summary", "Clock3", "Assemble a concise end-of-shift clinical handoff."],
] as const;

export const templates: ClinicalTemplate[] = nurseTemplateSeed.map(([id, name, icon, description]) => ({
  id,
  name,
  icon,
  description,
  modeIds: id === "general-progress-note" || id === "discharge-summary" || id === "patient-education" ? modes.map((mode) => mode.id) : ["nurse", "home-health", "cna"],
  examples: examplesFor(id, name),
}));

export function getMode(id: string) {
  return modes.find((mode) => mode.id === id) ?? modes[0];
}

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id) ?? templates[0];
}
