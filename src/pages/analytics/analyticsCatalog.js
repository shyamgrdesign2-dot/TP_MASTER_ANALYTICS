// Semantic catalog the Widget Builder offers (mirrors the server-side semantic
// registry, PRD §8). The builder only ever lets the user pick measures /
// dimensions / filters that exist here, so every generated query is valid.
// `live: true` datasets can be executed locally today from the existing
// billing/appointment APIs; `live: false` datasets need the Analytics API.

export const DATASETS = [
  {
    key: "collections",
    label: "Collections (billing)",
    live: true,
    measures: [
      { key: "collections.amount", label: "Collection amount", type: "currency" },
      { key: "collections.refund", label: "Refund amount", type: "currency" },
      { key: "collections.count", label: "Bill count", type: "number" },
    ],
    dimensions: [
      { key: "date", label: "Date", date: true },
      { key: "payment_mode", label: "Payment mode" },
      { key: "status", label: "Bill status", values: ["FullyPaid", "Due", "CarriedForward", "Refunded"] },
    ],
  },
  {
    key: "appointments",
    label: "Appointments",
    live: true,
    measures: [{ key: "appointments.count", label: "Appointment count", type: "number" }],
    dimensions: [
      { key: "case_type", label: "Case type", values: ["New", "Follow-up", "Urgent"] },
      { key: "status", label: "Status", values: ["Completed", "In queue", "Cancelled"] },
    ],
  },
  {
    key: "consultations",
    label: "Consultations",
    live: false,
    measures: [
      { key: "consultations.count", label: "Consultations", type: "number" },
      { key: "consultations.unique_patients", label: "Unique patients", type: "number" },
      { key: "consultations.repeat_patients", label: "Repeat patients", type: "number" },
      { key: "consultations.followups", label: "Follow-ups", type: "number" },
    ],
    dimensions: [
      { key: "date", label: "Date", date: true },
      { key: "doctor", label: "Doctor" },
      { key: "hospital", label: "Hospital" },
    ],
  },
  {
    key: "diagnosis",
    label: "Diagnosis",
    live: false,
    measures: [{ key: "diagnosis.count", label: "Diagnosis count", type: "number" }],
    dimensions: [
      { key: "diagnosis", label: "Diagnosis" },
      { key: "icd_code", label: "ICD code" },
      { key: "gender", label: "Gender", values: ["Male", "Female"] },
      { key: "age_band", label: "Age band", values: ["0-10", "11-25", "26-40", "41-59", "60+"] },
      { key: "date", label: "Date", date: true },
    ],
  },
  {
    key: "prescriptions",
    label: "Prescriptions (Rx)",
    live: false,
    measures: [
      { key: "prescriptions.count", label: "Prescription count", type: "number" },
      { key: "prescriptions.generic_count", label: "Generic count", type: "number" },
      { key: "prescriptions.branded_count", label: "Branded count", type: "number" },
    ],
    dimensions: [
      { key: "salt", label: "Salt / molecule" },
      { key: "company", label: "Company" },
      { key: "generic_category", label: "Generic vs branded", values: ["Generic", "Branded"] },
      { key: "date", label: "Date", date: true },
    ],
  },
];

export const OPERATORS = [
  { key: "eq", label: "is" },
  { key: "neq", label: "is not" },
  { key: "in", label: "is any of" },
  { key: "between", label: "between" },
  { key: "gt", label: "greater than" },
  { key: "lt", label: "less than" },
  { key: "contains", label: "contains" },
];

export const GRAINS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

export const VIZ_TYPES = [
  { key: "kpi", label: "KPI" },
  { key: "line", label: "Line" },
  { key: "bar", label: "Bar" },
  { key: "stackedBar", label: "Stacked" },
  { key: "donut", label: "Donut" },
  { key: "table", label: "Table" },
];

export const getDataset = (key) => DATASETS.find((d) => d.key === key);

// Rule-based chart recommendation (the "semi-automatic" assist, PRD §14).
export const recommendViz = (dimensions = []) => {
  if (!dimensions.length) return "kpi";
  const hasDate = dimensions.some((d) => d.date || d.field === "date");
  if (hasDate) return dimensions.length > 1 ? "stackedBar" : "line";
  if (dimensions.length === 1) return "donut";
  return "bar";
};
