// Query executor — routes a structured query (PRD §8 / API spec §2.1) to:
//   - Live hospital-scoped data (existing billing/appointment APIs) when possible
//   - The Analytics microservice via ApiAnalytics.runQuery when the flag is on
//   - Sample/stub data (matching dataset shape) when neither is available yet
//
// All paths return the universal { columns, rows, meta } envelope so Widget
// renders without knowing which path ran.

import { fetchBillingDashboard } from "../opdBilling/service";
import { DEMO } from "./demo/demoApi";
import { getAppointments, getAppointmentCounts } from "./service";
import ApiAnalytics from "../../api/services/ApiAnalytics";
import { collectionTrend, paymentMix, billsTable, caseTypeMix, appointmentStatusMix } from "./analyticsHelpers";
import { getDecodedToken } from "../../utils/localStorage";
import config from "../../config";
import dayjs from "dayjs";

// Resolve doctorIds — prefer explicitly passed ids, fall back to JWT user_id.
function resolveDoctorIds(passedIds = []) {
  if (passedIds.length) return passedIds;
  try {
    const decoded = getDecodedToken();
    const uid = decoded?.result?.user_id;
    return uid ? [uid] : [];
  } catch (_) {
    return [];
  }
}

const SAMPLE_META = { live: false, cached: false };
const LIVE_META = { live: true, cached: false };

// ---- helpers ------------------------------------------------------------

const today = () => dayjs().format("YYYY-MM-DD");
const ago = (n) => dayjs().subtract(n, "day").format("YYYY-MM-DD");

function getDateRange(filters = []) {
  const f = filters.find((f) => f.field === "date" && f.op === "between");
  if (f && Array.isArray(f.value)) return { startDate: f.value[0], endDate: f.value[1] };
  return { startDate: ago(29), endDate: today() };
}

// ---- live loaders -------------------------------------------------------

async function runCollectionsQuery(q) {
  const { startDate, endDate } = getDateRange(q.filters);
  const doctorIds = resolveDoctorIds(q._doctorIds || []);
  const params = { startDate, endDate, page: 1, limit: 100, sortBy: "date", sortOrder: "desc", patientId: "", doctorIds };
  const billing = await fetchBillingDashboard(params, q.dataset === "ipd_billing" ? "ipd" : "opd");
  const bills = billing?.bills || [];

  const dim = q.dimensions?.[0]?.field;

  if (dim === "payment_mode") {
    const mix = paymentMix(billing?.summary || {});
    return { ...mix, meta: { ...LIVE_META, rowCount: mix.rows.length } };
  }
  if (dim === "date" || !dim) {
    const trend = collectionTrend(bills);
    // filter to requested measures
    const cols = trend.columns.filter(
      (c) => c.key === (q.dimensions?.[0]?.field || "date") || q.measures.includes(c.key)
        || c.key === "date" || c.key === "collected" || c.key === "refund"
    );
    return { columns: cols, rows: trend.rows, meta: { ...LIVE_META, rowCount: trend.rows.length } };
  }

  // fallback: bills table
  const table = billsTable(bills);
  return { ...table, meta: { ...LIVE_META, rowCount: table.rows.length } };
}

async function runAppointmentsQuery(q) {
  const { startDate, endDate } = getDateRange(q.filters);
  // doctorIds not required for the appointments API
  const dim = q.dimensions?.[0]?.field;
  const wantsRows = dim === "case_type" || !dim;
  let data;
  try {
    // Case-type needs app_data rows (all statuses, paged); the status mix only
    // needs the full-period counts fields — one call.
    data = wantsRows ? await getAppointments({ startDate, endDate }) : await getAppointmentCounts({ startDate, endDate });
  } catch (_) {
    data = null;
  }
  if (!data) return stubResult(q);

  if (wantsRows) {
    const mix = caseTypeMix(data.app_data || []);
    return { ...mix, meta: { ...LIVE_META, rowCount: mix.rows.length } };
  }
  const status = appointmentStatusMix(data);
  return { ...status, meta: { ...LIVE_META, rowCount: status.rows.length } };
}

// ---- via Analytics microservice -----------------------------------------

async function runViaApi(q) {
  if (!config.analytics_api_url) throw new Error("analytics_api_url not configured");
  const result = await ApiAnalytics.runQuery(q);
  return { ...result, meta: { ...LIVE_META, rowCount: result.rows?.length ?? 0 } };
}

// ---- sample stub ---------------------------------------------------------

function stubResult(q) {
  const dim = q.dimensions?.[0]?.field || "x";
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const columns = [
    { key: dim, label: dim, type: "string" },
    ...q.measures.map((m) => ({ key: m, label: m, type: "number" })),
  ];
  const rows = labels.map((l, i) => {
    const row = { [dim]: l };
    q.measures.forEach((m, j) => { row[m] = 20 + i * 5 + j * 8; });
    return row;
  });
  return { columns, rows, meta: { ...SAMPLE_META, rowCount: rows.length } };
}

// ---- main entry ---------------------------------------------------------

/**
 * Execute a structured query. Routes to the right data source and always
 * returns { columns:[{key,label,type}], rows:[...], meta:{live,rowCount} }.
 */
export async function executeQuery(q) {
  if (!q) throw new Error("No query");

  // 1. If the Analytics API is configured, use it first.
  // DEMO build: never attempt HTTP — the local loaders below are themselves
  // fixture-backed (billing + appointments), so queries stay fully offline.
  if (!DEMO && config.analytics_api_url) {
    try {
      return await runViaApi(q);
    } catch (e) {
      // fall through to local loaders (API not yet deployed)
      console.warn("Analytics API unavailable, falling back to local:", e.message);
    }
  }

  // 2. Local live loaders for the two wired datasets
  if (q.dataset === "collections") return runCollectionsQuery(q);
  if (q.dataset === "appointments") return runAppointmentsQuery(q);

  // 3. Everything else → sample data (clearly flagged as SAMPLE in meta)
  return stubResult(q);
}
