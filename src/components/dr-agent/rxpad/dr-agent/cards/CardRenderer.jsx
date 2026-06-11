import React from "react";
import { VoiceStructuredRxCard } from "./action/VoiceStructuredRxCard";
import { PatientReportedCard } from "./summary/PatientReportedCard";

export function CardRenderer({ output, isStale, onCopy, onSidebarNav, activeSpecialty, patientDocuments, onPatientSelect }) {
  if (!output) return null;
  const kind = output.kind;
  isStale = Boolean(isStale ?? output.isStale);

  switch (kind) {
    case "voice_structured_rx":
      return <VoiceStructuredRxCard data={output.data} isStale={isStale} onCopy={onCopy} />;
    case "symptom_collector":
      return <PatientReportedCard data={output.data} onCopy={onCopy} />;
    default:
      return <div data-card-kind={kind} />;
  }
}
