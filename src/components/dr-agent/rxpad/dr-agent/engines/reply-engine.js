// -----------------------------------------------------------------
// Reply Engine -- Maps intent + patient data -> RxAgentOutput
// Generates mock card data from SmartSummaryData
// -----------------------------------------------------------------


import { buildRecommendationsFullListForChat, messageAsksForRecommendationsList } from "../shared/patientRecommendations";

/** Split a comma-separated string while respecting parentheses. */
function splitRespectingParens(str) {
  const results = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      results.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

/** Words that indicate a more specific clinical query — bypass POMR card matching */
const SPECIFIC_CLINICAL_TERMS = [
"adequacy", "fluid", "electrolyte", "bone", "mineral", "calcium", "phosph",
"cardiovascular", "cv risk", "cardiac", "heart",
"glycemic", "glycaemic", "glucose", "sugar control",
"adjustment", "adjust", "dosing", "dose",
"iron", "stores", "ferritin",
"polypharmacy", "review", "timeline",
"diet", "lifestyle", "nutrition", "handout", "education",
"explain", "chronic", "medication review", "medication timeline"];


/** Keyword map: input keywords → POMR problem name prefix */
const POMR_KEYWORDS = [
{ keywords: ["ckd", "kidney", "renal", "dialysis", "peritoneal", "nephro"], matchPrefix: "CKD" },
{ keywords: ["hypertension", "htn", "bp needs", "blood pressure"], matchPrefix: "Hypertension" },
{ keywords: ["diabetes", "dm", "sugar", "hba1c", "fbs", "insulin", "glyc"], matchPrefix: "Type 2 Diabetes" },
{ keywords: ["anaemia", "anemia", "epo", "haemoglobin", "hemoglobin"], matchPrefix: "Anaemia" }];


function findPomrProblem(normalized, summary) {
  if (!summary.pomrProblems) return null;

  // If the query contains specific clinical terms, skip POMR card matching
  // so more specific handlers can respond instead
  if (SPECIFIC_CLINICAL_TERMS.some((term) => normalized.includes(term))) return null;

  for (const { keywords, matchPrefix } of POMR_KEYWORDS) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      const prob = summary.pomrProblems.find((p) => p.problem.startsWith(matchPrefix));
      if (prob) {
        return {
          text: `Here's the ${prob.problem} problem card with data completeness and action items.`,
          rxOutput: {
            kind: "pomr_problem_card",
            data: buildPomrCardData(prob, summary)
          }
        };
      }
    }
  }
  return null;
}

export function buildPomrCardData(
prob,
summary)
{
  // Resolve labs from keyLabs by labKeys
  const labs = (prob.labKeys || []).map((key) => {
    const found = summary.keyLabs?.find((l) => l.name === key);
    const prov = summary.dataProvenance?.[key];
    return {
      name: key,
      value: found?.value || "—",
      unit: found?.unit,
      flag: found?.flag,
      provenance: prov?.source === "emr" ? "emr" : prov?.source === "ai_extracted" ? "ai_extracted" : undefined
    };
  });

  // Resolve missing fields
  const missingFields = (prob.missingKeys || []).map((key) => {
    const found = summary.missingExpectedFields?.find((f) => f.field.includes(key));
    return {
      field: key,
      reason: found?.reason || "Not found in available data",
      prompt: found?.prompt || `Order ${key}`
    };
  });

  // Build source entries from lab provenance + summary data provenance
  const sourceEntries = [];
  const seenSources = new Set()

  // Check each lab for provenance and extractedFrom
;(prob.labKeys || []).forEach((key) => {
    const prov = summary.dataProvenance?.[key];
    if (prov && !seenSources.has(prov.extractedFrom || prov.source)) {
      const sourceKey = prov.extractedFrom || prov.source;
      seenSources.add(sourceKey);
      if (prov.source === "emr") {
        sourceEntries.push({
          label: prov.extractedFrom || "EMR — Lab Results",
          date: undefined, // EMR dates come from the system
          type: "emr"
        });
      } else if (prov.source === "ai_extracted") {
        sourceEntries.push({
          label: prov.extractedFrom || "Uploaded Report",
          type: "uploaded"
        });
      }
    }
  });

  // Fallback: if no provenance data, add generic EMR source
  if (sourceEntries.length === 0) {
    // Add mock source entries for demo (CKD patient typically has multiple sources)
    if (prob.problem.includes("CKD")) {
      sourceEntries.push(
        { label: "Blood Work — CBC, KFT, Electrolytes", date: "28 Feb 2026", type: "emr" },
        { label: "Nephrology Report — Dr. Arun Mehta", date: "15 Feb 2026", type: "uploaded" }
      );
    } else if (prob.problem.includes("Diabetes")) {
      sourceEntries.push(
        { label: "Blood Work — HbA1c, FBS, Lipid Panel", date: "28 Feb 2026", type: "emr" },
        { label: "Rx #4521 — Dr. Sharma", date: "01 Mar 2026", type: "rx" }
      );
    } else if (prob.problem.includes("Hypertension")) {
      sourceEntries.push(
        { label: "Vitals Record — OPD", date: "10 Mar 2026", type: "emr" },
        { label: "ECG Report — Uploaded", date: "20 Feb 2026", type: "uploaded" }
      );
    } else if (prob.problem.includes("Anaemia") || prob.problem.includes("Anemia")) {
      sourceEntries.push(
        { label: "Blood Work — CBC, Iron Studies", date: "28 Feb 2026", type: "emr" },
        { label: "Rx #4522 — Dr. Sharma", date: "01 Mar 2026", type: "rx" }
      );
    } else {
      sourceEntries.push({ label: "EMR Records", type: "emr" });
    }
  }

  return {
    problem: prob.problem,
    status: prob.status,
    statusColor: prob.statusColor,
    completeness: prob.completeness,
    labs,
    meds: prob.medKeys || [],
    missingFields,
    sourceEntries
  };
}

/**
 * Build a concise clinical summary for the patient detail view.
 * Follows SBAR conceptual ordering without literal labels:
 * context → history → assessment → action items
 */
function buildDetailSummary(summary) {
  const lines = [];

  // Clinical context (situation)
  if (summary.sbarSituation) {
    lines.push(summary.sbarSituation);
  } else if (summary.lastVisit?.symptoms) {
    lines.push(`Presenting with ${summary.lastVisit.symptoms.split(",").slice(0, 3).map((s) => s.trim()).join(", ")}`);
  }

  // History context (background)
  const bg = [];
  if (summary.chronicConditions?.length) bg.push(summary.chronicConditions.join(", "));
  if (summary.allergies?.length) bg.push(`Allergies: ${summary.allergies.join(", ")}`);
  if (bg.length > 0) lines.push(bg.join(". "));

  // Current findings (assessment)
  const findings = [];
  if (summary.todayVitals?.bp) {
    const sys = parseInt(summary.todayVitals.bp.split("/")[0]);
    if (sys > 140 || sys < 90) findings.push(`BP ${summary.todayVitals.bp} (abnormal)`);
  }
  if (summary.todayVitals?.spo2) {
    const spo2 = parseFloat(summary.todayVitals.spo2);
    if (spo2 < 95) findings.push(`SpO₂ ${summary.todayVitals.spo2}% (low)`);
  }
  if (summary.labFlagCount > 0) findings.push(`${summary.labFlagCount} lab values flagged`);
  if (findings.length > 0) lines.push(findings.join("; "));

  // Action items (recommendation)
  const actions = [];
  if (summary.crossProblemFlags?.some((f) => f.severity === "high")) {
    actions.push("Review drug interactions");
  }
  if (summary.missingExpectedFields?.length) {
    actions.push(`${summary.missingExpectedFields.length} tests overdue`);
  }
  if (summary.followUpOverdueDays > 0) actions.push("Follow-up overdue");
  if (actions.length > 0) lines.push(`Needs attention: ${actions.join("; ")}`);

  if (lines.length === 0) return "Here's the full patient detail summary.";
  return lines.join("\n");
}

export function buildReply(
input,
summary,
phase,
intent)
{
  const normalized = input.toLowerCase().replace(/[\u2080-\u2089]/g, (ch) => String(ch.charCodeAt(0) - 0x2080));

  // === OUT-OF-SCOPE GUARDRAIL ===
  if (intent.category === "out_of_scope") {
    return {
      text: "Sorry, that's outside my area of expertise. I'm here to help with clinical insights, patient data, and practice management — try one of these instead:",
      suggestions: [
      { label: "Patient summary", message: "Patient summary" },
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Medical history", message: "Medical history" },
      { label: "Last visit", message: "Last visit details" }]

    };
  }

  // === ACTION FLOWS — Write RX, Create Bill, Schedule Follow-up, Book Appointment ===

  // Write RX / Prescription
  if (normalized.includes("write rx") || normalized.includes("write prescription") || normalized.includes("prescribe") || normalized.includes("create rx") || normalized.includes("draft rx")) {
    const meds = summary.activeMeds || [];
    return {
      text: `Prescription draft for ${meds.length > 0 ? `current medications (${meds.slice(0, 3).join(", ")}${meds.length > 3 ? ` + ${meds.length - 3} more` : ""})` : "this patient"}. Review and confirm below.`,
      rxOutput: {
        kind: "follow_up_question",
        data: {
          question: "How would you like to proceed with the prescription?",
          options: [
          "Save prescription for patient",
          "Add more medications",
          "Copy to RxPad for editing"],

          multiSelect: false
        }
      }
    };
  }

  // Create Bill
  if (normalized.includes("create bill") || normalized.includes("generate bill") || normalized.includes("billing") || normalized.includes("create invoice") || normalized.includes("bill for")) {
    return {
      text: "Bill summary for today's consultation:\n\n• **Consultation Fee** — ₹800\n\nWould you like to add any additional services?",
      rxOutput: {
        kind: "follow_up_question",
        data: {
          question: "Select additional services to include in the bill:",
          options: [
          "Lab tests conducted",
          "Procedure / Minor surgery",
          "Pharmacy items",
          "No additional services — generate bill"],

          multiSelect: true
        }
      }
    };
  }

  // Schedule Follow-up
  if (normalized.includes("schedule follow") || normalized.includes("book follow") || normalized.includes("plan follow") || normalized.includes("set follow")) {
    return {
      text: "Follow-up scheduling confirmation:\n\n• **Patient**: will be scheduled for a follow-up\n• **Suggested interval**: based on current diagnosis\n\nThe follow-up has been scheduled. The patient will receive a reminder via the TatvaPractice app."
    };
  }

  // Book Appointment
  if (normalized.includes("book appointment") || normalized.includes("schedule appointment") || normalized.includes("new appointment") || normalized.includes("add appointment")) {
    return {
      text: "Appointment booking:\n\n• Use **+ Add Appointment** in the header to book a new appointment\n• Or use **Start Walk-In** for immediate consultations\n\nI can help you with patient summaries and clinical data — appointment booking is handled through the appointment module."
    };
  }

  // === SYMPTOM COLLECTOR — DIRECT MATCH (highest priority after guardrail) ===
  // Handles: "Show reported intake", "Reported by patient", "Pre-visit intake", "Show intake"
  if (normalized.includes("intake") || normalized === "reported by patient" || normalized.includes("show reported") || normalized.includes("patient reported") || normalized.includes("symptom collector")) {
    if (summary.symptomCollectorData) {
      return {
        text: `Here's the patient-reported data from ${summary.symptomCollectorData.reportedAt}.`,
        rxOutput: { kind: "symptom_collector", data: summary.symptomCollectorData }
      };
    }
    return { text: "No patient-reported data available for this visit yet." };
  }

  // === CLINICAL RECOMMENDATIONS — full list (patient summary card shows top five only) ===
  if (messageAsksForRecommendationsList(normalized)) {
    const items = buildRecommendationsFullListForChat(summary);
    if (items.length > 0) {
      return {
        text: "Here are the clinical recommendations for this patient. The summary card lists the five highest-priority bullets; this reply uses the same rules and shows the full set available from the chart.",
        rxOutput: { kind: "text_list", data: { items } }
      };
    }
    return { text: "No clinical recommendations are available for this patient yet." };
  }

  // === EXTERNAL EXPORT CTA (Excel / Word) ===
  if (
  normalized.includes("excel") ||
  normalized.includes("xlsx") ||
  normalized.includes("spreadsheet") ||
  normalized.includes("word") ||
  normalized.includes("docx") ||
  normalized.includes("document format"))
  {
    const isExcel = normalized.includes("excel") || normalized.includes("xlsx") || normalized.includes("spreadsheet");
    return {
      text: isExcel ?
      "Here's an exportable Excel output for this view." :
      "Here's an exportable Word document for this view.",
      rxOutput: {
        kind: "external_cta",
        data: {
          title: isExcel ? "Export ready: Excel" : "Export ready: Word",
          description: isExcel ?
          "The requested data is ready in spreadsheet format. Open the file using the link below." :
          "The requested data is ready in Word format. Open the document using the link below.",
          ctaLabel: isExcel ? "Open Excel file" : "Open Word document",
          ctaUrl: isExcel ? "https://example.com/exports/patient-view.xlsx" : "https://example.com/exports/patient-view.docx",
          openInNewTab: true
        }
      }
    };
  }

  // === POMR PROBLEM CARDS (CKD, Hypertension, Diabetes, Anaemia) ===
  if (summary.pomrProblems && summary.pomrProblems.length > 0) {
    const pomrMatch = findPomrProblem(normalized, summary);
    if (pomrMatch) {
      return pomrMatch;
    }
  }

  // === MISSING TESTS / OVERDUE ITEMS ===
  if ((normalized.includes("missing") || normalized.includes("overdue") || normalized.includes("due")) && summary.missingExpectedFields && summary.missingExpectedFields.length > 0) {
    const items = summary.missingExpectedFields.map((f) => `**${f.field}** — ${f.reason}`);
    return {
      text: `${summary.missingExpectedFields.length} tests/assessments are missing or overdue for this patient:`,
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === DRUG INTERACTIONS / CROSS-PROBLEM FLAGS ===
  if ((normalized.includes("interaction") || normalized.includes("cross") || normalized.includes("conflict") || normalized.includes("contraindic")) && summary.crossProblemFlags && summary.crossProblemFlags.length > 0) {
    const items = summary.crossProblemFlags.map((f) => `[${f.severity.toUpperCase()}] ${f.text}`);
    return {
      text: `${summary.crossProblemFlags.length} cross-problem interactions identified:`,
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === ACTIONS NEEDED / RECOMMENDATIONS ===
  if ((normalized.includes("action") || normalized.includes("recommend") || normalized.includes("plan") || normalized.includes("next step")) && summary.recommendationTiers && summary.recommendationTiers.length > 0) {
    const actItems = summary.recommendationTiers.filter((r) => r.tier === "act");
    const verifyItems = summary.recommendationTiers.filter((r) => r.tier === "verify");
    const gatherItems = summary.recommendationTiers.filter((r) => r.tier === "gather");
    const steps = [];
    if (actItems.length > 0) steps.push("**Act now:** " + actItems.map((r) => r.text).join("; "));
    if (verifyItems.length > 0) steps.push("**Verify first:** " + verifyItems.map((r) => r.text).join("; "));
    if (gatherItems.length > 0) steps.push("**Gather data:** " + gatherItems.map((r) => r.text).join("; "));
    return {
      text: "Here are the prioritised recommendations for this visit:",
      rxOutput: { kind: "text_step", data: { steps } }
    };
  }

  // === PENDING RECORDS ===
  if ((normalized.includes("record") || normalized.includes("pending")) && summary.recordAlerts && summary.recordAlerts.length > 0) {
    return {
      text: `${summary.recordAlerts.length} pending records need attention:`,
      rxOutput: { kind: "text_list", data: { items: summary.recordAlerts } }
    };
  }

  // === DUE ALERTS (specific) ===
  if (normalized.includes("due alert") && summary.dueAlerts && summary.dueAlerts.length > 0) {
    return {
      text: `${summary.dueAlerts.length} overdue or upcoming items:`,
      rxOutput: { kind: "text_list", data: { items: summary.dueAlerts } }
    };
  }

  // === DIALYSIS ADEQUACY ===
  if (normalized.includes("dialysis") && summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("ckd"))) {
    return {
      text: "Dialysis adequacy assessment based on available data:",
      rxOutput: { kind: "text_step", data: { steps: [
          "**Kt/V target:** ≥1.7/week for peritoneal dialysis — verify with recent adequacy test",
          "**Ultrafiltration:** Monitor daily drain volumes and net UF",
          "**Residual renal function:** Check 24-hour urine output — declining residual function may need prescription adjustment",
          "**Peritonitis risk:** Last episode date, PET category, exit site status",
          "**Adequacy markers:** BUN, Creatinine clearance, albumin trend"]
        } }
    };
  }

  // === FLUID & ELECTROLYTES ===
  if ((normalized.includes("fluid") || normalized.includes("electrolyte")) && summary.pomrProblems) {
    const labs = summary.keyLabs || [];
    const potassium = labs.find((l) => l.name === "Potassium");
    const sodium = labs.find((l) => l.name === "Sodium");
    const items = [
    potassium ? `**Potassium:** ${potassium.value} ${potassium.unit || ""} ${potassium.flag ? `(${potassium.flag})` : ""}` : "**Potassium:** Not available — order stat",
    sodium ? `**Sodium:** ${sodium.value} ${sodium.unit || ""} ${sodium.flag ? `(${sodium.flag})` : ""}` : "**Sodium:** Not available",
    "**Fluid balance:** Assess daily weight trends, oedema, dry weight target",
    "**Phosphate binders:** Verify adherence and timing with meals"];

    return {
      text: "Fluid and electrolyte status:",
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === BONE MINERAL STATUS ===
  if ((normalized.includes("bone") || normalized.includes("mineral") || normalized.includes("calcium") || normalized.includes("phosph")) && summary.pomrProblems) {
    const labs = summary.keyLabs || [];
    const calcium = labs.find((l) => l.name === "Calcium");
    const phosphorus = labs.find((l) => l.name === "Phosphorus");
    const items = [
    calcium ? `**Calcium:** ${calcium.value} ${calcium.unit || ""}` : "**Calcium:** Not available — order",
    phosphorus ? `**Phosphorus:** ${phosphorus.value} ${phosphorus.unit || ""}` : "**Phosphorus:** Not available — order",
    "**PTH:** Check if due (target 2-9× upper normal for CKD Stage 5)",
    "**Vitamin D:** Assess 25(OH)D levels, supplement if <30 ng/mL",
    "**Phosphate binders:** Review type and dose adequacy"];

    return {
      text: "CKD Mineral Bone Disease (CKD-MBD) assessment:",
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === CV RISK ASSESSMENT ===
  if ((normalized.includes("cv risk") || normalized.includes("cardiovascular") || normalized.includes("cardiac") || normalized.includes("heart")) && summary.pomrProblems) {
    return {
      text: "Cardiovascular risk assessment for CKD patient:",
      rxOutput: { kind: "text_step", data: { steps: [
          "**BP control:** Target <130/80 mmHg — current: " + (summary.todayVitals?.bp || "not recorded today"),
          "**Lipid panel:** LDL target <70 mg/dL (high CV risk) — statin optimisation",
          "**ECG:** Annual screening or if symptoms present (stent history noted)",
          "**Echo:** If new symptoms of dyspnea or fluid overload",
          "**Antiplatelet:** Continue aspirin post-stent — review duration with cardiology"]
        } }
    };
  }

  // === GLYCEMIC CONTROL ===
  if ((normalized.includes("glycemic") || normalized.includes("glycaemic") || normalized.includes("sugar control") || normalized.includes("glucose")) && summary.pomrProblems) {
    const hba1c = summary.keyLabs?.find((l) => l.name === "HbA1c");
    const fbs = summary.keyLabs?.find((l) => l.name === "Fasting Glucose" || l.name === "Fasting Blood Sugar");
    return {
      text: "Glycemic control assessment:",
      rxOutput: { kind: "text_step", data: { steps: [
          hba1c ? `**HbA1c:** ${hba1c.value}% — target 7-8% in CKD (avoid aggressive control)` : "**HbA1c:** Not available — order",
          fbs ? `**Fasting glucose:** ${fbs.value} ${fbs.unit || ""}` : "**Fasting glucose:** Not available",
          "**Insulin dosing:** CKD reduces insulin clearance — monitor for hypoglycaemia",
          "**Metformin:** Contraindicated in CKD Stage 4-5 — verify discontinuation",
          "**Self-monitoring:** Review glucose diary, frequency of hypo episodes"]
        } }
    };
  }

  // === INSULIN ADJUSTMENT ===
  if (normalized.includes("insulin")) {
    return {
      text: "Insulin management considerations for CKD patient:",
      rxOutput: { kind: "text_step", data: { steps: [
          "**Dose reduction:** CKD Stage 5 often requires 25-50% dose reduction due to decreased renal clearance",
          "**Hypoglycaemia risk:** Reduced gluconeogenesis and insulin clearance increase hypo risk",
          "**Monitoring:** Check pre-meal and bedtime glucose; consider CGM if available",
          "**Dialysis days:** May need dose adjustment on dialysis vs non-dialysis days"]
        } }
    };
  }

  // === EPO DOSING ===
  if (normalized.includes("epo")) {
    const hb = summary.keyLabs?.find((l) => l.name === "Hemoglobin");
    return {
      text: "EPO (Erythropoietin) dosing review:",
      rxOutput: { kind: "text_step", data: { steps: [
          hb ? `**Current Hb:** ${hb.value} ${hb.unit || ""} — target 10-11.5 g/dL` : "**Hemoglobin:** Not available — order CBC",
          "**EPO dose:** Titrate to maintain Hb 10-11.5 g/dL; avoid >13 g/dL",
          "**Iron stores:** Check ferritin (>200 ng/mL) and TSAT (>20%) before increasing EPO",
          "**Response monitoring:** Recheck Hb in 2-4 weeks after dose change",
          "**Resistance:** If poor response, evaluate iron deficiency, infection, inflammation"]
        } }
    };
  }

  // === IRON STORES ===
  if (normalized.includes("iron")) {
    const ferritin = summary.keyLabs?.find((l) => l.name === "Ferritin");
    return {
      text: "Iron stores assessment for anaemia management:",
      rxOutput: { kind: "text_list", data: { items: [
          ferritin ? `**Ferritin:** ${ferritin.value} ${ferritin.unit || ""} — target >200 ng/mL for CKD` : "**Ferritin:** Not available — order",
          "**TSAT:** Target >20% — order if not recent",
          "**Iron supplementation:** IV iron preferred in CKD (oral absorption poor)",
          "**Monitoring:** Recheck ferritin and TSAT monthly during IV iron therapy"]
        } }
    };
  }

  // === POLYPHARMACY REVIEW ===
  if (normalized.includes("polypharmacy") || normalized.includes("medication") && normalized.includes("review")) {
    const meds = summary.activeMeds || [];
    return {
      text: `Polypharmacy review — ${meds.length} active medications:`,
      rxOutput: { kind: "text_step", data: { steps: [
          `**Active medications:** ${meds.join(", ")}`,
          "**Renal dose adjustments:** Verify all medications are dosed for CKD Stage 5 / dialysis",
          "**Deprescribing opportunities:** Review PRN medications, assess ongoing need",
          "**Timing with dialysis:** Some medications need to be given post-dialysis",
          "**Adherence:** Complex regimens — consider simplification or pill organiser"]
        } }
    };
  }

  // === MEDICATION TIMELINE ===
  if (normalized.includes("medication timeline") || normalized.includes("med timeline")) {
    return {
      text: "Medication timeline showing prescription history:",
      rxOutput: { kind: "text_list", data: { items: [
          "**Jan 2024:** Started peritoneal dialysis — added phosphate binders, EPO",
          "**2021:** Post-MI — started dual antiplatelet, statin optimised",
          "**2018+:** Insulin therapy for T2DM — doses adjusted for declining renal function",
          "**Ongoing:** Antihypertensives (Telma, Amlodipine), Cholesterol tablet"]
        } }
    };
  }

  // === CHRONIC CONDITIONS SUMMARY ===
  if (normalized.includes("chronic")) {
    const conditions = summary.chronicConditions || [];
    if (conditions.length === 0) {
      return { text: "No chronic conditions documented for this patient." };
    }
    const items = conditions.map((c) => `• ${c}`);
    return {
      text: `${conditions.length} chronic conditions on record:`,
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === DIET & LIFESTYLE ===
  if (normalized.includes("diet") || normalized.includes("lifestyle") || normalized.includes("nutrition")) {
    const isCKD = summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("ckd"));
    const isDM = summary.pomrProblems?.some((p) => p.problem.toLowerCase().includes("diabetes"));
    const steps = [];
    if (isCKD) {
      steps.push("**Renal diet:** Low potassium, low phosphorus, moderate protein (0.8-1.0 g/kg/day on PD)");
      steps.push("**Fluid restriction:** Based on residual urine output + 500mL/day");
      steps.push("**Sodium:** <2g/day to manage fluid balance and BP");
    }
    if (isDM) {
      steps.push("**Carbohydrate:** Consistent carb intake, avoid refined sugars");
      steps.push("**Glycemic index:** Prefer low-GI foods for stable glucose");
    }
    steps.push("**Exercise:** Light to moderate activity as tolerated — improves CV health");
    steps.push("**Smoking/alcohol:** Counsel cessation if applicable");
    return {
      text: "Personalised diet and lifestyle recommendations:",
      rxOutput: { kind: "text_step", data: { steps } }
    };
  }

  // === PATIENT HANDOUT ===
  if (normalized.includes("handout") || normalized.includes("patient education")) {
    return {
      text: "Patient education handout generated:",
      rxOutput: { kind: "text_step", data: { steps: [
          "**Understanding your condition:** Brief explanation of CKD Stage 5 and peritoneal dialysis",
          "**Medications:** Why each medication is important — take as prescribed",
          "**Warning signs:** When to seek emergency care (chest pain, severe breathlessness, cloudy PD fluid)",
          "**Diet tips:** Foods to avoid (high potassium, high phosphorus), safe choices",
          "**Follow-up:** Next appointment schedule and what tests to expect"]
        } }
    };
  }

  // === EXPLAIN DIAGNOSIS ===
  if (normalized.includes("explain") && (normalized.includes("diagnos") || normalized.includes("dx"))) {
    return {
      text: "Diagnosis explanation for clinical documentation:",
      rxOutput: { kind: "text_step", data: { steps: [
          "**Primary:** CKD Stage 5 on peritoneal dialysis — ESRD requiring renal replacement therapy since Jan 2024",
          "**Comorbid:** Type 2 Diabetes Mellitus (18 years) — insulin-dependent, complicated by nephropathy",
          "**Comorbid:** Hypertension — likely renoparenchymal + essential, on dual antihypertensives",
          "**Comorbid:** Renal Anaemia — on EPO therapy, likely functional iron deficiency",
          "**History:** CAD post-MI (2021) — stent placed, on secondary prevention"]
        } }
    };
  }

  // === OBSTETRIC SUMMARY (before generic summary) ===
  if ((normalized.includes("obstetric") || normalized.includes("ob summary") || normalized.includes("obstetric history") || normalized.includes("obstetric summary") || normalized.includes("pregnancy summary") || normalized.includes("pregnancy") || normalized.includes("anc summary") || normalized.includes("anc")) && summary.obstetricData) {
    return {
      text: `Here's the obstetric summary${summary.obstetricData.gestationalWeeks ? ` at ${summary.obstetricData.gestationalWeeks}` : ""}.`,
      rxOutput: { kind: "obstetric_summary", data: summary.obstetricData }
    };
  }

  // === GYNEC SUMMARY (before generic summary) ===
  if ((normalized.includes("gynec") || normalized.includes("gynae") || normalized.includes("gynaec") || normalized.includes("gynecological") || normalized.includes("gynec history") || normalized.includes("gynec summary") || normalized.includes("cycle") || normalized.includes("lmp") || normalized.includes("menstrual")) && summary.gynecData) {
    return {
      text: "Here's the gynecological summary for your review.",
      rxOutput: { kind: "gynec_summary", data: summary.gynecData }
    };
  }

  // === PEDIATRIC SUMMARY (before generic summary) ===
  if ((normalized.includes("growth") || normalized.includes("vaccine") || normalized.includes("pediatric") || normalized.includes("pedia") || normalized.includes("pediatric summary") || normalized.includes("pedia summary") || normalized.includes("growth summary") || normalized.includes("vaccination summary") || normalized.includes("growth and vaccination")) && summary.pediatricsData) {
    return {
      text: `Here's the pediatric summary${summary.pediatricsData.ageDisplay ? ` for this ${summary.pediatricsData.ageDisplay} patient` : ""}.`,
      rxOutput: { kind: "pediatric_summary", data: summary.pediatricsData }
    };
  }

  // === OPHTHAL SUMMARY (before generic summary) ===
  if ((normalized.includes("ophthal") || normalized.includes("ophthal summary") || normalized.includes("ophthalmology") || normalized.includes("ophthal history") || normalized.includes("vision summary") || normalized.includes("eye") || normalized.includes("vision") || normalized.includes("va")) && summary.ophthalData) {
    return {
      text: "Here's the ophthalmology summary for your review.",
      rxOutput: { kind: "ophthal_summary", data: summary.ophthalData }
    };
  }

  // === PATIENT'S DETAILED SUMMARY (pill-triggered) ===
  // SBAR card situation quote is built from intake only (see buildCardSituationQuote); no narrative mutation here.
  if (normalized.includes("detailed summary") || normalized.includes("detail summary") || normalized.includes("patient detail")) {
    return {
      text: "Patient's detailed summary:",
      rxOutput: { kind: "sbar_overview", data: summary },
      suggestions: [
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Medical history", message: "Medical history" },
      { label: "Lab overview", message: "Lab overview" }]

    };
  }

  // === SBAR OVERVIEW (explicit) ===
  if (normalized.includes("sbar") || normalized.includes("s-bar") || normalized.includes("handoff")) {
    return {
      text: "Here's the clinical summary.",
      rxOutput: { kind: "sbar_overview", data: summary },
      suggestions: [
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Lab overview", message: "Lab overview" },
      { label: "Last visit", message: "Last visit details" }]

    };
  }

  // === PATIENT SUMMARY (now returns SBAR overview as primary) ===
  if (normalized.includes("summary") || normalized.includes("snapshot") || normalized.includes("patient")) {
    return {
      text: summary.specialtyTags.length > 0 ?
      "Here's the patient's clinical summary." :
      "This is a new patient, no records found yet. You can begin by adding history or uploading reports.",
      rxOutput: { kind: "sbar_overview", data: summary },
      suggestions: [
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Medical history", message: "Medical history" },
      { label: "Last visit", message: "Last visit details" }]

    };
  }

  // === PAST VISIT SUMMARIES ===
  if (normalized.includes("last visit") || normalized.includes("past visit") || normalized.includes("previous")) {
    if (!summary.lastVisit) {
      return { text: "No past visits found for this patient yet." };
    }
    return {
      text: `Here's the visit summary from ${summary.lastVisit.date}. You can ask for any specific date to see that visit's details.`,
      rxOutput: {
        kind: "last_visit",
        data: {
          visitDate: summary.lastVisit.date,
          sections: [
          { tag: "Symptoms", icon: "thermometer", items: splitRespectingParens(summary.lastVisit.symptoms).map((s) => {
              const parenMatch = s.match(/^([^(]+)\((.+)\)\s*$/);
              if (parenMatch) {
                // "Fever (2d, high, evening spikes)" → label: "Fever", detail: "2d, high, evening spikes"
                return { label: parenMatch[1].trim(), detail: parenMatch[2].trim() };
              }
              return { label: s.trim() };
            }) },
          { tag: "Examination", icon: "stethoscope", items: splitRespectingParens(summary.lastVisit.examination).map((e) => {
              const parts = e.split(":");
              return { label: parts[0].trim(), detail: parts.length > 1 ? parts.slice(1).join(":").trim() : undefined };
            }) },
          { tag: "Diagnosis", icon: "Diagnosis", items: splitRespectingParens(summary.lastVisit.diagnosis).map((d) => ({ label: d })) },
          { tag: "Medication", icon: "pill", items: splitRespectingParens(summary.lastVisit.medication).map((m) => {
              // "Telma 20mg (Twice daily | Before food)" → label: "Telma 20mg", detail: "Twice daily | Before food"
              const parenMatch = m.trim().match(/^(.+?)\s*\((.+)\)\s*$/);
              if (parenMatch) {
                return { label: parenMatch[1].trim(), detail: parenMatch[2].trim() };
              }
              // "Paracetamol 650mg" — no parenthetical detail
              return { label: m.trim() };
            }) },
          { tag: "Investigation", icon: "Lab", items: splitRespectingParens(summary.lastVisit.labTestsSuggested).map((l) => ({ label: l })) },
          ...(summary.lastVisit.advice ? [{ tag: "Advice", icon: "clipboard-activity", items: splitRespectingParens(summary.lastVisit.advice).map((a) => ({ label: a })) }] : []),
          ...(summary.lastVisit.followUp ? [{ tag: "Follow-up", icon: "medical-record", items: [{ label: summary.lastVisit.followUp }] }] : [])],

          copyAllPayload: {
            sourceDateLabel: summary.lastVisit.date,
            symptoms: splitRespectingParens(summary.lastVisit.symptoms),
            diagnoses: splitRespectingParens(summary.lastVisit.diagnosis),
            advice: summary.lastVisit.advice,
            followUp: summary.lastVisit.followUp
          }
        }
      },
      suggestions: [
      { label: "Medical history", message: "Medical history" },
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Suggest DDX", message: "Suggest DDX" }]

    };
  }

  // === MEDICAL HISTORY (patient's clinical background) ===
  // === INDIVIDUAL HISTORY SUB-SECTIONS ===
  if (normalized === "chronic conditions" || normalized.includes("chronic") && normalized.includes("condition")) {
    if (summary.chronicConditions?.length) {
      return {
        text: `${summary.chronicConditions.length} chronic condition${summary.chronicConditions.length > 1 ? "s" : ""} on record.`,
        rxOutput: { kind: "medical_history", data: { sections: [{ tag: "Chronic Conditions", items: summary.chronicConditions }] } }
      };
    }
    return { text: "No chronic conditions on record for this patient." };
  }

  if (normalized === "allergies" || normalized.includes("allerg") && !normalized.includes("conflict")) {
    if (summary.allergies?.length) {
      return {
        text: `${summary.allergies.length} allerg${summary.allergies.length > 1 ? "ies" : "y"} on record.`,
        rxOutput: { kind: "medical_history", data: { sections: [{ tag: "Allergies", items: summary.allergies }] } }
      };
    }
    return { text: "No allergies recorded for this patient." };
  }

  if (normalized === "family history" || normalized.includes("family") && normalized.includes("history")) {
    if (summary.familyHistory?.length) {
      return {
        text: `Family history — ${summary.familyHistory.length} entries.`,
        rxOutput: { kind: "medical_history", data: { sections: [{ tag: "Family History", items: summary.familyHistory }] } }
      };
    }
    return { text: "No family history on record." };
  }

  if (normalized === "lifestyle" || normalized.includes("lifestyle note")) {
    if (summary.lifestyleNotes?.length) {
      return {
        text: `Lifestyle notes — ${summary.lifestyleNotes.length} entries.`,
        rxOutput: { kind: "medical_history", data: { sections: [{ tag: "Lifestyle", items: summary.lifestyleNotes }] } }
      };
    }
    return { text: "No lifestyle notes on record." };
  }

  // === FULL MEDICAL HISTORY ===
  if (normalized.includes("medical history") || normalized.includes("med history") || normalized.includes("clinical history") || normalized.includes("past history") || normalized.includes("patient history")) {
    const sections = [];

    if (summary.chronicConditions?.length) {
      sections.push({ tag: "Chronic Conditions", items: summary.chronicConditions });
    }
    if (summary.allergies?.length) {
      sections.push({ tag: "Allergies", items: summary.allergies });
    }
    if (summary.familyHistory?.length) {
      sections.push({ tag: "Family History", items: summary.familyHistory });
    }
    if (summary.lifestyleNotes?.length) {
      sections.push({ tag: "Lifestyle", items: summary.lifestyleNotes });
    }
    // Active medications NOT included in medical history — separate card
    // Surgical history from symptom collector
    if (summary.symptomCollectorData?.medicalHistory?.length) {
      sections.push({ tag: "History", items: summary.symptomCollectorData.medicalHistory });
    }

    if (sections.length === 0) {
      return { text: "No medical history on record for this patient yet." };
    }

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    return {
      text: `Here's the medical history — ${sections.length} sections, ${totalItems} entries on record.`,
      rxOutput: {
        kind: "medical_history",
        data: {
          sections,
          insight: summary.chronicConditions && summary.chronicConditions.length > 2 ?
          `${summary.chronicConditions.length} chronic conditions — multimorbidity consideration.` :
          undefined
        }
      },
      suggestions: [
      { label: "Medication history", message: "Medication history" },
      { label: "Last visit", message: "Last visit details" },
      { label: "Today's vitals", message: "Today's vitals" }]

    };
  }

  // === MEDICATION HISTORY ===
  if (normalized.includes("medication history") || normalized.includes("drug history") || normalized.includes("past medication")) {
    const entries = (summary.activeMeds || []).map((m, i) => ({
      drug: m.split(/\s+\d/)[0] || m,
      dosage: m,
      date: summary.lastVisit?.date || "Recent",
      diagnosis: summary.chronicConditions?.[i] || summary.lastVisit?.diagnosis || "Chronic management",
      source: "prescribed"
    }));
    if (entries.length === 0) {
      return { text: "No medication history available for this patient yet." };
    }
    return {
      text: `Here's the medication history — ${entries.length} active medications on record.`,
      rxOutput: {
        kind: "med_history",
        data: {
          entries,
          insight: entries.length > 3 ? "Multiple active medications — consider polypharmacy review." : `${entries.length} active medication${entries.length > 1 ? "s" : ""} on record.`
        }
      },
      suggestions: [
      { label: "Drug interactions", message: "Check drug interactions" },
      { label: "Medical history", message: "Medical history" },
      { label: "Lab overview", message: "Lab overview" }]

    };
  }

  // === TODAY'S VITALS (VITALS SUMMARY) ===
  if (normalized.includes("today's vitals") || normalized.includes("todays vitals") || normalized.includes("vitals today") || normalized.includes("vital summary") || normalized.includes("vitals summary") || normalized.includes("current vitals") || normalized.includes("recorded vitals")) {
    const v = summary.todayVitals;
    const rows = [];
    if (v) {
      if (v.bp) {
        const parts = v.bp.split("/").map(Number);
        const sys = parts[0] || 0;
        const dia = parts[1] || 0;
        rows.push({ shortLabel: "BP", label: "Blood Pressure", value: v.bp, unit: "mmHg", flag: sys > 140 || dia > 90 ? "high" : sys < 90 ? "low" : "normal" });
      }
      if (v.pulse) {
        const p = parseFloat(v.pulse);
        rows.push({ shortLabel: "HR", label: "Heart Rate", value: v.pulse, unit: "bpm", flag: p > 100 ? "high" : p < 60 ? "low" : "normal" });
      }
      if (v.spo2) {
        const s = parseFloat(v.spo2);
        rows.push({ shortLabel: "SpO₂", label: "Oxygen Saturation", value: v.spo2, unit: "%", flag: s < 95 ? "low" : "normal" });
      }
      if (v.temp) {
        const t = parseFloat(v.temp);
        rows.push({ shortLabel: "Temp", label: "Temperature", value: v.temp, unit: "°F", flag: t > 99.5 ? "high" : "normal" });
      }
      if (v.weight) rows.push({ shortLabel: "Wt", label: "Weight", value: v.weight, unit: "kg", flag: "normal" });
      if (v.height) rows.push({ shortLabel: "Ht", label: "Height", value: v.height, unit: "cm", flag: "normal" });
      if (v.bmi) {
        const b = parseFloat(v.bmi);
        rows.push({ shortLabel: "BMI", label: "Body Mass Index", value: v.bmi, unit: "kg/m²", flag: b > 30 ? "high" : b < 18.5 ? "low" : "normal" });
      }
      if (v.rr) {
        const r = parseFloat(v.rr);
        rows.push({ shortLabel: "RR", label: "Respiratory Rate", value: v.rr, unit: "/min", flag: r > 20 ? "high" : "normal" });
      }
      if (v.bloodSugar) rows.push({ shortLabel: "BS", label: "Blood Sugar", value: v.bloodSugar, unit: "mg/dL", flag: parseFloat(v.bloodSugar) > 200 ? "high" : "normal" });
    }
    if (rows.length === 0) {
      return { text: "No vitals have been recorded for this patient today." };
    }
    const flaggedCount = rows.filter((r) => r.flag && r.flag !== "normal").length;
    return {
      text: flaggedCount > 0 ? `Today's vitals — ${flaggedCount} parameter${flaggedCount > 1 ? "s" : ""} flagged.` : "Today's vitals — all within normal range.",
      rxOutput: {
        kind: "vitals_summary",
        data: {
          title: "Today's Vitals",
          recordedAt: "Today",
          rows,
          insight: flaggedCount > 0 ? `${flaggedCount} value${flaggedCount > 1 ? "s" : ""} outside normal range — review recommended.` : "All parameters within normal limits."
        }
      },
      suggestions: [
      { label: "Vital trends", message: "Vital trends" },
      { label: "Lab overview", message: "Lab overview" },
      { label: "Patient summary", message: "Patient summary" }]

    };
  }

  // === PATIENT TIMELINE ===
  if (normalized.includes("timeline") || normalized.includes("patient timeline") || normalized.includes("visit timeline") || normalized.includes("history timeline")) {
    const events = [];
    if (summary.lastVisit) {
      events.push({ date: summary.lastVisit.date, type: "visit", summary: `${summary.lastVisit.diagnosis} — ${summary.lastVisit.medication?.split(",")[0] || ""}` });
    }
    if (summary.keyLabs?.length) {
      events.push({ date: summary.lastVisit?.date || "Recent", type: "lab", summary: `${summary.keyLabs.length} parameters, ${summary.labFlagCount} flagged` });
    }
    if (summary.obstetricData?.lastExamDate) {
      events.push({ date: summary.obstetricData.lastExamDate, type: "procedure", summary: `Obstetric exam — ${summary.obstetricData.gestationalWeeks || "ANC"}` });
    }
    if (summary.recordAlerts?.length) {
      events.push({ date: "Uploaded", type: "procedure", summary: summary.recordAlerts[0] });
    }
    // Add some historical entries
    if (summary.chronicConditions?.length) {
      events.push({ date: "On record", type: "visit", summary: `Chronic: ${summary.chronicConditions.join(", ")}` });
    }
    return {
      text: `Here's the patient timeline — ${events.length} key events on record.`,
      rxOutput: { kind: "patient_timeline", data: { title: "Patient Timeline", events } }
    };
  }

  // === REFERRAL ===
  if (normalized.includes("referral") || normalized.includes("refer to") || normalized.includes("specialist referral") || normalized.includes("refer specialist")) {
    const patientName = "Current Patient";
    return {
      text: `Here's the incoming referral summary for ${patientName}.`,
      rxOutput: {
        kind: "referral",
        data: {
          title: "Doctor Referral Summary (Incoming)",
          totalReferrers: 1,
          totalPatients: 1,
          items: [{
            doctorName: summary.obstetricData ? "Dr. Meena Iyer" : "Dr. Sanjay Mehta",
            doctorPhone: "98XXXXXX11",
            specialty: summary.obstetricData ? "OBG" : "General Medicine",
            patientsReferred: 1,
            topReason: summary.obstetricData ?
            `Early pregnancy (${summary.obstetricData.gestationalWeeks}) with asthma` :
            `Consultation support for ${(summary.chronicConditions || ["general review"]).join(", ")}`
          }]
        }
      }
    };
  }

  // === VACCINATION SCHEDULE ===
  if (normalized.includes("vaccination") || normalized.includes("vaccine schedule") || normalized.includes("immunization") || normalized.includes("vaccine") && !normalized.includes("vaccine summary")) {
    const patientName = "Current Patient";
    const vaccines = [];
    if (summary.obstetricData?.vaccineStatus) {
      summary.obstetricData.vaccineStatus.forEach((v) => {
        const isGiven = v.toLowerCase().includes("given");
        vaccines.push({ patientName, name: v.split("(")[0].trim(), dose: "Standard", dueDate: isGiven ? "Completed" : "Due now", status: isGiven ? "given" : "due" });
      });
    }
    if (summary.pediatricsData?.overdueVaccineNames) {
      summary.pediatricsData.overdueVaccineNames.forEach((v) => {
        vaccines.push({ patientName, name: v, dose: "Standard", dueDate: "Overdue", status: "overdue" });
      });
    }
    // Add standard vaccines for adults
    if (vaccines.length === 0 || !summary.pediatricsData) {
      vaccines.push(
        { patientName, name: "Influenza (Annual)", dose: "0.5ml IM", dueDate: "Due", status: "due" },
        { patientName, name: "Td/TT Booster", dose: "0.5ml IM", dueDate: summary.obstetricData ? "Due now" : "Due (if >10yr)", status: summary.obstetricData ? "due" : "due" },
        { patientName, name: "Hepatitis B", dose: "3-dose series", dueDate: "Check status", status: "due" }
      );
    }
    const overdueCount = vaccines.filter((v) => v.status === "overdue").length;
    const dueCount = vaccines.filter((v) => v.status === "due").length;
    const givenCount = vaccines.filter((v) => v.status === "given").length;
    return {
      text: `Here's the vaccination schedule — ${vaccines.filter((v) => v.status !== "given").length} vaccines pending.`,
      rxOutput: { kind: "vaccination_schedule", data: { title: "Vaccination Schedule", overdueCount, dueCount, givenCount, vaccines } }
    };
  }

  // === CLINICAL GUIDELINE ===
  if (normalized.includes("guideline") || normalized.includes("clinical guideline") || normalized.includes("evidence") || normalized.includes("protocol guide") || normalized.includes("treatment guideline")) {
    const condition = summary.chronicConditions?.[0] || summary.lastVisit?.diagnosis || "General";
    const isAsthma = (summary.chronicConditions || []).some((c) => c.toLowerCase().includes("asthma"));
    const isPregnant = !!summary.obstetricData;

    const recommendations = isAsthma && isPregnant ? [
    "Budesonide is the preferred ICS in pregnancy (Category B)",
    "Uncontrolled asthma poses greater risk than ICS use",
    "LABA + ICS combination preferred over high-dose ICS alone",
    "Avoid Deriphyllin in 1st trimester — consider alternatives",
    "Monitor PEFR weekly, target >80% predicted",
    "Step down only if well-controlled for ≥3 months"] :
    isAsthma ? [
    "Step-up therapy if symptoms >2 days/week",
    "ICS is first-line controller therapy",
    "SABA for rescue use only (not maintenance)",
    "Annual influenza vaccination recommended",
    "Allergen avoidance as adjunct to pharmacotherapy"] :
    [
    "Follow evidence-based treatment protocols",
    "Monitor response to therapy at regular intervals",
    "Patient education is integral to management",
    "Consider specialist referral if inadequate response"];


    return {
      text: `Here are the clinical guidelines for ${condition.split("(")[0].trim()}.`,
      rxOutput: {
        kind: "clinical_guideline",
        data: {
          title: `Clinical Guidelines: ${condition.split("(")[0].trim()}`,
          condition: condition.split("(")[0].trim(),
          source: isAsthma ? "GINA 2025 / Indian Chest Society" : "Standard Clinical Protocols",
          recommendations,
          evidenceLevel: "A"
        }
      }
    };
  }

  // === BILLING SUMMARY ===
  if (normalized.includes("billing") || normalized.includes("bill summary") || normalized.includes("billing overview") || normalized.includes("invoice") || normalized.includes("charges")) {
    return {
      text: "Here's the billing summary for this consultation.",
      rxOutput: {
        kind: "billing_summary",
        data: {
          title: "OPD Billing: This Week",
          mode: "billing",
          items: [
          { referenceNo: "INV-1001", patientName: "Current Patient", amount: 500, billedAmount: 500, paidAmount: 500, status: "paid_fully" },
          { referenceNo: "INV-1002", patientName: "Current Patient", amount: 1200, billedAmount: 1200, paidAmount: 0, status: "due" },
          { referenceNo: "INV-1003", patientName: "Current Patient", amount: 300, billedAmount: 300, paidAmount: 300, status: "paid_fully" },
          { referenceNo: "INV-1004", patientName: "Current Patient", amount: 80, billedAmount: 80, paidAmount: 80, status: "refunded" }],

          totalBilledAmount: 2080,
          totalPaidFullyAmount: 1880,
          totalDueAmount: 1200,
          totalRefundedAmount: 80,
          totalAdvanceReceived: 650,
          totalAdvanceRefunded: 80,
          totalAdvanceDebited: 200
        }
      }
    };
  }

  // === RX PREVIEW ===
  if (normalized.includes("rx preview") || normalized.includes("prescription preview") || normalized.includes("preview rx") || normalized.includes("preview prescription")) {
    const diagnoses = summary.lastVisit?.diagnosis ? splitRespectingParens(summary.lastVisit.diagnosis) : ["Current diagnosis"];
    const medications = (summary.activeMeds || []).slice(0, 4);
    const investigations = summary.lastVisit?.labTestsSuggested ? splitRespectingParens(summary.lastVisit.labTestsSuggested) : [];
    return {
      text: "Here's a preview of the current prescription being prepared.",
      rxOutput: {
        kind: "rx_preview",
        data: {
          patientName: summary.specialtyTags.length > 0 ? "Current Patient" : "New Patient",
          date: "Today",
          diagnoses,
          medications,
          investigations,
          advice: summary.lastVisit?.advice ? splitRespectingParens(summary.lastVisit.advice) : ["Continue prescribed medications"],
          followUp: summary.lastVisit?.followUp || "As advised"
        }
      }
    };
  }

  // === OCR / DOCUMENT ANALYSIS ===
  if (normalized.includes("ocr") || normalized.includes("scan report") || normalized.includes("uploaded report") || normalized.includes("document analysis") || normalized.includes("extract report")) {
    if (normalized.includes("extract") || normalized.includes("extraction")) {
      // OCR Full Extraction
      return {
        text: "I've extracted structured data from the uploaded report.",
        rxOutput: {
          kind: "ocr_extraction",
          data: {
            title: "Report Extraction",
            category: "Pathology Report",
            sections: [
            { heading: "Diagnosis", icon: "Diagnosis", items: summary.lastVisit?.diagnosis ? splitRespectingParens(summary.lastVisit.diagnosis) : ["Pending review"], copyDestination: "rxpad" },
            { heading: "Medications", icon: "pill", items: (summary.activeMeds || []).slice(0, 3), copyDestination: "rxpad" },
            { heading: "Investigations", icon: "Lab", items: summary.lastVisit?.labTestsSuggested ? splitRespectingParens(summary.lastVisit.labTestsSuggested) : ["No investigations noted"], copyDestination: "rxpad" }]

          }
        }
      };
    }
    // OCR Pathology
    const parameters = (summary.keyLabs || []).map((lab) => ({
      name: lab.name,
      value: lab.value,
      refRange: lab.refRange,
      flag: lab.flag,
      confidence: "high"
    }));
    return {
      text: `I've analyzed the uploaded report — ${parameters.filter((p) => p.flag).length} flagged values found.`,
      rxOutput: {
        kind: "ocr_pathology",
        data: {
          title: "Lab Report (OCR)",
          category: "Blood Investigation",
          parameters,
          normalCount: Math.max(0, 12 - parameters.length)
        }
      }
    };
  }

  // === VOICE / STRUCTURED RX / TRANSCRIPT ===
  if (normalized.includes("voice") || normalized.includes("transcript") || normalized.includes("structured rx") || normalized.includes("dictation") || normalized.includes("voice rx")) {
    const sections = [];
    if (summary.lastVisit?.symptoms) {
      sections.push({
        sectionId: "symptoms", title: "Symptoms", tpIconName: "thermometer",
        items: splitRespectingParens(summary.lastVisit.symptoms).map((s) => ({ name: s.split("(")[0].trim(), detail: s.includes("(") ? s.match(/\((.+)\)/)?.[1] : undefined }))
      });
    }
    if (summary.lastVisit?.diagnosis) {
      sections.push({
        sectionId: "diagnosis", title: "Diagnosis", tpIconName: "Diagnosis",
        items: splitRespectingParens(summary.lastVisit.diagnosis).map((d) => ({ name: d }))
      });
    }
    if (summary.activeMeds?.length) {
      sections.push({
        sectionId: "medication", title: "Medication", tpIconName: "pill",
        items: summary.activeMeds.slice(0, 4).map((m) => ({ name: m.split(/\s+\d/)[0] || m, detail: m }))
      });
    }
    const voiceText = summary.lastVisit ?
    `Patient has ${summary.lastVisit.symptoms}. Examination: ${summary.lastVisit.examination}. Diagnosis: ${summary.lastVisit.diagnosis}.` :
    "Voice transcription of clinical notes.";
    return {
      text: "",
      rxOutput: {
        kind: "voice_structured_rx",
        data: {
          voiceText,
          sections,
          copyAllPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            symptoms: summary.lastVisit?.symptoms ? splitRespectingParens(summary.lastVisit.symptoms) : [],
            diagnoses: summary.lastVisit?.diagnosis ? splitRespectingParens(summary.lastVisit.diagnosis) : []
          }
        }
      }
    };
  }

  // === ALLERGY CONFLICT (specific, before generic allergy handler) ===
  if (normalized.includes("allergy conflict") || normalized.includes("allergy safety") || normalized.includes("conflict check") || normalized.includes("drug allergy check")) {
    if (summary.allergies?.length) {
      const allergen = summary.allergies[0];
      const drug = allergen.toLowerCase().includes("aspirin") ? "Aspirin 75mg" :
      allergen.toLowerCase().includes("penicillin") ? "Amoxicillin 500mg" :
      allergen.toLowerCase().includes("sulfa") ? "Sulfasalazine 500mg" :
      "Suspected medication";
      const alternative = allergen.toLowerCase().includes("aspirin") ? "Clopidogrel 75mg" :
      allergen.toLowerCase().includes("penicillin") ? "Azithromycin 500mg" :
      allergen.toLowerCase().includes("sulfa") ? "Mesalamine 400mg" :
      "Alternative medication";
      return {
        text: `⚠️ Allergy conflict detected — **${allergen}** is on record. Suggesting safe alternative.`,
        rxOutput: {
          kind: "allergy_conflict",
          data: { drug, allergen, alternative }
        }
      };
    }
    return { text: "No allergies on record — no conflicts detected with current prescriptions." };
  }

  // === FOLLOW-UP QUESTION / CLARIFY ===
  if (normalized.includes("clarify") || normalized.includes("ask patient") || normalized.includes("question for patient") || normalized.includes("follow-up question") || normalized.includes("need more info")) {
    const question = summary.obstetricData ?
    "Can you confirm the exact date of your last menstrual period?" :
    summary.chronicConditions?.length ?
    "Have you been taking your medications regularly without missing any doses?" :
    "When did the symptoms first start?";
    const options = summary.obstetricData ?
    ["28 Dec 2025 (as recorded)", "Different date", "Not sure — want USG dating"] :
    summary.chronicConditions?.length ?
    ["Yes, fully compliant", "Missed a few doses", "Stopped some medications", "Changed doses on my own"] :
    ["Less than a week ago", "1-2 weeks", "More than 2 weeks", "Gradual onset"];
    return {
      text: "I need a bit more information to refine the recommendations.",
      rxOutput: {
        kind: "follow_up_question",
        data: { question, options, multiSelect: false }
      }
    };
  }

  // === TEXT FACT ===
  if (normalized.includes("fact") || normalized.includes("quick fact") || normalized.includes("did you know")) {
    const isAsthma = (summary.chronicConditions || []).some((c) => c.toLowerCase().includes("asthma"));
    const isPregnant = !!summary.obstetricData;
    const value = isAsthma && isPregnant ?
    "Uncontrolled asthma in pregnancy increases risk of preterm birth by 50%. Well-controlled asthma has outcomes comparable to non-asthmatic pregnancies." :
    isAsthma ?
    "Bronchial asthma affects 4.5% of Indian adults. Nocturnal symptoms indicate suboptimal control and warrant step-up therapy." :
    `Current clinical profile: ${summary.chronicConditions?.join(", ") || "No chronic conditions"}, ${summary.labFlagCount} lab flags, ${summary.followUpOverdueDays > 0 ? `follow-up overdue ${summary.followUpOverdueDays}d` : "follow-up on track"}.`;
    return {
      text: "Here's a relevant clinical fact.",
      rxOutput: {
        kind: "text_fact",
        data: {
          value,
          context: isAsthma ? "Asthma Management" : "Clinical Context",
          source: isAsthma ? "GINA Guidelines 2025" : "Patient Records"
        }
      }
    };
  }

  // === TEXT STEPS / PROCEDURE ===
  if (normalized.includes("steps") || normalized.includes("step by step") || normalized.includes("procedure") || normalized.includes("how to")) {
    const isAsthma = (summary.chronicConditions || []).some((c) => c.toLowerCase().includes("asthma"));
    const steps = isAsthma ? [
    "Assess symptom control: daytime symptoms, night waking, reliever use, activity limitation",
    "Classify control level: well-controlled / partly controlled / uncontrolled",
    "Check inhaler technique — correct common errors (not shaking, not holding breath)",
    "Review PEFR diary — target ≥80% of predicted",
    "Adjust therapy: step up if uncontrolled, maintain if controlled, step down after 3 months stable",
    "Schedule follow-up: 2-4 weeks after any medication change"] :
    [
    "Review patient history and current medications",
    "Assess vital signs and flag any abnormalities",
    "Review recent lab results and pending investigations",
    "Formulate differential diagnosis based on presenting complaints",
    "Plan treatment: medications, investigations, and advice",
    "Set follow-up schedule and patient education"];

    return {
      text: isAsthma ? "Here's a step-by-step asthma assessment protocol." : "Here's a step-by-step consultation workflow.",
      rxOutput: { kind: "text_step", data: { steps } }
    };
  }

  // === TEXT QUOTE / CLINICAL REFERENCE ===
  if (normalized.includes("quote") || normalized.includes("clinical reference") || normalized.includes("reference")) {
    const isAsthma = (summary.chronicConditions || []).some((c) => c.toLowerCase().includes("asthma"));
    return {
      text: "Here's a relevant clinical reference.",
      rxOutput: {
        kind: "text_quote",
        data: {
          quote: isAsthma ?
          "Step-up therapy is recommended when symptoms are not well controlled on current treatment. Poorly controlled asthma carries greater risk than medication side effects." :
          "Clinical decision-making should integrate patient preferences, clinical expertise, and best available evidence.",
          source: isAsthma ? "GINA 2025, Chapter 3: Treating to Control Symptoms" : "Evidence-Based Medicine Principles"
        }
      }
    };
  }

  // === TEXT COMPARISON (treatment options) ===
  if (normalized.includes("compare treatment") || normalized.includes("compare option") || normalized.includes("treatment comparison") || normalized.includes("drug comparison") || normalized.includes("vs") && !normalized.includes("visit")) {
    const isAsthma = (summary.chronicConditions || []).some((c) => c.toLowerCase().includes("asthma"));
    return {
      text: isAsthma ? "Here's a comparison of asthma management approaches." : "Here's a comparison of treatment options.",
      rxOutput: {
        kind: "text_comparison",
        data: {
          labelA: isAsthma ? "ICS Monotherapy" : "Option A",
          labelB: isAsthma ? "ICS + LABA Combo" : "Option B",
          itemsA: isAsthma ?
          ["Budesonide 200mcg BD", "Lower cost", "First-line for mild-moderate", "Step up if inadequate"] :
          ["Standard approach", "Well-established evidence", "Lower complexity"],
          itemsB: isAsthma ?
          ["Budesonide/Formoterol 200/6mcg BD", "Better symptom control", "Preferred if ICS alone insufficient", "Maintenance + reliever in one"] :
          ["Advanced approach", "May offer better outcomes", "Higher complexity"]
        }
      }
    };
  }

  // === TEXT LIST ===
  if (normalized.includes("checklist") || normalized.includes("to-do list") || normalized.includes("action items") || normalized.includes("pending items")) {
    const items = [];
    if (summary.dueAlerts?.length) items.push(...summary.dueAlerts);
    if (summary.recordAlerts?.length) items.push(...summary.recordAlerts);
    if (summary.followUpOverdueDays > 0) items.push(`Follow-up overdue by ${summary.followUpOverdueDays} days`);
    if (summary.labFlagCount > 0) items.push(`${summary.labFlagCount} flagged lab values to review`);
    if (items.length === 0) items.push("No pending items — all caught up!");
    return {
      text: `Here are the pending action items — ${items.length} items to address.`,
      rxOutput: { kind: "text_list", data: { items } }
    };
  }

  // === SUGGEST LAB TESTS → routes to investigation, not lab panel ===
  if (normalized.includes("suggest") && normalized.includes("lab") || normalized.includes("initial investigation") || normalized.includes("initial workup")) {
    const { title, items, labInvestigations } = buildInvestigations(summary);
    return {
      text: "These investigations might help clarify the clinical picture.",
      rxOutput: {
        kind: "investigation_bundle",
        data: {
          title,
          items,
          copyPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            labInvestigations
          }
        }
      }
    };
  }

  // === LAB PANEL ===
  if (normalized.includes("lab") || normalized.includes("report") || normalized.includes("flag")) {
    if (!summary.keyLabs || summary.keyLabs.length === 0) {
      return { text: "No lab results available for this patient yet." };
    }
    const flaggedCount = summary.keyLabs.filter((l) => l.flag).length;
    return {
      text: `I noticed ${flaggedCount} flagged values in the latest panel \u2014 here's a closer look.`,
      rxOutput: {
        kind: "lab_panel",
        data: {
          panelDate: summary.lastVisit?.date || "Recent",
          flagged: summary.keyLabs,
          hiddenNormalCount: Math.max(0, 17 - summary.keyLabs.length)
        }
      },
      suggestions: [
      { label: "Lab comparison", message: "Lab comparison" },
      { label: "Today's vitals", message: "Today's vitals" },
      { label: "Suggest investigations", message: "Suggest investigations" }]

    };
  }

  // === eGFR TREND (CKD-specific) ===
  if (normalized.includes("egfr trend") || normalized.includes("egfr")) {
    return {
      text: "Here's the eGFR trend over the past 12 months. The declining trajectory confirms CKD Stage 5 progression — Ramesh is now on maintenance dialysis.",
      rxOutput: {
        kind: "lab_trend",
        data: {
          title: "eGFR Trend (12 months)",
          parameterName: "eGFR",
          series: [{
            label: "eGFR",
            values: [14, 12, 10, 9, 8, 7],
            dates: ["Apr'25", "Jun'25", "Aug'25", "Oct'25", "Dec'25", "Feb'26"],
            tone: "critical",
            threshold: 15,
            thresholdLabel: "Stage 5 <15",
            unit: "mL/min/1.73m²"
          }]
        }
      }
    };
  }

  // === LAB TREND (HbA1c, specific lab trends) ===
  if (normalized.includes("hba1c trend") || normalized.includes("lab trend") || normalized.includes("hba1c")) {
    return {
      text: "Here's the HbA1c trend over recent visits. Gradual improvement from 10.1% → 9.2% with current regimen, but still above target.",
      rxOutput: {
        kind: "lab_trend",
        data: {
          title: "HbA1c Trend",
          parameterName: "HbA1c",
          series: [{
            label: "HbA1c",
            values: [10.1, 10.0, 9.4, 9.3, 9.2],
            dates: ["Jun'25", "Aug'25", "Oct'25", "Dec'25", "Feb'26"],
            tone: "critical",
            threshold: 6.5,
            thresholdLabel: "Target <6.5%",
            unit: "%"
          }]
        }
      }
    };
  }

  // === VITAL TRENDS ===
  if (normalized.includes("vital") || normalized.includes("trend") || normalized.includes("bp") || normalized.includes("spo2") || normalized.includes("temperature") || normalized.includes("pulse")) {
    if (!summary.concernTrend && !summary.todayVitals) {
      return { text: "No vital signs recorded for this patient yet." };
    }
    const series = [];
    if (summary.concernTrend) {
      series.push({
        label: summary.concernTrend.label,
        values: summary.concernTrend.values,
        dates: summary.concernTrend.labels,
        tone: summary.concernTrend.tone === "red" ? "critical" : summary.concernTrend.tone === "amber" || summary.concernTrend.tone === "violet" ? "warn" : "ok",
        threshold: summary.concernTrend.label === "SpO\u2082" ? 95 : 140,
        thresholdLabel: summary.concernTrend.label === "SpO\u2082" ? "Normal \u226595%" : "140 mmHg",
        unit: summary.concernTrend.unit
      });
    }
    const useBar = false; // Always use line graph for better visualization
    return {
      text: "Here's how the vitals have been trending over recent visits.",
      rxOutput: {
        kind: useBar ? "vitals_trend_bar" : "vitals_trend_line",
        data: {
          title: "Vital Trends",
          series
        }
      }
    };
  }

  // === DDX ===
  if (normalized.includes("ddx") || normalized.includes("differential") || normalized.includes("diagnosis") || normalized.includes("diagnose")) {
    const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name).join(", ") || summary.patientNarrative || "Symptoms";
    const context = `${symptoms} \u00B7 ${(summary.chronicConditions || []).join(", ")} \u00B7 ${(summary.allergies || []).join(", ")}`;
    return {
      text: "Based on the symptoms and history, here are some diagnostic considerations.",
      rxOutput: {
        kind: "ddx",
        data: {
          context,
          options: buildDDXOptions(summary)
        }
      }
    };
  }

  // === PROTOCOL MEDS ===
  if (normalized.includes("protocol") || normalized.includes("med") || normalized.includes("prescription") || normalized.includes("rx")) {
    const { diagnosis, meds, medications } = buildProtocolMeds(summary);
    return {
      text: `Here's a medication protocol suggestion for ${diagnosis} \u2014 please review and adjust as needed.`,
      rxOutput: {
        kind: "protocol_meds",
        data: {
          diagnosis,
          meds,
          safetyCheck: summary.allergies && summary.allergies.length > 0 ?
          `Checked against allergies: ${summary.allergies.join(", ")}` :
          "\u2713 No allergy conflicts \u00B7 No interactions",
          copyPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            medications
          }
        }
      }
    };
  }

  // === INVESTIGATIONS ===
  if (normalized.includes("investigation") || normalized.includes("test") || normalized.includes("order") || normalized.includes("workup")) {
    const { title, items, labInvestigations } = buildInvestigations(summary);
    return {
      text: "These investigations might help clarify the clinical picture.",
      rxOutput: {
        kind: "investigation_bundle",
        data: {
          title,
          items,
          copyPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            labInvestigations
          }
        }
      }
    };
  }

  // === ADVICE ===
  if (normalized.includes("advice") || normalized.includes("counsel") || normalized.includes("advise")) {
    const { items, shareMessage, adviceCopy } = buildAdvice(summary);
    return {
      text: "I've drafted some advice points for this consultation.",
      rxOutput: {
        kind: "advice_bundle",
        data: {
          title: "Advice",
          items,
          shareMessage,
          copyPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            advice: adviceCopy
          }
        }
      }
    };
  }

  // === FOLLOW-UP ===
  if (normalized.includes("follow") || normalized.includes("f/u") || normalized.includes("schedule") || normalized.includes("next visit")) {
    const { context, options } = buildFollowUpOptions(summary);
    return {
      text: "Here's a follow-up recommendation based on the current status.",
      rxOutput: {
        kind: "follow_up",
        data: { context, options }
      }
    };
  }

  // === TRANSLATE ===
  if (normalized.includes("translate") || normalized.includes("hindi") || normalized.includes("telugu")) {
    const advice = summary.lastVisit?.advice || "Take medicines as prescribed. Rest well. Drink plenty of water. Follow up as scheduled.";
    const lang = normalized.includes("hindi") ? "Hindi" : normalized.includes("telugu") ? "Telugu" : "Hindi";
    return {
      text: `I've translated the advice into ${lang} for you.`,
      rxOutput: {
        kind: "translation",
        data: {
          sourceLanguage: "English",
          targetLanguage: lang,
          sourceText: `Take Telma20 before food morning & night. Drink 3L water. Avoid oily food. Walk 30 min. Follow-up 5 days with CBC.`,
          translatedText: lang === "Hindi" ?
          "Telma20 \u0938\u0941\u092C\u0939 \u0914\u0930 \u0930\u093E\u0924 \u0916\u093E\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0932\u0947\u0902\u0964 3L \u092A\u093E\u0928\u0940 \u092A\u093F\u090F\u0902\u0964 \u0924\u0932\u093E \u0916\u093E\u0928\u093E \u0928 \u0916\u093E\u090F\u0902\u0964 30 \u092E\u093F\u0928\u091F \u091A\u0932\u0947\u0902\u0964 5 \u0926\u093F\u0928 \u092C\u093E\u0926 CBC \u0915\u0930\u0935\u093E\u090F\u0902\u0964" :
          "Telma20 \u0C09\u0C26\u0C2F\u0C02, \u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F \u0C2D\u0C4B\u0C1C\u0C28\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C2E\u0C41\u0C02\u0C26\u0C41 \u0C24\u0C40\u0C38\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F. 3L \u0C28\u0C40\u0C30\u0C41 \u0C24\u0C3E\u0C17\u0C02\u0C21\u0C3F. 30 \u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C3E\u0C32\u0C41 \u0C28\u0C21\u0C35\u0C02\u0C21\u0C3F.",
          copyPayload: {
            sourceDateLabel: "Today",
            targetSection: "rxpad",
            advice: lang === "Hindi" ?
            "Telma20 \u0938\u0941\u092C\u0939 \u0914\u0930 \u0930\u093E\u0924 \u0916\u093E\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0932\u0947\u0902\u0964 3L \u092A\u093E\u0928\u0940 \u092A\u093F\u090F\u0902\u0964 \u0924\u0932\u093E \u0916\u093E\u0928\u093E \u0928 \u0916\u093E\u090F\u0902\u0964 30 \u092E\u093F\u0928\u091F \u091A\u0932\u0947\u0902\u0964 5 \u0926\u093F\u0928 \u092C\u093E\u0926 CBC \u0915\u0930\u0935\u093E\u090F\u0902\u0964" :
            "Telma20 \u0C09\u0C26\u0C2F\u0C02, \u0C30\u0C3E\u0C24\u0C4D\u0C30\u0C3F \u0C2D\u0C4B\u0C1C\u0C28\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C2E\u0C41\u0C02\u0C26\u0C41 \u0C24\u0C40\u0C38\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F."
          }
        }
      }
    };
  }

  // === COMPLETENESS ===
  if (normalized.includes("completeness") || normalized.includes("checklist") || normalized.includes("missing")) {
    return {
      text: "Here's the documentation checklist \u2014 a few sections still need your input.",
      rxOutput: {
        kind: "completeness",
        data: {
          sections: [
          { name: "Symptoms", filled: true, count: 2 },
          { name: "Diagnosis", filled: true, count: 1 },
          { name: "Med(Rx)", filled: true, count: 3 },
          { name: "Examination", filled: false },
          { name: "Lab Investigation", filled: false },
          { name: "Advice", filled: false },
          { name: "Follow Up", filled: false }],

          emptyCount: 4
        }
      }
    };
  }

  // === COMPARE ===
  if (normalized.includes("compare") && summary.keyLabs && summary.keyLabs.length > 0) {
    return {
      text: "Here's a side-by-side comparison of the latest lab values with previous results.",
      rxOutput: {
        kind: "lab_comparison",
        data: {
          rows: summary.keyLabs.slice(0, 5).map((lab) => ({
            parameter: lab.name,
            prevValue: String(Math.round(parseFloat(lab.value) * 0.92 * 10) / 10),
            currValue: lab.value,
            prevDate: "15 Dec",
            currDate: "27 Jan",
            delta: lab.flag === "high" ? `\u2191${(parseFloat(lab.value) * 0.08).toFixed(1)}` : `\u2193${(parseFloat(lab.value) * 0.08).toFixed(1)}`,
            direction: lab.flag === "high" ? "up" : "down",
            isFlagged: true
          }))
        }
      }
    };
  }

  // === RECENT ER HISTORY ===
  if (normalized.includes("recent er") || normalized.includes("er history") || normalized.includes("emergency admission")) {
    return {
      text: "Here are Ramesh Kumar's recent emergency department visits.",
      rxOutput: {
        kind: "text_list",
        data: {
          items: [
          "**Dec 2025** — Hyperkalemia (K⁺ 6.8 mEq/L) with ECG changes. Emergency dialysis + IV calcium gluconate. Discharged after 48hrs.",
          "**Oct 2025** — Acute pulmonary edema with fluid overload. Required urgent ultrafiltration. BP 198/112 on arrival. Stabilised and switched to higher-dose Torsemide."]

        }
      }
    };
  }

  // === ACTIVE MEDICATIONS (pill-triggered) ===
  if (normalized.includes("active medication") || normalized.includes("active med") || normalized.includes("current med")) {
    const meds = summary.activeMeds || [];
    if (meds.length === 0) {
      return { text: "No active medications recorded for this patient." };
    }
    return {
      text: `Here are the **${meds.length} active medications** for this patient.`,
      rxOutput: {
        kind: "text_list",
        data: {
          items: meds
        }
      }
    };
  }

  // === KEY LABS (emergency pill) ===
  if (normalized === "key labs" || normalized.includes("key lab") && !normalized.includes("trend")) {
    const labs = summary.keyLabs || [];
    if (labs.length === 0) {
      return { text: "No lab results available for this patient." };
    }
    return {
      text: `Here are the **${labs.length} key lab values** for this patient.`,
      rxOutput: {
        kind: "text_list",
        data: {
          items: labs.map((l) => {
            const flagIcon = l.flag === "critical" ? "🔴" : l.flag === "high" || l.flag === "low" ? "🟡" : "🟢";
            return `${flagIcon} **${l.name}**: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.flag ? ` (${l.flag})` : ""}`;
          })
        }
      }
    };
  }

  // === ALLERGY/SPO2 ALERTS ===
  if (normalized.includes("allergy") || normalized.includes("alert")) {
    if (summary.allergies && summary.allergies.length > 0) {
      return {
        text: `**${summary.allergies.length} allergies** on record for this patient. All prescriptions are automatically checked against this list before dispensing.`,
        rxOutput: {
          kind: "text_alert",
          data: {
            severity: "high",
            message: `Known allergens: **${summary.allergies.join("**, **")}**. Avoid prescribing medications containing these substances.`
          }
        }
      };
    }
    return { text: "No allergies recorded for this patient." };
  }

  // === CHECK INTERACTIONS ===
  if (normalized.includes("interaction") || normalized.includes("check interaction")) {
    const meds = summary.symptomCollectorData?.currentMedications || [];
    if (meds.length >= 2) {
      return {
        text: `Checked **${meds.length} medications** for interactions, no critical conflicts found.`,
        rxOutput: {
          kind: "drug_interaction",
          data: {
            drug1: meds[0]?.split(/\s+\d/)[0] || meds[0],
            drug2: meds[1]?.split(/\s+\d/)[0] || meds[1],
            severity: "moderate",
            risk: "Both medications are metabolized via CYP3A4. Monitor for increased side effects.",
            action: "No dose adjustment needed at current doses. Monitor renal function periodically."
          }
        }
      };
    }
    return { text: "No significant drug interactions found for the current medication list." };
  }

  // === PRE-CONSULT PREP ===
  if (normalized.includes("pre-consult") || normalized.includes("preconsult")) {
    return {
      text: summary.specialtyTags.length > 0 ?
      `Pre-consult summary ready. Key points: ${summary.chronicConditions?.join(", ") || "No chronic conditions"}, ${summary.labFlagCount > 0 ? `${summary.labFlagCount} flagged labs` : "labs normal"}, ${summary.followUpOverdueDays > 0 ? `follow-up overdue ${summary.followUpOverdueDays}d` : "follow-up on track"}.` :
      "New patient, no prior data available for pre-consult prep. You can start by reviewing the intake form or asking for symptoms.",
      rxOutput: summary.specialtyTags.length > 0 ? { kind: "sbar_overview", data: summary } : undefined
    };
  }

  // === ASK ME ANYTHING / GENERIC ===
  if (normalized.includes("ask me anything") || normalized.includes("ask anything")) {
    return {
      text: summary.specialtyTags.length > 0 ?
      `I have access to ${summary.chronicConditions?.length || 0} chronic conditions, ${summary.keyLabs?.length || 0} lab values, and recent visit data. What would you like to know?` :
      "This is a new patient. I can help with differential diagnosis, suggest investigations, or review the intake data. What would you like?"
    };
  }

  // === DEFAULT — TEXT + SUGGESTION PILLS FOR LOW-CONFIDENCE QUERIES ===
  return {
    text: buildDefaultResponse(input, summary),
    suggestions: [
    { label: "Patient summary", message: "Patient summary" },
    { label: "Today's vitals", message: "Today's vitals" },
    { label: "Medical history", message: "Medical history" },
    { label: "Last visit", message: "Last visit details" }]

  };
}

// === HELPERS ===

function buildLabInsight(labs) {
  if (!labs || labs.length === 0) return "";
  const highLabs = labs.filter((l) => l.flag === "high").map((l) => `${l.name}\u2191`);
  const lowLabs = labs.filter((l) => l.flag === "low").map((l) => `${l.name}\u2193`);
  const parts = [...highLabs, ...lowLabs];
  if (parts.length === 0) return "All values within normal range.";
  return `${parts.join(", ")} \u2014 correlate clinically.`;
}

function buildDDXOptions(summary) {
  const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name.toLowerCase()) || [];
  const hasFever = symptoms.some((s) => s.includes("fever"));
  const hasCough = symptoms.some((s) => s.includes("cough"));
  const hasKneePain = symptoms.some((s) => s.includes("knee"));
  const hasStiffness = symptoms.some((s) => s.includes("stiffness"));
  const hasHeadache = symptoms.some((s) => s.includes("headache"));
  const hasFatigue = symptoms.some((s) => s.includes("fatigue"));
  const hasBleeding = symptoms.some((s) => s.includes("bleeding") || s.includes("menstrual"));

  // Musculoskeletal — Ramesh M pattern (knee pain + morning stiffness)
  if (hasKneePain || hasStiffness) {
    return [
    { name: "Rheumatoid Arthritis", bucket: "cant_miss" },
    { name: "Septic Arthritis", bucket: "cant_miss" },
    { name: "Osteoarthritis", bucket: "most_likely" },
    { name: "Mechanical Knee Injury (meniscal)", bucket: "most_likely" },
    { name: "Gout / Pseudogout", bucket: "consider" },
    { name: "Reactive Arthritis", bucket: "consider" }];

  }

  // Obstetric — check for asthma-in-pregnancy (Neha) vs generic obstetric (Priya)
  if (summary.obstetricData) {
    const chronicLower = (summary.chronicConditions || []).map((c) => c.toLowerCase());
    const hasAsthma = chronicLower.some((c) => c.includes("asthma"));
    if (hasAsthma) {
      // Asthma in pregnancy — Neha Gupta pattern
      return [
      { name: "Acute severe asthma in pregnancy", bucket: "cant_miss" },
      { name: "Pre-eclampsia (with respiratory overlay)", bucket: "cant_miss" },
      { name: "Asthma exacerbation (seasonal/allergic)", bucket: "most_likely" },
      { name: "Allergic bronchitis in pregnancy", bucket: "most_likely" },
      { name: "GERD-related cough (pregnancy)", bucket: "consider" },
      { name: "Pulmonary embolism", bucket: "consider" }];

    }
    // Priya Rao pattern (edema + pregnancy)
    return [
    { name: "Pre-eclampsia", bucket: "cant_miss" },
    { name: "Deep Vein Thrombosis", bucket: "cant_miss" },
    { name: "Physiological edema of pregnancy", bucket: "most_likely" },
    { name: "Lumbar strain (pregnancy-related)", bucket: "most_likely" },
    { name: "Renal pathology", bucket: "consider" }];

  }

  // Gynec — Lakshmi K pattern (heavy bleeding + fatigue)
  if (hasBleeding) {
    return [
    { name: "Endometrial carcinoma", bucket: "cant_miss" },
    { name: "AUB (Ovulatory dysfunction)", bucket: "most_likely" },
    { name: "Uterine fibroids", bucket: "most_likely" },
    { name: "Coagulopathy", bucket: "consider" },
    { name: "Thyroid-related AUB", bucket: "consider" }];

  }

  // Headache — Anjali Patel pattern (headache + photophobia)
  if (hasHeadache) {
    return [
    { name: "Subarachnoid Hemorrhage", bucket: "cant_miss" },
    { name: "Migraine without aura", bucket: "most_likely" },
    { name: "Tension-type headache", bucket: "most_likely" },
    { name: "Cluster headache", bucket: "consider" },
    { name: "Digital eye strain headache", bucket: "consider" }];

  }

  // Pediatric — Arjun S pattern (cough + reduced appetite)
  if (summary.pediatricsData) {
    return [
    { name: "Pertussis (Whooping cough)", bucket: "cant_miss" },
    { name: "Recurrent reactive airways", bucket: "most_likely" },
    { name: "Post-nasal drip cough", bucket: "most_likely" },
    { name: "Foreign body aspiration", bucket: "consider" },
    { name: "Tuberculosis exposure", bucket: "consider" }];

  }

  // Fatigue — Vikram Singh pattern (fatigue + poor sleep + metabolic)
  if (hasFatigue) {
    return [
    { name: "Obstructive Sleep Apnea", bucket: "cant_miss" },
    { name: "Metabolic syndrome fatigue", bucket: "most_likely" },
    { name: "Subclinical hypothyroidism", bucket: "most_likely" },
    { name: "Depression / Anxiety", bucket: "consider" },
    { name: "Cardiac insufficiency", bucket: "consider" }];

  }

  // Fever — Shyam GR pattern (fever + cough + DM/HTN)
  if (hasFever) {
    return [
    { name: "Dengue Fever", bucket: "cant_miss" },
    { name: "Leptospirosis", bucket: "cant_miss" },
    { name: "Viral Fever", bucket: "most_likely" },
    { name: hasCough ? "URTI with Viral Fever" : "Bacterial Infection", bucket: "most_likely" },
    { name: "Allergic Reaction", bucket: "consider" },
    { name: "Drug Reaction", bucket: "consider" }];

  }

  // Chronic-condition-based detection (when no symptomCollectorData)
  const chronicLower = (summary.chronicConditions || []).map((c) => c.toLowerCase());
  const hasChronicAsthma = chronicLower.some((c) => c.includes("asthma"));
  const hasChronicThyroid = chronicLower.some((c) => c.includes("thyroid"));

  if (hasChronicAsthma) {
    return [
    { name: "Acute severe asthma", bucket: "cant_miss" },
    { name: "Pneumonia", bucket: "cant_miss" },
    { name: "Acute exacerbation of bronchial asthma", bucket: "most_likely" },
    { name: "Allergic bronchitis", bucket: "most_likely" },
    { name: "GERD-related cough", bucket: "consider" },
    { name: hasChronicThyroid ? "Thyroid-related respiratory symptoms" : "Cardiac wheeze", bucket: "consider" }];

  }

  return [
  { name: "Primary diagnosis", bucket: "most_likely" },
  { name: "Secondary consideration", bucket: "consider" }];

}

function buildDefaultResponse(input, summary) {
  if (summary.specialtyTags.length === 0) {
    return "This patient is new \u2014 you can start by adding history, uploading reports, or just ask me anything.";
  }
  return "Sorry, I couldn't help you with that at the moment. You can ask me about patient summaries, vitals, medical history, or past visits, or try the quick-action pills below to get started.";
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PER-PATIENT PROTOCOL MEDS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550




function buildProtocolMeds(summary) {
  const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name.toLowerCase()) || [];
  const hasKneePain = symptoms.some((s) => s.includes("knee"));
  const hasHeadache = symptoms.some((s) => s.includes("headache"));
  const hasFatigue = symptoms.some((s) => s.includes("fatigue"));
  const hasBleeding = symptoms.some((s) => s.includes("bleeding") || s.includes("menstrual"));

  // Musculoskeletal (Ramesh M)
  if (hasKneePain) {
    return {
      diagnosis: "Osteoarthritis, Right Knee",
      meds: [
      { name: "Paracetamol 500mg", dosage: "500mg", timing: "1-0-0-1", duration: "7d", notes: "For pain relief" },
      { name: "Diclofenac 50mg", dosage: "50mg", timing: "0-1-0-1", duration: "5d", notes: "After food only" },
      { name: "Pantoprazole 40mg", dosage: "40mg", timing: "1-0-0-0", duration: "7d", notes: "Gastric cover (BF)" },
      { name: "Calcium 500mg", dosage: "500mg", timing: "0-0-0-1", duration: "30d", notes: "Continue current" }],

      medications: [
      { medicine: "Paracetamol 500mg", unitPerDose: "1", frequency: "1-0-0-1", when: "AF", duration: "7d", note: "For pain" },
      { medicine: "Diclofenac 50mg", unitPerDose: "1", frequency: "0-1-0-1", when: "AF", duration: "5d", note: "" },
      { medicine: "Pantoprazole 40mg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "7d", note: "Gastric cover" },
      { medicine: "Calcium 500mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "30d", note: "Continue" }]

    };
  }

  // Obstetric — differentiate asthma-in-pregnancy (Neha) vs generic ANC (Priya)
  if (summary.obstetricData) {
    const chronicLower = (summary.chronicConditions || []).map((c) => c.toLowerCase());
    const hasAsthma = chronicLower.some((c) => c.includes("asthma"));
    if (hasAsthma) {
      // Neha Gupta — asthma + pregnancy + hypothyroid
      return {
        diagnosis: `Bronchial asthma in pregnancy (${summary.obstetricData.gestationalWeeks || "early"}), Hypothyroid on Rx`,
        meds: [
        { name: "Budesonide 200mcg", dosage: "200mcg", timing: "1-0-0-1", duration: "Cont.", notes: "Category B — safe in pregnancy" },
        { name: "Salbutamol MDI", dosage: "200mcg", timing: "SOS", duration: "SOS", notes: "Rescue inhaler" },
        { name: "Thyronorm 75mcg", dosage: "75mcg", timing: "1-0-0-0", duration: "Cont.", notes: "Increase dose in pregnancy" },
        { name: "Folic Acid 5mg", dosage: "5mg", timing: "1-0-0-0", duration: "Cont." },
        { name: "Ferrous Fumarate 200mg", dosage: "200mg", timing: "0-1-0-0", duration: "Cont.", notes: "Hb 10.8 — needs correction" }],

        medications: [
        { medicine: "Budesonide 200mcg", unitPerDose: "1 puff", frequency: "1-0-0-1", when: "", duration: "Cont.", note: "Cat B safe" },
        { medicine: "Salbutamol MDI 200mcg", unitPerDose: "2 puffs", frequency: "SOS", when: "", duration: "SOS", note: "Rescue" },
        { medicine: "Thyronorm 75mcg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "Cont.", note: "↑ dose" },
        { medicine: "Folic Acid 5mg", unitPerDose: "1", frequency: "1-0-0-0", when: "AF", duration: "Cont.", note: "" },
        { medicine: "Ferrous Fumarate 200mg", unitPerDose: "1", frequency: "0-1-0-0", when: "AF", duration: "Cont.", note: "Anemia" }]

      };
    }
    // Priya Rao — generic ANC pattern
    return {
      diagnosis: `ANC ${summary.obstetricData.gestationalWeeks || ""}, Hypothyroid on Rx, Pedal Edema`,
      meds: [
      { name: "Thyronorm 50mcg", dosage: "50mcg", timing: "1-0-0-0", duration: "Cont.", notes: "BF, empty stomach" },
      { name: "Folic Acid 5mg", dosage: "5mg", timing: "1-0-0-0", duration: "Cont." },
      { name: "Iron + Folic", dosage: "1 tab", timing: "0-1-0-0", duration: "Cont.", notes: "After food" },
      { name: "Calcium 500mg", dosage: "500mg", timing: "0-1-0-1", duration: "Cont." }],

      medications: [
      { medicine: "Thyronorm 50mcg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "Cont.", note: "Empty stomach" },
      { medicine: "Folic Acid 5mg", unitPerDose: "1", frequency: "1-0-0-0", when: "AF", duration: "Cont.", note: "" },
      { medicine: "Iron + Folic", unitPerDose: "1", frequency: "0-1-0-0", when: "AF", duration: "Cont.", note: "" },
      { medicine: "Calcium 500mg", unitPerDose: "1", frequency: "0-1-0-1", when: "AF", duration: "Cont.", note: "" }]

    };
  }

  // Gynec / bleeding (Lakshmi K)
  if (hasBleeding) {
    return {
      diagnosis: "AUB-Ovulatory dysfunction, Iron deficiency anemia, Hypothyroid",
      meds: [
      { name: "Thyronorm 75mcg", dosage: "75mcg", timing: "1-0-0-0", duration: "Cont.", notes: "BF, empty stomach" },
      { name: "Autrin capsule", dosage: "1 cap", timing: "0-1-0-0", duration: "30d", notes: "After food" },
      { name: "Tranexamic acid 500mg", dosage: "500mg", timing: "1-1-1-0", duration: "During flow", notes: "Max 5 days" },
      { name: "Vitamin C 500mg", dosage: "500mg", timing: "0-1-0-0", duration: "30d", notes: "Aids iron absorption" }],

      medications: [
      { medicine: "Thyronorm 75mcg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "Cont.", note: "Empty stomach" },
      { medicine: "Autrin capsule", unitPerDose: "1", frequency: "0-1-0-0", when: "AF", duration: "30d", note: "" },
      { medicine: "Tranexamic acid 500mg", unitPerDose: "1", frequency: "1-1-1-0", when: "AF", duration: "During flow", note: "Max 5d" },
      { medicine: "Vitamin C 500mg", unitPerDose: "1", frequency: "0-1-0-0", when: "AF", duration: "30d", note: "" }]

    };
  }

  // Migraine (Anjali Patel)
  if (hasHeadache) {
    return {
      diagnosis: "Migraine without aura, Vitamin D deficiency",
      meds: [
      { name: "Sumatriptan 50mg", dosage: "50mg", timing: "SOS", duration: "SOS", notes: "Max 2 tabs/day" },
      { name: "Naproxen 250mg", dosage: "250mg", timing: "1-0-0-1", duration: "5d", notes: "SOS for headache" },
      { name: "Vitamin D3 60K", dosage: "60K IU", timing: "Once weekly", duration: "8wk" },
      { name: "Amitriptyline 10mg", dosage: "10mg", timing: "0-0-0-1", duration: "30d", notes: "Migraine prophylaxis" }],

      medications: [
      { medicine: "Sumatriptan 50mg", unitPerDose: "1", frequency: "SOS", when: "", duration: "SOS", note: "Max 2/day" },
      { medicine: "Naproxen 250mg", unitPerDose: "1", frequency: "1-0-0-1", when: "AF", duration: "5d", note: "SOS" },
      { medicine: "Vitamin D3 60K", unitPerDose: "1", frequency: "Once weekly", when: "", duration: "8wk", note: "" },
      { medicine: "Amitriptyline 10mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "30d", note: "Prophylaxis" }]

    };
  }

  // Pediatric (Arjun S)
  if (summary.pediatricsData) {
    return {
      diagnosis: "Recurrent reactive airways, Reduced appetite",
      meds: [
      { name: "Salbutamol syrup", dosage: "2ml", timing: "1-1-1-0", duration: "5d", notes: "If wheeze" },
      { name: "Cetirizine syrup", dosage: "2.5ml", timing: "0-0-0-1", duration: "5d" },
      { name: "Honey + warm water", dosage: "1 tsp", timing: "0-0-0-1", duration: "5d", notes: "Cough soother" },
      { name: "Multivitamin syrup", dosage: "5ml", timing: "0-1-0-0", duration: "30d", notes: "Appetite booster" }],

      medications: [
      { medicine: "Salbutamol syrup 2ml", unitPerDose: "2ml", frequency: "1-1-1-0", when: "", duration: "5d", note: "If wheeze" },
      { medicine: "Cetirizine syrup 2.5ml", unitPerDose: "2.5ml", frequency: "0-0-0-1", when: "", duration: "5d", note: "" },
      { medicine: "Honey + warm water 1 tsp", unitPerDose: "1 tsp", frequency: "0-0-0-1", when: "", duration: "5d", note: "" },
      { medicine: "Multivitamin syrup 5ml", unitPerDose: "5ml", frequency: "0-1-0-0", when: "", duration: "30d", note: "" }]

    };
  }

  // Fatigue/metabolic (Vikram Singh)
  if (hasFatigue) {
    return {
      diagnosis: "Fatigue syndrome, HTN Stage I, Dyslipidemia",
      meds: [
      { name: "Telma 40mg", dosage: "40mg", timing: "1-0-0-0", duration: "Cont.", notes: "BF (continue)" },
      { name: "Rosuvastatin 10mg", dosage: "10mg", timing: "0-0-0-1", duration: "Cont.", notes: "Bedtime (continue)" },
      { name: "CoQ10 100mg", dosage: "100mg", timing: "0-0-0-1", duration: "30d", notes: "Fatigue support" },
      { name: "Melatonin 3mg", dosage: "3mg", timing: "0-0-0-1", duration: "14d", notes: "30 min before bed" }],

      medications: [
      { medicine: "Telma 40mg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "Cont.", note: "Continue" },
      { medicine: "Rosuvastatin 10mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "Cont.", note: "Bedtime" },
      { medicine: "CoQ10 100mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "30d", note: "" },
      { medicine: "Melatonin 3mg", unitPerDose: "1", frequency: "0-0-0-1", when: "", duration: "14d", note: "30min before bed" }]

    };
  }


  // Asthma pattern (chronic condition — Neha without symptomCollectorData)
  const chronicLower2 = (summary.chronicConditions || []).map((c) => c.toLowerCase());
  if (chronicLower2.some((c) => c.includes("asthma"))) {
    return {
      diagnosis: "Bronchial asthma (exacerbation), Hypothyroid on Rx",
      meds: [
      { name: "Budesonide 200mcg", dosage: "200mcg", timing: "1-0-0-1", duration: "Cont.", notes: "ICS controller" },
      { name: "Montelukast 10mg", dosage: "10mg", timing: "0-0-0-1", duration: "Cont.", notes: "LTRA" },
      { name: "Salbutamol MDI", dosage: "200mcg", timing: "SOS", duration: "SOS", notes: "Rescue inhaler" },
      { name: "Thyronorm 50mcg", dosage: "50mcg", timing: "1-0-0-0", duration: "Cont.", notes: "BF empty stomach" }],

      medications: [
      { medicine: "Budesonide 200mcg", unitPerDose: "1 puff", frequency: "1-0-0-1", when: "", duration: "Cont.", note: "ICS" },
      { medicine: "Montelukast 10mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "Cont.", note: "" },
      { medicine: "Salbutamol MDI 200mcg", unitPerDose: "2 puffs", frequency: "SOS", when: "", duration: "SOS", note: "Rescue" },
      { medicine: "Thyronorm 50mcg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "Cont.", note: "" }]

    };
  }
  // Default (Shyam GR / fever pattern)
  const dx = summary.lastVisit?.diagnosis || "Current diagnosis";
  return {
    diagnosis: dx,
    meds: [
    { name: "Paracetamol 650mg", dosage: "650mg", timing: "1-0-0-1", duration: "5d", notes: "SOS if fever>100\u00B0F" },
    { name: "Cetirizine 10mg", dosage: "10mg", timing: "0-0-0-1", duration: "5d" },
    { name: "Pantoprazole 40mg", dosage: "40mg", timing: "1-0-0-0", duration: "5d", notes: "BF" }],

    medications: [
    { medicine: "Paracetamol 650mg", unitPerDose: "1", frequency: "1-0-0-1", when: "AF", duration: "5d", note: "SOS" },
    { medicine: "Cetirizine 10mg", unitPerDose: "1", frequency: "0-0-0-1", when: "AF", duration: "5d", note: "" },
    { medicine: "Pantoprazole 40mg", unitPerDose: "1", frequency: "1-0-0-0", when: "BF", duration: "5d", note: "" }]

  };
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PER-PATIENT INVESTIGATIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550



function buildInvestigations(summary) {
  const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name.toLowerCase()) || [];
  const hasKneePain = symptoms.some((s) => s.includes("knee"));
  const hasHeadache = symptoms.some((s) => s.includes("headache"));
  const hasFatigue = symptoms.some((s) => s.includes("fatigue"));
  const hasBleeding = symptoms.some((s) => s.includes("bleeding") || s.includes("menstrual"));

  if (hasKneePain) {
    const items = [
    { name: "X-ray Both Knees AP/LAT", rationale: "Joint space assessment", selected: true },
    { name: "CBC", rationale: "Baseline + infection screening", selected: true },
    { name: "ESR", rationale: "Inflammatory marker", selected: true },
    { name: "CRP", rationale: "Acute inflammation", selected: true },
    { name: "Uric Acid", rationale: "Rule out gout", selected: true },
    { name: "RA Factor", rationale: "Rule out RA (morning stiffness)", selected: false },
    { name: "Serum Vitamin D", rationale: "Known deficiency context", selected: false }];

    return { title: "Investigations \u2014 Knee Pain Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }

  if (summary.obstetricData) {
    const items = [
    { name: "BP Chart (4-hourly)", rationale: "Pre-eclampsia monitoring", selected: true },
    { name: "24hr Urine Protein", rationale: "If BP rises above 140/90", selected: true },
    { name: "NST (Non-stress test)", rationale: "Fetal wellbeing at 38wk", selected: true },
    { name: "TSH", rationale: "Thyroid recheck (on Thyronorm)", selected: true },
    { name: "CBC", rationale: "Hb monitoring (last 11.2 g/dL)", selected: true },
    { name: "USG Doppler", rationale: "If edema worsens", selected: false }];

    return { title: "Investigations \u2014 ANC 38wk", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }

  if (hasBleeding) {
    const items = [
    { name: "USG Pelvis", rationale: "Endometrial thickness + ovarian eval", selected: true },
    { name: "Pap Smear", rationale: "Overdue >1 year", selected: true },
    { name: "CBC", rationale: "Hb monitoring (last 9.2 g/dL)", selected: true },
    { name: "Iron Studies", rationale: "Serum ferritin + TIBC", selected: true },
    { name: "Thyroid Panel", rationale: "TSH + Free T4 (on Thyronorm)", selected: true },
    { name: "Endometrial Biopsy", rationale: "If USG shows thickened endometrium", selected: false }];

    return { title: "Investigations \u2014 AUB Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }

  if (hasHeadache) {
    const items = [
    { name: "Vitamin D", rationale: "Known deficiency (last 18 ng/mL)", selected: true },
    { name: "Vitamin B12", rationale: "Neurological screening", selected: true },
    { name: "CBC", rationale: "Baseline assessment", selected: true },
    { name: "Thyroid Panel", rationale: "Rule out thyroid-related headache", selected: false },
    { name: "MRI Brain", rationale: "If refractory to treatment", selected: false }];

    return { title: "Investigations \u2014 Migraine Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }

  if (summary.pediatricsData) {
    const items = [
    { name: "CBC", rationale: "Infection screening + Hb check", selected: true },
    { name: "Chest X-ray", rationale: "If wheeze persists >5d", selected: false },
    { name: "IgE levels", rationale: "Allergy screening (family hx asthma)", selected: false },
    { name: "Speech & Language Assessment", rationale: "Developmental concern noted", selected: true }];

    return { title: "Investigations \u2014 Pediatric Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }

  if (hasFatigue) {
    const items = [
    { name: "ECG", rationale: "Cardiac screening (pending)", selected: true },
    { name: "Lipid Panel", rationale: "Recheck overdue", selected: true },
    { name: "HbA1c", rationale: "Pre-diabetes monitoring (last 6.2%)", selected: true },
    { name: "TSH", rationale: "Rule out hypothyroidism", selected: true },
    { name: "Sleep Study Referral", rationale: "If sleep issues persist", selected: false },
    { name: "Vitamin D + B12", rationale: "Fatigue workup", selected: false }];

    return { title: "Investigations \u2014 Fatigue + Metabolic Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }


  // Asthma + Thyroid pattern (Neha — chronic conditions without symptomCollectorData)
  const chronicLower3 = (summary.chronicConditions || []).map((c) => c.toLowerCase());
  const hasChronicAsthma3 = chronicLower3.some((c) => c.includes("asthma"));
  const isPregnant3 = !!summary.obstetricData;
  if (hasChronicAsthma3) {
    const items = [
    { name: "PEFR (Peak Expiratory Flow)", rationale: "Asthma control assessment", selected: true },
    { name: "TSH", rationale: "Thyroid monitoring (last 5.2 mIU/L)", selected: true },
    { name: "CBC", rationale: "Hb check (last 10.8 g/dL)", selected: true },
    { name: "IgE levels", rationale: "Allergy quantification (last 380)", selected: true },
    { name: "Serum Vitamin D", rationale: "Known deficiency (last 16 ng/mL)", selected: true },
    ...(isPregnant3 ? [
    { name: "NT Scan (11-14wk)", rationale: "First trimester screening", selected: true },
    { name: "Fasting Blood Sugar", rationale: "GDM screening (PCOS history)", selected: true },
    { name: "Beta hCG + PAPP-A", rationale: "Combined first trimester screen", selected: false }] :
    [
    { name: "Chest X-ray (PA view)", rationale: "If persistent wheeze", selected: false },
    { name: "Spirometry", rationale: "Detailed pulmonary function", selected: false }])];


    return { title: isPregnant3 ? "Investigations — Asthma in Pregnancy" : "Investigations — Asthma Workup", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
  }
  // Default (fever pattern)
  const items = [
  { name: "CBC", rationale: "Infection screening", selected: true },
  { name: "CRP", rationale: "Inflammation marker", selected: true },
  { name: "LFT", rationale: "Dengue rule-out", selected: true },
  { name: "Dengue NS1", rationale: "Endemic area", selected: true },
  { name: "Blood Culture", rationale: "If persistent fever", selected: false },
  { name: "Chest X-ray", rationale: "If cough >5d", selected: false }];

  return { title: "Investigations", items, labInvestigations: items.filter((i) => i.selected).map((i) => i.name) };
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PER-PATIENT ADVICE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function buildAdvice(summary) {
  const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name.toLowerCase()) || [];
  const hasKneePain = symptoms.some((s) => s.includes("knee"));
  const hasHeadache = symptoms.some((s) => s.includes("headache"));
  const hasFatigue = symptoms.some((s) => s.includes("fatigue"));
  const hasBleeding = symptoms.some((s) => s.includes("bleeding") || s.includes("menstrual"));

  if (hasKneePain) {
    const items = [
    "Rest the affected knee \u2014 avoid climbing stairs and squatting",
    "Apply ice pack on knee for 15 min, 3 times a day",
    "Calcium-rich diet (milk, curd, ragi, leafy greens)",
    "Continue Vitamin D3 as prescribed",
    "Avoid Sulfonamide-containing medications (known allergy)",
    "Return with X-ray report in 1 week"];

    return { items, shareMessage: "Rest knee. Ice 15min TDS. Calcium-rich diet. Continue Vitamin D3. Avoid Sulfonamides. Return in 1 week with X-ray.", adviceCopy: items.join(". ") };
  }

  if (summary.obstetricData) {
    const items = [
    "Left lateral sleeping position \u2014 reduces edema",
    "Keep legs elevated when sitting",
    "Adequate hydration (3L/day)",
    "Monitor fetal kick count \u2014 report if <10 kicks in 2 hours",
    "Report immediately: severe headache, visual changes, sudden swelling, reduced fetal movement",
    "Continue all prescribed medications",
    "Hospital bag ready \u2014 EDD approaching"];

    return { items, shareMessage: "Sleep on left side. Elevate legs. Drink 3L water. Count baby kicks. Report headache/swelling/reduced movement. Keep hospital bag ready.", adviceCopy: items.join(". ") };
  }

  if (hasBleeding) {
    const items = [
    "Iron-rich diet: spinach, beetroot, dates, jaggery, red meat",
    "Take Vitamin C with iron \u2014 aids absorption",
    "AVOID Ibuprofen (known allergy) \u2014 use Paracetamol if needed",
    "Track cycle and flow (pads/day) in diary",
    "Report if soaking >1 pad/hour or passing large clots",
    "Pap smear due \u2014 please schedule",
    "Return with USG pelvis report"];

    return { items, shareMessage: "Iron-rich diet. Take Vitamin C with iron. AVOID Ibuprofen. Track cycle. Report heavy flow. Get Pap smear done. Return with USG report.", adviceCopy: items.join(". ") };
  }

  if (hasHeadache) {
    const items = [
    "Follow 20-20-20 rule: every 20 min, look 20 feet away for 20 sec",
    "Maintain regular sleep schedule (7-8 hrs)",
    "Stay hydrated (2.5-3L/day)",
    "Maintain a migraine diary (triggers, frequency, severity)",
    "Reduce screen time where possible, use blue light filter",
    "Avoid known triggers (bright lights, skipped meals, stress)"];

    return { items, shareMessage: "Follow 20-20-20 rule. Sleep 7-8 hrs. Drink 3L water. Keep migraine diary. Reduce screen time. Avoid triggers.", adviceCopy: items.join(". ") };
  }

  if (summary.pediatricsData) {
    const items = [
    "Steam inhalation before bedtime (supervised)",
    "Avoid cold drinks and ice cream",
    "Encourage solid food intake \u2014 reduce milk dependency",
    "Honey + warm water at bedtime for cough (safe >1yr)",
    "MMR-2 vaccine overdue \u2014 schedule at next visit",
    "Consider speech therapy referral for language assessment",
    "Limit screen time to <1 hr/day"];

    return { items, shareMessage: "Steam inhalation at night. No cold drinks. More solid food. Honey for cough. Get MMR-2 vaccine. Speech eval needed. Limit screen time.", adviceCopy: items.join(". ") };
  }

  if (hasFatigue) {
    const items = [
    "Dinner by 8 PM \u2014 no heavy meals before bed",
    "No screens 1 hour before bedtime",
    "Walk 30 minutes daily \u2014 morning preferred",
    "Limit alcohol to occasional (avoid weekday drinking)",
    "Get ECG done as advised",
    "Continue current medications without interruption"];

    return { items, shareMessage: "Dinner by 8 PM. No screens before bed. Walk 30 min daily. Limit alcohol. Get ECG. Continue medicines.", adviceCopy: items.join(". ") };
  }


  // Asthma pattern (Neha — chronic condition without symptomCollectorData)
  const chronicLower4 = (summary.chronicConditions || []).map((c) => c.toLowerCase());
  const hasChronicAsthma4 = chronicLower4.some((c) => c.includes("asthma"));
  const isPregnant4 = !!summary.obstetricData;
  if (hasChronicAsthma4) {
    const items = isPregnant4 ? [
    "Continue Budesonide inhaler — safe in pregnancy (Category B)",
    "AVOID Aspirin (known bronchospasm trigger) and Penicillin (rash)",
    "Use Salbutamol MDI as rescue — safe in pregnancy",
    "Deriphyllin NOT recommended in 1st trimester",
    "Monitor PEFR daily — report if <300 L/min",
    "Take Thyronorm on empty stomach (increased dose for pregnancy)",
    "Iron-rich diet for Hb correction (10.8 g/dL — target 11.5+)",
    "NT Scan due this week (11-14 weeks window)",
    "Report immediately: worsening breathlessness, chest tightness, reduced fetal movement"] :
    [
    "Use inhaler correctly — shake, exhale, inhale slowly, hold 10s",
    "Avoid triggers: dust, smoke, cold air, strong perfumes",
    "AVOID Aspirin and Penicillin (known allergies)",
    "Monitor PEFR daily — maintain diary",
    "Take Thyronorm on empty stomach, 30 min before breakfast",
    "Annual flu vaccine recommended for asthmatics",
    "Report if needing rescue inhaler >2 times/week"];

    const shareMessage = isPregnant4 ?
    "Continue Budesonide. Avoid Aspirin/Penicillin. Monitor PEFR daily. Take Thyronorm empty stomach. Get NT Scan done. Report breathlessness." :
    "Use inhaler correctly. Avoid triggers. Take Thyronorm empty stomach. Monitor PEFR. Get flu vaccine.";
    return { items, shareMessage, adviceCopy: items.join(". ") };
  }
  // Default (fever/Shyam GR pattern)
  const items = [
  "Rest, plenty of fluids (3L/day minimum)",
  "Avoid dust exposure (known allergy)",
  "Monitor temperature \u2014 return if fever persists >3 days",
  "Continue regular medications (Telma20, Metsmail 500)",
  "Follow up with CBC report"];

  return { items, shareMessage: "Rest well. Drink 3L water daily. Avoid dust. Take medicines as prescribed. Return if fever continues >3 days.", adviceCopy: items.join(". ") };
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PER-PATIENT FOLLOW-UP OPTIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function buildFollowUpOptions(summary) {
  const symptoms = summary.symptomCollectorData?.symptoms.map((s) => s.name.toLowerCase()) || [];
  const hasKneePain = symptoms.some((s) => s.includes("knee"));
  const hasHeadache = symptoms.some((s) => s.includes("headache"));
  const hasFatigue = symptoms.some((s) => s.includes("fatigue"));
  const hasBleeding = symptoms.some((s) => s.includes("bleeding") || s.includes("menstrual"));

  if (hasKneePain) {
    return {
      context: "Dx: Osteoarthritis R knee \u00B7 Initial workup ordered",
      options: [
      { label: "1 week", days: 7, recommended: true, reason: "Review X-ray + lab results" },
      { label: "2 weeks", days: 14, reason: "If improvement, extend to fortnightly" },
      { label: "1 month", days: 30, reason: "Routine follow-up if stable" }]

    };
  }

  if (summary.obstetricData) {
    const chronicLowerFU = (summary.chronicConditions || []).map((c) => c.toLowerCase());
    const hasAsthmaFU = chronicLowerFU.some((c) => c.includes("asthma"));
    if (hasAsthmaFU) {
      // Neha — asthma in pregnancy
      return {
        context: `Dx: Asthma in pregnancy (${summary.obstetricData.gestationalWeeks || "early"}) + Hypothyroid + ${summary.labFlagCount} lab flags`,
        options: [
        { label: "1 week", days: 7, recommended: true, reason: "NT Scan window + asthma review + TSH recheck" },
        { label: "2 weeks", days: 14, reason: "Pulmonary function assessment + lab results" },
        { label: "4 weeks", days: 28, reason: "Routine ANC (monthly until 28wk)" }]

      };
    }
    // Priya Rao — generic ANC
    return {
      context: "Dx: ANC 38wk \u00B7 Primigravida \u00B7 BP borderline",
      options: [
      { label: "3 days", days: 3, recommended: true, reason: "Weekly ANC at 38wk + BP monitoring" },
      { label: "1 week", days: 7, reason: "Standard weekly ANC" },
      { label: "Admit if BP\u2191", days: 0, reason: "Immediate admission if BP >140/90 or symptoms" }]

    };
  }

  if (hasBleeding) {
    return {
      context: "Dx: AUB + Iron deficiency anemia \u00B7 Hb 9.2 g/dL",
      options: [
      { label: "2 weeks", days: 14, recommended: true, reason: "USG pelvis + Pap smear results" },
      { label: "6 weeks", days: 42, reason: "Standard gynec follow-up" },
      { label: "1 month", days: 30, reason: "Check Hb response to iron therapy" }]

    };
  }

  if (hasHeadache) {
    return {
      context: "Dx: Migraine without aura \u00B7 Vitamin D deficiency",
      options: [
      { label: "2 weeks", days: 14, recommended: true, reason: "Assess prophylaxis response" },
      { label: "1 month", days: 30, reason: "Lab results + migraine diary review" },
      { label: "3 months", days: 90, reason: "Long-term prophylaxis assessment" }]

    };
  }

  if (summary.pediatricsData) {
    return {
      context: "Dx: Recurrent reactive airways \u00B7 Reduced appetite \u00B7 Speech delay",
      options: [
      { label: "5 days", days: 5, recommended: true, reason: "Reassess cough + appetite" },
      { label: "2 weeks", days: 14, reason: "Speech therapy follow-up" },
      { label: "1 month", days: 30, reason: "Growth monitoring + vaccine catch-up" }]

    };
  }

  if (hasFatigue) {
    return {
      context: "Dx: Fatigue syndrome \u00B7 HTN + Dyslipidemia \u00B7 3 lab flags",
      options: [
      { label: "2 weeks", days: 14, recommended: true, reason: "ECG + lab results review" },
      { label: "1 month", days: 30, reason: "Sleep improvement assessment" },
      { label: "3 months", days: 90, reason: "Lipid panel recheck" }]

    };
  }


  // Asthma without pregnancy (standalone chronic condition pattern)
  const chronicLower5 = (summary.chronicConditions || []).map((c) => c.toLowerCase());
  if (chronicLower5.some((c) => c.includes("asthma"))) {
    return {
      context: `Dx: Bronchial asthma exacerbation + Hypothyroid + ${summary.labFlagCount} lab flags`,
      options: [
      { label: "2 weeks", days: 14, recommended: true, reason: "Reassess asthma control + PEFR review" },
      { label: "1 month", days: 30, reason: "Step-down assessment if well-controlled" },
      { label: "3 months", days: 90, reason: "TSH recheck + long-term asthma review" }]

    };
  }
  // Default (Shyam GR / fever)
  const dx = summary.lastVisit?.diagnosis || "Current consultation";
  return {
    context: `Dx: ${dx}${summary.labFlagCount > 0 ? ` + ${summary.labFlagCount} lab flags` : ""}`,
    options: [
    { label: "5 days", days: 5, recommended: true, reason: "Fever reassessment + new med glucose check" },
    { label: "2 weeks", days: 14, reason: "Standard follow-up interval" },
    { label: "1 month", days: 30, reason: "Chronic monitoring (DM + HTN)" }]

  };
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 DOCUMENT UPLOAD REPLY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550



export function getDocTypeForSpecialty(specialty) {
  if (specialty === "gynec") return "radiology";
  if (specialty === "obstetric") return "prescription";
  if (specialty === "gp") return "pathology";
  return "generic";
}

export function buildDocumentReply(
docType,
_summary)
{
  switch (docType) {
    case "pathology":
      return buildPathologyReply();
    case "radiology":
      return buildRadiologyReply();
    case "prescription":
      return buildPrescriptionReply();
    default:
      return buildGenericDocReply();
  }
}

function buildPathologyReply() {
  return {
    text: "I've detected this as a **pathology report**. Here are the extracted lab values \u2014 I've highlighted the concerning ones for your review.\n\nWould you like me to copy these values to the lab results section, or compare them with previous results?",
    rxOutput: {
      kind: "ocr_pathology",
      data: {
        title: "Pathology Report",
        category: "Apollo Diagnostics \u00B7 05 Mar 2026",
        parameters: [
        { name: "Hemoglobin", value: "11.2 g/dL", refRange: "13-17", flag: "low" },
        { name: "WBC", value: "12,800 /\u03BCL", refRange: "4000-11000", flag: "high" },
        { name: "Platelet Count", value: "1,45,000 /\u03BCL", refRange: "150000-400000", flag: "low" },
        { name: "ESR", value: "42 mm/hr", refRange: "0-20", flag: "high" },
        { name: "CRP", value: "18.5 mg/L", refRange: "0-5", flag: "high" },
        { name: "Fasting Glucose", value: "168 mg/dL", refRange: "70-100", flag: "high" },
        { name: "HbA1c", value: "8.1 %", refRange: "4-5.6", flag: "high" },
        { name: "Creatinine", value: "1.1 mg/dL", refRange: "0.7-1.3" }],

        normalCount: 1
      }
    }
  };
}

function buildRadiologyReply() {
  return {
    text: "I've identified this as a **radiology report**. Here are the key findings extracted from the scan.\n\nWould you like me to save this to medical records, or extract specific findings?",
    rxOutput: {
      kind: "ocr_extraction",
      data: {
        title: "Radiology Report - USG Pelvis",
        category: "Radiology \u00B7 Auto-Analyzed",
        sections: [
        {
          heading: "Findings",
          icon: "search",
          items: [
          "Uterus: Anteverted, normal size (8.2 \u00D7 4.1 \u00D7 3.8 cm)",
          "Endometrial thickness: 12mm (thickened)",
          "Right ovary: Simple cyst 2.3cm",
          "Left ovary: Normal",
          "No free fluid in POD"],

          copyDestination: "medical-records"
        },
        {
          heading: "Impression",
          icon: "clipboard-activity",
          items: [
          "Thickened endometrium \u2014 correlate clinically",
          "Right ovarian simple cyst \u2014 likely functional",
          "Suggest follow-up USG after next cycle"],

          copyDestination: "medical-records"
        }]

      }
    }
  };
}

function buildPrescriptionReply() {
  return {
    text: "I've detected this as a **prescription document**. Here are the medications and notes extracted.\n\nWould you like me to copy these medications to the current prescription, or save to records?",
    rxOutput: {
      kind: "ocr_extraction",
      data: {
        title: "Prescription - Previous Consultation",
        category: "Prescription \u00B7 Auto-Analyzed",
        sections: [
        {
          heading: "Medications",
          icon: "pill",
          items: [
          "Tab Folvite 5mg \u2014 1-0-0 \u2014 30 days",
          "Tab Calcium 500mg \u2014 1-0-1 \u2014 30 days",
          "Tab Iron (Autrin) \u2014 0-1-0 \u2014 30 days (AF)",
          "Cap DHA Omega-3 \u2014 0-0-1 \u2014 30 days"],

          copyDestination: "rxpad"
        },
        {
          heading: "Advice",
          icon: "clipboard-activity",
          items: [
          "Continue prenatal vitamins",
          "Adequate hydration (3L/day)",
          "Gentle walking 20 min daily",
          "Report any bleeding, severe headache, or reduced fetal movement"],

          copyDestination: "advice"
        },
        {
          heading: "Follow-up",
          icon: "medical-record",
          items: [
          "Next ANC visit: 2 weeks",
          "Anomaly scan at 18-20 weeks if not done"],

          copyDestination: "follow-up"
        }]

      }
    }
  };
}

function buildGenericDocReply() {
  return {
    text: "I've scanned the uploaded document. It appears to be a **medical document** \u2014 here's what I could extract.\n\nWould you like me to save this to medical records?",
    rxOutput: {
      kind: "ocr_extraction",
      data: {
        title: "Medical Document",
        category: "General \u00B7 Auto-Analyzed",
        sections: [
        {
          heading: "Extracted Content",
          icon: "medical-record",
          items: [
          "Document scanned successfully",
          "Content type: Medical record / clinical note",
          "Date on document: Recent",
          "Full OCR text available for review"],

          copyDestination: "medical-records"
        }]

      }
    }
  };
}