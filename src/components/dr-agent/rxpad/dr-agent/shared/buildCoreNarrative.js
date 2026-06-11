const ABBREV_MAP = {
  HTN: "Hypertension", DM: "Diabetes Mellitus", DM2: "Type 2 Diabetes",
  CKD: "Chronic Kidney Disease", CAD: "Coronary Artery Disease",
  COPD: "Chronic Obstructive Pulmonary Disease", HF: "Heart Failure",
  AF: "Atrial Fibrillation", DVT: "Deep Vein Thrombosis",
  PE: "Pulmonary Embolism", CVA: "Cerebrovascular Accident",
  MI: "Myocardial Infarction", T2DM: "Type 2 Diabetes Mellitus",
  GERD: "Gastroesophageal Reflux Disease", UTI: "Urinary Tract Infection",
  SpO2: "Oxygen Saturation", BP: "Blood Pressure", HR: "Heart Rate",
  RR: "Respiratory Rate", Temp: "Temperature",
};

export function expandAbbreviation(text) {
  if (!text) return text;
  return text.replace(/\b([A-Z]{2,6}(?:\d)?)\b/g, (match) => ABBREV_MAP[match] || match);
}

export function extractDemographicsLine(summary) {
  const parts = [];
  if (summary.age) parts.push(`${summary.age}y`);
  if (summary.gender) parts.push(summary.gender);
  if (summary.weight) parts.push(`${summary.weight}kg`);
  return parts.join(", ");
}

export function buildCoreNarrative(summary) {
  const lines = [];
  if (summary.chiefComplaint) lines.push(`Chief complaint: ${summary.chiefComplaint}`);
  if (summary.primaryDx?.length) lines.push(`Diagnosis: ${summary.primaryDx.join(", ")}`);
  if (summary.activeMedications?.length) lines.push(`On: ${summary.activeMedications.slice(0, 3).join(", ")}`);
  if (summary.allergies?.length) lines.push(`Allergies: ${summary.allergies.join(", ")}`);
  return lines.join(" · ");
}

export function narrativeToPlainText(summary) {
  return buildCoreNarrative(summary);
}

export function patientHasQuickClinicalSnapshotData(summary) {
  return !!(
    summary.chiefComplaint ||
    (summary.primaryDx && summary.primaryDx.length > 0) ||
    (summary.specialtyTags && summary.specialtyTags.length > 0)
  );
}

export function buildQuickClinicalSnapshotText(summary) {
  const parts = [];
  const demo = extractDemographicsLine(summary);
  if (demo) parts.push(demo);
  if (summary.chiefComplaint) parts.push(`presenting with ${summary.chiefComplaint}`);
  if (summary.primaryDx?.length) parts.push(`diagnosed with ${summary.primaryDx.slice(0, 2).join(" and ")}`);
  if (summary.activeMedications?.length) parts.push(`currently on ${summary.activeMedications.slice(0, 2).join(", ")}`);
  if (summary.todayVitals) {
    const vitals = [];
    if (summary.todayVitals.bp) vitals.push(`BP ${summary.todayVitals.bp}`);
    if (summary.todayVitals.hr) vitals.push(`HR ${summary.todayVitals.hr}`);
    if (summary.todayVitals.spo2) vitals.push(`SpO₂ ${summary.todayVitals.spo2}%`);
    if (vitals.length) parts.push(`Vitals: ${vitals.join(", ")}`);
  }
  return parts.join(". ") + ".";
}

export function buildQuickClinicalSnapshotInlineSuggestions(summary, _mode = "compact") {
  const suggestions = [];
  if (summary.primaryDx?.length) suggestions.push({ id: "ddx", label: "Suggest DDX", tone: "primary" });
  if (summary.labResults?.length) suggestions.push({ id: "labs", label: "Lab overview", tone: "primary" });
  if (summary.activeMedications?.length) suggestions.push({ id: "meds", label: "Current medications", tone: "primary" });
  suggestions.push({ id: "summary", label: "Full patient summary", tone: "secondary" });
  return suggestions.slice(0, 4);
}

export function buildCardSituationQuote(summary) {
  return buildQuickClinicalSnapshotText(summary);
}
