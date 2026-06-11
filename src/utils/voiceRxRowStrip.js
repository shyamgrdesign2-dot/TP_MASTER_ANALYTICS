// Shared strip util for voice-rx new UI empty-row feature.
// Strips rows that have no data in any meaningful column.
// Used by Box template-apply, HeaderPrescription global template apply,
// and PrescriptionNew copy-to-rxpad append flows.

export const MODULE_STRIP_KEYS = {
  symptoms: ["symptom_name", "since", "severity", "note"],
  examinations: ["examination_name", "note"],
  diagnosis: ["tds_name", "icd_code", "since", "status", "note"],
  investigations: ["investigation_name", "note"],
  surgeries: ["name", "notes"],
};

export function stripEmptyRows(rows, moduleKey) {
  const keys = MODULE_STRIP_KEYS[moduleKey];
  if (!keys || !Array.isArray(rows)) return rows;
  return rows.filter((r) => keys.some((k) => String(r?.[k] ?? "").trim() !== ""));
}

export function appendStripped(prev, next, moduleKey) {
  const cleanedPrev = stripEmptyRows(prev, moduleKey);
  return [...cleanedPrev, ...(next || [])];
}
