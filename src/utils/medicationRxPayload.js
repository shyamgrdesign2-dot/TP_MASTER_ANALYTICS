/**
 * Snap / Smart / Voice / Ambient save & PATCH: keep manual edits on groundedMedicineName (not name).
 * Fills grounded + refinedName when missing, using legacy groundingMedicineName or name as fallback.
 */
export function ensureMedicationGroundedForRxSave(item) {
  if (!item || typeof item !== "object") return item;
  const next = { ...item };
  const grounded = String(
    next.groundedMedicineName ?? next.groundingMedicineName ?? ""
  ).trim();
  const sourceName = String(next.name ?? "").trim();
  if (grounded) {
    next.groundedMedicineName = grounded;
    if (!String(next.refinedName ?? "").trim()) next.refinedName = grounded;
  } else if (sourceName) {
    next.groundedMedicineName = sourceName;
    if (!String(next.refinedName ?? "").trim()) next.refinedName = sourceName;
  }
  return next;
}

export function ensureLabInvestigationMetadataForRxSave(item) {
  if (!item || typeof item !== "object") return item;
  const next = { ...item };
  const metadata = {
    ...(next.metadata && typeof next.metadata === "object" ? next.metadata : {}),
  };

  if (next.isFuzzyCorrected !== undefined && metadata.isFuzzyCorrected === undefined) {
    metadata.isFuzzyCorrected = next.isFuzzyCorrected;
  }
  if (next.fuzzyCorrectedName && !metadata.fuzzyCorrectedName) {
    metadata.fuzzyCorrectedName = next.fuzzyCorrectedName;
  }
  if (next.originalName && !metadata.originalName) {
    metadata.originalName = next.originalName;
  }

  if (metadata.hm_type !== undefined && next.hm_type === undefined) {
    next.hm_type = metadata.hm_type;
  }
  if (metadata.um_id !== undefined && next.um_id === undefined) {
    next.um_id = metadata.um_id;
  }

  if (Object.keys(metadata).length > 0) {
    next.metadata = metadata;
  }

  return next;
}

export function preparePreviousContextRxItems(prescriptionData) {
  if (!prescriptionData || typeof prescriptionData !== "object") return prescriptionData;
  const next = { ...prescriptionData };
  if (Array.isArray(next.medications)) {
    next.medications = next.medications.map((item) =>
      ensureMedicationGroundedForRxSave(item)
    );
  }
  if (Array.isArray(next.labInvestigation)) {
    next.labInvestigation = next.labInvestigation.map((item) =>
      ensureLabInvestigationMetadataForRxSave(item)
    );
  }
  return next;
}

function findPriorItemByIdOrName(prevItems, nextItem, getName) {
  if (!Array.isArray(prevItems) || !nextItem) return null;
  if (nextItem.id) {
    const byId = prevItems.find((item) => item?.id === nextItem.id);
    if (byId) return byId;
  }
  const nextName = getName(nextItem).toLowerCase();
  if (!nextName) return null;
  return (
    prevItems.find((item) => {
      const names = [
        getName(item),
        String(item?.metadata?.originalName ?? "").trim(),
        String(item?.metadata?.fuzzyCorrectedName ?? "").trim(),
      ]
        .map((name) => name.toLowerCase())
        .filter(Boolean);
      return names.includes(nextName);
    }) || null
  );
}

export function getLabInvestigationNameForFuzzy(item) {
  return String(item?.name ?? item?.metadata?.fuzzyCorrectedName ?? "").trim();
}

function getMedicationNameForMerge(item) {
  return String(
    item?.groundedMedicineName ?? item?.groundingMedicineName ?? item?.name ?? ""
  ).trim();
}

export function mergeMedicationsWithPriorMetadata(prevItems, nextItems) {
  if (!Array.isArray(nextItems)) return nextItems;
  return nextItems.map((next) => {
    const prev = findPriorItemByIdOrName(prevItems, next, getMedicationNameForMerge);
    if (!prev) return ensureMedicationGroundedForRxSave(next);

    const prevMeta =
      prev.metadata && typeof prev.metadata === "object" ? prev.metadata : {};
    const nextMeta =
      next.metadata && typeof next.metadata === "object" ? next.metadata : {};

    const mergedMeta =
      prevMeta.isFuzzyCorrected && !nextMeta.isFuzzyCorrected
        ? { ...prevMeta, ...nextMeta }
        : { ...prevMeta, ...nextMeta };

    return ensureMedicationGroundedForRxSave({
      ...next,
      groundedMedicineName:
        next.groundedMedicineName ||
        next.groundingMedicineName ||
        prev.groundedMedicineName ||
        prev.groundingMedicineName ||
        next.name,
      refinedName:
        next.refinedName ||
        prev.refinedName ||
        next.groundedMedicineName ||
        prev.groundedMedicineName,
      metadata: Object.keys(mergedMeta).length > 0 ? mergedMeta : next.metadata,
    });
  });
}

export function mergeLabInvestigationWithPriorMetadata(prevItems, nextItems) {
  if (!Array.isArray(nextItems)) return nextItems;
  return nextItems.map((next) => {
    const prev = findPriorItemByIdOrName(prevItems, next, getLabInvestigationNameForFuzzy);
    if (!prev) return ensureLabInvestigationMetadataForRxSave(next);

    const prevMeta =
      prev.metadata && typeof prev.metadata === "object" ? prev.metadata : {};
    const nextMeta =
      next.metadata && typeof next.metadata === "object" ? next.metadata : {};

    const mergedMeta =
      prevMeta.isFuzzyCorrected && !nextMeta.isFuzzyCorrected
        ? { ...prevMeta, ...nextMeta }
        : { ...prevMeta, ...nextMeta };

    return ensureLabInvestigationMetadataForRxSave({
      ...next,
      hm_type: next.hm_type ?? nextMeta.hm_type ?? prev.hm_type ?? prevMeta.hm_type,
      um_id: next.um_id ?? nextMeta.um_id ?? prev.um_id ?? prevMeta.um_id,
      metadata: Object.keys(mergedMeta).length > 0 ? mergedMeta : next.metadata,
    });
  });
}

/** Preserve fuzzy metadata when voice API returns stripped lab/medication items. */
export function mergeVoiceApiPrescriptionWithPrior(prevData, nextData) {
  if (!nextData || typeof nextData !== "object") return nextData;
  const merged = { ...nextData };
  if (Array.isArray(merged.medications) || Array.isArray(prevData?.medications)) {
    merged.medications = mergeMedicationsWithPriorMetadata(
      prevData?.medications,
      merged.medications || []
    );
  }
  if (Array.isArray(merged.labInvestigation) || Array.isArray(prevData?.labInvestigation)) {
    merged.labInvestigation = mergeLabInvestigationWithPriorMetadata(
      prevData?.labInvestigation,
      merged.labInvestigation || []
    );
  }
  return merged;
}
