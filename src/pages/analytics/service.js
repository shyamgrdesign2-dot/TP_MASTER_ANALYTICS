// Analytics data service — orchestrates the EXISTING hospital-scoped APIs
// (billing dashboard, appointment list) and normalizes their responses into
// widget descriptors the UI renders. Hospital scope is implicit from the JWT,
// so no hospital id is passed here.
//
// Returns, per (careSetting × section), an array of widget descriptors:
//   { id, title, kind: 'kpis'|'chart'|'table'|'empty', span, ... }
// where chart/table widgets carry { data:{columns,rows} } (or columns/rows)
// so the export menu works uniformly.

import { fetchBillingDashboard, fetchAdvancedDepositDashboard } from "../opdBilling/service";
import { fetchAllPatients } from "../allPatients.js/service";
import ApiAppointments from "../../api/services/ApiAppointments";
import ApiAnalytics from "../../api/services/ApiAnalytics";
import ApiBulkMessages from "../../api/services/ApiBulkMessages";
import { getDecodedToken } from "../../utils/localStorage";
import {
  mergeBilling,
  collectionTrend,
  paymentMix,
  billRefundMix,
  advanceModeMix,
  duesAgingFromBills,
  billsTable,
  caseTypeMix,
  appointmentStatusMix,
  appointmentsTable,
  genderMix,
  ageBandMix,
  patientsTable,
  campaignsTable,
} from "./analyticsHelpers";
import { inr, num, DATA_AVAILABILITY_NOTE, PLANNED_REPORTS, API_REPORTS, isApiOn } from "./analyticsConfig";
import { DEMO } from "./demo/demoApi";
import { demoBillingDashboard, demoAdvanceDashboard, DEMO_USER_CREDIT, demoCampaigns } from "./demo/billingFixtures";
import { PAGES } from "./analyticsPages";
import { PAGE_MAP, DASHBOARD_ENDPOINTS } from "./shell/analyticsNav";

function resolveDocIds(passedIds = []) {
  if (passedIds.length) return passedIds;
  try {
    const uid = getDecodedToken()?.result?.user_id;
    return uid ? [uid] : [];
  } catch (_) { return []; }
}

// The dashboard endpoint caps `limit` (limit=1000 → HTTP 400). Match the
// working billing dashboard's params. KPIs + payment-mode mix come from the
// full-period `summary`; the trend uses the returned bills page.
const BILL_LIMIT = 100;

async function getBilling(careSetting, { startDate, endDate, doctorIds }) {
  // DEMO build: the billing dashboard is a production API with no captured
  // fixture — synthesize plausible, shape-exact data instead (both ledgers).
  if (DEMO) {
    if (careSetting === "both") return mergeBilling(demoBillingDashboard("opd"), demoBillingDashboard("ipd"));
    return demoBillingDashboard(careSetting === "ipd" ? "ipd" : "opd");
  }
  // The billing endpoint REQUIRES doctorIds. Resolve from passed list or JWT.
  const resolvedIds = resolveDocIds(doctorIds || []);
  const params = {
    startDate,
    endDate,
    page: 1,
    limit: BILL_LIMIT,
    sortBy: "date",
    sortOrder: "desc",
    patientId: "",
    doctorIds: resolvedIds,
  };
  if (careSetting === "opd") return fetchBillingDashboard(params, "opd");
  if (careSetting === "ipd") return fetchBillingDashboard(params, "ipd");
  const [opd, ipd] = await Promise.all([
    fetchBillingDashboard(params, "opd"),
    fetchBillingDashboard(params, "ipd"),
  ]);
  return mergeBilling(opd || {}, ipd || {});
}

const hasBilling = (b) => b && (b.summary || (b.bills && b.bills.length));

// KPI band that mirrors the production OPD Billing dashboard exactly — two
// explicit families: BILLS (the bill ledger) then ADVANCE WALLET (deposits),
// followed by the derived cards. Everything sources from the billing APIs the
// page already fetches, so it works for every tenant (the replica is empty for
// hospitals billing through the new billing service).
function financialKpis(summary = {}, advance = {}, filters = {}) {
  const billed = Number(summary.totalBillAmount || 0);
  const billCount = Number(summary.count || 0);
  // Stable keys keep card identity (and therefore position) fixed across
  // periods and across any future title rewording.
  const money = (key, title, value, description) => ({ key, title, value, prefix: "₹", description });
  const dash = (key, title, description) => ({ key, title, value: "—", description });

  // (The four "Top … mode" cards were curated out of the band on review: the
  // four mode donuts directly below carry the full payment / refund mode story.)

  // Projected billed: the module-standard gating, a current rolling window of
  // 7–92 days ending ~today; otherwise the card stays, showing '—'.
  const dayjsOk = filters.startDate && filters.endDate;
  const days = dayjsOk ? Math.max(1, Math.round((new Date(filters.endDate) - new Date(filters.startDate)) / 86400000) + 1) : 0;
  const endsToday = dayjsOk && (Date.now() - new Date(filters.endDate).getTime()) <= 2 * 86400000;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectable = endsToday && days >= 7 && days <= 92;

  return [
    // ── Bills ──
    money("billed", "Total billed", billed, "Gross value of bills raised in this period."),
    money("collected", "Total collected", Number(summary.totalPaidAmount || 0), "Money actually received against bills in this period."),
    money("due", "Total bill due", Number(summary.dueAmount || 0), `Outstanding balance still owed by patients${summary.dueCount ? ` (${num(summary.dueCount)} bills)` : ""}.`),
    money("refunded", "Total bill refunded", Number(summary.refundedAmount || 0), `Money refunded to patients against bills this period${summary.refundedCount ? ` (${num(summary.refundedCount)} refunds)` : ""}.`),
    // ── Advance wallet ──
    money("advReceived", "Total advance received", Number(advance.totalAdvanceReceived || 0), `Advance money deposited by patients this period (${num(advance.advanceReceivedCount || 0)} deposits). "Received" and "deposited" are the same event: money into the patient's wallet.`),
    money("advRefunded", "Total advance refunded", Number(advance.totalAdvanceRefunded || 0), "Advance money returned to patients from their wallet this period."),
    money("advDebited", "Total advance debited", Number(advance.totalAdvanceDebited || 0), "Advance money USED to pay bills this period (it appears as the 'Advance Deposit' slice in the bill payment-mode mix). It can legitimately exceed 'Total advance received': bills in this window often consume deposits made in earlier periods."),
    // ── Derived ──
    billCount
      ? { key: "avgBill", title: "Avg bill value", value: Math.round(billed / billCount), prefix: "~₹", description: `Approximate: total billed ÷ ${num(billCount)} bills in this period.` }
      : dash("avgBill", "Avg bill value", "No bills were raised in this period."),
    projectable
      ? { key: "projectedBilled", title: "Projected billed (month)", value: Math.round((billed / days) * daysInMonth), prefix: "~₹", description: "Approximate forecast: billed value for the full current month at this period's daily run-rate. Shown only for current rolling periods (last 7–90 days)." }
      : dash("projectedBilled", "Projected billed (month)", "A forecast is only meaningful for a current rolling period (last 7–90 days ending today). Select one of those presets to see the projected month."),
  ];
}

async function financialWidgets(careSetting, filters) {
  // Bill dashboard + advance-deposit dashboard from the production billing API.
  // The advance receipts page feeds the advance-mode cards/charts (limit 100 —
  // truncation is honest-marked where the period has more transactions).
  const [billing, advanceRes] = await Promise.all([
    getBilling(careSetting, filters),
    DEMO
      ? Promise.resolve(demoAdvanceDashboard(careSetting === "ipd" ? "ipd" : "opd"))
      : fetchAdvancedDepositDashboard({ page: 1, limit: 100, startDate: filters.startDate, endDate: filters.endDate }).catch(() => ({})),
  ]);
  if (!hasBilling(billing)) {
    return [emptyWidget("financial-empty", "Financial", "No billing data found for this hospital and period.")];
  }
  const summary = billing.summary || {};
  const advance = (advanceRes && advanceRes.summary) || {};
  const advReceipts = (advanceRes && (advanceRes.receipts || advanceRes.data?.receipts)) || [];
  const bills = billing.bills || [];
  const mix = paymentMix(summary);
  const refundMix = billRefundMix(summary);
  const advDepositMix = advanceModeMix(advReceipts, "Deposit");
  const advRefundMix = advanceModeMix(advReceipts, "Refund");
  const aging = duesAgingFromBills(bills);
  const trend = collectionTrend(bills);
  const table = billsTable(bills);
  // Patient-level table that the download (↓) on EVERY chart should export.
  const patientData = { columns: table.columns, rows: table.rows };
  const unpaidInPage = bills.filter((b) => Number(b?.dueAmount || 0) > 0).length;
  const hasAdvanceDepositSlice = mix.rows.some((r) => /advance/i.test(String(r.paymentMode)));

  // Authoritative real-API band — sources the production billing APIs directly,
  // so every chart works for BOTH legacy and new-billing-service tenants (the
  // replica is empty for the latter; nothing here reads it).
  const apiWidgets = [
    { id: "fin-kpis", kind: "kpis", kpis: financialKpis(summary, advance, filters), span: "full" },
    {
      id: "fin-trend",
      kind: "chart",
      title: "Collection over time",
      chartType: "line",
      data: trend,
      viz: { x: "date", y: ["collected", "refund"] },
      span: "half",
      group: "Money & collections",
      patientData,
      note: trend.rows.length ? null : "No dated bills in this period.",
    },
    {
      id: "fin-mix",
      kind: "chart",
      title: "Bill payment-mode mix",
      chartType: "donut",
      data: mix,
      viz: { x: "paymentMode", y: ["received"] },
      span: "half",
      group: "Money & collections",
      info: "How bill money came in, by payment mode. 'Advance Deposit' means the bill was paid from the patient's wallet: money already counted under Advance received, not fresh cash.",
      patientData,
      note: mix.rows.length
        ? (hasAdvanceDepositSlice ? "'Advance Deposit' = bills paid from the patient's wallet: already counted under Advance received." : null)
        : "No payment-mode breakdown returned.",
    },
    {
      id: "fin-refund-mix",
      kind: "chart",
      title: "Bill refunds by mode",
      chartType: "donut",
      data: refundMix,
      viz: { x: "paymentMode", y: ["refunded"] },
      span: "half",
      group: "Money & collections",
      info: "Money refunded against bills, by the mode it was returned through.",
      patientData,
      note: refundMix.rows.length ? null : "No bill refunds in this period.",
    },
    {
      id: "fin-aging",
      kind: "chart",
      title: "Unpaid bills by age",
      chartType: "bar",
      data: aging,
      viz: { x: "age", y: ["due"] },
      span: "half",
      group: "Money & collections",
      sequence: true,
      info: "Bills your patients haven't fully paid yet, grouped by how long ago the bill was raised: the older the bucket, the harder the recovery.",
      patientData,
      note: Number(summary.dueCount || 0) > unpaidInPage
        ? `Based on the ${bills.length} most-recent bills: the Total-due card covers the full period.`
        : null,
    },
    {
      id: "fin-adv-mix",
      kind: "chart",
      title: "Advance payment-mode mix",
      chartType: "donut",
      data: advDepositMix,
      viz: { x: "paymentMode", y: ["amount"] },
      span: "half",
      group: "Money & collections",
      info: "How patients deposited advance money into their wallet, by payment mode.",
      note: advDepositMix.rows.length
        ? (Number(advance.advanceReceivedCount || 0) > advReceipts.filter((r) => r?.transactionType === "Deposit").length
          ? "Based on the most-recent deposits in this period." : null)
        : "No advance deposits in this period.",
    },
    {
      id: "fin-adv-refund-mix",
      kind: "chart",
      title: "Advance refunds by mode",
      chartType: "donut",
      data: advRefundMix,
      viz: { x: "paymentMode", y: ["amount"] },
      span: "half",
      group: "Money & collections",
      info: "Wallet money returned to patients, by the mode it went back through.",
      note: advRefundMix.rows.length
        ? null
        : (Number(advance.advanceRefundedCount || 0) > 0
          ? "Refunds exist this period but their modes are beyond the most-recent receipts page."
          : "No advance refunds in this period."),
    },
    {
      id: "fin-bills",
      kind: "table",
      title: "Bills",
      columns: table.columns,
      rows: table.rows,
      span: "full",
      group: "Patient data",
      note:
        Number(summary.count || 0) > bills.length
          ? `Showing the ${bills.length} most-recent of ${num(summary.count)} bills · KPIs above cover the full period. Full export needs the Analytics service.`
          : null,
    },
  ];

  // Analytical depth from the analytics-service replica — ONLY the blocks with
  // no billing-API equivalent (by-doctor, discounts, stream split, registers).
  // The replica's KPI cards and its payment/refund/aging blocks are dropped:
  // the API band above covers them for every tenant, while the replica is
  // empty for hospitals billing through the new billing service.
  let depth = [];
  if (careSetting === "opd" && isApiOn()) {
    try {
      const res = await ApiAnalytics.report("financial/depth", {
        careSetting: "opd", startDate: filters.startDate, endDate: filters.endDate,
        doctorIds: filters.doctorIds, grain: "day",
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      });
      if (res && typeof res === "object") {
        delete res.paymentModeMix;
        delete res.duesAging;
        delete res.refundByMode;
        delete res.receiptsTrend;
        res.kpis = [];
      }
      depth = blocksToWidgets(res).filter((w) => w.kind !== "empty");
    } catch (_) { depth = []; }
  }
  // IPD depth: the replica twin detail tables are unverified, but the summary
  // endpoint's by-doctor split and patient-dues register ARE IPD-aware and add
  // what the billing API cannot give (legacy-tenant doctor revenue, the named
  // debtors list). Everything the API band already covers is dropped.
  if (careSetting === "ipd" && isApiOn()) {
    try {
      const res = await ApiAnalytics.report("financial/summary", {
        careSetting: "ipd", startDate: filters.startDate, endDate: filters.endDate,
        doctorIds: filters.doctorIds, grain: "day",
        ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}),
      });
      if (res && typeof res === "object") {
        const keep = { byDoctor: res.byDoctor, patientDues: res.patientDues, meta: res.meta };
        depth = blocksToWidgets(keep).filter((w) => w.kind !== "empty");
      }
    } catch (_) { depth = []; }
  }
  return [...apiWidgets, ...depth];
}

// ---- appointments / operational -----------------------------------------

// The list API is the EMR appointment screen's own: one status per call,
// 0-based pages, and every response carries the full-period per-status counts
// (queue_count / finished_count / cancelled_count / draft_count). Valid
// apStatue values mirror the EMR tabs (src/utils/constants.js): 0 queue,
// 3 finished, 4 cancelled, 6 draft Rx — there is no status 1.
// Drafts (6) are excluded so the row set matches the KPI total and the status
// donut, which count finished + queue + cancelled only.
const APPT_STATUSES = [
  { apStatue: 3, countKey: "finished_count" },
  { apStatue: 0, countKey: "queue_count" },
  { apStatue: 4, countKey: "cancelled_count" },
];
// Page size is server-side and unknown here; cap requests so a wide period at
// a busy hospital can't fan out unbounded. Truncation is honest-marked via
// `rowsComplete` on the merged result.
const APPT_MAX_PAGES_PER_STATUS = 5;

async function fetchAppointmentPage({ startDate, endDate }, apStatue, page) {
  const res = await ApiAppointments.getAllAppointment({
    startDate,
    endDate,
    apStatue,
    filterVisitType: "",
    page,
    search: "",
  });
  return res?.data || null;
}

// Counts-only fetch — one call; enough for the KPI band and the status donut,
// which read the full-period counts fields, not app_data rows.
export async function getAppointmentCounts(filters) {
  return fetchAppointmentPage(filters, APPT_STATUSES[0].apStatue, 0);
}

const apptTime = (r) => {
  const t = Date.parse(r?.pam_app_date || r?.apDate || r?.appointment_date || r?.date || "");
  return Number.isNaN(t) ? 0 : t;
};

// Full fetch for row-level widgets (case-type mix, appointments table): all
// three real statuses, each paged until its own count is reached or the page
// cap trips. Returns { ...counts, app_data, rowsComplete }.
export async function getAppointments(filters) {
  const firstPages = await Promise.all(
    APPT_STATUSES.map((s) => fetchAppointmentPage(filters, s.apStatue, 0).catch(() => null))
  );
  const base = firstPages.find(Boolean);
  if (!base) return null;

  const app_data = [];
  let rowsComplete = true;
  await Promise.all(
    APPT_STATUSES.map(async (s, i) => {
      const first = firstPages[i];
      if (!first) { rowsComplete = false; return; }
      const rows = [...(first.app_data || [])];
      const expected = Number(first[s.countKey] || 0);
      const pageSize = rows.length;
      if (pageSize > 0 && expected > pageSize) {
        const pagesNeeded = Math.ceil(expected / pageSize);
        const extraPages = Math.min(pagesNeeded, APPT_MAX_PAGES_PER_STATUS) - 1;
        const more = await Promise.all(
          Array.from({ length: extraPages }, (_, k) =>
            fetchAppointmentPage(filters, s.apStatue, k + 1).catch(() => null)
          )
        );
        more.forEach((d) => { if (d?.app_data?.length) rows.push(...d.app_data); });
        if (pagesNeeded > APPT_MAX_PAGES_PER_STATUS || more.some((d) => !d)) rowsComplete = false;
      }
      app_data.push(...rows);
    })
  );
  app_data.sort((a, b) => apptTime(b) - apptTime(a));
  return { ...base, app_data, rowsComplete };
}

function operationalKpis(d = {}) {
  const total =
    Number(d.finished_count || 0) +
    Number(d.queue_count || 0) +
    Number(d.cancelled_count || 0);
  const cancelRate = total > 0 ? Math.round((Number(d.cancelled_count || 0) / total) * 100) : 0;
  return [
    { title: "Appointments", value: num(total), accent: "#4b4ad5" },
    { title: "Completed", value: num(d.finished_count), accent: "#36c5a8" },
    { title: "Cancelled", value: num(d.cancelled_count), accent: "#ef5da8" },
    { title: "Cancellation rate", value: `${cancelRate}%`, accent: "#f5a623" },
  ];
}

async function operationalWidgets(careSetting, filters) {
  if (careSetting === "ipd") {
    return [
      emptyWidget("ipd-ops", "IPD operations", DATA_AVAILABILITY_NOTE.ipdOperational, PLANNED_REPORTS.ipd),
    ];
  }
  let data;
  try {
    data = await getAppointments(filters);
  } catch (e) {
    data = null;
  }
  if (!data) {
    return [emptyWidget("ops-empty", "Operational", "Appointment data isn't available for this hospital/period right now.")];
  }
  const statusMix = appointmentStatusMix(data);
  const cases = caseTypeMix(data.app_data || []);
  const apptTable = appointmentsTable(data.app_data || []);
  const patientData = { columns: apptTable.columns, rows: apptTable.rows };
  const periodTotal =
    Number(data.finished_count || 0) + Number(data.queue_count || 0) + Number(data.cancelled_count || 0);
  const truncNote = data.rowsComplete
    ? null
    : `Based on the ${num((data.app_data || []).length)} most-recent of ${num(periodTotal)} appointments: the KPIs and status counts above cover the full period.`;
  const widgets = [
    { id: "ops-kpis", kind: "kpis", kpis: operationalKpis(data), span: "full" },
    {
      id: "ops-status",
      kind: "chart",
      title: "Appointment status",
      chartType: "donut",
      data: statusMix,
      viz: { x: "status", y: ["count"] },
      patientData,
      note: statusMix.rows.length ? null : "No appointments in this period.",
    },
    {
      id: "ops-casetype",
      kind: "chart",
      title: "Case-type mix",
      chartType: "bar",
      data: cases,
      viz: { x: "caseType", y: ["count"] },
      patientData,
      note: cases.rows.length ? truncNote : "No case-type data returned.",
    },
    {
      id: "ops-list",
      kind: "table",
      title: "Appointments",
      columns: apptTable.columns,
      rows: apptTable.rows,
      span: "full",
      note: truncNote,
    },
  ];
  if (careSetting === "both") {
    widgets.push(
      emptyWidget("ops-ipd-note", "IPD operations", DATA_AVAILABILITY_NOTE.ipdOperational, PLANNED_REPORTS.ipd)
    );
  }
  return widgets;
}

// ---- patients -----------------------------------------------------------

async function patientsWidgets(filters) {
  let res;
  try {
    // Pull the full count + a representative recent sample for demographics.
    res = await fetchAllPatients({ page: 1, limit: 200, startDate: filters.startDate, endDate: filters.endDate });
  } catch (e) {
    res = null;
  }
  const rows = res?.patients || [];
  const total = res?.total ?? rows.length;
  if (!rows.length) {
    return [emptyWidget("pat-empty", "Patients", "No patient data found for this hospital and period.")];
  }
  const table = patientsTable(rows);
  const patientData = { columns: table.columns, rows: table.rows };
  const withAbha = rows.filter((r) => r.abhaAddress).length;
  const sampleNote = total > rows.length ? `Demographics from ${rows.length} most-recent patients (of ${num(total)}).` : null;

  return [
    {
      id: "pat-kpis",
      kind: "kpis",
      span: "full",
      kpis: [
        { title: "Total Patients", value: num(total), accent: "#4b4ad5" },
        { title: "ABHA-linked (sample)", value: num(withAbha), accent: "#36c5a8" },
      ],
    },
    {
      id: "pat-gender",
      kind: "chart",
      title: "Gender distribution",
      chartType: "donut",
      data: genderMix(rows),
      viz: { x: "gender", y: ["count"] },
      patientData,
      note: sampleNote,
    },
    {
      id: "pat-age",
      kind: "chart",
      title: "Age distribution",
      chartType: "donut",
      data: ageBandMix(rows),
      viz: { x: "band", y: ["count"] },
      patientData,
      note: sampleNote,
    },
    {
      id: "pat-list",
      kind: "table",
      title: "Patient database",
      columns: table.columns,
      rows: table.rows,
      span: "full",
      note:
        total > rows.length
          ? `Showing ${rows.length} of ${num(total)} patients · the Total Patients KPI covers the full set. Full export needs the Analytics service.`
          : null,
    },
  ];
}

// ---- bulk communication --------------------------------------------------

async function bulkCommWidgets(filters) {
  const [credit, camp] = await Promise.all([
    DEMO ? Promise.resolve(DEMO_USER_CREDIT) : ApiBulkMessages.userCredit().catch(() => null),
    DEMO ? Promise.resolve(demoCampaigns()) : ApiBulkMessages.userCampaign({ draft: 0, start_date: filters.startDate, end_date: filters.endDate }).catch(() => null),
  ]);
  // userCampaign returns an array-like object {0:{…},1:{…}}.
  const rows = camp ? Object.values(camp).filter((x) => x && typeof x === "object" && x.campaign_name !== undefined) : [];
  if (!rows.length && !credit) {
    return [emptyWidget("bulk-empty", "Bulk communication", "No campaign data found for this period.")];
  }
  const sum = (k) => rows.reduce((s, c) => s + Number(c[k] || 0), 0);
  const patients = sum("total_patient");
  const success = sum("success");
  const failed = sum("failed");
  const creditsUsed = sum("total_credit");
  const table = campaignsTable(rows);
  const patientData = { columns: table.columns, rows: table.rows };

  return [
    {
      id: "bulk-kpis",
      kind: "kpis",
      span: "full",
      kpis: [
        { title: "Credit Balance", value: inr(credit?.userCredit), accent: "#4b4ad5" },
        { title: "Campaigns", value: num(rows.length), accent: "#a461d8" },
        { title: "Patients Reached", value: num(patients), accent: "#36c5a8" },
        { title: "Messages Delivered", value: num(success), accent: "#2bb3e0" },
        { title: "Credits Used", value: num(Math.round(creditsUsed)), accent: "#f5a623" },
      ],
    },
    {
      id: "bulk-delivery",
      kind: "chart",
      title: "Delivery: delivered vs failed",
      chartType: "donut",
      data: {
        columns: [{ key: "k", label: "Result" }, { key: "count", label: "Messages" }],
        rows: [
          { k: "Delivered", count: success },
          { k: "Failed", count: failed },
        ].filter((r) => r.count > 0),
      },
      viz: { x: "k", y: ["count"] },
      patientData,
      note: success + failed > 0 ? null : "No delivery data in this period.",
    },
    {
      id: "bulk-top",
      kind: "chart",
      title: "Patients reached by campaign (top 8)",
      chartType: "bar",
      data: {
        columns: [{ key: "campaign", label: "Campaign" }, { key: "patients", label: "Patients" }],
        rows: [...table.rows].sort((a, b) => b.patients - a.patients).slice(0, 8),
      },
      viz: { x: "campaign", y: ["patients"] },
      patientData,
    },
    {
      id: "bulk-list",
      kind: "table",
      title: "Campaigns",
      columns: table.columns,
      rows: table.rows,
      span: "full",
    },
  ];
}

// ---- clinical -----------------------------------------------------------

async function clinicalWidgets() {
  return [
    emptyWidget("clinical", "Clinical analytics", DATA_AVAILABILITY_NOTE.clinical, PLANNED_REPORTS.clinical),
  ];
}

// ---- overview (blend) ----------------------------------------------------

async function overviewWidgets(careSetting, filters) {
  const [billing, appts] = await Promise.all([
    getBilling(careSetting, filters).catch(() => null),
    // Counts-only: the overview reads the per-status counts, never app_data rows.
    careSetting === "ipd" ? Promise.resolve(null) : getAppointmentCounts(filters).catch(() => null),
  ]);

  const summary = billing?.summary || {};
  const bills = billing?.bills || [];

  const kpis = [
    { title: "Collection", value: inr(summary.totalPaidAmount), accent: "#4b4ad5" },
    { title: "Outstanding Due", value: inr(summary.dueAmount), accent: "#f5a623" },
  ];
  if (appts) {
    const total =
      Number(appts.finished_count || 0) +
      Number(appts.queue_count || 0) +
      Number(appts.cancelled_count || 0);
    kpis.push({ title: "Appointments", value: num(total), accent: "#36c5a8" });
  }
  kpis.push({ title: "Refunded", value: inr(summary.refundedAmount), accent: "#ef5da8" });

  const widgets = [{ id: "ov-kpis", kind: "kpis", kpis, span: "full" }];

  if (hasBilling(billing)) {
    const trend = collectionTrend(bills);
    const mix = paymentMix(summary);
    const patientData = billsTable(bills);
    widgets.push({
      id: "ov-trend",
      kind: "chart",
      title: "Collection over time",
      chartType: "line",
      data: trend,
      viz: { x: "date", y: ["collected", "refund"] },
      patientData,
      note: trend.rows.length ? null : "No dated bills in this period.",
    });
    widgets.push({
      id: "ov-mix",
      kind: "chart",
      title: "Payment-mode mix",
      chartType: "donut",
      data: mix,
      viz: { x: "paymentMode", y: ["received"] },
      patientData,
      note: mix.rows.length ? null : "No payment-mode breakdown returned.",
    });
  }
  if (appts) {
    widgets.push({
      id: "ov-appts",
      kind: "chart",
      title: "Appointment status",
      chartType: "donut",
      data: appointmentStatusMix(appts),
      viz: { x: "status", y: ["count"] },
    });
  }
  return widgets;
}

// ---- dispatch -----------------------------------------------------------

function emptyWidget(id, title, note, planned) {
  return { id, kind: "empty", title, note, planned, span: "full" };
}

// --- via the Analytics microservice (spec §4) ---------------------------
// Generic: each report descriptor → one named-endpoint fetch → widget. Every
// endpoint returns the universal { columns, rows } envelope, so the same
// Widget components render without change. Used only when the cutover flag is
// on; an endpoint that isn't live yet degrades to an "empty" widget.
async function loadSectionViaApi(careSetting, section, { startDate, endDate, doctorIds }) {
  const reports =
    section === "Operational" && careSetting === "ipd"
      ? API_REPORTS.ipdOperational
      : API_REPORTS[section] || [];
  const params = { careSetting, startDate, endDate, doctorIds, grain: "day" };

  const widgets = await Promise.all(
    reports.map(async (r) => {
      try {
        const resp = await ApiAnalytics.report(r.endpoint, params);
        const rows = resp?.rows || [];
        const base = { id: r.endpoint, title: r.title, span: r.span };
        if (r.kind === "table") {
          return { ...base, kind: "table", columns: resp?.columns || [], rows };
        }
        return {
          ...base,
          kind: "chart",
          chartType: r.chartType,
          viz: r.viz,
          data: { columns: resp?.columns || [], rows },
          note: rows.length ? null : "No data for this period.",
        };
      } catch (e) {
        return emptyWidget(r.endpoint, r.title, "This report's endpoint isn't live yet.");
      }
    })
  );
  return widgets;
}

// --- PHP-faithful page model -------------------------------------------
// Each legacy page (Business Summary, OPD/IPD Billing, Appointments,
// Inpatient Summary, Others, Consultations, Diagnosis, Rx) renders its exact
// chart set. Charts with a `source` pull real hospital-scoped data; the rest
// render PHP-style sample data tagged "Sample" until the Analytics API ships.

async function loadSource(source, { startDate, endDate, doctorIds }) {
  if (source === "revenues" || source === "opd_collection" || source === "ipd_collection") {
    const cs = source === "opd_collection" ? "opd" : source === "ipd_collection" ? "ipd" : "both";
    const billing = await getBilling(cs, { startDate, endDate, doctorIds });
    const bills = billing?.bills || [];
    if (!bills.length) return null;
    return collectionTrend(bills).rows.map((r) => ({ x: r.date, collected: r.collected, refund: r.refund }));
  }
  if (source === "appt_casetype") {
    const d = await getAppointments({ startDate, endDate });
    const rows = caseTypeMix(d?.app_data || []).rows;
    if (!rows.length) return null;
    return rows.map((r) => ({ x: r.caseType, count: r.count }));
  }
  if (source === "appt_trend") {
    // daily total-vs-cancelled isn't reliably derivable from the list API yet
    return null;
  }
  return null;
}

export async function loadPage(pageKey, filters) {
  // Golden, fully-real dashboards use the rich KPI + chart + patient-table
  // builders (boardroom items #2, #3). These show KPI rows, charts whose ↓
  // exports the patient-level bills table, and a bills table.
  if (pageKey === "business_summary") return overviewWidgets("both", filters);
  if (pageKey === "opd_billing") return financialWidgets("opd", filters);
  if (pageKey === "ipd_billing") return financialWidgets("ipd", filters);
  if (pageKey === "appointments") return operationalWidgets("opd", filters);
  if (pageKey === "patients") return patientsWidgets(filters);
  if (pageKey === "bulk_comm") return bulkCommWidgets(filters);

  const page = PAGES[pageKey];
  if (!page) return [];
  if (page.type === "reports") return [{ id: "reports", kind: "reports", span: "full" }];

  return Promise.all(
    (page.charts || []).map(async (c) => {
      let realRows = null;
      if (c.source) {
        try {
          realRows = await loadSource(c.source, filters);
        } catch (e) {
          realRows = null;
        }
      }
      // Boardroom item #4: a chart that HAS a real data source but returns
      // nothing shows an honest empty state — never fabricated sample data.
      if (c.source && !(realRows && realRows.length)) {
        return {
          id: c.id,
          kind: "chart",
          title: c.title,
          chartType: c.type,
          viz: c.viz,
          data: { columns: c.sample.columns, rows: [] },
          note: "No data for this hospital and period.",
          span: "half",
        };
      }
      const isSample = !(realRows && realRows.length);
      return {
        id: c.id,
        kind: "chart",
        title: c.title,
        chartType: c.type,
        viz: c.viz,
        data: { columns: c.sample.columns, rows: isSample ? c.sample.rows : realRows },
        sample: isSample,
        span: "half",
      };
    })
  );
}

// --- Analytics API dashboard-block rendering ----------------------------
// Maps a contract dashboard-block response { hero, kpis, summary, genderMix,
// ageMix, patients, … } generically into widgets. Any contract-conformant
// endpoint renders without bespoke code (the executable-spec → UI bridge).
const BLOCK_TITLES = {
  summary: "Summary", genderMix: "Gender distribution", ageMix: "Age distribution",
  genericMix: "Top generics", manufacturerMix: "Top manufacturers", genericVsBranded: "Generic name capture", topGenerics: "Top generics", topManufacturers: "Top manufacturers", polypharmacy: "Drugs per prescription", drugsRegister: "Drug register", genericsRegister: "Generics register",
  bpDistribution: "BP distribution", bmiDistribution: "BMI distribution", spo2Distribution: "SpO₂ distribution", vitalsCaptured: "What gets measured", bpMix: "Blood pressure stages", bmiMix: "BMI distribution", bmiCoverage: "BMI coverage", rbsMix: "Random blood sugar bands", monitoredShare: "Repeat monitoring",
  topConditions: "Top conditions", conditionMix: "Condition mix", allergyMix: "Allergy distribution", statusMix: "Diagnosis status mix", conditionDist: "Top medical conditions", allergyDist: "Top allergies", familyDist: "Top family history", lifestyleDist: "Top lifestyle factors", surgicalDist: "Top past surgeries", additionalHistory: "Additional history notes", captureTrend: "History captures over time", historyRegister: "History register",
  familyHistory: "Family history",
  comorbidityLoad: "Comorbidity load", topSurgeries: "Top surgeries", adoptionTrend: "Adoption over time",
  byDoctor: "By doctor", durationDist: "Session duration", fieldCapture: "Fields captured",
  editRateByField: "Edit rate by field", browserMix: "Browser mix", statusSummary: "Status summary",
  topBrands: "Top brands", refusalTrend: "Refusal trend", topReported: "Top reported symptoms", topSymptoms: "Top symptoms", symptomTrend: "Symptom entries over time", register: "Symptom register", iapVsOther: "IAP schedule vs other", heightDistribution: "Height distribution", weightDistribution: "Weight distribution", ofcCapture: "Head circumference capture", repeatMeasured: "Repeat measurement coverage",
  timeToResponse: "Time to response",
  // Consultations
  consultsTrend: "Consultations over time", newVsRepeat: "First vs repeat visits",
  diagnosisTrend: "Diagnoses over time", rxTrend: "Prescribing trend", medCustomMix: "Catalogue vs custom medicines", customByDoctor: "Custom medicines by doctor", customMedsRegister: "Custom medicines (register)",
  procedureTrend: "Procedures over time", labTrend: "Investigations over time",
  channelMix: "Clinic vs video (booked)", channelTrend: "Clinic vs video over time", newVsReturningTrend: "New vs returning over time", videoTrend: "Video adoption over time", followupTrend: "Follow-ups over time", adherenceMix: "Follow-up adherence",
  apptStatusMix: "Appointment status", caseMix: "Case-type mix", apptTrend: "Appointments over time", topDiagnoses: "Top diagnoses",
  typeMix: "Visit mix (booked vs walk-in)", bookingChannelMix: "Booking channels", bookingSourceTrend: "Booking sources over time", byDayOfWeek: "Visits by day of week", byHour: "Visits by hour of day", footfallTrend: "Footfall over time", newVsReturning: "New vs returning patients",
  newVsFollowupBooking: "New vs returning bookings", bookingByVisitType: "Booking channels (new vs returning)",
  bySpecialty: "Appointments by specialty", conversionTrend: "Appointment → prescription",
  repeatBookers: "Patients with most visits", frequentCancellers: "Frequent cancellers",
  doctorScorecard: "Doctor scorecard (coaching)",
  // Financial (composite financial/summary)
  collectionTrend: "Collection vs refund", revenueTrend: "Revenue over time",
  paymentModeMix: "Payment-mode mix", duesAging: "Receivables aging", refundByMode: "Refund by mode", discountByDoctor: "Discount by doctor",
  patientDues: "Patients with outstanding dues",
  topServices: "Top billed services (by count)", topServicesRevenue: "Top billed services (by revenue)",
  receiptsTrend: "Payments received over time", billsByBuilder: "Bills built by role",
  advanceModeMix: "Advance deposits by mode", advanceByDoctor: "Advance received by doctor",
  topBillEditors: "Bills edited, by user", cancelledByActor: "Cancelled / deleted bills, by user",
  negativeWallets: "Advance wallet alerts (refunded > deposited)", accountRegister3C: "Billing register by account",
  // Pathology
  streamMix: "Revenue by stream", pathTrend: "Pathology revenue over time",
  // Pharmacy (tbl_pha_* family — the standalone pharmacy module's own data)
  salesTrend: "Sales & returns over time",
  pharmaPayMix: "Payment-mode mix", pharmaTopItems: "Top medicines (by revenue)",
  pharmaMakerMix: "Manufacturer mix", pharmaGenericMix: "Top molecules (generic)",
  pharmaBuyerMix: "One-time vs repeat buyers", pharmaWeekday: "Sales by weekday",
  purchaseTrend: "Purchases over time", topSuppliers: "Top suppliers",
  stockSnapshot: "Stock snapshot (as of today)", expiryBuckets: "Stock by expiry window",
  batchRegister: "Batch register (first expiry first)", docVolume: "Documents over time (SI / SR / PI / PR)",
  counterRetail: "Counter retail (services)",
  // Compliance + Gynec
  linkageMix: "ABHA linkage", outcomeMix: "Obstetric outcomes",
  bloodGroupMix: "Blood group", maritalMix: "Marital status", linkageTrend: "ABHA enrolments over time", cycleMix: "Cycle: regular vs irregular", flowMix: "Flow mix", painMix: "Pain mix", stageMix: "Reproductive life stages", gynecRegister: "Gynec history register", procTopList: "Top procedures", procTrend: "Procedures over time", procByDoctor: "Procedures by doctor", procRegister: "Procedure register", moduleMostUsed: "Most used modules", moduleByCreator: "Modules created by doctor", moduleCreatedVsReused: "Created vs reused", moduleRegister: "Module register", certTypeMix: "Certificate types", certTrend: "Certificates over time", certByDoctor: "Certificates by doctor", certificates: "Certificate register", deliveryModeMix: "Delivery mode mix", gestationMix: "Gestation at delivery", eddPipeline: "Expected deliveries by month", ancStatusMix: "ANC schedule status", cityMix: "Top cities", severityMix: "Symptom severity",
  rfmMix: "Patient value segments (RFM)", mostValuable: "Most valuable patients", lapsedRecall: "Lapsed high-value (recall list)",
  visitFrequency: "Visit frequency",
  // IPD
  specialtyOccupancy: "Specialty occupancy (beds)", bedsByWard: "Beds by ward",
  surgeries: "IPD surgeries", lengthOfStayDist: "Length-of-stay distribution",
  dischargeMix: "Discharge mix", borTrend: "Bed Occupancy Rate (BOR) trend",
  alosTrend: "Avg Length of Stay (ALOS) trend", adcTrend: "Avg Daily Census (ADC) trend",
  alosBySpecialty: "ALOS by specialty", admissionsByDoctor: "Admissions by doctor",
  payerMix: "Payer mix (insurance vs self-pay)", mlcMix: "Medico-legal (MLC) mix",
  // IPD module (ipd/summary, ipd/admissions, ipd/wards, ipd/clinical)
  ipdFlowTrend: "Admissions vs discharges over time", censusTrend: "Inpatient census over time",
  wardOccupancy: "Ward occupancy (occupied vs available)", dischargeTypeMix: "Discharge types",
  admitTrend: "Admissions over time", byDepartment: "Admissions by department", byWard: "Admissions by ward",
  byAdmittingDoctor: "Admissions by doctor", categoryMix: "Admission categories",
  losDistribution: "Length of stay distribution",
  admissionRegister: "Admission register", dischargeRegister: "Discharge register",
  queueRegister: "Discharge queue", losRegister: "Length of stay register",
  occupancyTrend: "Bed occupancy over time", alosByWard: "Avg length of stay by ward",
  transfersRegister: "Transfers register", expectedDischarges: "Expected discharges (next 7 days)",
  projectedOccupancy: "Projected occupancy (next 7 days)",
  notesByType: "Clinical documentation by type", docFunnel: "Documentation funnel", notesByStayDay: "Notes by stay day", noteIntervalByDept: "Note interval by department", wardFlow: "Admissions & discharges by ward", deptFlow: "Admissions & discharges by department", alosByDept: "Avg length of stay by department", wardTransfers: "Transfers in & out by ward", topAdmitDx: "Top admission diagnoses",
  topDischargeDx: "Top discharge diagnoses", otByDoctor: "OT procedures by doctor",
  anaesthesiaMix: "Anaesthesia mix", summaryCompletion: "Discharge summary completion",
  otRegister: "OT register",
};
// One-line "what is this" copy shown in the info tooltip next to every chart /
// table heading (mirrors the KPI tooltips). Blocks without an entry simply show
// no icon. The live filter scope is appended automatically at render.
const BLOCK_INFO = {
  // Appointments & demand
  apptStatusMix: "Split of appointments by outcome: completed, cancelled or still scheduled.",
  footfallTrend: "The volume pulse of the practice: total visits per day / week / month across the period, so growth, dips and seasonality are visible at a glance.",
  caseMix: "Appointments grouped by consultation/case type.",
  typeMix: "How patients arrived, in three explicit parts: booked for an in-clinic visit, booked for video / tele, or walked in with no booking. The two booked segments sum to the Booked-appointments KPI, and all three sum to Total footfall.",
  apptTrend: "Total vs cancelled appointments over time.",
  topDiagnoses: "The most-recorded diagnoses in this period.",
  byDayOfWeek: "All visits in the selected period grouped by day of the week, so the Monday bar is every Monday in the period combined. A staffing pattern, not a single week. Every weekday shown, even at zero.",
  byHour: "All visits in the selected period grouped by hour of the day, so the 11 AM bar is every 11 AM visit in the period combined. A staffing pattern, not a single day. All 24 hours shown.",
  bySpecialty: "Appointment volume by department / specialty. Every specialty available in the clinic is listed, even with zero bookings.",
  conversionTrend: "Appointments vs those that produced a prescription, over time.",
  // Booking sources
  bookingChannelMix: "How each BOOKED appointment was booked: Doctor portal, KEA portal, Appointment agent (website / symptom-collector / patient-app bookings arrive through it), or the legacy portal (migrated). Walk-ins are excluded: they have no booking. Every channel is listed, even at zero.",
  newVsFollowupBooking: "Bookings split by the patient's booking history: a booking is NEW if it is that patient's first-ever booking on record (all time, not just this period); every later booking counts as a returning patient. Booked appointments only.",
  bookingByVisitType: "One chart for the whole booking story: each channel's bar splits into new-patient bookings (first-ever booking on record) vs returning-patient bookings, so you can see which channels actually bring NEW patients. Booked appointments only.",
  bookingSourceTrend: "All four booking channels over time (Doctor portal, KEA portal, Appointment agent, Legacy), every period 0-filled so a quiet channel shows flat instead of disappearing. A 'Not tracked' line appears only when some bookings have no recorded source. Booked appointments only.",
  // Patients & retention
  newVsReturning: "New vs returning patients.",
  visitFrequency: "How many times patients have visited over their lifetime (1, 2, 3, 4-5, …).",
  newVsReturningTrend: "Retention over time: each period splits the patients seen into NEW (their first-ever visit falls in that period) vs RETURNING (they had visited before and came back), so you can watch the repeat base grow.",
  newVsRepeat: "Unique patients vs repeat consults.",
  repeatBookers: "Patients with the most visits.",
  frequentCancellers: "Patients who cancel most often.",
  rfmMix: "Every patient ever seen, segmented by how recently and how often they visit (anchored to the clinic's most recent visit date, so old data still segments sensibly): Champions = visited within 90 days and 3+ lifetime visits; Loyal = within 180 days and 2+ visits; Recent = within 180 days, first visit; At risk = last seen 6 to 12 months ago; Lapsed = not seen in over a year. The rupee value shown per segment is those patients' lifetime billing.",
  mostValuable: "Highest-value patients by lifetime spend.",
  lapsedRecall: "High-value patients who haven't returned recently.",
  genderMix: "Patients by gender: all three groups always shown, zero when empty.",
  ageMix: "Patients by age band: every band always shown, zero when empty.",
  bloodGroupMix: "Patients by blood group. All 8 groups are always listed (zero when empty); patients with no blood group on file appear under 'Not recorded'.",
  deliveryModeMix: "Recorded deliveries by mode (legacy obstetric records).",
  gestationMix: "Pregnancies by gestation at delivery: preterm, term, post-term (legacy records; weeks parsed from free text).",
  eddPipeline: "Expected delivery dates by month from the legacy pregnancy records. The newest records here end in 2024, so this reads as a historical pipeline until the gynec-service feed lands.",
  ancStatusMix: "Antenatal-care schedule items by status (legacy scheduler).",
  maritalMix: "Patients seen this period by marital status. All five statuses are always listed (zero when empty). This field is rarely filled at registration, so a large 'Not recorded' slice is a data-quality prompt for the front desk, not a clinical finding.",
  cityMix: "Where patients come from: every city with at least one patient, plus an 'Unknown' bucket for patients with no city on file.",
  // Money & collections
  collectionTrend: "Money collected vs refunded over time.",
  revenueTrend: "Gross billed value over time.",
  paymentModeMix: "How patients pay (cash, card, UPI…).",
  duesAging: "Outstanding dues bucketed by how overdue they are.",
  patientDues: "Patients with outstanding balances.",
  streamMix: "Revenue split across OPD, pathology and pharmacy.",
  refundByMode: "Refunds split by the payment method they were returned through.",
  discountByDoctor: "Total discount given per doctor: per-line discounts converted to rupees plus the bill-level extra discount.",
  topServices: "The services billed most often this period (real bills only).",
  topServicesRevenue: "The services earning the most revenue this period (line totals, net of line discounts).",
  receiptsTrend: "Money received per period from payment receipts: the observable view of dues being cleared. Wallet-debit settlements happen in the billing service and are not included.",
  billsByBuilder: "Who creates the bills: doctors vs front-office staff (by the creating login's role). All roles shown, zero when empty.",
  advanceModeMix: "Advance deposits split by the payment mode they came in through.",
  advanceByDoctor: "Advance deposits collected, attributed to the doctor on the deposit.",
  topBillEditors: "Users who modified bills after issue: financial documents edited post-creation deserve periodic review.",
  cancelledByActor: "Cancelled and deleted billing documents by the user who did it: revenue-leakage review.",
  negativeWallets: "Patients whose advance refunds exceed their deposits: data-integrity flags for the front desk to reconcile.",
  accountRegister3C: "Bills grouped by billing account: the dimension the Form-3C report partitions by. The Form-3C added/not-added flag itself lives in the billing service, not in this data.",
  pathTrend: "Pathology revenue over time.",
  salesTrend: "Pharmacy sale value vs returned value per period: refund spikes stand out against the sales line.",
  pharmaPayMix: "Pharmacy collections by payment mode. Every mode is listed, zero when unused.",
  pharmaTopItems: "The medicines earning the most at the counter: restocking and negotiation priorities.",
  pharmaMakerMix: "Pharmacy revenue by manufacturer: which companies your counter actually sells.",
  pharmaGenericMix: "Pharmacy revenue by generic molecule: demand by active ingredient, independent of brand.",
  pharmaBuyerMix: "Registered patients who bought once vs came back. Walk-in counter sales without a patient record can't be counted, so this understates buyers.",
  pharmaWeekday: "Pharmacy sales by day of the week: staffing and stocking rhythm. All 7 days shown.",
  purchaseTrend: "Procurement spend per period (purchase invoices).",
  topSuppliers: "Suppliers ranked by purchase value: negotiation leverage at a glance.",
  stockSnapshot: "Current stock position: valued at MRP (complete) and at purchase cost (where recorded). As of today; the date filter does not apply to stock.",
  expiryBuckets: "Stock bucketed by time to expiry: expired / 30 / 60 / 90 days / beyond. All buckets always shown; an empty bucket is a good sign.",
  batchRegister: "Every in-stock batch in first-expiry-first-out order: the batches to dispense or return first.",
  docVolume: "Pharmacy document activity per period: sale invoices, sale returns, purchase invoices, purchase returns.",
  counterRetail: "Service items billed at the retail counter (checkups, X-ray, bed charges): not medicines.",
  // Follow-ups & consultations
  adherenceMix: "Due follow-ups that were kept vs missed.",
  followupTrend: "Follow-ups advised vs kept over time.",
  consultsTrend: "Consultations and unique patients over time.",
  channelMix: "In-clinic vs video consultations.",
  channelTrend: "Adoption of video consultations: booked appointments per period split into clinic visits vs video / teleconsults, so you can see whether video is growing as a share of bookings.",
  videoTrend: "Video / tele consults over time.",
  // Clinical
  diagnosisTrend: "Diagnosis entries and distinct patients per period, zero-filled so quiet days still show.",
  statusMix: "Split of diagnosis entries by clinical status (Suspected, Confirmed, Ruled out, Unspecified). Computed only from entries dated Jan 2024 onward: a 2023 legacy bulk import marks every row Primary, which carries no clinical status; legacy and blank statuses appear as Unspecified.",
  rxTrend: "Medicine lines written and distinct patients prescribed to, per period.",
  medCustomMix: "Prescription lines that came from the system medicine catalogue versus medicines the doctor added themselves (custom). Custom includes free-typed medicines with no catalogue match.",
  customByDoctor: "Which doctors prescribe the most custom (non-catalogue) medicines. A high count can flag drugs the catalogue is missing.",
  customMedsRegister: "Every custom (doctor-added) medicine prescribed in this period, with how many lines and patients. Filter by doctor with the top filter and download. ",
  linkageTrend: "New ABHA enrolments recorded per period for this clinic (the dated ABHA signal that exists in this database).",
  cycleMix: "Patients by recorded cycle regularity. Irregular cycles are the screening signal for PCOD and thyroid workups.",
  flowMix: "Patients by recorded menstrual flow.",
  painMix: "Patients by recorded menstrual pain severity.",
  stageMix: "Patients by recorded reproductive life stage.",
  gynecRegister: "Per-patient menstrual history summary.",
  procTopList: "The most performed procedures this period.",
  procTrend: "Procedures performed per period.",
  procByDoctor: "Procedures performed per doctor.",
  procRegister: "Per-procedure log with patient, doctor and notes.",
  moduleMostUsed: "Which custom modules get used the most across all doctors.",
  moduleByCreator: "How many custom modules each doctor has built.",
  moduleCreatedVsReused: "Uses by the module creator vs reuse by other doctors: the sharing signal.",
  moduleRegister: "Every custom module with its creator, columns, usage and cross-doctor reuse.",
  certTypeMix: "Issued certificates by type. Certificate type comes from the linked template where available, else the saved title; blank titles show as Untitled.",
  certTrend: "Certificates issued per period.",
  certByDoctor: "Certificates issued per doctor. This is the issuing doctor, not the template author.",
  certificates: "Every certificate issued in this period: type, issuing doctor, patient, and whether it used a system or a custom template.",
  topGenerics: "The 10 most prescribed generic names (case and spacing variants merged); catalogue test entries excluded.",
  topManufacturers: "The 10 manufacturers with the most prescription lines; catalogue test entries excluded.",
  polypharmacy: "How many prescriptions carry 1, 2, 3, 4 or 5+ medicines; a tall 5+ bar signals heavy polypharmacy.",
  drugsRegister: "Top 100 catalogue products by prescription lines, with generic, manufacturer, patient reach and last prescribed date.",
  genericsRegister: "Top 100 generic names by prescription lines, with how many brands each is dispensed under.",
  topSymptoms: "The 15 most-mentioned symptoms on prescriptions this period, counted by mentions. Names are as typed by the doctor (case and spacing normalized), so spelling variants count separately.",
  symptomTrend: "Structured symptom entries parsed from prescriptions per period, with the distinct patients they belong to. Empty periods show as zero.",
  register: "The most recent structured symptom entries: patient, date, symptom, severity, duration as typed, and the doctor's note. Capped at 200 rows.",
  vitalsCaptured: "Entries recorded per vital sign across all 12 capturable fields; a field counts when it is filled in, and never-captured vitals stay visible at zero.",
  bpMix: "Parseable systolic/diastolic readings staged Normal to Crisis (the higher stage wins); unparseable and not-recorded counts are noted on the chart.",
  bmiMix: "Measurements banded Underweight / Normal / Overweight / Obese after defensive parsing with sanity bounds 10 to 60; discards are noted.",
  bmiCoverage: "Of patients with any vitals record this period, how many have at least one usable BMI measurement.",
  rbsMix: "Random blood sugar readings banded under 140, 140 to 199, and 200+ mg/dl; capture is low and the chart says exactly how low.",
  monitoredShare: "Patients with 2 or more vitals entries (a trackable trend) versus a single one-off capture.",
  conditionDist: "Most common confirmed conditions, counted by distinct patients on their latest history record (top 10).",
  allergyDist: "Most common confirmed allergies, by distinct patients on their latest history record (top 10).",
  familyDist: "Most common confirmed family history items, by distinct patients on their latest history record (top 10).",
  lifestyleDist: "Most common confirmed lifestyle factors (habits), by distinct patients on their latest history record (top 10).",
  surgicalDist: "Most common confirmed past surgeries, by distinct patients on their latest history record (top 10).",
  additionalHistory: "Patients whose latest history record carries free-text additional history, versus those without.",
  captureTrend: "History entries saved in the selected period (the only block the date range applies to): entries and distinct patients per period.",
  historyRegister: "All confirmed history items across the five sections in one ranked table: section, item, distinct patients, last recorded date (top 150).",
  heightDistribution: "Recorded heights of children under 18 grouped into fixed centimetre bands; implausible and missing values are shown as their own buckets.",
  weightDistribution: "Recorded weights of children under 18 grouped into fixed kilogram bands; implausible and missing values are shown as their own buckets.",
  ofcCapture: "Share of growth measurements that also recorded OFC (head circumference) versus those that did not.",
  repeatMeasured: "Children measured two or more times in this period versus children measured only once (growth needs serial measurements).",
  iapVsOther: "Doses recorded against the system-provided IAP vaccination schedule versus a clinic-customised or unmapped template.",
  labTrend: "Investigations ordered over time.",
  genericMix: "Generic vs branded prescribing.",
  manufacturerMix: "Prescriptions by manufacturer.",
  genericVsBranded: "Data capture completeness: prescription lines where a generic name was recorded vs not (not a clinical generic vs branded split).",
  topConditions: "Most common diagnoses by distinct patients, with case and spacing variants of the same name counted together.",
  allergyMix: "Most-recorded patient allergies.",
  familyHistory: "Conditions recorded in patients' family history.",
  topSurgeries: "Most-recorded past surgeries.",
  conditionMix: "Distribution of recorded conditions.",
  bpDistribution: "Blood-pressure readings by band.",
  bmiDistribution: "BMI readings by band.",
  spo2Distribution: "SpO₂ readings by band.",
  // Doctor performance
  byDoctor: "Breakdown by doctor.",
  doctorScorecard: "Per-doctor volume, completion and cancellation vs the peer median.",
  // Compliance
  linkageMix: "ABHA / ABDM linkage status.",
  outcomeMix: "Verification outcomes.",
  // IPD module
  ipdFlowTrend: "Patients admitted vs discharged per period: the in and out flow of the unit, zero-filled so quiet periods stay visible.",
  censusTrend: "How many patients were in beds per period: the unit's occupancy pulse.",
  wardOccupancy: "Each ward's beds split into occupied vs available right now.",
  dischargeTypeMix: "Discharges split by type: routine, LAMA, transfer, death and so on.",
  admitTrend: "New admissions per period, zero-filled so quiet periods stay visible.",
  byDepartment: "Admissions grouped by the admitting department.",
  byWard: "Admissions grouped by the ward the patient was placed in.",
  byAdmittingDoctor: "Admissions attributed to the admitting doctor.",
  categoryMix: "Admissions split by category: general, MLC, insurance and so on.",
  losDistribution: "Completed stays bucketed by length: 0-1, 2-3, 4-7, 8-14 and 15+ days, every bucket always shown.",
  admissionRegister: "Every admission in the period: patient, demographics, department, ward, room, admitting doctor, status, discharge type and length of stay.",
  dischargeRegister: "Discharged patients only: when, from which ward, by which doctor, discharge type and the final length of stay.",
  queueRegister: "Patients marked for discharge but still in a bed: the longer the wait, the more it blocks the bed.",
  losRegister: "Per-patient stay log: admitted, discharged, ward, doctor and days stayed.",
  occupancyTrend: "Beds occupied per period: watch load build or ease over time.",
  alosByWard: "Average length of stay per ward: a long-stay ward is a throughput flag.",
  transfersRegister: "Every room / ward / department shift: patient, from, to, and who moved them.",
  expectedDischarges: "Next 7 days forecast: discharge-queue patients plus in-bed patients past the unit's median stay.",
  projectedOccupancy: "Beds expected to remain occupied over the next 7 days if forecast discharges happen and no new admissions arrive.",
  notesByType: "Clinical documentation volume by record type: assessments, progress notes, consultant notes, vitals, medications, investigations, lab and radiology.",
  docFunnel: "Of all admissions in the period, how many carry each documentation artifact: assessment, progress notes, consultant notes, discharge summary. Gaps show where documentation breaks down.",
  notesByStayDay: "Progress plus consultant notes recorded on each day of the stay. A fading tail means later stay days get documented less.",
  noteIntervalByDept: "Average hours between consecutive nurse progress notes and doctor consultant notes, per department. Long gaps are the documentation risk an average per-day count hides.",
  wardFlow: "Patients admitted into and discharged from each ward in the period: the ward-level throughput view.",
  deptFlow: "Admissions and completed discharges per department (specialty).",
  alosByDept: "Average length of stay per department for stays completed in the period.",
  wardTransfers: "Ward transfer load: patients moved INTO and OUT OF each ward in the period.",
  topAdmitDx: "Most common provisional diagnoses recorded at admission.",
  topDischargeDx: "Most common final diagnoses recorded at discharge.",
  otByDoctor: "Operation theatre procedures attributed to the operating doctor.",
  anaesthesiaMix: "OT procedures split by anaesthesia type.",
  summaryCompletion: "Discharged patients with vs without a completed discharge summary: a documentation compliance check.",
  otRegister: "Every OT procedure: date, patient, procedure, operating doctor, anaesthetist, anaesthesia, duration and status.",
};
const BLOCK_CHART_TYPE = {
  genderMix: "donut", ageMix: "bar", genericMix: "donut", manufacturerMix: "donut",
  genericVsBranded: "donut", conditionMix: "donut", fieldCapture: "donut", browserMix: "donut", statusMix: "donut", medCustomMix: "donut", cycleMix: "donut", flowMix: "donut", painMix: "donut", stageMix: "donut", procTopList: "bar", procTrend: "line", procByDoctor: "bar", moduleMostUsed: "bar", moduleByCreator: "bar", moduleCreatedVsReused: "donut", customByDoctor: "bar", linkageTrend: "line", certTypeMix: "donut", certTrend: "line", certByDoctor: "bar", topGenerics: "bar", topManufacturers: "bar", polypharmacy: "bar", topSymptoms: "bar", symptomTrend: "line", vitalsCaptured: "bar", bpMix: "bar", bmiMix: "bar", bmiCoverage: "donut", rbsMix: "bar", monitoredShare: "donut", conditionDist: "bar", allergyDist: "bar", familyDist: "bar", lifestyleDist: "bar", surgicalDist: "bar", additionalHistory: "donut", captureTrend: "line", heightDistribution: "bar", weightDistribution: "bar", ofcCapture: "donut", repeatMeasured: "donut", iapVsOther: "donut",
  adoptionTrend: "line", refusalTrend: "line",
  consultsTrend: "line", newVsRepeat: "donut", diagnosisTrend: "line", rxTrend: "line", procedureTrend: "line", labTrend: "line",
  channelMix: "donut", channelTrend: "line", newVsReturningTrend: "line", newVsReturning: "donut", videoTrend: "line", followupTrend: "line", adherenceMix: "donut", conversionTrend: "line",
  apptStatusMix: "donut", caseMix: "bar", apptTrend: "line", topDiagnoses: "bar",
  typeMix: "donut", bookingChannelMix: "bar", newVsFollowupBooking: "donut", bookingByVisitType: "stackedBar", bookingSourceTrend: "line", byDayOfWeek: "bar", byHour: "bar", footfallTrend: "line", visitFrequency: "bar",
  collectionTrend: "line", revenueTrend: "bar", paymentModeMix: "donut", duesAging: "bar", refundByMode: "donut", discountByDoctor: "bar",
  topServices: "bar", topServicesRevenue: "bar", receiptsTrend: "line", billsByBuilder: "donut", advanceModeMix: "donut", advanceByDoctor: "bar",
  streamMix: "donut", pathTrend: "line", salesTrend: "line",
  pharmaPayMix: "donut", pharmaTopItems: "bar", pharmaMakerMix: "donut", pharmaGenericMix: "bar",
  pharmaBuyerMix: "donut", pharmaWeekday: "bar", purchaseTrend: "line", expiryBuckets: "bar", docVolume: "line",
  bpDistribution: "donut", bmiDistribution: "donut", spo2Distribution: "donut",
  // Compliance
  linkageMix: "donut", outcomeMix: "donut", bloodGroupMix: "donut", maritalMix: "donut", deliveryModeMix: "donut", gestationMix: "bar", eddPipeline: "line", ancStatusMix: "donut", cityMix: "bar", severityMix: "donut", rfmMix: "donut",
  // IPD
  bedsByWard: "stackedBar", dischargeMix: "donut", borTrend: "line", alosTrend: "line", adcTrend: "line",
  payerMix: "donut", mlcMix: "donut", admissionsByDoctor: "bar", alosBySpecialty: "bar",
  // IPD module (ipd/* dashboard blocks)
  ipdFlowTrend: "line", censusTrend: "line", wardOccupancy: "stackedBar", dischargeTypeMix: "donut",
  admitTrend: "line", byDepartment: "bar", byWard: "bar", byAdmittingDoctor: "bar", categoryMix: "donut",
  losDistribution: "bar", occupancyTrend: "line", alosByWard: "bar",
  expectedDischarges: "bar", projectedOccupancy: "line",
  notesByType: "bar", docFunnel: "bar", notesByStayDay: "bar", noteIntervalByDept: "bar", wardFlow: "bar", deptFlow: "bar", alosByDept: "bar", wardTransfers: "bar", topAdmitDx: "bar", topDischargeDx: "bar", otByDoctor: "bar",
  anaesthesiaMix: "donut", summaryCompletion: "donut",
};
const BLOCK_ORDER = [
  "summary",
  // Financial composite (Money page reads top-to-bottom)
  "collectionTrend", "revenueTrend", "receiptsTrend", "paymentModeMix", "byDoctor", "duesAging", "refundByMode", "discountByDoctor",
  "topServices", "topServicesRevenue", "billsByBuilder", "advanceModeMix", "advanceByDoctor",
  "accountRegister3C", "topBillEditors", "cancelledByActor", "negativeWallets", "patientDues",
  // Pathology + Pharmacy + Compliance
  "streamMix", "pathTrend", "salesTrend",
  "pharmaPayMix", "pharmaTopItems", "pharmaMakerMix", "pharmaGenericMix", "pharmaBuyerMix", "pharmaWeekday",
  "purchaseTrend", "topSuppliers", "expiryBuckets", "stockSnapshot", "batchRegister", "docVolume", "counterRetail",
  "linkageMix", "outcomeMix", "deliveryModeMix", "gestationMix", "eddPipeline", "ancStatusMix", "bloodGroupMix", "maritalMix", "cityMix", "severityMix",
  // Consultations
  "consultsTrend", "newVsRepeat", "diagnosisTrend", "rxTrend", "procedureTrend", "labTrend",
  "channelMix", "channelTrend", "newVsReturningTrend", "videoTrend", "adherenceMix", "followupTrend", "apptStatusMix", "caseMix", "apptTrend", "topDiagnoses",
  "typeMix", "bookingChannelMix", "newVsFollowupBooking", "bookingByVisitType", "bookingSourceTrend", "byDayOfWeek", "byHour", "bySpecialty", "footfallTrend", "conversionTrend", "newVsReturning", "visitFrequency", "repeatBookers", "frequentCancellers", "doctorScorecard",
  // IPD-first ordering so the IPD dashboard reads well
  "specialtyOccupancy", "bedsByWard", "surgeries", "lengthOfStayDist", "dischargeMix",
  "borTrend", "alosTrend", "adcTrend",
  "alosBySpecialty", "admissionsByDoctor", "payerMix", "mlcMix",
  "rfmMix", "mostValuable", "lapsedRecall",
  "genderMix", "ageMix", "genericMix", "manufacturerMix", "genericVsBranded",
  "bpDistribution", "bmiDistribution", "spo2Distribution", "topConditions", "conditionMix",
  "allergyMix", "familyHistory", "comorbidityLoad", "topSurgeries", "adoptionTrend", "durationDist",
  "fieldCapture", "editRateByField", "browserMix", "statusSummary", "topBrands", "refusalTrend",
  "topReported", "timeToResponse",
  // Clinical overhaul (symptoms / diagnosis / medications / vitals / medical
  // history / growth / vaccination) — blocks only render if listed here.
  "topSymptoms", "symptomTrend", "register",
  "statusMix",
  "topGenerics", "topManufacturers", "polypharmacy", "drugsRegister", "genericsRegister",
  "vitalsCaptured", "bpMix", "bmiMix", "bmiCoverage", "rbsMix", "monitoredShare",
  "conditionDist", "allergyDist", "familyDist", "lifestyleDist", "surgicalDist", "additionalHistory", "captureTrend", "historyRegister",
  "heightDistribution", "weightDistribution", "ofcCapture", "repeatMeasured",
  "iapVsOther",
  // ABHA + medications custom + certificates (this pass)
  "linkageTrend",
  // Sample-data modules (gynec / procedures / custom modules)
  "cycleMix", "flowMix", "painMix", "stageMix", "gynecRegister",
  "procTopList", "procTrend", "procByDoctor", "procRegister",
  "moduleMostUsed", "moduleByCreator", "moduleCreatedVsReused", "moduleRegister",
  "medCustomMix", "customByDoctor", "customMedsRegister",
  "certTypeMix", "certTrend", "certByDoctor", "certificates",
  // IPD module (ipd/summary, ipd/admissions, ipd/wards, ipd/clinical).
  // bedsByWard is already listed in the IPD-first ordering above.
  "ipdFlowTrend", "censusTrend", "wardOccupancy", "dischargeTypeMix",
  "admitTrend", "byDepartment", "byWard", "byAdmittingDoctor", "categoryMix", "losDistribution",
  "occupancyTrend", "alosByWard", "expectedDischarges", "projectedOccupancy",
  "notesByType", "docFunnel", "notesByStayDay", "noteIntervalByDept", "wardFlow", "deptFlow", "alosByDept", "wardTransfers", "topAdmitDx", "topDischargeDx", "otByDoctor", "anaesthesiaMix", "summaryCompletion",
  "admissionRegister", "dischargeRegister", "queueRegister", "losRegister",
  "transfersRegister", "otRegister",
];

// Block keys that render as a TABLE (not a chart) when present in a dashboard-block.
const TABLE_BLOCKS = new Set([
  "register", "drugsRegister", "genericsRegister", "historyRegister", "customMedsRegister", "certificates", "gynecRegister", "procRegister", "moduleRegister",
  "repeatBookers", "frequentCancellers", "patientDues", "mostValuable", "lapsedRecall", "doctorScorecard",
  "topBillEditors", "cancelledByActor", "negativeWallets", "accountRegister3C",
  "topSuppliers", "stockSnapshot", "batchRegister", "counterRetail",
  "admissionRegister", "dischargeRegister", "queueRegister", "losRegister",
  "transfersRegister", "otRegister",
]);

// Segment the canvas into labelled bands instead of one long card list. Each
// block maps to a section; the workspace renders a SectionHeader before each
// group, in this order. Unmapped blocks fall into "More insights".
// Charts/KPIs first (in these labelled bands), then ALL data tables collected
// into a single "Patient data" zone at the very bottom — never mixed.
export const SECTION_ORDER = [
  "Key metrics", "Patient flow", "Wards & beds", "Appointments & demand", "Booking sources", "Patients & retention",
  "Money & collections", "Purchases & suppliers", "Stock & expiry",
  "Follow-ups", "Consultations", "Clinical",
  "ABHA & compliance", "More insights", "Doctor performance", "Patient data",
];
const BLOCK_GROUP = {
  apptStatusMix: "Appointments & demand", caseMix: "Appointments & demand", typeMix: "Appointments & demand",
  apptTrend: "Appointments & demand", footfallTrend: "Appointments & demand", topDiagnoses: "Clinical",
  byDayOfWeek: "Appointments & demand", byHour: "Appointments & demand",
  bySpecialty: "Appointments & demand", conversionTrend: "Consultations",
  bookingChannelMix: "Booking sources", newVsFollowupBooking: "Booking sources", bookingByVisitType: "Booking sources", bookingSourceTrend: "Booking sources",
  newVsReturning: "Patients & retention", newVsReturningTrend: "Patients & retention", newVsRepeat: "Patients & retention", visitFrequency: "Patients & retention",
  repeatBookers: "Patients & retention", frequentCancellers: "Patients & retention",
  doctorScorecard: "Doctor performance",
  rfmMix: "Patients & retention", mostValuable: "Patients & retention", lapsedRecall: "Patients & retention",
  genderMix: "Patients & retention", ageMix: "Patients & retention", bloodGroupMix: "Patients & retention", maritalMix: "Patients & retention",
  cityMix: "Patients & retention", severityMix: "Patients & retention",
  collectionTrend: "Money & collections", revenueTrend: "Money & collections",
  paymentModeMix: "Money & collections", byDoctor: "Doctor performance",
  duesAging: "Money & collections", patientDues: "Money & collections", refundByMode: "Money & collections", discountByDoctor: "Money & collections",
  streamMix: "Money & collections", pathTrend: "Money & collections", salesTrend: "Money & collections",
  pharmaPayMix: "Money & collections", pharmaTopItems: "Money & collections", pharmaMakerMix: "Money & collections",
  pharmaGenericMix: "Money & collections", pharmaBuyerMix: "Patients & retention", pharmaWeekday: "Money & collections",
  purchaseTrend: "Purchases & suppliers", topSuppliers: "Purchases & suppliers", docVolume: "Purchases & suppliers",
  stockSnapshot: "Stock & expiry", expiryBuckets: "Stock & expiry", batchRegister: "Stock & expiry",
  counterRetail: "More insights",
  topServices: "Money & collections", topServicesRevenue: "Money & collections", receiptsTrend: "Money & collections",
  billsByBuilder: "Money & collections", advanceModeMix: "Money & collections", advanceByDoctor: "Money & collections",
  topBillEditors: "Money & collections", cancelledByActor: "Money & collections", negativeWallets: "Money & collections",
  accountRegister3C: "Money & collections",
  adherenceMix: "Follow-ups", followupTrend: "Follow-ups",
  consultsTrend: "Consultations", channelMix: "Consultations", channelTrend: "Consultations", videoTrend: "Consultations",
  diagnosisTrend: "Clinical", rxTrend: "Clinical", procedureTrend: "Clinical", labTrend: "Clinical",
  genericMix: "Clinical", manufacturerMix: "Clinical", genericVsBranded: "Clinical",
  topConditions: "Clinical", conditionMix: "Clinical", allergyMix: "Clinical", comorbidityLoad: "Clinical",
  familyHistory: "Clinical",
  topSurgeries: "Clinical", bpDistribution: "Clinical", bmiDistribution: "Clinical", spo2Distribution: "Clinical",
  statusSummary: "Clinical", topBrands: "Clinical", refusalTrend: "Clinical", topReported: "Clinical",
  timeToResponse: "Clinical", durationDist: "Clinical", fieldCapture: "Clinical", editRateByField: "Clinical",
  browserMix: "Clinical", adoptionTrend: "Clinical",
  linkageMix: "ABHA & compliance", outcomeMix: "ABHA & compliance",
  // IPD module
  ipdFlowTrend: "Patient flow", censusTrend: "Patient flow", admitTrend: "Patient flow",
  dischargeTypeMix: "Patient flow", categoryMix: "Patient flow", losDistribution: "Patient flow",
  byDepartment: "Patient flow", byWard: "Patient flow", expectedDischarges: "Patient flow",
  wardOccupancy: "Wards & beds", bedsByWard: "Wards & beds", occupancyTrend: "Wards & beds",
  alosByWard: "Wards & beds", projectedOccupancy: "Wards & beds",
  notesByType: "Clinical", docFunnel: "Clinical", notesByStayDay: "Clinical", noteIntervalByDept: "Clinical", wardFlow: "Wards & beds", deptFlow: "Patient flow", alosByDept: "Patient flow", wardTransfers: "Wards & beds", topAdmitDx: "Clinical", topDischargeDx: "Clinical",
  anaesthesiaMix: "Clinical", summaryCompletion: "Clinical",
  byAdmittingDoctor: "Doctor performance", otByDoctor: "Doctor performance",
};
const groupFor = (key) => BLOCK_GROUP[key] || "More insights";
// A line/bar toggle is only offered where BOTH readings are meaningful:
//  - time-series trends (line by default → bars show per-bucket magnitude), and
//  - ordered / sequence categoricals (hour-of-day, weekday, aging buckets, age
//    bands, booking channels) where a line traces the shape across the order.
// Ranking bars (by-doctor, top cities, case mix) and part-to-whole donuts get
// NO toggle — a line across unordered ranks or a bar of a pie is noise.
const SEQUENCE_BLOCKS = new Set(["byHour", "byDayOfWeek", "duesAging", "ageMix", "visitFrequency", "pharmaWeekday", "expiryBuckets", "gestationMix", "polypharmacy", "bmiMix", "bpMix", "rbsMix", "heightDistribution", "weightDistribution", "linkageTrend", "certTrend", "ipdFlowTrend", "censusTrend", "admitTrend", "occupancyTrend", "losDistribution", "expectedDischarges", "projectedOccupancy"]);
const isToggleable = (key, chartType) => {
  if (chartType === "donut" || chartType === "pie") return false; // never toggle a part-to-whole
  return chartType === "line" || chartType === "area" || SEQUENCE_BLOCKS.has(key);
};
// Stable per-KPI id so individual metric cards can be shown/hidden/reordered.
const kpiSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

function blocksToWidgets(res) {
  if (!res || typeof res !== "object") return [emptyWidget("api-empty", "Analytics", "No data returned.")];

  // Lone result-set { columns, rows } (the financial/* + operational/* endpoints,
  // which return the universal envelope rather than a dashboard-block). Render as
  // a chart + a downloadable table so any result-set endpoint surfaces in the
  // leaf shell. Time-like x → line; single series → donut; else bar.
  if (res.columns && res.rows && !res.hero && !res.kpis && !res.summary && !res.patients) {
    if (!res.rows.length) return [emptyWidget("api-empty", "Analytics", "No data for this period.")];
    const xKey = res.columns[0]?.key;
    const yKeys = res.columns.slice(1).map((c) => c.key).filter(Boolean);
    const isTime = /date|month|day|period|week/i.test(xKey || "");
    const data = { columns: res.columns, rows: res.rows };
    const table = { id: "api-rs-table", kind: "table", title: "Details", columns: res.columns, rows: res.rows, span: "full", group: "Patient data" };
    // Only chart when meaningful: a time series, or a single category→value pair.
    // Wide detail tables (e.g. the 3C service-level report) render table-only.
    const chartable = isTime || res.columns.length === 2;
    if (!chartable) return [table];
    return [
      { id: "api-rs-chart", kind: "chart", title: "Overview", chartType: isTime ? "line" : "donut", data, viz: { x: xKey, y: yKeys }, patientData: data, group: "Key metrics", toggleable: isTime },
      table,
    ];
  }

  const widgets = [];
  // Surface builder-level honesty notes (sample data, legacy gating, feed gaps)
  // as a visible banner at the top of the page instead of an invisible field.
  if (res.meta && res.meta.note) widgets.push({ id: "api-note", kind: "banner", text: res.meta.note, sample: res.meta.live === false });
  const patientData = res.patients?.rows?.length
    ? { columns: res.patients.columns, rows: res.patients.rows }
    : undefined;

  // Map contract KPIs ({ label, value, unit }) → KpiCard props ({ title, value,
  // prefix/suffix }). ₹ becomes a prefix; %, days etc. become a suffix.
  // "vs previous 30 days" etc. — supplied by the builder based on the active
  // filter window. Falls back to a generic label when absent.
  const deltaLabel = res.meta?.compareLabel
    ? `vs ${res.meta.compareLabel}`
    : "vs previous period";

  const toKpi = (k, accent) => {
    const unit = k.unit;
    const isMoney = unit === "₹" || unit === "INR";
    return {
      // Stable identity: the backend `key` survives title renames, so per-card
      // customization (hide) never scrambles with wording changes.
      key: k.key,
      title: k.title || k.label,
      value: k.value,
      // An approximate marker composes with the currency: "~₹ 1.2L".
      prefix: isMoney ? `${k.prefix || ""}₹ ` : k.prefix,
      suffix: !isMoney && unit ? (unit === "%" ? "%" : ` ${unit}`) : k.suffix,
      description: k.description || k.sub,
      delta: typeof k.delta === "number" ? k.delta : undefined,
      deltaLabel,
      spark: Array.isArray(k.spark) ? k.spark : undefined,
      accent,
    };
  };
  const kpis = [];
  if (res.hero) kpis.push({ title: res.hero.label, value: res.hero.value, accent: "#4b4ad5" });
  const palette = ["#a461d8", "#36c5a8", "#f5a623", "#2bb3e0", "#ef5da8", "#7a8cff"];
  (res.kpis || []).forEach((k, i) => kpis.push(toKpi(k, k.accent || palette[i % palette.length])));
  if (kpis.length) {
    const seen = {};
    kpis.forEach((k, i) => {
      // Prefer the backend's stable key; fall back to a title slug for KPI
      // bands assembled on the frontend (e.g. the billing-API headline cards).
      let id = "kpi:" + (k.key || kpiSlug(k.title) || "m" + i);
      if (seen[id]) id = `${id}-${i}`;
      seen[id] = 1;
      k.id = id;
    });
    kpis[0].hero = true; // headline metric gets the gradient hero treatment
    widgets.push({ id: "api-kpis", kind: "kpis", kpis, span: "full", group: "Key metrics" });
  }

  BLOCK_ORDER.forEach((key) => {
    const b = res[key];
    if (!b || !b.columns || !b.rows) return;
    if (key === "summary" || TABLE_BLOCKS.has(key)) {
      // Detail blocks (top diagnoses, repeat bookers, frequent cancellers, …) render
      // as searchable/sortable tables, not charts.
      if (!b.rows.length) return;
      widgets.push({ id: "api-" + key, kind: "table", title: BLOCK_TITLES[key] || key, columns: b.columns, rows: b.rows, span: "full", group: groupFor(key), note: b.note || null, info: BLOCK_INFO[key] });
    } else {
      const xKey = b.columns[0]?.key;
      const yKeys = b.columns.slice(1).map((c) => c.key);
      const chartType = BLOCK_CHART_TYPE[key] || "bar";
      widgets.push({
        id: "api-" + key, kind: "chart", title: BLOCK_TITLES[key] || key,
        chartType,
        data: b, viz: { x: xKey, y: yKeys }, patientData,
        group: groupFor(key), toggleable: isToggleable(key, chartType),
        info: BLOCK_INFO[key], note: b.note || null,
        // Ordered/time sequences (days, hours, lead-time, age bands) draw as a
        // single colour like a line; distinct-category bars keep per-bar colours.
        sequence: SEQUENCE_BLOCKS.has(key),
      });
    }
  });

  if (res.patients?.rows?.length) {
    widgets.push({ id: "api-patients", kind: "table", title: "Patient list", columns: res.patients.columns, rows: res.patients.rows, span: "full", group: "Patient data" });
  }
  return widgets.length ? widgets : [emptyWidget("api-empty", "Analytics", "No data returned.")];
}

async function apiDashboardWidgets(mapping, filters) {
  // A leaf maps to either an endpoint string, or { endpoint, params } when the
  // leaf needs fixed params (e.g. OPD Billing → financial/summary?careSetting=opd).
  const endpoint = typeof mapping === "string" ? mapping : mapping.endpoint;
  const fixed = typeof mapping === "string" ? {} : mapping.params || {};
  let res;
  try {
    const params = { startDate: filters.startDate, endDate: filters.endDate, doctorIds: filters.doctorIds, ...fixed };
    // Pass through optional per-leaf filters (e.g. patients gender quick-filter)
    // so the dashboard — and its downloadable register — is segmented server-side.
    ["gender", "bloodGroup", "abha", "status", "reportType", "grain", "hospitalId"].forEach((k) => {
      if (filters[k] != null && filters[k] !== "" && filters[k] !== "all") params[k] = filters[k];
    });
    res = await ApiAnalytics.report(endpoint, params);
  } catch (e) {
    return [emptyWidget("api-err", "Analytics service", `Couldn't reach the analytics service (${endpoint}): ${e?.message || "error"}`)];
  }
  return blocksToWidgets(res);
}

/** Resolve a report card → { columns, rows } for download (CSV/Excel).
 *  billing-sourced reports build from the live billing API; endpoint-sourced
 *  reports pull from the Analytics service (when on). Returns null if neither
 *  is available so the caller can tell the user honestly. */
export async function downloadReport(card, filters) {
  if (card.source === "billing") {
    const billing = await getBilling(card.careSetting || "both", filters);
    const bills = billing?.bills || [];
    if (!bills.length) return null;
    return billsTable(bills);
  }
  if (card.source === "billing-ipd") {
    // IPD bill ledger straight from the production billing dashboard
    // (fetchBillingDashboard(params, "ipd") via getBilling).
    const billing = await getBilling("ipd", filters);
    const bills = billing?.bills || [];
    if (!bills.length) return null;
    return billsTable(bills);
  }
  if (card.endpoint && isApiOn()) {
    try {
      const res = await ApiAnalytics.report(card.endpoint, { ...filters, ...(card.params || {}) });
      // Register-style cards name the response block carrying their rows.
      if (card.block && res?.[card.block]?.rows) return { columns: res[card.block].columns, rows: res[card.block].rows };
      if (res?.columns && res?.rows) return { columns: res.columns, rows: res.rows };
      if (res?.patients?.rows?.length) return { columns: res.patients.columns, rows: res.patients.rows };
    } catch (e) {
      return null;
    }
  }
  return null;
}

/** Top-level loader keyed by sidebar leaf. Routes to the Analytics API
 *  (when on) for backend-gated dashboards, else the built rich/page loaders. */
export async function loadLeaf(leaf, filters) {
  // Billing reads from the production billing-dashboard API (the same source as
  // the OPD Billing screen) so every figure — Paid fully / Due / Refunded /
  // Advance — reconciles exactly, rather than re-deriving from the replica.
  if (leaf === "opd_billing") return financialWidgets("opd", filters);
  // IPD Billing mirrors OPD Billing exactly, against the IPD bill ledger.
  if (leaf === "ipd_billing") return financialWidgets("ipd", filters);
  if (isApiOn() && DASHBOARD_ENDPOINTS[leaf]) return apiDashboardWidgets(DASHBOARD_ENDPOINTS[leaf], filters);
  const pageKey = PAGE_MAP[leaf];
  if (pageKey) return loadPage(pageKey, filters);
  return [];
}

export async function loadSection(careSetting, section, filters, useApi = false) {
  if (useApi) return loadSectionViaApi(careSetting, section, filters);
  switch (section) {
    case "Financial":
      return financialWidgets(careSetting, filters);
    case "Operational":
      return operationalWidgets(careSetting, filters);
    case "Clinical":
      return clinicalWidgets(careSetting, filters);
    case "Overview":
    default:
      return overviewWidgets(careSetting, filters);
  }
}
