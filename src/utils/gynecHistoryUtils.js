/**
 * Shared gynec history normalization for voice, ambient, snap, and smart flows.
 * Maps API shape (e.g. gyneacHistory typo, clotsDuringFlow, occurrenceOfPain)
 * to UI shape expected by MedicalHistoryBox and GynecHistoryRichTextEditor.
 * Pure function: no side effects, safe to use in React (useMemo, reducers, etc.).
 */
import moment from "moment";

const OCCURRENCE_OF_PAIN_MAP = {
  "during menses": "During menses",
  "before menses": "Before menses",
  "after menses": "After menses",
  "not related to menses": "Not related to menses",
};

function normalizeClotsValue(rawClots) {
  if (rawClots === true || rawClots === false) return rawClots;
  if (rawClots === null || rawClots === undefined) return rawClots;
  const s = String(rawClots).trim().toLowerCase();
  if (s === "clots" || s === "yes") return true;
  if (s === "no clots" || s === "no") return false;
  return rawClots;
}

function normalizeOccurrenceOfPain(rawOccurrence) {
  if (rawOccurrence === null || rawOccurrence === undefined) return rawOccurrence;
  const key = String(rawOccurrence).trim().toLowerCase();
  return OCCURRENCE_OF_PAIN_MAP[key] ?? rawOccurrence;
}

/**
 * Normalizes raw gynec/gyneac history from API to UI shape.
 * @param {object} gynecRaw - Raw object from digitizeData.gynecHistory or digitizeData.gyneacHistory
 * @returns {object} Normalized gynec history object, or empty object if input invalid
 */
export function normalizeGynecHistoryFromApi(gynecRaw) {
  if (!gynecRaw || typeof gynecRaw !== "object") return {};
  const g = gynecRaw;
  const rawClots = g.clots ?? g.clotsDuringFlow;
  const clots = normalizeClotsValue(rawClots);
  const occurrenceOfPain = normalizeOccurrenceOfPain(g.occurrenceOfPain);
  return {
    ...g,
    lastMenstrualPeriod: g.lastMenstrualPeriod ?? g.lmp,
    lmp: g.lmp ?? g.lastMenstrualPeriod,
    intervalOfCycle: g.intervalOfCycle ?? g.intervalCycle,
    intervalCycle: g.intervalCycle ?? g.intervalOfCycle,
    cycleNotes: g.cycleNotes ?? g.intervalNotes,
    intervalNotes: g.intervalNotes ?? g.cycleNotes,
    clots,
    clotsDuringFlow: g.clotsDuringFlow ?? g.clots,
    flowNotes: g.flowNotes ?? g.clotsNotes,
    clotsNotes: g.clotsNotes ?? g.flowNotes,
    occurrenceOfPain,
    reproductiveLifeStages: g.reproductiveLifeStages ?? g.lifecycleHarmonialChanges,
    lifecycleHarmonialChanges: g.lifecycleHarmonialChanges ?? g.reproductiveLifeStages,
    reproductiveNotes: g.reproductiveNotes ?? g.lifecycleHarmonialChangesNotes,
    lifecycleHarmonialChangesNotes: g.lifecycleHarmonialChangesNotes ?? g.reproductiveNotes,
  };
}

/**
 * Picks gynec history from payload (supports gynecHistory, gynec_history, gyneacHistory typo).
 * @param {object} data - Object that may contain gynecHistory, gynec_history, or gyneacHistory
 * @returns {object} Normalized gynec history (or {}) for use in Rx pad / drawer
 */
export function getNormalizedGynecHistory(data) {
  const raw = data?.gynecHistory ?? data?.gynec_history ?? data?.gyneacHistory;
  return normalizeGynecHistoryFromApi(raw);
}

const META_KEYS = ["createdAt", "createdBy", "updatedAt", "updatedBy"];

function toApiLmp(value) {
  if (!value) return value;
  if (value instanceof Date) {
    return moment(value).format("YYYY-MM-DD");
  }

  const str = String(value).trim();
  const parsed = moment(
    str,
    [
      "DD-MM-YYYY",
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      moment.ISO_8601
    ],
    true
  );

  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }

  return null; 
}


/**
 * True if gynec object has no meaningful data (only meta or empty).
 */
export function isGynecDataEmpty(gynec) {
  if (!gynec || typeof gynec !== "object") return true;
  return !Object.keys(gynec).some(
    (k) => {
      if (META_KEYS.includes(k)) return false;
      const v = gynec[k];
      if (v === undefined || v === null || v === "") return false;
      const s = String(v).trim();
      if (s === "" || s === "0") return false;
      if (typeof v === "number" && v === 0) return false;
      return true;
    }
  );
}

/**
 * Format normalized gynec history into display lines (read-only, e.g. patient summary).
 * Single source of truth for gynec display text; used by Cardiology and can be used elsewhere.
 */
export function formatGynecDisplayLines(gynec) {
  if (!gynec || typeof gynec !== "object" || isGynecDataEmpty(gynec)) return [];
  const formatVal = (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "number" && v === 0) return null;
    const s = String(v).trim();
    if (s === "0") return null;
    return s;
  };
  const lines = [];
  const lmp = formatVal(gynec.lastMenstrualPeriod ?? gynec.lmp);
  if (lmp) lines.push(`Last menstrual period: ${lmp}`);
  const menarche = formatVal(gynec.ageAtMenarche);
  if (menarche) lines.push(`Menarche (Age at: ${menarche})`);
  const cycleType = formatVal(gynec.cycle);
  const interval = formatVal(gynec.intervalOfCycle ?? gynec.intervalCycle);
  const cycleNotes = formatVal(gynec.cycleNotes);
  if (cycleType || interval || cycleNotes) {
    const parts = [];
    if (cycleType) parts.push(`Type: ${cycleType}`);
    if (interval) parts.push(`Cycle Interval: ${interval}`);
    if (cycleNotes) parts.push(`Cycle Notes: ${cycleNotes}`);
    lines.push(`Cycle(${parts.join(", ")})`);
  }
  const flow = formatVal(gynec.flow);
  const duration = formatVal(gynec.durationOfMenstrualFlow);
  const clots = formatVal(gynec.clots);
  const pads = formatVal(gynec.numberOfPadsPerDay);
  if (flow || duration || clots !== null || pads) {
    const parts = [];
    if (flow) parts.push(`Volume: ${flow}`);
    if (duration) parts.push(`Duration of Menstrual Flow: ${duration}`);
    if (clots !== null) parts.push(`Clots During Flow: ${clots}`);
    if (pads) parts.push(`Number of Pads Per Day: ${pads}`);
    if (parts.length > 0) lines.push(`Flow(${parts.join(", ")})`);
  }
  const pain = formatVal(gynec.pain);
  const occurrence = formatVal(gynec.occurrenceOfPain);
  if (pain || occurrence) {
    const parts = [];
    if (pain) parts.push(`Level: ${pain}`);
    if (occurrence) parts.push(`Occurrence of pain: ${occurrence}`);
    lines.push(`Pain(${parts.join(", ")})`);
  }
  const lifecycle = formatVal(gynec.reproductiveLifeStages ?? gynec.lifecycleHarmonialChanges);
  if (lifecycle) {
    const ageAt = formatVal(gynec.ageAtMenopause);
    const typeOf = formatVal(gynec.typeOfMenopause);
    const parts = [`type: ${lifecycle}`];
    if (ageAt) parts.push(`Age at Menopause: ${ageAt}`);
    if (typeOf) parts.push(`Type of Menopause: ${typeOf}`);
    lines.push(`Lifecycle Hormonal Changes(${parts.join(", ")})`);
  }
  const notes = formatVal(gynec.notes);
  if (notes) lines.push(`Note(${notes})`);
  return lines;
}

/**
 * Build payload for gynec POST (timeline item) or PATCH. Normalizes lmp to YYYY-MM-DD.
 * Excludes UI-only keys; sends API field names (e.g. lmp, clots, occurrenceOfPain).
 */
export function buildGynecPayloadForApi(gynec, userId) {
  if (!gynec || typeof gynec !== "object") return null;
  const lmpRaw = gynec.lmp ?? gynec.lastMenstrualPeriod;
  const lmp = toApiLmp(lmpRaw);
  const now = moment().toISOString();
  const payload = {
    lmp: lmp ?? undefined,
    ageAtMenarche: gynec.ageAtMenarche,
    cycle: gynec.cycle,
    intervalOfCycle: gynec.intervalOfCycle,
    flow: gynec.flow,
    durationOfMenstrualFlow: gynec.durationOfMenstrualFlow,
    clots: gynec.clots,
    numberOfPadsPerDay: gynec.numberOfPadsPerDay,
    pain: gynec.pain,
    occurrenceOfPain: gynec.occurrenceOfPain,
    reproductiveLifeStages: gynec.reproductiveLifeStages ?? gynec.lifecycleHarmonialChanges,
    ageAtMenopause: gynec.ageAtMenopause,
    typeOfMenopause: gynec.typeOfMenopause,
    notes: gynec.notes,
    createdAt: now,
    createdBy: userId,
  };
  Object.keys(payload).forEach((k) => {
    const v = payload[k];
    if (v === undefined || v === "" || v === null) delete payload[k];
    // Don't send numeric fields when they are 0 (e.g. durationOfMenstrualFlow, numberOfPadsPerDay, ageAtMenarche, ageAtMenopause)
    else if (typeof v === "number" && v === 0) delete payload[k];
  });
  if (payload.createdAt === undefined) payload.createdAt = now;
  if (payload.createdBy === undefined) payload.createdBy = userId;
  return payload;
}


export function isGynecEqual(apiGynec, rxGynec) {
  if (!rxGynec || typeof rxGynec !== "object") return true;
  const keys = new Set([...Object.keys(rxGynec), ...Object.keys(apiGynec || {}).filter((k) => !META_KEYS.includes(k))]);
  for (const k of keys) {
    if (META_KEYS.includes(k)) continue;
    const a = apiGynec?.[k];
    const r = rxGynec[k];
    if (a === r) continue;
    const aEmpty = a === null || a === undefined;
    const rEmpty = r === null || r === undefined;
    if (aEmpty && rEmpty) continue;
    if (aEmpty || rEmpty) return false;
    if (String(a).trim() !== String(r).trim()) return false;
  }
  return true;
}

/**
 * After End Visit (voice, ambient, snap, smart): sync gynec history.
 *
 * @param {string|number} patientId - patient_unique_id
 * @param {string|number} userId - doctor user_id
 * @param {object} rxGynec - Normalized gynec from Rx pad (use getNormalizedGynecHistory(prescriptionData))
 * @param {{ getGynecDetails: function, postGynecDetails: function, updateGynecDetails: function }} api - Gynec API functions
 */
export async function syncGynecHistoryAfterEndVisit(patientId, userId, rxGynec, api) {
  if (!patientId || userId === null || userId === undefined) return;
  if (isGynecDataEmpty(rxGynec)) return;
  const { getGynecDetails, postGynecDetails, updateGynecDetails } = api;
  let existing = null;
  try {
    existing = await getGynecDetails(patientId, userId);
  } catch (e) {
    return;
  }
  const hasExisting = existing && typeof existing === "object" && !isGynecDataEmpty(existing);
  const payload = buildGynecPayloadForApi(rxGynec, userId);
  if (!payload) return;
  const existingNormalized = normalizeGynecHistoryFromApi(existing);
  if (!hasExisting) {
    try {
      await postGynecDetails({
        patientId: Number(patientId),
        timeline: [payload],
        createdAt: payload.createdAt,
        createdBy: payload.createdBy,
      });
    } catch (e) {
      console.error("End Visit: gynec POST failed", e);
    }
    return;
  }
  if (!isGynecEqual(existingNormalized, rxGynec)) {
    try {
      await updateGynecDetails(patientId, payload, userId);
    } catch (e) {
      console.error("End Visit: gynec PATCH failed", e);
    }
  }
}
