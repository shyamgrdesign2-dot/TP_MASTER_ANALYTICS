import { isValidMongoId } from "./utils";

/**
 * Returns true when caseManagerData has at least one prescription-module entry
 * OR any sidebar historical data (vitals, medical history, vaccines,
 * measurements, lab params, zydus labs, gynec, obstetric).
 *
 * Used to decide whether to route edit/repeat actions to the new
 * PrescriptionNew page (with voice-rx new UI) or keep them on the legacy
 * prescription flow. New UI is only meaningful when there is actual data
 * to load + the casemanager record has a valid voice-rx mongo id.
 */
export function hasCaseManagerAnyData(caseManagerData) {
  if (!caseManagerData) return false;
  if (caseManagerData.visit_advice) return true;
  if (caseManagerData.treatment) return true;
  if (caseManagerData.follow_up_date) return true;
  if (caseManagerData.private_notes) return true;
  if (caseManagerData.gynecHistory) return true;
  if (caseManagerData.gynec_history) return true;
  if (caseManagerData.gyneacHistory) return true;
  if (caseManagerData.gynecHistoryData) return true;
  if (caseManagerData.obstetricDetails) return true;
  if (caseManagerData.obstetric_details) return true;
  const arrays = [
    caseManagerData.symptoms,
    caseManagerData.examination,
    caseManagerData.diagnosis,
    caseManagerData.advice,
    caseManagerData.investigation,
    caseManagerData.medicine,
    caseManagerData.vitals,
    caseManagerData.surgeries,
    caseManagerData.moduleContents,
    caseManagerData.medical_history,
    caseManagerData?.vaccines?.given,
    caseManagerData?.vaccines?.due,
    caseManagerData.measurements,
    caseManagerData.lab_params,
    caseManagerData.zydus_lab_params,
    caseManagerData.uploadedDocs,
  ];
  return arrays.some((items) => Array.isArray(items) && items.length > 0);
}

/**
 * Returns true when the consultation should open in the new PrescriptionNew UI.
 *
 * Decision order:
 *   1. If the casemanager record carries `ui_version` ("new" / "old"), trust it
 *      (set at end-visit / save-draft submit). This is the cheap, deterministic path.
 *   2. Legacy records without `ui_version` fall back to the heuristic:
 *      GB flag on + any data present + valid voice-rx mongo id.
 */
export function shouldUseNewPrescriptionUi(caseManagerData, isVoiceRxNewFromGB) {
  if (!isVoiceRxNewFromGB) return false;
  const uiVersion = caseManagerData?.ui_version;
  if (uiVersion === "new") return true;
  if (uiVersion === "old") return false;
  // Legacy record (no ui_version stored) — fall back to heuristic.
  if (!hasCaseManagerAnyData(caseManagerData)) return false;
  return isValidMongoId(caseManagerData?.smart_prescription_filename);
}
