// Faithful map of the legacy PHP analytics dashboard structure.
//   data_analytics/analytics_dashboard_top.php  → tabs + page dropdown
//   analytics_dashboard.php / opd_billing_analytics.php / ipd_billing_analytics.php
//   appointments_analytics.php / inpatient_summary.php / others_analytics.php
//   data_clinic_consultations.php / _diagnosis.php / _rx_analytics.php
//   data_analytics_reports.php   → Reports hub
//
// Each chart carries the SAME chart type + series the PHP renders. `source`
// names a live loader (real, hospital-scoped data); charts without a source
// render PHP-style sample data tagged "Sample" until the Analytics API ships.

export const DAY_OPTIONS = [
  { value: 7, label: "Last 7 Days" },
  { value: 15, label: "Last 15 Days" },
  { value: 30, label: "Last 30 Days" },
  { value: 90, label: "Last 90 Days" },
  { value: 365, label: "Last 1 Year" },
];

// Top-level tabs (PHP nav-pills) → each tab's selectable pages (PHP dropdown).
export const TABS = [
  {
    key: "analytics",
    label: "Analytics Dashboard",
    pages: ["business_summary", "opd_billing", "ipd_billing", "appointments", "inpatient_summary", "others"],
  },
  { key: "clinics", label: "Clinics Dashboard", pages: ["consultations", "diagnosis", "rx"] },
  { key: "reports", label: "Reports", pages: ["reports_hub"] },
];

const bar = (cols, rows, viz, extra = {}) => ({ type: "bar", sample: { columns: cols, rows }, viz, ...extra });
const stacked = (cols, rows, viz, extra = {}) => ({ type: "stackedBar", sample: { columns: cols, rows }, viz, ...extra });
const line = (cols, rows, viz, extra = {}) => ({ type: "line", sample: { columns: cols, rows }, viz, ...extra });
const donut = (cols, rows, viz, extra = {}) => ({ type: "donut", sample: { columns: cols, rows }, viz, ...extra });

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS9 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

const daySeries = (a, b, ka, kb) =>
  DAYS.map((d, i) => ({ x: d, [ka]: a[i], ...(kb ? { [kb]: b[i] } : {}) }));
const monthSeries = (vals, k) => MONTHS9.map((m, i) => ({ x: m, [k]: vals[i] }));

// ---- pages (exact PHP per-page chart sets) ------------------------------
export const PAGES = {
  // analytics_dashboard.php — "Business Summary"
  business_summary: {
    label: "Business Summary",
    filters: ["days"],
    charts: [
      {
        id: "revenues",
        title: "Revenues",
        source: "revenues",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "collected", label: "Collection", type: "currency" }, { key: "refund", label: "Refund", type: "currency" }],
          daySeries([44, 55, 57, 56, 61, 58, 63], [12, 9, 21, 8, 13, 5, 6], "collected", "refund"),
          { x: "x", y: ["collected", "refund"] }
        ),
      },
      {
        id: "appointments",
        title: "Appointments",
        source: "appointments_bar",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "followup", label: "Follow Up" }, { key: "new", label: "New" }, { key: "lost", label: "Lost" }],
          DAYS.map((d, i) => ({ x: d, followup: [44, 55, 57, 56, 61, 58, 63][i], new: [76, 85, 71, 68, 87, 65, 61][i], lost: [6, 5, 1, 0, 1, 0, 2][i] })),
          { x: "x", y: ["followup", "new", "lost"] }
        ),
      },
    ],
  },

  // opd_billing_analytics.php
  opd_billing: {
    label: "OPD Billing Analytics",
    filters: ["counter", "days"],
    charts: [
      {
        id: "opd_collection",
        title: "Collection",
        source: "opd_collection",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "collected", label: "Collection", type: "currency" }, { key: "refund", label: "Refund", type: "currency" }],
          daySeries([4400, 5500, 5700, 5600, 6100, 5800, 6300], [1200, 900, 2100, 800, 1300, 500, 600], "collected", "refund"),
          { x: "x", y: ["collected", "refund"] }
        ),
      },
      {
        id: "opd_revenue",
        title: "Revenue",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "revenue", label: "Revenue", type: "currency" }],
          daySeries([4400, 5500, 5700, 5600, 6100, 5800, 6300], [0, 0, 0, 0, 0, 0, 0], "revenue", "_unused"),
          { x: "x", y: ["revenue"] }
        ),
      },
    ],
  },

  // ipd_billing_analytics.php
  ipd_billing: {
    label: "IPD Billing Analytics",
    filters: ["counter", "days"],
    charts: [
      {
        id: "ipd_collection",
        title: "Collection",
        source: "ipd_collection",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "collected", label: "Collection", type: "currency" }, { key: "refund", label: "Refund", type: "currency" }],
          daySeries([8400, 9500, 7700, 9600, 10100, 8800, 9300], [2200, 1900, 3100, 1800, 2300, 1500, 1600], "collected", "refund"),
          { x: "x", y: ["collected", "refund"] }
        ),
      },
      {
        id: "ipd_revenue",
        title: "Revenue",
        ...bar(
          [{ key: "x", label: "Date" }, { key: "revenue", label: "Revenue", type: "currency" }, { key: "credit_note", label: "Credit Notes", type: "currency" }],
          daySeries([8400, 9500, 7700, 9600, 10100, 8800, 9300], [1760, 1850, 2010, 1980, 1870, 2050, 1910], "revenue", "credit_note"),
          { x: "x", y: ["revenue", "credit_note"] }
        ),
      },
    ],
  },

  // appointments_analytics.php
  appointments: {
    label: "Appointments Analytics",
    filters: ["hospital", "days"],
    charts: [
      {
        id: "appt_trend",
        title: "Appointments",
        source: "appt_trend",
        ...line(
          [{ key: "x", label: "Date" }, { key: "total", label: "Total Appointment" }, { key: "cancelled", label: "Cancelled Appointment" }],
          daySeries([52, 59, 48, 63, 61, 40, 33], [4, 6, 3, 7, 5, 2, 1], "total", "cancelled"),
          { x: "x", y: ["total", "cancelled"] }
        ),
      },
      {
        id: "appt_casetype",
        title: "Case Type",
        source: "appt_casetype",
        ...donut(
          [{ key: "x", label: "Case type" }, { key: "count", label: "Count" }],
          [{ x: "New", count: 37 }, { x: "Follow-Up", count: 50 }, { x: "Urgent", count: 13 }],
          { x: "x", y: ["count"] }
        ),
      },
    ],
  },

  // inpatient_summary.php
  inpatient_summary: {
    label: "Inpatient Summary",
    filters: ["hospital"],
    charts: [
      { id: "bor", title: "Bed Occupancy Rate (BOR)", ...line([{ key: "x", label: "Month" }, { key: "bor", label: "BOR %", type: "percent" }], monthSeries([62, 68, 71, 74, 70, 78, 81, 76, 73], "bor"), { x: "x", y: ["bor"] }) },
      { id: "alos", title: "Average Length Of Stay (ALOS)", ...line([{ key: "x", label: "Month" }, { key: "alos", label: "ALOS (days)" }], monthSeries([3.2, 3.5, 3.1, 3.8, 3.4, 4.1, 3.9, 3.6, 3.3], "alos"), { x: "x", y: ["alos"] }) },
      { id: "adc", title: "Average Daily Census (ADC)", ...line([{ key: "x", label: "Month" }, { key: "adc", label: "ADC" }], monthSeries([10, 41, 35, 51, 49, 62, 69, 58, 47], "adc"), { x: "x", y: ["adc"] }) },
      { id: "ward", title: "Ward Summary", ...donut([{ key: "x", label: "Ward" }, { key: "count", label: "Admitted" }], [{ x: "General", count: 4 }, { x: "Test P Ward", count: 1 }], { x: "x", y: ["count"] }) },
      { id: "discharge", title: "Discharge Summary", ...donut([{ key: "x", label: "Type" }, { key: "count", label: "Count" }], [{ x: "Medical", count: 4 }, { x: "Death", count: 1 }], { x: "x", y: ["count"] }) },
    ],
  },

  // others_analytics.php
  others: {
    label: "Others Analytics",
    filters: ["hospital", "days"],
    charts: [
      {
        id: "pharmacy",
        title: "Pharmacy",
        ...stacked(
          [{ key: "x", label: "Date" }, { key: "pi", label: "Purchase Invoice" }, { key: "pr", label: "Purchase Return" }, { key: "si", label: "Sale Invoice" }, { key: "sr", label: "Sale Return" }],
          DAYS.map((d, i) => ({ x: d, pi: [44, 55, 41, 67, 22, 43, 30][i], pr: [13, 23, 20, 8, 13, 27, 10][i], si: [11, 17, 15, 15, 21, 14, 9][i], sr: [21, 7, 25, 13, 22, 8, 5][i] })),
          { x: "x", y: ["pi", "pr", "si", "sr"] }
        ),
      },
      {
        id: "pathology",
        title: "Pathology",
        ...line(
          [{ key: "x", label: "Date" }, { key: "opd", label: "OPD" }, { key: "ipd", label: "IPD" }],
          daySeries([10, 41, 35, 51, 49, 62, 69], [4, 9, 6, 11, 8, 14, 12], "opd", "ipd"),
          { x: "x", y: ["opd", "ipd"] }
        ),
      },
    ],
  },

  // data_clinic_consultations.php
  consultations: {
    label: "Consultations",
    filters: ["hospital", "doctor", "month"],
    charts: [
      { id: "weekly_consults", title: "Weekly Total Consultations", ...bar([{ key: "x", label: "Week" }, { key: "last", label: "Last Month" }, { key: "current", label: "Current Month" }], ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => ({ x: w, last: [22, 30, 18, 25][i], current: [28, 26, 31, 20][i] })), { x: "x", y: ["last", "current"] }) },
      { id: "weekly_unique", title: "Weekly Unique Patients", ...bar([{ key: "x", label: "Week" }, { key: "last", label: "Last Month" }, { key: "current", label: "Current Month" }], ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => ({ x: w, last: [18, 24, 14, 20][i], current: [22, 20, 25, 16][i] })), { x: "x", y: ["last", "current"] }) },
      { id: "weekly_repeat", title: "Weekly Repeat Patients", ...bar([{ key: "x", label: "Week" }, { key: "last", label: "Last Month" }, { key: "current", label: "Current Month" }], ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => ({ x: w, last: [4, 6, 4, 5][i], current: [6, 6, 6, 4][i] })), { x: "x", y: ["last", "current"] }) },
      { id: "weekly_followups", title: "Weekly Follow-ups", ...bar([{ key: "x", label: "Week" }, { key: "planned", label: "Planned" }, { key: "done", label: "Followed-up" }], ["Week 1", "Week 2", "Week 3", "Week 4"].map((w, i) => ({ x: w, planned: [8, 10, 7, 9][i], done: [5, 7, 4, 6][i] })), { x: "x", y: ["planned", "done"] }) },
    ],
  },

  // data_clinic_diagnosis.php
  diagnosis: {
    label: "Diagnosis",
    filters: ["hospital", "doctor", "month"],
    charts: [
      { id: "top_diagnoses", title: "Top Diagnoses", ...bar([{ key: "x", label: "Diagnosis" }, { key: "count", label: "No. of Consults" }], [["Hypertension", 24], ["Type 2 Diabetes", 19], ["URTI", 15], ["Gastritis", 12], ["Anemia", 9]].map(([x, count]) => ({ x, count })), { x: "x", y: ["count"] }) },
      { id: "top_investigations", title: "Top Investigations", ...donut([{ key: "x", label: "Investigation" }, { key: "count", label: "Count" }], [["CBC", 30], ["Lipid Profile", 22], ["HbA1c", 18], ["LFT", 12], ["TSH", 10]].map(([x, count]) => ({ x, count })), { x: "x", y: ["count"] }) },
      { id: "age_profile", title: "Age Profile", ...bar([{ key: "x", label: "Age" }, { key: "last", label: "Last Month" }, { key: "current", label: "Current Month" }], [["0-10", 8, 10], ["11-25", 14, 16], ["26-40", 22, 25], ["41-59", 18, 20], ["60+", 12, 14]].map(([x, last, current]) => ({ x, last, current })), { x: "x", y: ["last", "current"] }) },
      { id: "gender_profile", title: "Gender Profile", ...bar([{ key: "x", label: "Gender" }, { key: "last", label: "Last Month" }, { key: "current", label: "Current Month" }], [["Males", 40, 44], ["Females", 35, 38]].map(([x, last, current]) => ({ x, last, current })), { x: "x", y: ["last", "current"] }) },
    ],
  },

  // data_clinic_rx_analytics.php
  rx: {
    label: "Prescriptions",
    filters: ["hospital", "doctor", "month"],
    charts: [
      { id: "top_brands", title: "Top Prescribed Brands", ...bar([{ key: "x", label: "Brand" }, { key: "count", label: "No. of Medicines" }], [["Crocin", 42], ["Augmentin", 31], ["Pan-D", 27], ["Dolo 650", 24], ["Azithral", 18]].map(([x, count]) => ({ x, count })), { x: "x", y: ["count"] }) },
      { id: "company_share", title: "Share of Companies", ...bar([{ key: "x", label: "Company" }, { key: "count", label: "No. of Medicines" }], [["GSK", 55], ["Cipla", 48], ["Sun Pharma", 40], ["Abbott", 33], ["Mankind", 27]].map(([x, count]) => ({ x, count })), { x: "x", y: ["count"] }) },
      { id: "generic_salts", title: "Top Prescribed Salts (Generics)", ...stacked([{ key: "x", label: "Salt" }, { key: "c1", label: "Company A" }, { key: "c2", label: "Company B" }, { key: "c3", label: "Company C" }], [["Paracetamol", 20, 12, 8], ["Amoxicillin", 14, 10, 6], ["Pantoprazole", 12, 9, 5]].map(([x, c1, c2, c3]) => ({ x, c1, c2, c3 })), { x: "x", y: ["c1", "c2", "c3"] }) },
    ],
  },

  reports_hub: { label: "Reports", type: "reports" },
};

// data_analytics_reports.php — the report cards. Each opens a filter modal →
// Download (CSV/Excel). `source:'billing'` builds from the live billing API;
// `endpoint` pulls from the Analytics service (when on); reportTypes drive the
// radio in the modal (legacy fidelity).
export const REPORT_SECTIONS = [
  { id: "financial", label: "Financial" },
  { id: "clinical", label: "Clinical" },
  { id: "reference", label: "Reference" },
  { id: "registers", label: "Registers (raw data)" },
];

export const REPORT_CARDS = [
  // ── Financial ──
  { key: "daily_collection", section: "financial", title: "Daily Collection", desc: "Cash memo / receipt / advance / refund for the period.", role: "389", source: "billing", careSetting: "opd" },
  { key: "collection", section: "financial", title: "Collection Report", desc: "General, detailed & day-wise collection by date, bill type, issued-by, payment mode.", role: "390", source: "billing", careSetting: "opd", reportTypes: ["General Report", "Detailed Report", "Day Wise Report"] },
  { key: "incentives", section: "financial", title: "Incentive Report", desc: "Detailed (service-level) & overall (per-user) incentive payouts.", role: "391", endpoint: "financial/incentives", reportTypes: ["Detailed Report", "Overall Report"] },
  { key: "report_3c", section: "financial", title: "3C Report", desc: "Service-level cash / invoice / credit-note breakdown by account.", role: "23", endpoint: "financial/3c-report" },
  { key: "billing_overall", section: "financial", title: "Billing Overall Reports", desc: "Revenue report & cash-flow across the practice.", role: "393", source: "billing", careSetting: "opd" },

  // ── Clinical ──
  { key: "appointment_analytics", section: "clinical", title: "Appointment Analytics", desc: "Per-appointment export with patient demographics; overall = per-doctor status matrix.", endpoint: "operational/appointment-analytics", reportTypes: ["General Report", "Overall Report"] },
  { key: "prescription_analytics", section: "clinical", title: "Prescription Analytics", desc: "Brand / generic / company prescription volumes (doses) for OPD.", endpoint: "operational/prescription-analytics" },
  { key: "medicine_analytics", section: "clinical", title: "Medicine Analytics", desc: "Prescribed-medicine counts by clinic for the period.", endpoint: "operational/medicine-analytics" },

  // ── Reference ──
  { key: "referred_by_patients", section: "reference", title: "Referred by Patients", desc: "Patients who referred other patients, with referred-case counts.", endpoint: "operational/referred-by-patients" },
  { key: "referred_by_others", section: "reference", title: "Referred by Others", desc: "External referrers with their referred-case counts.", endpoint: "operational/referred-by-others" },

  // ── Registers (raw data, beyond the legacy PHP set) ──
  { key: "patient_register", section: "registers", title: "Patient Register", desc: "Every patient seen in the period: demographics, contact, ABHA, visits.", endpoint: "operational/patients", block: "patients", params: { careSetting: "opd" } },
  { key: "followup_recall", section: "registers", title: "Follow-up Recall List", desc: "Advised follow-ups with kept / missed / upcoming status: the call list.", endpoint: "operational/followups", block: "patients" },
  { key: "certificates_register", section: "registers", title: "Certificates Register", desc: "Every certificate issued: type, patient, doctor, template source.", endpoint: "operational/certificates", block: "certificates" },
  { key: "custom_meds_register", section: "registers", title: "Custom Medicines Register", desc: "Doctor-added (non-catalogue) medicines prescribed, with reach.", endpoint: "clinical/drug", block: "customMedsRegister" },
  { key: "dues_register", section: "registers", title: "Outstanding Dues Register", desc: "Patients with unpaid balances, oldest first.", endpoint: "financial/depth", block: "patientDues", params: { careSetting: "opd" } },
  { key: "stock_expiry_register", section: "registers", title: "Pharmacy Stock Expiry", desc: "Medicine batches by expiry (FEFO): what to move first.", endpoint: "operational/pharmacy", block: "batchRegister" },
];

// IPD Reports hub (the /analytics/ipd "Reports" leaf). Same card contract as
// REPORT_CARDS: `endpoint` + `block` name the Analytics-service response block
// carrying the rows; `source:'billing-ipd'` builds from the live IPD billing
// dashboard API instead.
export const IPD_REPORT_SECTIONS = [
  { id: "flow", label: "Patient flow" },
  { id: "clinical", label: "Clinical" },
  { id: "financial", label: "Financial" },
];

export const IPD_REPORT_CARDS = [
  // ── Patient flow ──
  { key: "admission_register", section: "flow", title: "Admission Register", desc: "Every admission: patient, demographics, department, ward, room, doctor, status, LOS.", endpoint: "ipd/admissions", block: "admissionRegister" },
  { key: "discharge_register", section: "flow", title: "Discharged Patients", desc: "Discharged patients with ward, doctor, discharge type and final length of stay.", endpoint: "ipd/admissions", block: "dischargeRegister" },
  { key: "discharge_queue", section: "flow", title: "Discharge Queue", desc: "Patients marked for discharge but still in a bed, with days waiting.", endpoint: "ipd/admissions", block: "queueRegister" },
  { key: "los_report", section: "flow", title: "LOS Report", desc: "Per-patient stay log: admitted, discharged, ward, doctor, days stayed.", endpoint: "ipd/admissions", block: "losRegister" },
  { key: "transfers_register", section: "flow", title: "Transfers Register", desc: "Every room, ward and department shift: from, to, and who moved the patient.", endpoint: "ipd/wards", block: "transfersRegister" },
  // ── Clinical ──
  { key: "ot_register", section: "clinical", title: "OT Register", desc: "Every OT procedure: patient, operating doctor, anaesthetist, anaesthesia, duration, status.", endpoint: "ipd/clinical", block: "otRegister" },
  // ── Financial ──
  { key: "ipd_bills", section: "financial", title: "IPD Bills", desc: "The IPD bill ledger for the period, straight from the billing dashboard.", source: "billing-ipd" },
  { key: "ipd_dues", section: "financial", title: "IPD Outstanding Dues", desc: "Admitted and discharged patients with unpaid balances, oldest first.", endpoint: "financial/summary", block: "patientDues", params: { careSetting: "ipd" } },
];
