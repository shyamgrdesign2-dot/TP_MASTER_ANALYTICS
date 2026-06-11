export const SITUATION_AT_A_GLANCE_ASSISTANT_TEXT = "Here's the patient's situation at a glance.";

export function isSituationAtGlanceAssistantMessage(message) {
  if (message.role !== "assistant") return false;
  if (message.text?.trim() !== SITUATION_AT_A_GLANCE_ASSISTANT_TEXT) return false;
  return message.rxOutput?.kind === "text_quote";
}

export function threadAlreadyHasQuickClinicalGlance(msgs, promptLower) {
  return msgs.some((m) => {
    if (m.role === "user" && m.text.trim().toLowerCase() === promptLower) return true;
    return isSituationAtGlanceAssistantMessage(m);
  });
}
