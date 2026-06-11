const RULES = [
  { category: "clinical_decision", keywords: ["ddx", "differential", "diagnosis", "treatment", "protocol", "suggest", "recommend", "drug interaction", "dose", "dosage"] },
  { category: "data_retrieval", keywords: ["lab", "result", "vital", "history", "summary", "report", "previous", "last visit", "trend"] },
  { category: "document_analysis", keywords: ["analyze", "review", "document", "pdf", "report", "ecg", "xray", "x-ray", "radiology", "pathology"] },
  { category: "operational", keywords: ["revenue", "appointment", "schedule", "billing", "kpi", "clinic", "staff", "inventory"] },
];

export function classifyIntent(text) {
  const lower = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { category: rule.category, format: "card", confidence: 0.85 };
    }
  }
  return { category: "clinical_decision", format: "text", confidence: 0.5 };
}

export const PILL_INTENT_MAP = {
  "Suggest DDX": "clinical_decision",
  "Lab overview": "data_retrieval",
  "Vital trends": "data_retrieval",
  "Patient summary": "data_retrieval",
  "Patient's detailed summary": "data_retrieval",
  "Reported by patient": "data_retrieval",
  "Last visit": "data_retrieval",
  "Drug interactions": "clinical_decision",
  "Follow-up overview": "data_retrieval",
  "Current medications": "data_retrieval",
  "Lab comparison": "data_retrieval",
};
