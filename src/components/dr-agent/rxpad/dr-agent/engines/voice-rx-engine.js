export function parseVoiceToStructuredRx(text = "") {
  const lower = text.toLowerCase();

  const sections = [];

  // Chief complaint
  const complaintMatch = lower.match(/(?:complain(?:ing|t)? of|presenting with|c\/o)\s+([^.]+)/i);
  if (complaintMatch) {
    sections.push({
      sectionId: "chief_complaint",
      title: "Chief Complaint",
      items: [{ name: complaintMatch[1].trim() }],
    });
  }

  // Diagnosis
  const dxKeywords = ["diagnos", "impression", "assessment"];
  const dxMatch = dxKeywords.some((k) => lower.includes(k));
  if (dxMatch) {
    sections.push({
      sectionId: "diagnosis",
      title: "Diagnosis",
      items: [{ name: "Clinical impression documented" }],
    });
  }

  // Medications
  const medKeywords = ["tab", "tablet", "cap", "capsule", "syrup", "mg", "prescribed"];
  const hasMeds = medKeywords.some((k) => lower.includes(k));
  if (hasMeds) {
    sections.push({
      sectionId: "medications",
      title: "Medications",
      items: [{ name: "Medications documented per dictation" }],
    });
  }

  // Follow-up
  if (lower.includes("follow") || lower.includes("review")) {
    sections.push({
      sectionId: "follow_up",
      title: "Follow-up",
      items: [{ name: "Follow-up as discussed" }],
    });
  }

  const copyAllPayload = {
    sections,
    historyChangeSummaries: [],
    sourceDateLabel: new Date().toLocaleDateString(),
  };

  return {
    sections,
    copyAllPayload,
    modeLabel: "Dictation Mode",
  };
}
