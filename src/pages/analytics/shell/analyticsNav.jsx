/* ============================================================================
 * Analytics navigation tree — the config that drives the TP sidebar.
 *
 * Structure (mirrors the TP App Shell RailSection model):
 *   Section (L1)  — { id, label, icon, items? }   (no items = leaf section)
 *   Item    (L2)  — { id, label, icon }            (a selectable page leaf)
 *
 * `id` matches a PAGES key in analyticsPages.js where the page is built; any
 * other id renders a spec-driven "Coming this release" placeholder, so the
 * full product nav is always present and navigable.
 * ========================================================================== */

import {
  Element3,
  Calendar,
  CalendarTick,
  Profile2User,
  Wallet3,
  Health,
  Chart21,
  ShieldTick,
  DocumentDownload,
  Activity,
  Microphone2,
  ClipboardText,
  ChemicalGlass,
  Scissor,
  ArchiveBook,
  Woman,
  HeartAdd,
  Ruler,
  Layer,
  MedalStar,
  Bag2,
} from "iconsax-reactjs";
import { CapsuleGlyph, SyringeGlyph } from "../components/MetricIcons";


// TatvaCare OPD analytics nav. OPD-only — there is no IPD here. One destination
// per topic (no duplication): Appointments, Billing and Patients each say
// EVERYTHING for that topic on a single page. Billing folds collections /
// payment mix / receivables; granular export cuts (3C, daily collection) live
// in Reports. Below: shared clinical / consult / pharmacy / growth, then Reports.
export const ANALYTICS_NAV = [
  { id: "overview", label: "Overview", icon: Element3 },
  { id: "footfall", label: "Appointments", icon: Calendar },
  { id: "opd_billing", label: "Billing", icon: Wallet3 },
  { id: "opd_patients", label: "Patients", icon: Profile2User },

  {
    id: "care",
    label: "Care",
    icon: Health,
    // Ordered as the clinical flow: symptoms → diagnosis → medication → tests.
    items: [
      { id: "symptoms", label: "Symptoms", icon: ClipboardText },
      { id: "diagnosis", label: "Diagnoses", icon: Health },
      { id: "rx", label: "Medications", icon: CapsuleGlyph },
      { id: "lab_tests", label: "Lab Tests", icon: ChemicalGlass },
      { id: "procedures", label: "Procedures", icon: Scissor },
      { id: "vitals", label: "Vitals", icon: Activity },
      { id: "medical_history", label: "Medical History", icon: ArchiveBook },
      { id: "gynec", label: "Gynec (Menstrual)", icon: Woman },
      { id: "obstetric", label: "Obstetrics", icon: HeartAdd },
      { id: "growth_chart", label: "Growth Chart", icon: Ruler },
      { id: "vaccination", label: "Vaccination", icon: SyringeGlyph },
      { id: "custom_modules", label: "Custom Modules", icon: Layer },
      { id: "certificates", label: "Certificates", icon: MedalStar },
    ],
  },

  // (Consultations folded into Appointments — the in-clinic vs video split + the
  //  consult-channel mix already render there; no separate destination needed.)

  // Pharmacy only — a LEAF section (clicking it opens the page directly).
  // Pathology has no connected source in this product, so it gets no
  // destination (re-add a section with items if/when a lab module lands).
  { id: "pharmacy", label: "Pharmacy", icon: Bag2 },

  {
    id: "grow",
    label: "Grow",
    icon: Chart21,
    items: [
      { id: "followups", label: "Follow-ups", icon: CalendarTick },
      { id: "abha", label: "ABHA / ABDM", icon: ShieldTick },
      { id: "bulk_comm", label: "Campaigns", icon: Microphone2 },
    ],
  },

  { id: "reports_hub", label: "Reports", icon: DocumentDownload },
];

// Sidebar leaf id -> built PAGES key (analyticsPages.js). Unmapped = placeholder.
// Only dashboards that render REAL hospital-scoped data belong here. Pages that
// would otherwise show fabricated PHP-sample data (rx/diagnosis/inpatient/
// consultations/others/daily-collection) are intentionally NOT mapped → they
// fall back to the honest PlaceholderPage (or render live via DASHBOARD_ENDPOINTS
// when the Analytics API is on). Boardroom #2 P0 — no fake data shown as "built".
export const PAGE_MAP = {
  overview: "business_summary",
  opd_billing: "opd_billing",
  bulk_comm: "bulk_comm",
  reports_hub: "reports_hub",
  // IPD module (sidebar ids from shell/ipdNav.jsx). Billing reads the
  // production IPD billing dashboard directly (service.loadLeaf shortcut);
  // Reports renders the IPD report-card hub.
  ipd_billing: "ipd_billing",
  ipd_reports: "reports_hub",
};

// Sidebar leaf id -> Analytics-API dashboard endpoint (contract: dashboard-block).
// Used when the Analytics API is on (isApiOn) — these light up via the service
// instead of a placeholder. Takes precedence over PAGE_MAP for shared ids.
export const DASHBOARD_ENDPOINTS = {
  // OPD-only product: the practice Overview is scoped to OPD.
  overview: { endpoint: "operational/overview", params: { careSetting: "opd" } },
  // Appointments — everything appointments (volume, status, channels, demand).
  footfall: "operational/footfall",
  // Billing — the single money destination: composite financial dashboard
  // (KPIs + collection/revenue trends + payment mix + receivables ledger).
  // Granular export cuts (3C, daily collection) live in the Reports hub.
  opd_billing: { endpoint: "financial/summary", params: { careSetting: "opd" } },
  // Patients — the single patients destination (OPD cohort: retention, RFM, ABHA).
  opd_patients: { endpoint: "operational/patients", params: { careSetting: "opd" } },
  pathology: "operational/pathology",
  pharmacy: "operational/pharmacy",
  abha: "operational/abha",
  // Clinical result-set / dashboard endpoints:
  diagnosis: "clinical/diagnosis",
  symptoms: "clinical/symptoms",
  rx: "clinical/drug",
  lab_tests: "clinical/lab-test",
  followups: "operational/followups",
  vitals: "clinical/vitals",
  growth_chart: "clinical/growth-chart",
  medical_history: "clinical/medical-history",
  clinical_quality: "clinical/quality",
  obstetric: "clinical/obstetric",
  certificates: "operational/certificates",
  gynec: "clinical/gynec",
  procedures: "clinical/procedures-opd",
  custom_modules: "operational/custom-modules",
  vaccination: "clinical/vaccination",
  // IPD dashboards (pm-ipd data via the Analytics service):
  ipd_overview: "ipd/summary",
  ipd_admissions: "ipd/admissions",
  ipd_wards: "ipd/wards",
  ipd_clinical: "ipd/clinical",
  // symptoms = per-Rx structured entries parsed from the prescription's
  // symptom box (tbl_case_manager.tcm_history_box) with real severity data.
  // surgical_history / voice_rx / symptom_collector stay unmapped (no source).
};

// Planned-widget lists for placeholder dashboards (from the master spec).
export const PLACEHOLDER_SPEC = {
  daily_collection: { needs: "Daily-collection endpoint (cash-memo / receipt / advance / refund split).", planned: ["Cash memo / Receipt / Advance / Refund totals", "Net collection", "Per-counter breakdown", "Payment-mode mix (today)"] },
  diagnosis: { needs: "Diagnosis aggregation endpoint.", planned: ["Top diagnoses (ICD)", "Gender & age donuts", "Comorbidity pairs", "Patient list (download)"] },
  rx: { needs: "Prescription aggregation endpoint.", planned: ["Top drugs / molecules / companies", "Generic-vs-branded ratio", "Gender & age donuts", "Patient list (download)"] },
  others: { needs: "Pharmacy + pathology endpoints.", planned: ["Pharmacy PI/PR/SI/SR", "Pathology by test", "Top tests"] },
  consult_inclinic: { needs: "Consultation-channel endpoint.", planned: ["In-clinic vs video split", "Channel trend", "By-doctor adoption"] },
  patients: {
    needs: "Patient cohort aggregation endpoint.",
    planned: ["New vs Old patients", "Age & gender distribution", "Retention rate", "Acquisition source", "Patient database (download)"],
  },
  realtime: {
    needs: "Real-time billing stream (today scope).",
    planned: ["Total collected today", "Paymode wise (live)", "Today's transactions", "Service-wise real time"],
  },
  symptoms: { needs: "Casemanager symptoms aggregation.", planned: ["Top symptom", "Symptoms summary", "Age donut", "Gender donut", "Severity mix", "Patient list (download)"] },
  lab_tests: { needs: "Investigation aggregation.", planned: ["Top lab test", "Lab test summary", "Age donut", "Gender donut", "Ordering rate trend", "Patient list (download)"] },
  procedures: { needs: "OPD procedures / surgeries from the Rx \"Surgeries/Procedures\" box are stored in the pm-patient-docs microservice (lab_params_api_url, /api/v1/surgeries), not in the analytics database. The replica only has a tiny inpatient procedure table, so this page needs a bulk export (procedures by hospital + date) before it can populate.", planned: ["Top procedure", "Procedures performed", "Distinct procedures", "Patients with a procedure", "Procedure trend", "By doctor", "Procedure register (download)"] },
  vitals: { needs: "Vitals normalization endpoint.", planned: ["BP distribution", "BMI distribution", "SpO2 distribution", "Age & gender donuts", "Vitals raw (download)"] },
  medical_history: { needs: "Medical-history aggregation.", planned: ["Top chronic conditions", "Allergy distribution", "Comorbidity load", "Condition by age/gender", "Patient list (download)"] },
  surgical_history: { needs: "Surgical-history aggregation.", planned: ["Top surgeries", "By age band", "By gender", "Patient list (download)"] },
  gynec: { needs: "Menstrual gynec history lives in the pm-medicalhistory service (gynec_api_url), not in the analytics database. The service exposes only a per-patient lookup; a bulk export (by hospital + date range) or a sync into the replica is needed before this page can populate. Contract: docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md.", planned: ["~Avg age at menarche", "Cycle: regular vs irregular", "Flow mix (heavy / moderate / scanty)", "Pain mix (none / mild / moderate / severe)", "Reproductive life stages (menopause / perimenopause / lactational amenorrhea)", "~Avg cycle interval and flow duration", "Patients with gynec history"] },
  growth_chart: { needs: "Growth-chart cohort aggregation.", planned: ["Height-for-age", "Weight-for-age", "Percentile categories", "Stunting/Wasting prevalence", "Patient list (download)"] },
  vaccination: { needs: "Vaccination cohort aggregation.", planned: ["Status summary", "Top brands", "Refusal trend", "Coverage trend", "Due list (download)"] },
  rx_raw: { needs: "Full prescription rows endpoint.", planned: ["Prescription data", "Medical history", "Expectant mothers", "Admission recommendations"] },
  clinical_quality: { needs: "Casemanager aggregation + rule engine.", planned: ["Generic vs branded ratio", "Polypharmacy rate", "Specialty quality (Diabetes/Cardio/Paeds)", "By-doctor quality scorecard"] },
  consult_video: { needs: "Teleconsult metrics endpoint.", planned: ["Video vs in-clinic split", "Video adoption by doctor", "Slot utilization", "Duration distribution", "Patient list (download)"] },
  voice_rx: { needs: "Voice-log aggregation (logs API exists).", planned: ["Adoption trend", "Sessions by doctor", "Edit rate", "Accuracy by field", "Browser mix", "Session list (download)"] },
  symptom_collector: { needs: "Symptom-collector message aggregation.", planned: ["Messages sent", "Response rate", "Top reported symptoms", "Self-report vs doctor correlation", "Patient list (download)"] },
  custom_modules: { needs: "RxPad custom modules live in the dynamic-modules microservice (custom_module_api_url), not in the analytics database. A bulk export (modules + reuse log by hospital) is needed before this page can populate. The registry is absent from the replica.", planned: ["Total custom modules created", "Modules created this period", "Per-doctor created", "Reuse rate (used by another doctor)", "Most-used modules across doctors", "Created vs reused", "Module register (download)"] },
  bulk_comm: { needs: "Campaign analytics (API exists).", planned: ["Campaign volume", "Delivery rate", "Credit consumption", "Best send time", "Campaign list (download)"] },
  report_3c: { needs: "3C report endpoint.", planned: ["Service-level cash/invoice/credit-note", "By account & department", "CSV/PDF export"] },
  incentives: { needs: "Incentive report endpoint.", planned: ["Incentive by doctor", "Incentive trend", "As % of revenue", "Detail (download)"] },
  referrals: { needs: "Referral aggregation.", planned: ["Referral source mix", "Top referring doctors", "Conversion funnel", "Revenue from referrals"] },
  followups: { needs: "Follow-up aggregation.", planned: ["Adherence rate by doctor", "Adherence trend", "Overdue list (download)"] },
  packages: { needs: "Treatment-plan tables.", planned: ["Package assignment", "Plan status", "Inactive plans (30d)", "Treatment plan usage"] },
  abha: { needs: "ABDM integration metrics.", planned: ["Care contexts linked", "ABHA patients (KYC / non-KYC)", "Consent success"] },
  gmb: { needs: "Google My Business API.", planned: ["Profile views", "Maps appearances", "Patient interactions", "Reviews & ratings"] },
  questionnaire: { needs: "Structured-assessment tables.", planned: ["Doctor-wise SA completed", "SA raw", "Patient-wise assessment details"] },
  deidentified: { needs: "Aggregate de-identified export.", planned: ["Appointments (avoidable)", "Lab by patient type", "Prescriptions by diagnosis", "Lab test trends"] },
};

// Flat lookup: leafId -> { label, sectionLabel, icon }
export const LEAF_INDEX = (() => {
  const idx = {};
  ANALYTICS_NAV.forEach((s) => {
    if (s.items?.length) {
      s.items.forEach((it) => {
        idx[it.id] = { label: it.label, sectionLabel: s.label, icon: it.icon };
      });
    } else {
      idx[s.id] = { label: s.label, sectionLabel: null, icon: s.icon };
    }
  });
  return idx;
})();
