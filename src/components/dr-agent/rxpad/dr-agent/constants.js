// ─────────────────────────────────────────────────────────────
// Doctor Agent v0 — Constants & Configuration
// ─────────────────────────────────────────────────────────────



// ═══════════════ FONT SIZE CONTRACT ═══════════════
// Welcome greet: 18px (text-[18px])   — greeting headline only
// Card headings: 16px (text-[16px])   — CardShell title, AgentHeader, modal h3
// Body text:     14px (text-[14px])   — all content / body text
// Section label: 12px (text-[12px])   — table headers, section sub-labels (not full-width section bars)
// Section summary bar + SectionTag: 14px semibold, 30px row height, 18px TPMedicalIcon — full-width bar or inline chip; default bg bg-tp-slate-100/70, label/icon tp-slate-500 (specialty: violet-50 + violet-600). Inline row keys (vitals, labs, Sx/Dx/Rx, Chronic:) use text-tp-slate-400 font-semibold.
// Tags/badges:   12px (text-[12px])   — CardShell badge, status pills, colored tags (not section headers)
// Chart labels:  10-12px              — axis ticks, donut center labels
// Minimum:       10px                 — nothing below 10px
//
// CASING: Tags and badges use sentence case (first letter capital, rest lowercase).
//         Never use CSS `uppercase` on tags. No ALL-CAPS labels.
// NO responsive font sizing — all fixed px values

// ═══════════════ PATIENT CONTEXT OPTIONS ═══════════════

export const RX_CONTEXT_OPTIONS = [
// Patients with appointments today
{ id: "__patient__", label: "Shyam GR", meta: "M, 25y · PAT0061 · 9567933357", kind: "patient", isToday: true, gender: "M", age: 25 },
{ id: "apt-neha", label: "Neha Gupta", meta: "F, 32y · PAT0042 · 9876501234", kind: "patient", isToday: true, gender: "F", age: 32 },
{ id: "apt-anjali", label: "Anjali Patel", meta: "F, 28y · PAT0088 · 9845123456", kind: "patient", isToday: true, gender: "F", age: 28 },
{ id: "apt-vikram", label: "Vikram Singh", meta: "M, 42y · PAT0045 · 9876543210", kind: "patient", gender: "M", age: 42 },
{ id: "apt-priya", label: "Priya Rao", meta: "F, 26y · PAT0112 · 8899776655", kind: "patient", isToday: true, gender: "F", age: 26 },
{ id: "apt-arjun", label: "Arjun S", meta: "M, 4y · PAT0203 · 7788994455", kind: "patient", isToday: true, gender: "M", age: 4 },
{ id: "apt-lakshmi", label: "Lakshmi K", meta: "F, 45y · PAT0076 · 9911223344", kind: "patient", isToday: true, gender: "F", age: 45 },
{ id: "apt-zerodata", label: "Ramesh M", meta: "M, 35y · PAT0190 · Walk-in", kind: "patient", isToday: true, gender: "M", age: 35 },
{ id: "apt-ramesh-ckd", label: "Ramesh Kumar", meta: "M, 76y · PAT0215 · Nephrology F/U", kind: "patient", isToday: true, gender: "M", age: 76 },
// Registered patients without appointment
{ id: "reg-meera", label: "Meera Sharma", meta: "F, 32y · PAT0034 · 9123456780", kind: "patient", gender: "F", age: 32 },
{ id: "reg-suresh", label: "Suresh Nair", meta: "M, 58y · PAT0019 · 8877665544", kind: "patient", gender: "M", age: 58 },
{ id: "reg-divya", label: "Divya Menon", meta: "F, 22y · PAT0155 · 9988771122", kind: "patient", gender: "F", age: 22 },
{ id: "reg-mohammad", label: "Mohammad Farooq", meta: "M, 67y · PAT0008 · 9000112233", kind: "patient", gender: "M", age: 67 },
{ id: "reg-kavitha", label: "Kavitha R", meta: "F, 39y · PAT0201 · 8765432109", kind: "patient", gender: "F", age: 39 }];


export const CONTEXT_PATIENT_ID = "__patient__";

/** Auto-sent from appointment-row AI icon — must match panel handling for quick snapshot vs full summary */
export const QUICK_CLINICAL_SNAPSHOT_PROMPT = "Quick clinical snapshot";

/**
 * Find RX_CONTEXT_OPTIONS id by patient ID or name.
 * Used when embedding DrAgentPanel in pages that use external patient identifiers.
 */
export function findContextIdByPatientId(patientId, patientName) {
  // Direct match by id
  const direct = RX_CONTEXT_OPTIONS.find((o) => o.id === patientId);
  if (direct) return direct.id;

  // Match by embedded patient ID (PAT0061, etc.) in meta
  const byMeta = RX_CONTEXT_OPTIONS.find((o) => o.meta?.includes(patientId));
  if (byMeta) return byMeta.id;

  // Match by name (case-insensitive)
  if (patientName) {
    const lower = patientName.toLowerCase();
    const byName = RX_CONTEXT_OPTIONS.find((o) => o.label.toLowerCase() === lower);
    if (byName) return byName.id;
  }

  return undefined;
}

// ═══════════════ SPECIALTY CONFIG ═══════════════

export const SPECIALTY_TABS = [
{ id: "gp", label: "GP", headerBg: "var(--tp-slate-50)", accentColor: "var(--tp-blue-500)", lightBg: "var(--tp-blue-50)", iconName: "stethoscope" },
{ id: "gynec", label: "Gynec", headerBg: "#FDF2F8", accentColor: "#EC4899", lightBg: "#FDF2F8", iconName: "female" },
{ id: "ophthal", label: "Ophthal", headerBg: "#F0FDFA", accentColor: "#14B8A6", lightBg: "#F0FDFA", iconName: "eye" },
{ id: "obstetric", label: "Obstetric", headerBg: "var(--tp-violet-50)", accentColor: "var(--tp-violet-500)", lightBg: "var(--tp-violet-50)", iconName: "baby" },
{ id: "pediatrics", label: "Pedia", headerBg: "var(--tp-blue-50)", accentColor: "var(--tp-blue-400)", lightBg: "var(--tp-blue-50)", iconName: "baby" }];


// ═══════════════ VITAL METADATA ═══════════════

export const VITAL_META = [
{
  key: "bp", label: "BP", unit: "mmHg", priority: 1,
  isAbnormal: (v) => v >= 140 || v <= 90,
  isCritical: (v) => v >= 180 || v <= 70
},
{
  key: "spo2", label: "SpO₂", unit: "%", priority: 2,
  isAbnormal: (v) => v < 95,
  isCritical: (v) => v < 90
},
{
  key: "pulse", label: "Pulse", unit: "bpm", priority: 3,
  isAbnormal: (v) => v > 100 || v < 50,
  isCritical: (v) => v > 130 || v < 40
},
{
  key: "temp", label: "Temp", unit: "°F", priority: 4,
  isAbnormal: (v) => v >= 100.4,
  isCritical: (v) => v >= 103
},
{
  key: "rr", label: "RR", unit: "/min", priority: 5,
  isAbnormal: (v) => v > 20 || v < 12,
  isCritical: (v) => v > 30 || v < 8
},
{
  key: "weight", label: "Weight", unit: "kg", priority: 6,
  isAbnormal: () => false,
  isCritical: () => false
},
{
  key: "height", label: "Height", unit: "cm", priority: 7,
  isAbnormal: () => false,
  isCritical: () => false
},
{
  key: "bmi", label: "BMI", unit: "", priority: 8,
  isAbnormal: (v) => v > 30 || v < 18.5,
  isCritical: (v) => v > 40 || v < 16
},
{
  key: "bloodSugar", label: "Blood Sugar", unit: "mg/dL", priority: 11,
  isAbnormal: (v) => v > 140,
  isCritical: (v) => v > 300
}];


// ═══════════════ SECTION TAG CONFIG ═══════════════

export const SECTION_TAGS = {
  vitals: { id: "vitals", label: "Today's Vitals", icon: "Heart Rate", sidebarTab: "vitals", copyDestination: "vitals" },
  labs: { id: "labs", label: "Key Labs", icon: "Lab", sidebarTab: "labResults", copyDestination: "labResults" },
  history: { id: "history", label: "Medical History", icon: "clipboard-activity", sidebarTab: "history", copyDestination: "history" },
  lastVisit: { id: "lastVisit", label: "Last Visit", icon: "medical-record", sidebarTab: "pastVisits", copyDestination: "rxpad" },
  symptoms: { id: "symptoms", label: "Symptoms Reported", icon: "thermometer", copyDestination: "rxpad" },
  examination: { id: "examination", label: "Examination", icon: "stethoscope", copyDestination: "rxpad" },
  diagnosis: { id: "diagnosis", label: "Diagnosis", icon: "Diagnosis", copyDestination: "rxpad" },
  medication: { id: "medication", label: "Medication", icon: "pill", sidebarTab: "pastVisits", copyDestination: "rxpad" },
  investigation: { id: "investigation", label: "Lab Investigations", icon: "Lab", copyDestination: "rxpad" },
  advice: { id: "advice", label: "Advice", icon: "clipboard-activity", copyDestination: "rxpad" },
  followUp: { id: "followUp", label: "Follow-up", icon: "medical-record", sidebarTab: "followUp", copyDestination: "followUp" },
  obstetric: { id: "obstetric", label: "Obstetric", icon: "Obstetric", sidebarTab: "obstetric", copyDestination: "obstetric" },
  gynec: { id: "gynec", label: "Gynec", icon: "Gynec", sidebarTab: "gynec", copyDestination: "gynec" },
  growth: { id: "growth", label: "Growth", icon: "Heart Rate Monitor", sidebarTab: "growth", copyDestination: "growth" },
  vaccine: { id: "vaccine", label: "Vaccine", icon: "injection", sidebarTab: "vaccine", copyDestination: "vaccine" }
};

// ═══════════════ AI STYLING ═══════════════

export const AI_GRADIENT = "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)";
export const AI_GRADIENT_SOFT = "linear-gradient(135deg, rgba(213,101,234,0.08) 0%, rgba(103,58,172,0.08) 50%, rgba(26,25,148,0.08) 100%)";
export const AI_GRADIENT_BORDER = "linear-gradient(135deg, rgba(213,101,234,0.3) 0%, rgba(103,58,172,0.3) 50%, rgba(26,25,148,0.3) 100%)";

// ═══════════════ AI ANIMATED GRADIENT (subtle flow for canned message icons) ═══════════════
export const AI_GRADIENT_SOFT_ANIMATED =
"linear-gradient(135deg, rgba(213,101,234,0.18) 0%, rgba(139,92,246,0.22) 25%, rgba(103,58,172,0.18) 50%, rgba(26,25,148,0.15) 75%, rgba(213,101,234,0.18) 100%)";

// ═══════════════ AI PILL STYLING ═══════════════
export const AI_PILL_BG = "linear-gradient(135deg, rgba(213,101,234,0.08) 0%, rgba(103,58,172,0.08) 50%, rgba(26,25,148,0.08) 100%)";
export const AI_PILL_BG_HOVER = "linear-gradient(135deg, rgba(213,101,234,0.14) 0%, rgba(103,58,172,0.14) 50%, rgba(26,25,148,0.14) 100%)";
export const AI_PILL_BORDER = "1px solid rgba(103,58,172,0.15)";
export const AI_PILL_TEXT_GRADIENT = "linear-gradient(91deg, #D565EA 3.04%, #673AAC 66.74%, #1A1994 130.45%)";

// ═══════════════ CARD SIZING ═══════════════

export const CARD = {
  radius: 12,
  headerIconSize: 26,
  headerIconRadius: 8,
  titleSize: 16,
  bodySize: 14,
  secondarySize: 12,
  tagSize: 13,
  ctaHeight: 30,
  ctaRadius: 10,
  ctaFontSize: 14,
  padding: { x: 12, y: 8 }
};

// ═══════════════ PHASE PROMPTS (for prompt chips) ═══════════════

export const PHASE_PROMPTS = {
  empty: ["Patient's detailed summary", "Last visit", "Abnormal labs", "Reported by patient"],
  symptoms_entered: ["Generate DDX", "Last visit compare", "Vitals review", "Lab focus"],
  dx_accepted: ["Medication plan", "Investigations", "Advice draft", "Follow-up plan"],
  meds_written: ["Refine advice", "Translate advice", "Follow-up plan", "Completeness check"],
  near_complete: ["Final checklist", "Translate advice", "Visit review", "Risk recap"]
};

// ═══════════════ TAB PROMPTS ═══════════════

export const TAB_PROMPTS = {
  "dr-agent": ["Patient's detailed summary", "Abnormal findings", "Last visit essentials"],
  "past-visits": ["Last visit essentials", "Previous comparison", "Recurrence check"],
  vitals: ["Vitals overview", "Concerning vitals", "Trend if relevant"],
  history: ["Chronic history", "Allergy safety", "Family/lifestyle context"],
  "lab-results": ["Flagged labs", "Latest panel focus", "Follow-up lab suggestion"],
  obstetric: ["Obstetric highlights", "ANC due items", "Pregnancy risk checks"],
  "medical-records": ["Latest document insights", "Abnormal OCR findings", "Older record lookup"]
};

// ═══════════════ SIDEBAR CTA MAP ═══════════════

export const SIDEBAR_CTA_MAP = {
  last_visit: { text: "See all past visits →", tab: "pastVisits" },
  vitals_trend_bar: { text: "View full vitals history →", tab: "vitals" },
  vitals_trend_line: { text: "View full vitals history →", tab: "vitals" },
  lab_panel: { text: "View complete lab report →", tab: "labResults" },
  lab_comparison: { text: "View full lab history →", tab: "labResults" },
  ocr_pathology: { text: "View in Medical Records →", tab: "medicalRecords" },
  ocr_extraction: { text: "View in Medical Records →", tab: "medicalRecords" },
  obstetric_summary: { text: "View full obstetric record →", tab: "obstetric" },
  gynec_summary: { text: "View gynec history →", tab: "gynec" },
  pediatric_summary: { text: "View growth chart →", tab: "growth" },
  ophthal_summary: { text: "View full ophthal history →", tab: "ophthal" },
  med_history: { text: "View full medical history →", tab: "history" },
  patient_summary: { text: "View full medical history →", tab: "history" }
};


export const VOICE_RX_CONSULT_OPTIONS = [
{
  value: "ambient_consultation",
  description: "Capture live doctor–patient conversation in the room."
},
{
  value: "dictation_consultation",
  description: "You dictate clinical content; optimized for solo narration."
}];
