// Shared constants + formatters for the Analytics module.

// OPD-only product — there is no IPD care setting in this module.
export const CARE_SETTINGS = [{ key: "opd", label: "OPD" }];

export const SECTIONS = ["Overview", "Financial", "Operational", "Clinical"];

// Brand palette derived from the EMR theme tokens (primary #4b4ad5).
export const PALETTE = [
  "#4b4ad5",
  "#a461d8",
  "#36c5a8",
  "#f5a623",
  "#ef5da8",
  "#2bb3e0",
  "#7a8cff",
  "#f76b6b",
];

// GrowthBook flag to route loaders through the Analytics microservice
// (spec §4). Default OFF → today's direct billing/appointment path is used.
export const ANALYTICS_API_FLAG = "analytics-use-api";

// The Analytics microservice is the native module's data source — ON by default.
// Every backend-backed dashboard (clinical, IPD, financial, operational, patients)
// routes through it. Set localStorage `tp_analytics_api_on='0'` to force the legacy
// built-page path (e.g. if the service is unreachable); `='1'` is the explicit opt-in.
export const isApiOn = () => {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem("tp_analytics_api_on");
      if (v === "0") return false;
      if (v === "1") return true;
    }
  } catch (e) {
    /* no localStorage → fall through to default */
  }
  return true;
};

// Named-endpoint map per section (spec §2.2). Each entry becomes a widget;
// the endpoint returns the universal { columns, rows } envelope so widgets are
// built generically. Used only when ANALYTICS_API_FLAG is on + url is set.
export const API_REPORTS = {
  Overview: [
    { endpoint: "financial/collection-trend", title: "Collection over time", kind: "chart", chartType: "line", viz: { x: "date", y: ["collection", "refund"] }, span: "half" },
    { endpoint: "financial/payment-mode-mix", title: "Payment-mode mix", kind: "chart", chartType: "donut", viz: { x: "payment_mode", y: ["amount"] }, span: "half" },
  ],
  Financial: [
    { endpoint: "financial/collection-trend", title: "Collection over time", kind: "chart", chartType: "line", viz: { x: "date", y: ["collection", "refund"] }, span: "half" },
    { endpoint: "financial/payment-mode-mix", title: "Payment-mode mix", kind: "chart", chartType: "donut", viz: { x: "payment_mode", y: ["amount"] }, span: "half" },
    { endpoint: "financial/revenue-trend", title: "Revenue over time", kind: "chart", chartType: "bar", viz: { x: "date", y: ["revenue"] }, span: "half" },
    { endpoint: "financial/daily-collection", title: "Daily collection", kind: "table", span: "full" },
  ],
  Operational: [
    { endpoint: "operational/appointments-trend", title: "Appointments: total vs cancelled", kind: "chart", chartType: "line", viz: { x: "date", y: ["total", "cancelled"] }, span: "half" },
    { endpoint: "operational/case-type-mix", title: "Case-type mix", kind: "chart", chartType: "donut", viz: { x: "caseType", y: ["count"] }, span: "half" },
  ],
  ipdOperational: [
    { endpoint: "ipd/occupancy", title: "Occupancy: BOR / ALOS / ADC", kind: "chart", chartType: "line", viz: { x: "month", y: ["bor", "alos", "adc"] }, span: "half" },
    { endpoint: "ipd/ward-summary", title: "Ward-wise admissions", kind: "chart", chartType: "donut", viz: { x: "ward", y: ["admitted"] }, span: "half" },
    { endpoint: "ipd/discharge-summary", title: "Discharge mix", kind: "chart", chartType: "donut", viz: { x: "dischargeType", y: ["count"] }, span: "half" },
  ],
  Clinical: [
    { endpoint: "clinical/diagnosis", title: "Top diagnoses", kind: "chart", chartType: "bar", viz: { x: "diagnosis", y: ["count"] }, span: "half" },
    { endpoint: "clinical/rx", title: "Top molecules", kind: "chart", chartType: "bar", viz: { x: "generic", y: ["count"] }, span: "half" },
    { endpoint: "clinical/consultations", title: "Consultations (weekly)", kind: "chart", chartType: "bar", viz: { x: "week", y: ["consults"] }, span: "full" },
  ],
};

export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const num = (n) => Number(n || 0).toLocaleString("en-IN");

// Which (careSetting × section) combinations have real data wired today.
// Anything not here renders an honest "not available yet" widget.
export const DATA_AVAILABILITY_NOTE = {
  clinical:
    "Clinical analytics need a consultation-aggregation API; the current endpoints only save consultation data, they don't aggregate it (PRD §4.3). Legacy parity reports planned here:",
  ipdOperational:
    "IPD runs as a separate service; only IPD billing is reachable from React today, so these IPD operational reports need the Analytics API (PRD §6). Legacy parity reports planned here:",
};

// The exact legacy PHP reports each not-yet-wired section will reproduce.
// Surfaced in-app so the parity roadmap is visible. See
// docs/analytics-planning/Legacy_Parity_Inventory.md.
export const PLANNED_REPORTS = {
  clinical: [
    "Consultations: weekly total / unique / repeat patients, follow-up adherence",
    "Diagnosis: top conditions, investigations, age & gender profile",
    "Rx: top brands, company share, generic-vs-branded salts",
  ],
  ipd: [
    "Bed Occupancy Rate (BOR), Average Length of Stay (ALOS), Average Daily Census (ADC)",
    "Ward-wise admissions & discharge-type mix",
    "Admissions, current occupancy, case-mix, readmissions",
  ],
};
