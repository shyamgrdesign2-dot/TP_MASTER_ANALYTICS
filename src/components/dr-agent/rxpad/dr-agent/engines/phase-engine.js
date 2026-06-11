const PHASE_KEYWORDS = {
  symptoms_entered: ["symptom", "fever", "cough", "pain", "complaint", "sx"],
  dx_accepted: ["accept", "dx", "diagnosis", "differential", "ddx", "protocol"],
  meds_written: ["med", "drug", "prescription", "rx", "advice", "translate"],
  near_complete: ["completeness", "final", "follow-up", "follow up", "f/u", "done"],
  empty: [],
};

export function inferPhase(messages, currentPhase) {
  if (messages.length === 0) return "empty";

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return currentPhase;

  const text = lastUserMsg.text.toLowerCase();
  const lastAssistantOutput = [...messages].reverse().find((m) => m.role === "assistant" && m.rxOutput);

  if (lastAssistantOutput?.rxOutput?.kind === "ddx" && currentPhase === "symptoms_entered") {
    return "dx_accepted";
  }
  if (lastAssistantOutput?.rxOutput?.kind === "protocol_meds" && currentPhase === "dx_accepted") {
    return "meds_written";
  }

  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    if (phase === "empty") continue;
    if (keywords.some((kw) => text.includes(kw))) {
      return phase;
    }
  }

  if (currentPhase === "empty" && text.length > 0) {
    return "symptoms_entered";
  }

  return currentPhase;
}

export function getPhaseLabel(phase) {
  const labels = {
    empty: "Getting started",
    symptoms_entered: "Symptoms captured",
    dx_accepted: "Diagnosis accepted",
    meds_written: "Medications written",
    near_complete: "Nearly complete",
  };
  return labels[phase] || "Getting started";
}
