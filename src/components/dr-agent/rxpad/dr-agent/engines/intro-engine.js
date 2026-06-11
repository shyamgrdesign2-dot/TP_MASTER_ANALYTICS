import { buildQuickClinicalSnapshotInlineSuggestions, buildQuickClinicalSnapshotText, patientHasQuickClinicalSnapshotData } from "../shared/buildCoreNarrative";
import { SITUATION_AT_A_GLANCE_ASSISTANT_TEXT } from "../shared/isSituationAtGlanceMessage";
import { uid } from "../utils/panelUtils";

export function buildIntroMessages(summary, patient, _doctorViewType, intakeMode = "with_intake", panelMode = "homepage") {
  const hasData = summary.specialtyTags.length > 0;
  const messages = [];

  if (panelMode === "rxpad") {
    if (!patientHasQuickClinicalSnapshotData(summary)) return messages;
    const quote = buildQuickClinicalSnapshotText(summary);
    messages.push({
      id: uid(),
      role: "assistant",
      text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "text_quote", data: { quote, source: "" } },
      feedbackGiven: null,
      suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
    });
    return messages;
  }

  if (panelMode === "homepage" && hasData) {
    const quote = buildQuickClinicalSnapshotText(summary);
    messages.push({
      id: uid(),
      role: "assistant",
      text: SITUATION_AT_A_GLANCE_ASSISTANT_TEXT,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "text_quote", data: { quote, source: "" } },
      feedbackGiven: null,
      suggestions: buildQuickClinicalSnapshotInlineSuggestions(summary, "full"),
    });
    return messages;
  }

  if (panelMode === "homepage") return messages;

  const showIntake = intakeMode === "with_intake" && !!summary.symptomCollectorData;

  if (showIntake) {
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label}'s details reported by patient via Symptom Collector:`,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "symptom_collector", data: { ...summary.symptomCollectorData, patientNarrative: summary.patientNarrative } },
      feedbackGiven: null,
    });
  } else if (hasData) {
    messages.push({
      id: uid(),
      role: "assistant",
      text: `Quick snapshot for ${patient.label}:`,
      createdAt: new Date().toISOString(),
      rxOutput: { kind: "patient_narrative", data: summary },
      feedbackGiven: null,
    });
  } else {
    messages.push({
      id: uid(),
      role: "assistant",
      text: `${patient.label} — new patient, first visit. No prior records yet.`,
      createdAt: new Date().toISOString(),
      feedbackGiven: null,
    });
  }

  return messages;
}
