// Fictional organization data for visual review only. Never contains patient data.
export const organization = { name: "Evergreen Care Group", region: "United States", facilities: 4, departments: 12, clinicians: 248, activeClinicians: 186, notes: 4280 };
export const facilities = [
  { name: "Evergreen Medical Center", kind: "Hospital", location: "Portland, OR", clinicians: 96, departments: 5 },
  { name: "Riverbend Senior Care", kind: "Skilled nursing", location: "Salem, OR", clinicians: 68, departments: 3 },
  { name: "Cedar Grove Rehabilitation", kind: "Rehabilitation", location: "Eugene, OR", clinicians: 52, departments: 2 },
  { name: "Evergreen Home Health", kind: "Home health", location: "Portland, OR", clinicians: 32, departments: 2 },
];
export const departments = [
  { name: "Nursing", facility: "Evergreen Medical Center", clinicians: 48 },
  { name: "Acute Care", facility: "Evergreen Medical Center", clinicians: 28 },
  { name: "Rehabilitation", facility: "Cedar Grove Rehabilitation", clinicians: 36 },
  { name: "Care Coordination", facility: "Riverbend Senior Care", clinicians: 18 },
  { name: "Home Nursing", facility: "Evergreen Home Health", clinicians: 20 },
];
export const users = [
  { name: "Alex Morgan", profession: "Nurse", facility: "Evergreen Medical Center", role: "Organization Admin" },
  { name: "Jordan Lee", profession: "Physician", facility: "Evergreen Medical Center", role: "Clinician" },
  { name: "Taylor Brooks", profession: "Nurse Practitioner", facility: "Riverbend Senior Care", role: "Facility Admin" },
  { name: "Casey Rivera", profession: "Physical Therapist", facility: "Cedar Grove Rehabilitation", role: "Clinician" },
];
export const ehrPlatforms = ["Epic", "PointClickCare", "Oracle Health", "athenahealth", "MEDITECH", "eClinicalWorks", "MatrixCare", "Homecare Homebase"];
export const professions = ["Nurses", "Nurse Practitioners", "Physicians", "Physician Assistants", "Physical Therapists", "Occupational Therapists", "Speech Therapists", "Pharmacists", "Dietitians", "Other"];
export const enterpriseFeatures = ["Multi-Facility Management", "Organization Dashboard", "Department Management", "Enterprise Analytics", "AI Documentation", "Role-Based Access", "Enterprise Security", "Audit Logs", "Future EHR Integrations", "Priority Support"];
export const monthlyUsage = [{ month: "April", notes: 2180 }, { month: "May", notes: 2840 }, { month: "June", notes: 3260 }, { month: "July", notes: 3540 }, { month: "August", notes: 3920 }, { month: "September", notes: 4280 }];
