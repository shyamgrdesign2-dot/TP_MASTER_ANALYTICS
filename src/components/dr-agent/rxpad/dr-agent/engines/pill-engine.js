// -----------------------------------------------------------------
// Canned Pill Engine -- 4-Layer Priority Pipeline
// Pure function: (summary, phase, tabLens) -> CannedPill[]
// -----------------------------------------------------------------



const MAX_PILLS = 35;

// =============== LAYER 1: SAFETY FORCE ===============
function getLayer1(summary) {
  const pills = [];

  // SpO2 critical
  const spo2 = summary.todayVitals?.spo2 ? parseFloat(summary.todayVitals.spo2) : null;
  if (spo2 !== null && spo2 < 90) {
    pills.push({ id: "force-spo2-critical", label: "Review SpO₂", priority: 0, layer: 1, force: true, tone: "primary" });
  }

  // Allergies present
  if (summary.allergies && summary.allergies.length > 0) {
    pills.push({ id: "force-allergy", label: "Allergy Alert", priority: 2, layer: 1, force: true, tone: "primary" });
  }

  return pills;
}

// =============== LAYER 2: CLINICAL FLAGS ===============
function getLayer2(summary) {
  const pills = [];

  if (summary.labFlagCount >= 3) {
    pills.push({ id: "flag-labs", label: `${summary.labFlagCount} lab values flagged`, priority: 10, layer: 2, tone: "primary" });
  }

  const spo2 = summary.todayVitals?.spo2 ? parseFloat(summary.todayVitals.spo2) : null;
  if (spo2 !== null && spo2 >= 90 && spo2 < 95) {
    pills.push({ id: "flag-spo2-declining", label: "SpO₂ trend declining", priority: 14, layer: 2, tone: "primary" });
  }

  // Check vital abnormals
  if (summary.todayVitals?.bp) {
    const sys = parseFloat(summary.todayVitals.bp.split("/")[0]);
    if (sys > 140 || sys < 90) {
      pills.push({ id: "flag-vitals-bp", label: "BP needs attention", priority: 16, layer: 2, tone: "primary" });
    }
  }

  if (summary.todayVitals?.temp) {
    const temp = parseFloat(summary.todayVitals.temp);
    if (temp >= 100.4) {
      pills.push({ id: "flag-vitals-temp", label: "Temperature elevated", priority: 18, layer: 2, tone: "primary" });
    }
  }

  // Specialty-aware clinical pills (Layer 2 when clinically relevant)
  if (summary.obstetricData) {
    pills.push({ id: "specialty-obstetric", label: "Obstetric summary", priority: 20, layer: 2, tone: "primary" });
  }

  if (summary.gynecData) {
    pills.push({ id: "specialty-gynec", label: "Gynec summary", priority: 22, layer: 2, tone: "primary" });
  }

  if (summary.pediatricsData) {
    pills.push({ id: "specialty-pediatrics", label: "Growth & vaccines", priority: 24, layer: 2, tone: "primary" });
  }

  if (summary.ophthalData) {
    pills.push({ id: "specialty-ophthal", label: "Vision summary", priority: 26, layer: 2, tone: "primary" });
  }

  // POMR per-problem pills (CKD, Hypertension, Diabetes, Anaemia, etc.)
  if (summary.pomrProblems && summary.pomrProblems.length > 0) {
    summary.pomrProblems.forEach((prob, i) => {
      const shortLabel = prob.problem.split(/[/–—]/)[0].trim();
      pills.push({
        id: `pomr-${i}-${shortLabel.toLowerCase().replace(/\s+/g, "-")}`,
        label: shortLabel,
        priority: 28 + i,
        layer: 2,
        tone: "primary"
      });
    });

    // Missing data pills
    if (summary.missingExpectedFields && summary.missingExpectedFields.length > 0) {
      pills.push({ id: "pomr-missing-data", label: `${summary.missingExpectedFields.length} missing tests`, priority: 35, layer: 2, tone: "primary" });
    }

    // Cross-problem interaction pills
    if (summary.crossProblemFlags && summary.crossProblemFlags.length > 0) {
      pills.push({ id: "pomr-cross-flags", label: "Drug interactions", priority: 36, layer: 2, tone: "primary" });
    }

    // Due alerts pills
    if (summary.dueAlerts && summary.dueAlerts.length > 0) {
      pills.push({ id: "pomr-due-alerts", label: `${summary.dueAlerts.length} overdue items`, priority: 37, layer: 2, tone: "primary" });
    }

    // Recommendation pills
    if (summary.recommendationTiers) {
      const actCount = summary.recommendationTiers.filter((r) => r.tier === "act").length;
      if (actCount > 0) {
        pills.push({ id: "pomr-act-now", label: `${actCount} actions needed`, priority: 38, layer: 2, tone: "primary" });
      }
    }
  }

  // Record alerts
  if (summary.recordAlerts && summary.recordAlerts.length > 0) {
    pills.push({ id: "flag-records", label: "Pending records", priority: 39, layer: 2, tone: "primary" });
  }

  // ---- CKD / chronic-disease-aware clinical pills ----

  // Dialysis-related pills
  if (summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("ckd"))) {
    pills.push({ id: "ckd-dialysis-adequacy", label: "Dialysis adequacy", priority: 40, layer: 2, tone: "primary" });
    pills.push({ id: "ckd-fluid-balance", label: "Fluid & electrolytes", priority: 41, layer: 2, tone: "primary" });
    pills.push({ id: "ckd-bone-mineral", label: "Bone mineral status", priority: 42, layer: 2, tone: "primary" });
    pills.push({ id: "ckd-cardiovascular", label: "CV risk assessment", priority: 43, layer: 2, tone: "primary" });
  }

  // Diabetes-related pills
  if (summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("diabetes"))) {
    pills.push({ id: "dm-glycemic-control", label: "Glycemic control", priority: 44, layer: 2, tone: "primary" });
    pills.push({ id: "dm-insulin-adjust", label: "Insulin adjustment", priority: 45, layer: 2, tone: "primary" });
  }

  // Anaemia-related pills
  if (summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("anaemia") || p.problem.toLowerCase().includes("anemia"))) {
    pills.push({ id: "anaemia-epo-dose", label: "EPO dosing", priority: 46, layer: 2, tone: "primary" });
    pills.push({ id: "anaemia-iron-stores", label: "Iron stores", priority: 47, layer: 2, tone: "primary" });
  }

  // Multi-morbidity pills (when 3+ problems)
  if (summary.pomrProblems && summary.pomrProblems.length >= 3) {
    pills.push({ id: "pomr-polypharmacy", label: "Polypharmacy review", priority: 48, layer: 2, tone: "primary" });
    pills.push({ id: "pomr-medication-timeline", label: "Medication timeline", priority: 49, layer: 2, tone: "primary" });
  }

  // Active medications review
  if (summary.activeMeds && summary.activeMeds.length > 3) {
    pills.push({ id: "flag-med-review", label: "Medication review", priority: 50, layer: 2, tone: "primary" });
  }

  // Chronic conditions
  if (summary.chronicConditions && summary.chronicConditions.length > 0) {
    pills.push({ id: "flag-chronic-summary", label: "Chronic conditions", priority: 51, layer: 2, tone: "primary" });
  }

  return pills;
}

// =============== LAYER 3: CONSULTATION PHASE (Patient-Data-Aware) ===============
function getLayer3(phase, summary) {
  const hasVitals = !!(summary.todayVitals && Object.keys(summary.todayVitals).length > 0);
  const hasLabs = !!(summary.keyLabs && summary.keyLabs.length > 0);
  const hasLastVisit = !!summary.lastVisit;
  const isNewPatient = summary.symptomCollectorData?.isNewPatient || summary.specialtyTags.length === 0;
  const hasSymptoms = !!summary.symptomCollectorData?.symptoms?.length;

  function buildEmpty() {
    if (isNewPatient) {
      // New patient — no past data to show, focus on intake + initial workup
      const pills = [];
      if (hasSymptoms) pills.push({ id: "phase-intake", label: "Reported by patient", priority: 30, layer: 3, tone: "primary" });
      pills.push({ id: "phase-ddx", label: "Suggest DDX", priority: 32, layer: 3, tone: "primary" });
      pills.push({ id: "phase-initial-workup", label: "Initial investigations", priority: 34, layer: 3, tone: "primary" });
      pills.push({ id: "phase-ask", label: "Ask me anything", priority: 36, layer: 3, tone: "primary" });
      return pills;
    }
    // Existing patient — show pills for data that actually exists
    const pills = [];
    const hasIntake = !!summary.symptomCollectorData?.symptoms?.length;
    const hasFlaggedLabs = !!summary.keyLabs?.some((l) => l.flag === "high" || l.flag === "low");
    const hasFollowUp = !!summary.followUpOverdueDays;
    // Always show "Patient's detailed summary" as the absolute first pill
    pills.push({ id: "phase-detailed-summary", label: "Patient's detailed summary", priority: -1, layer: 3, force: true, tone: "primary" });
    if (hasIntake) pills.push({ id: "phase-intake", label: "Reported by patient", priority: 30, layer: 3, tone: "primary" });
    if (hasVitals) pills.push({ id: "phase-vital-trends", label: "Vital trends", priority: 31, layer: 3, tone: "primary" });
    if (hasFlaggedLabs) pills.push({ id: "phase-flagged-labs", label: "Flagged lab results", priority: 32, layer: 3, tone: "primary" }); else
    if (hasLabs) pills.push({ id: "phase-labs", label: "Lab overview", priority: 32, layer: 3, tone: "primary" });
    if (hasLastVisit) pills.push({ id: "phase-last-visit", label: "Last visit details", priority: 33, layer: 3, tone: "primary" });
    if (hasFollowUp) pills.push({ id: "phase-followup-overview", label: "Follow-up overview", priority: 34, layer: 3, tone: "primary" });
    pills.push({ id: "phase-ask", label: "Ask me anything", priority: 36, layer: 3, tone: "primary" });
    return pills;
  }

  function buildSymptomsEntered() {
    const pills = [
    { id: "phase-ddx", label: "Suggest DDX", priority: 30, layer: 3, tone: "primary" }];

    if (hasLastVisit) pills.push({ id: "phase-compare", label: "Compare with last visit", priority: 32, layer: 3, tone: "primary" });
    if (hasVitals) pills.push({ id: "phase-vital-trends", label: "Vital trends", priority: 33, layer: 3, tone: "primary" });
    if (!hasLastVisit) pills.push({ id: "phase-investigation", label: "Suggest investigations", priority: 34, layer: 3, tone: "primary" });
    return pills;
  }

  const generators = {
    empty: buildEmpty,
    symptoms_entered: buildSymptomsEntered,
    dx_accepted: () => [
    { id: "phase-protocol-meds", label: "Suggest medications", priority: 30, layer: 3, tone: "primary" },
    { id: "phase-investigation", label: "Suggest investigations", priority: 32, layer: 3, tone: "primary" },
    { id: "phase-advice", label: "Draft advice", priority: 34, layer: 3, tone: "primary" },
    { id: "phase-followup", label: "Plan follow-up", priority: 36, layer: 3, tone: "primary" }],

    meds_written: () => [
    { id: "phase-translate", label: "Translate to regional", priority: 32, layer: 3, tone: "primary" },
    { id: "phase-followup", label: "Plan follow-up", priority: 34, layer: 3, tone: "primary" }],

    near_complete: () => [
    { id: "phase-completeness", label: "Completeness check", priority: 30, layer: 3, tone: "primary" },
    { id: "phase-translate", label: "Translate advice", priority: 32, layer: 3, tone: "primary" },
    { id: "phase-summary-final", label: "Visit summary", priority: 34, layer: 3, tone: "primary" }]

  };

  const base = (generators[phase] || generators.empty)();

  // Add lab comparison pill when labs are available (all phases)
  if (hasLabs && !base.some((p) => p.id === "phase-lab-compare")) {
    base.push({ id: "phase-lab-compare", label: "Lab comparison", priority: 55, layer: 3, tone: "primary" });
  }

  return base;
}

// =============== LAYER 4: TAB LENS ===============
function getLayer4(lens) {
  const map = {
    "dr-agent": [],
    "past-visits": [
    { id: "lens-compare", label: "Compare visits", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-recurrence", label: "Recurrence check", priority: 62, layer: 4, tone: "primary" }],

    vitals: [
    { id: "lens-vital-trends", label: "Vital trends", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-graph", label: "Graph view", priority: 62, layer: 4, tone: "primary" }],

    history: [
    { id: "lens-med-search", label: "Med history search", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-chronic-timeline", label: "Chronic timeline", priority: 62, layer: 4, tone: "primary" }],

    "lab-results": [
    { id: "lens-lab-compare", label: "Lab comparison", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-annual-panel", label: "Annual panel", priority: 62, layer: 4, tone: "primary" }],

    obstetric: [
    { id: "lens-ob-summary", label: "Obstetric summary", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-anc", label: "ANC schedule", priority: 62, layer: 4, tone: "primary" }],

    "medical-records": [
    { id: "lens-ocr", label: "OCR analysis", priority: 60, layer: 4, tone: "primary" },
    { id: "lens-extract", label: "Report extract", priority: 62, layer: 4, tone: "primary" }]

  };
  return map[lens] || [];
}

// =============== TREATING PHYSICIAN — trend-focused pills ===============
function getTreatingPhysicianPills(summary) {
  const pills = [];

  // Always show detailed summary as the absolute first pill
  pills.push({ id: "tp-detailed-summary", label: "Patient's detailed summary", priority: -1, layer: 3, force: true, tone: "primary" });
  pills.push({ id: "tp-vital-trends", label: "Vital trends", priority: 30, layer: 3, tone: "primary" });

  if (summary.keyLabs && summary.keyLabs.length > 0) {
    pills.push({ id: "tp-lab-compare", label: "Lab comparison", priority: 31, layer: 3, tone: "primary" });
  }

  // CKD-specific trends
  if (summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("ckd"))) {
    pills.push({ id: "tp-egfr-trend", label: "eGFR trend", priority: 32, layer: 3, tone: "primary" });
  }

  // Diabetes-specific trends
  if (summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("diabetes"))) {
    pills.push({ id: "tp-hba1c-trend", label: "HbA1c trend", priority: 33, layer: 3, tone: "primary" });
  }

  pills.push({ id: "tp-med-timeline", label: "Medication timeline", priority: 34, layer: 3, tone: "primary" });
  pills.push({ id: "tp-plan-followup", label: "Plan follow-up", priority: 35, layer: 3, tone: "primary" });
  pills.push({ id: "tp-ask", label: "Ask me anything", priority: 36, layer: 3, tone: "primary" });

  return pills;
}

// =============== EMERGENCY — triage-only pills ===============
function getEmergencyPills(summary) {
  const pills = [];

  // Force allergy alert if allergies present
  if (summary.allergies && summary.allergies.length > 0) {
    pills.push({ id: "er-allergy", label: "Allergy Alert", priority: 0, layer: 1, force: true, tone: "primary" });
  }

  // Cross-problem interactions
  if (summary.crossProblemFlags && summary.crossProblemFlags.length > 0) {
    pills.push({ id: "er-interactions", label: "Drug interactions", priority: 10, layer: 2, tone: "primary" });
  }

  // Always show detailed summary as the absolute first pill
  pills.push({ id: "er-detailed-summary", label: "Patient's detailed summary", priority: -1, layer: 2, force: true, tone: "primary" });

  pills.push({ id: "er-recent-er", label: "Recent ER history", priority: 12, layer: 2, tone: "primary" });
  pills.push({ id: "er-key-labs", label: "Key labs", priority: 14, layer: 2, tone: "primary" });
  pills.push({ id: "er-active-meds", label: "Active medications", priority: 16, layer: 2, tone: "primary" });

  return pills;
}

// =============== MAIN GENERATOR ===============

export function generatePills(
summary,
phase,
tabLens,
doctorViewType)
{
  // --- Doctor-type-specific pill sets ---
  if (doctorViewType === "treating_physician") {
    // Layer 1 safety + treating physician trend pills only (no Layer 2 POMR, no Layer 4)
    const all = [
    ...getLayer1(summary),
    ...getTreatingPhysicianPills(summary)];

    all.sort((a, b) => a.priority - b.priority);
    const seen = new Set();
    return all.filter((p) => {
      if (seen.has(p.label)) return false;
      seen.add(p.label);
      return true;
    }).slice(0, MAX_PILLS);
  }

  if (doctorViewType === "emergency_oncall") {
    // Triage-only pills
    const all = getEmergencyPills(summary);
    all.sort((a, b) => a.priority - b.priority);
    return all.slice(0, MAX_PILLS);
  }

  // --- Default / specialist_first_visit: all layers ---
  const all = [
  ...getLayer1(summary),
  ...getLayer2(summary),
  ...getLayer3(phase, summary),
  ...getLayer4(tabLens)];


  // Sort by priority (ascending = highest priority first)
  all.sort((a, b) => a.priority - b.priority);

  // Deduplicate by label
  const seen = new Set();
  const deduped = all.filter((p) => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  });

  // Layer 1 force pills always included, rest truncated to MAX_PILLS
  const forced = deduped.filter((p) => p.force);
  const rest = deduped.filter((p) => !p.force);
  const available = MAX_PILLS - forced.length;

  return [...forced, ...rest.slice(0, Math.max(0, available))];
}
