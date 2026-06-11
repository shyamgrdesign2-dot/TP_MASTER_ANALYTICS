/**
 * Clinical recommendations pipeline — shared by SBAR summary card (top 5) and chat (full list).
 * Bullets are split for ~1–1.5 lines at card width; no ellipsis truncation.
 */



/** Raw source lines collected before split/flatten (tiers, labs, flags, …) — card */
const MAX_RAW_SOURCES_SUMMARY_CARD = 10;
/** Raw source lines — chat full list */
const MAX_RAW_SOURCES_CHAT = 16;

/** Max ● rows on the patient summary card */
export const MAX_RECOMMENDATIONS_ON_SUMMARY_CARD = 5;
/** Max ● rows when doctor asks for recommendations in chat */
export const MAX_RECOMMENDATIONS_IN_CHAT = 28;

/**
 * Target ~1–1.5 lines at 14px in ~320px panel — overflow becomes another bullet, not a cut-off.
 */
const MAX_REC_BULLET_CHARS = 76;

function splitAtWordBoundary(text, maxLen) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return [t];
  let breakAt = t.lastIndexOf(" ", maxLen);
  if (breakAt < maxLen * 0.42) {
    const fwd = t.indexOf(" ", maxLen);
    breakAt = fwd > 0 ? fwd : t.length;
  }
  if (breakAt <= 0) return [t];
  const first = t.slice(0, breakAt).trim();
  const rest = t.slice(breakAt).trim();
  if (!rest || rest === t) return [t];
  return [first, ...splitAtWordBoundary(rest, maxLen)];
}

function splitCommaPhrasesIntoBullets(text, maxLen) {
  const segments = text.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) return [text];
  const out = [];
  let buf = "";
  for (const seg of segments) {
    const test = buf ? `${buf}, ${seg}` : seg;
    if (test.length <= maxLen) buf = test;else
    {
      if (buf) out.push(buf);
      buf = seg;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function dedupeLowercased(items) {
  const seen = new Set();
  const out = [];
  for (const x of items) {
    const k = x.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x.trim());
  }
  return out;
}

/** Split one recommendation string into complete, readable bullets — never mid-word ellipsis */
function splitRecommendationIntoDisplayBullets(text) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return [];
  if (t.length <= MAX_REC_BULLET_CHARS) return [t];

  if (t.includes(";")) {
    const parts = t.split(/\s*;\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const out = parts.flatMap((p) => splitRecommendationIntoDisplayBullets(p));
      return dedupeLowercased(out);
    }
  }

  const dashParts = t.split(/\s+[—–]\s+/).map((p) => p.trim()).filter(Boolean);
  if (dashParts.length > 1) {
    const out = dashParts.flatMap((p) => splitRecommendationIntoDisplayBullets(p));
    return dedupeLowercased(out);
  }

  if (t.includes(",")) {
    const commaChunks = splitCommaPhrasesIntoBullets(t, MAX_REC_BULLET_CHARS);
    if (commaChunks.length > 1) {
      return dedupeLowercased(
        commaChunks.flatMap((c) =>
        c.length <= MAX_REC_BULLET_CHARS ? [c] : splitAtWordBoundary(c, MAX_REC_BULLET_CHARS)
        )
      );
    }
  }

  const sentences = t.match(/[^.?!]+[.?!]+|[^.?!]+$/g);
  if (sentences && sentences.length > 1) {
    const parts = sentences.map((s) => s.trim()).filter(Boolean);
    const out = parts.flatMap((p) =>
    p.length <= MAX_REC_BULLET_CHARS ? [p] : splitAtWordBoundary(p, MAX_REC_BULLET_CHARS)
    );
    if (out.length > 1) return dedupeLowercased(out);
  }

  return splitAtWordBoundary(t, MAX_REC_BULLET_CHARS);
}

function flattenRecommendationsForDisplay(raw, maxBullets) {
  const out = [];
  const seen = new Set();
  for (const r of raw) {
    for (const b of splitRecommendationIntoDisplayBullets(r)) {
      const k = b.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(b);
      if (out.length >= maxBullets) return out;
    }
  }
  return out;
}

/** Administrative visit-scheduling noise — not tests/imaging/procedures to order */
function isAdministrativeFollowUpAlert(alert) {
  const t = alert.trim();
  if (!t) return true;
  if (/^follow[-\s]?up (visit|appointment)(\s|$)/i.test(t)) return true;
  if (/^(routine\s+)?follow[-\s]?up (only|scheduling)\b/i.test(t)) return true;
  return false;
}

const LAB_ORDER_NEXT_STEP = {
  LDL: "Repeat lipid panel — LDL high; titrate Rx",
  HDL: "Recheck lipids at next visit",
  "Total Cholesterol": "Repeat fasting lipid panel",
  HbA1c: "Repeat HbA1c; adjust glycemic plan",
  TSH: "Recheck TSH after dose change or in 6–8 wk",
  Triglycerides: "Repeat lipids; cut alcohol if TG high",
  "Fasting Glucose": "Repeat fasting glucose ± HbA1c",
  "Fasting Blood Sugar": "Repeat glucose / HbA1c",
  FBS: "Repeat glucose / HbA1c",
  Creatinine: "Repeat renal panel; review meds & volume",
  eGFR: "Repeat renal panel; stage CKD & dosing",
  Hemoglobin: "Work up anemia — iron/B12/folate as needed",
  Hb: "Work up anemia — iron/B12/folate as needed",
  Ferritin: "Add TSAT / iron studies if guiding anemia Rx",
  "Vitamin D": "Recheck 25-OH D after repletion",
  PTH: "Align PTH / Ca / PO₄ workup with CKD stage",
  "Uric Acid": "Repeat uric acid if changing therapy",
  WBC: "Repeat CBC if indicated",
  Platelet: "Repeat platelets if trend unclear",
  BUN: "Interpret with Cr/eGFR & hydration",
  "K+": "Repeat K+; trim RAAS Rx & diet K+ if high",
  Potassium: "Repeat K+; trim RAAS Rx & diet K+ if high",
  Phosphorus: "Repeat mineral panel; adjust binders (CKD)",
  Calcium: "Repeat Ca ± PTH per context",
  Albumin: "Repeat with liver/renal workup if needed",
  Bicarbonate: "Repeat BMP; address acidosis",
  Microalbumin: "Repeat urine albumin (early AM)",
  INR: "Repeat INR after warfarin change"
};

function labOrderLine(lab) {
  if (lab.flag === "normal" || lab.flag === "success" || !lab.flag) return "";
  const preset = LAB_ORDER_NEXT_STEP[lab.name];
  if (preset) return preset;
  return `Review ${lab.name} ${lab.value} ${lab.unit} — order confirmatory labs`;
}

function pushUniqueLine(recs, line, maxRaw) {
  const t = line.trim();
  if (!t || recs.length >= maxRaw) return;
  const low = t.toLowerCase();
  if (recs.some((r) => r.toLowerCase() === low)) return;
  const head = low.slice(0, 40);
  if (recs.some((r) => r.toLowerCase().startsWith(head) || head.length > 12 && r.toLowerCase().includes(head.slice(0, 12)))) return;
  recs.push(t);
}

function tierOrder(tier) {
  if (tier === "act") return 0;
  if (tier === "verify") return 1;
  if (tier === "gather") return 2;
  return 3;
}

/**
 * Ordered source lines (vitals → tiers → due alerts → last visit labs → key labs → cross-problem flags).
 */
export function collectRawClinicalRecommendations(data, maxRaw) {
  const recs = [];

  if (data.todayVitals) {
    const v = data.todayVitals;
    if (v.bp) {
      const sys = parseInt(v.bp.split("/")[0], 10);
      if (!isNaN(sys) && (sys <= 90 || sys >= 160)) {
        pushUniqueLine(
          recs,
          sys <= 90 ?
          `BP critically low at ${v.bp} (assess for hypotension)` :
          `BP severely elevated at ${v.bp} (hypertensive urgency)`,
          maxRaw
        );
      }
    }
    if (v.spo2) {
      const spo2 = parseInt(v.spo2, 10);
      if (!isNaN(spo2) && spo2 < 92) {
        pushUniqueLine(recs, `SpO₂ at ${v.spo2}% (consider supplemental oxygen)`, maxRaw);
      }
    }
    if (v.temp) {
      const temp = parseFloat(v.temp);
      if (!isNaN(temp) && temp >= 104) {
        pushUniqueLine(recs, `High fever ${v.temp}°F (evaluate source)`, maxRaw);
      }
    }
  }

  const tiers = [...(data.recommendationTiers ?? [])].sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier));
  for (const row of tiers) {
    pushUniqueLine(recs, row.text, maxRaw);
  }

  if (data.dueAlerts?.length) {
    for (const alert of data.dueAlerts) {
      if (!isAdministrativeFollowUpAlert(alert)) pushUniqueLine(recs, alert, maxRaw);
    }
  }

  const lt = data.lastVisit?.labTestsSuggested?.trim();
  if (lt) {
    pushUniqueLine(recs, `Last visit: order/doc — ${lt}`, maxRaw);
  }

  const badLabs = (data.keyLabs ?? []).filter((l) => l.flag && l.flag !== "normal" && l.flag !== "success");
  for (const lab of badLabs) {
    const line = labOrderLine(lab);
    if (line) pushUniqueLine(recs, line, maxRaw);
  }

  const flags = [...(data.crossProblemFlags ?? [])].sort((a, b) => {
    if (a.severity === "high" && b.severity !== "high") return -1;
    if (b.severity === "high" && a.severity !== "high") return 1;
    return 0;
  });
  for (const flag of flags) {
    pushUniqueLine(recs, flag.text, maxRaw);
  }

  return recs;
}

/** Top priority bullets for the SBAR / patient summary card (max five). */
export function buildRecommendationsForSummaryCard(data) {
  const raw = collectRawClinicalRecommendations(data, MAX_RAW_SOURCES_SUMMARY_CARD);
  return flattenRecommendationsForDisplay(raw, MAX_RECOMMENDATIONS_ON_SUMMARY_CARD);
}

/** Full list for chat when the doctor asks for recommendations (card stays at five). */
export function buildRecommendationsFullListForChat(data) {
  const raw = collectRawClinicalRecommendations(data, MAX_RAW_SOURCES_CHAT);
  return flattenRecommendationsForDisplay(raw, MAX_RECOMMENDATIONS_IN_CHAT);
}

/** True if the doctor’s message is asking for the full recommendations list (not e.g. “recommend a dose”). */
export function messageAsksForRecommendationsList(normalizedInput) {
  const n = normalizedInput.trim();
  if (!n) return false;
  if (/\brecommendations\b/.test(n)) return true;
  if (/\brecommendation\b/.test(n) && (n.includes("list") || n.includes("show") || n.includes("full") || n.includes("all ") || n.includes("every ") || n.includes("clinical"))) return true;
  if (n.includes("clinical recommendation")) return true;
  if (n.includes("list recommend") || n.includes("show recommend") || n.includes("full recommend") || n.includes("all recommend")) return true;
  return false;
}