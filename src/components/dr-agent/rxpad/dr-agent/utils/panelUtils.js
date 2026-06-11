export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function getQueryHint(intentCategory, _query) {
  const hints = {
    clinical_decision: "Analyzing clinical context…",
    data_retrieval: "Looking up patient data…",
    document_analysis: "Reviewing document…",
    operational: "Checking clinic data…",
    out_of_scope: "Processing query…",
  };
  return hints[intentCategory] || "Thinking…";
}

export function detectSpecialties(summary) {
  const specialties = new Set(["gp"]);
  if (summary.specialtyTags) {
    summary.specialtyTags.forEach((tag) => specialties.add(tag));
  }
  return Array.from(specialties);
}
