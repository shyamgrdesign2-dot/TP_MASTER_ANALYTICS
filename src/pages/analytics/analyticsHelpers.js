import moment from "moment";

// ---- billing aggregation -------------------------------------------------

// Total cash actually collected on a bill = its own paidAmount + any dues it cleared.
const billPaidTotal = (b) =>
  Number(b?.paidAmount || 0) +
  (Array.isArray(b?.paidDues)
    ? b.paidDues.reduce((s, d) => s + Number(d?.paidAmount || 0), 0)
    : 0);

/** Merge two billing-dashboard responses (e.g. OPD + IPD for "Both"). */
export const mergeBilling = (a, b) => {
  const sa = a?.summary || {};
  const sb = b?.summary || {};
  const addNum = (k) => Number(sa[k] || 0) + Number(sb[k] || 0);

  // merge payment-mode summaries by mode
  const mixMap = {};
  [...(sa.paymentModeSummary || []), ...(sb.paymentModeSummary || [])].forEach(
    (m) => {
      const key = m.paymentMode || "Unknown";
      mixMap[key] = mixMap[key] || { paymentMode: key, receivedAmount: 0, refundedAmount: 0 };
      mixMap[key].receivedAmount += Number(m.receivedAmount || 0);
      mixMap[key].refundedAmount += Number(m.refundedAmount || 0);
    }
  );

  return {
    summary: {
      totalPaidAmount: addNum("totalPaidAmount"),
      totalBillAmount: addNum("totalBillAmount"),
      dueAmount: addNum("dueAmount"),
      refundedAmount: addNum("refundedAmount"),
      paidFullyAmount: addNum("paidFullyAmount"),
      count: addNum("count"),
      dueCount: addNum("dueCount"),
      refundedCount: addNum("refundedCount"),
      paidFullyCount: addNum("paidFullyCount"),
      paymentModeSummary: Object.values(mixMap),
    },
    bills: [...(a?.bills || []), ...(b?.bills || [])],
  };
};

/** Collection + refund trend with ADAPTIVE bucketing: the bucket grows with the
 *  data's actual date span so a long window never crams dozens of daily ticks —
 *  day (≤ 1 month) → week (≤ ~7 months) → month (≤ 3 years) → year (beyond).
 *  Keys are raw dates ("YYYY-MM-DD" / "YYYY-MM" / "YYYY") so the chart treats
 *  the axis as TIME (clean formatted ticks with smart skipping), not categories. */
export const collectionTrend = (bills = []) => {
  const dated = bills.filter((b) => b?.date);
  if (!dated.length) {
    return {
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "collected", label: "Collection", type: "currency" },
        { key: "refund", label: "Refund", type: "currency" },
      ],
      rows: [],
    };
  }
  const times = dated.map((b) => moment(b.date).valueOf());
  const spanDays = Math.round((Math.max(...times) - Math.min(...times)) / 86400000) + 1;
  const unit = spanDays > 1095 ? "year" : spanDays > 210 ? "month" : spanDays > 31 ? "week" : "day";

  const byBucket = {};
  dated.forEach((b) => {
    const m = moment(b.date);
    const key =
      unit === "year" ? m.format("YYYY")
        : unit === "month" ? m.format("YYYY-MM")
          : unit === "week" ? m.clone().startOf("isoWeek").format("YYYY-MM-DD")
            : m.format("YYYY-MM-DD");
    byBucket[key] = byBucket[key] || { collected: 0, refund: 0 };
    byBucket[key].collected += billPaidTotal(b);
    byBucket[key].refund += Number(b.refundedAmount || 0);
  });
  const rows = Object.keys(byBucket)
    .sort()
    .map((key) => ({
      date: key,
      collected: Math.round(byBucket[key].collected),
      refund: Math.round(byBucket[key].refund),
    }));
  return {
    columns: [
      { key: "date", label: unit === "year" ? "Year" : unit === "month" ? "Month" : unit === "week" ? "Week" : "Date", type: "date" },
      { key: "collected", label: "Collection", type: "currency" },
      { key: "refund", label: "Refund", type: "currency" },
    ],
    rows,
  };
};

/** Payment-mode mix from the summary's paymentModeSummary → donut result set. */
export const paymentMix = (summary = {}) => ({
  columns: [
    { key: "paymentMode", label: "Payment mode", type: "string" },
    { key: "received", label: "Collected", type: "currency" },
  ],
  rows: (summary.paymentModeSummary || [])
    .map((m) => ({
      paymentMode: m.paymentMode || "Unknown",
      received: Math.round(Number(m.receivedAmount || 0)),
    }))
    .filter((r) => r.received > 0)
    .sort((x, y) => y.received - x.received),
});

/** Bill REFUNDS by mode — paymentModeSummary carries refundedAmount per mode,
 *  which paymentMix drops. Separate donut so refunds never mix with collections. */
export const billRefundMix = (summary = {}) => ({
  columns: [
    { key: "paymentMode", label: "Refund mode", type: "string" },
    { key: "refunded", label: "Refunded", type: "currency" },
  ],
  rows: (summary.paymentModeSummary || [])
    .map((m) => ({
      paymentMode: m.paymentMode || "Unknown",
      refunded: Math.round(Number(m.refundedAmount || 0)),
    }))
    .filter((r) => r.refunded > 0)
    .sort((x, y) => y.refunded - x.refunded),
});

/** ADVANCE-wallet mode mix from the advance-deposit dashboard's receipts.
 *  type: "Deposit" (money in) | "Refund" (money back). Each receipt carries
 *  paymentModes[{ paymentMode, amount }]. */
export const advanceModeMix = (receipts = [], type = "Deposit") => {
  const agg = {};
  (receipts || [])
    .filter((r) => String(r?.transactionType || "") === type)
    .forEach((r) => (r.paymentModes || []).forEach((m) => {
      const k = m.paymentMode || "Unknown";
      agg[k] = (agg[k] || 0) + Number(m.amount || 0);
    }));
  return {
    columns: [
      { key: "paymentMode", label: type === "Deposit" ? "Deposit mode" : "Refund mode", type: "string" },
      { key: "amount", label: "Amount", type: "currency" },
    ],
    rows: Object.entries(agg)
      .map(([paymentMode, amount]) => ({ paymentMode, amount: Math.round(amount) }))
      .filter((r) => r.amount > 0)
      .sort((x, y) => y.amount - x.amount),
  };
};

/** Unpaid bills bucketed by how long ago each bill was raised — sourced from
 *  the bill API's own rows (works for every tenant, unlike the replica).
 *  All four buckets always emitted, 0-filled. */
export const duesAgingFromBills = (bills = []) => {
  const BUCKETS = ["0-7 days", "8-30 days", "31-90 days", "90+ days"];
  const sums = { "0-7 days": 0, "8-30 days": 0, "31-90 days": 0, "90+ days": 0 };
  (bills || []).forEach((b) => {
    const due = Number(b?.dueAmount || 0);
    if (due <= 0 || !b?.date) return;
    const age = moment().diff(moment(b.date), "days");
    const k = age <= 7 ? "0-7 days" : age <= 30 ? "8-30 days" : age <= 90 ? "31-90 days" : "90+ days";
    sums[k] += due;
  });
  return {
    columns: [
      { key: "age", label: "Bill age", type: "string" },
      { key: "due", label: "Unpaid amount", type: "currency" },
    ],
    rows: BUCKETS.map((age) => ({ age, due: Math.round(sums[age]) })),
  };
};

/** Flat, exportable bill table. */
export const billsTable = (bills = []) => ({
  columns: [
    { key: "billNumber", label: "Bill No", type: "string" },
    { key: "date", label: "Date", type: "date" },
    { key: "patient", label: "Patient", type: "string" },
    { key: "billed", label: "Billed", type: "currency" },
    { key: "paid", label: "Collected", type: "currency" },
    { key: "due", label: "Due", type: "currency" },
    { key: "refund", label: "Refund", type: "currency" },
    { key: "status", label: "Status", type: "string" },
  ],
  rows: bills.map((b) => ({
    billNumber: b.billNumber || "",
    date: b.date ? moment(b.date).format("DD MMM YYYY") : "",
    patient: b?.patient?.name || "",
    billed: Math.round(Number(b.payableAmount || 0)),
    paid: Math.round(billPaidTotal(b)),
    due: Math.round(Number(b.dueAmount || 0)),
    refund: Math.round(Number(b.refundedAmount || 0)),
    status: b.paymentStatus || "",
  })),
});

// ---- appointment aggregation --------------------------------------------

/** Case-type (New/Follow-up/Urgent) mix from appointment app_data. */
export const caseTypeMix = (appData = []) => {
  const counts = {};
  appData.forEach((a) => {
    const t = a?.toct_type || "Other";
    counts[t] = (counts[t] || 0) + 1;
  });
  return {
    columns: [
      { key: "caseType", label: "Case type", type: "string" },
      { key: "count", label: "Appointments", type: "number" },
    ],
    rows: Object.keys(counts).map((t) => ({ caseType: t, count: counts[t] })),
  };
};

/** Patient-level appointment table (download). Field names vary across the
 *  appointment API, so each column reads from a few likely keys defensively. */
export const appointmentsTable = (appData = []) => {
  const pick = (r, keys) => {
    for (const k of keys) if (r[k] != null && r[k] !== "") return r[k];
    return "";
  };
  return {
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "doctor", label: "Doctor", type: "string" },
      { key: "patient", label: "Patient", type: "string" },
      { key: "gender", label: "Gender", type: "string" },
      { key: "age", label: "Age", type: "number" },
      { key: "mobile", label: "Mobile", type: "string" },
      { key: "type", label: "Type", type: "string" },
      { key: "status", label: "Status", type: "string" },
    ],
    rows: (appData || []).map((r) => ({
      date: (() => {
        const d = pick(r, ["pam_app_date", "apDate", "appointment_date", "date"]);
        return d ? moment(d).format("DD MMM YYYY") : "";
      })(),
      doctor: pick(r, ["um_name", "doctor_name", "doctors_name"]),
      patient: pick(r, ["patient_name", "pm_name", "name"]),
      gender: pick(r, ["pm_gender", "gender"]),
      age: pick(r, ["ageYears", "patient_age", "age"]),
      mobile: pick(r, ["patient_mobile", "pm_mobile", "mobile"]),
      type: pick(r, ["toct_type", "case_type", "appointment_type"]),
      status: pick(r, ["pam_status", "status"]),
    })),
  };
};

// ---- patient aggregation -------------------------------------------------

const ageBand = (yrs) => {
  const a = Number(yrs || 0);
  if (a < 18) return "<18";
  if (a <= 30) return "18-30";
  if (a <= 45) return "30-45";
  if (a <= 60) return "45-60";
  return ">60";
};

/** Gender mix from patient rows → donut result set. */
export const genderMix = (rows = []) => {
  const counts = {};
  rows.forEach((r) => {
    const g = (r.pm_gender || "").toString().toUpperCase();
    const label = g === "M" || g === "MALE" ? "Male" : g === "F" || g === "FEMALE" ? "Female" : "Other";
    counts[label] = (counts[label] || 0) + 1;
  });
  return {
    columns: [{ key: "gender", label: "Gender", type: "string" }, { key: "count", label: "Patients", type: "number" }],
    rows: Object.keys(counts).map((g) => ({ gender: g, count: counts[g] })),
  };
};

/** Age-band mix from patient rows → donut/bar result set. */
export const ageBandMix = (rows = []) => {
  const order = ["<18", "18-30", "30-45", "45-60", ">60"];
  const counts = {};
  rows.forEach((r) => { const b = ageBand(r.ageYears); counts[b] = (counts[b] || 0) + 1; });
  return {
    columns: [{ key: "band", label: "Age band", type: "string" }, { key: "count", label: "Patients", type: "number" }],
    rows: order.filter((b) => counts[b]).map((b) => ({ band: b, count: counts[b] })),
  };
};

/** Patient-level table (download). */
export const patientsTable = (rows = []) => ({
  columns: [
    { key: "patient", label: "Patient", type: "string" },
    { key: "gender", label: "Gender", type: "string" },
    { key: "age", label: "Age", type: "number" },
    { key: "contact", label: "Contact", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "category", label: "Category", type: "string" },
    { key: "lastVisit", label: "Last Visit", type: "date" },
    { key: "abha", label: "ABHA", type: "string" },
  ],
  rows: rows.map((r) => ({
    patient: `${r.pm_salutation || ""} ${r.pm_fullname || ""}`.trim(),
    gender: r.pm_gender || "",
    age: r.ageYears != null ? r.ageYears : "",
    contact: r.pm_contact_no || "",
    city: r.pm_city || "",
    category: r.category || "",
    lastVisit: r.lastVisitDate ? moment(r.lastVisitDate).format("DD MMM YYYY") : "",
    abha: r.abhaAddress || "",
  })),
});

// ---- bulk communication aggregation -------------------------------------

/** Campaign list (download) from userCampaign rows. */
export const campaignsTable = (rows = []) => ({
  columns: [
    { key: "campaign", label: "Campaign", type: "string" },
    { key: "date", label: "Date", type: "date" },
    { key: "patients", label: "Patients", type: "number" },
    { key: "sent", label: "Sent", type: "number" },
    { key: "success", label: "Delivered", type: "number" },
    { key: "failed", label: "Failed", type: "number" },
    { key: "credits", label: "Credits", type: "number" },
    { key: "status", label: "Status", type: "string" },
  ],
  rows: rows.map((c) => ({
    campaign: c.campaign_name || "—",
    date: c.campaign_date ? moment(c.campaign_date).format("DD MMM YYYY") : "",
    patients: Number(c.total_patient || 0),
    sent: Number(c.campaign_sent || 0),
    success: Number(c.success || 0),
    failed: Number(c.failed || 0),
    credits: Number(c.total_credit || 0),
    status: c.campaign_status || "",
  })),
});

/** Appointment status mix → donut/bar result set. */
export const appointmentStatusMix = (data = {}) => ({
  columns: [
    { key: "status", label: "Status", type: "string" },
    { key: "count", label: "Count", type: "number" },
  ],
  rows: [
    { status: "Completed", count: Number(data.finished_count || 0) },
    { status: "In queue", count: Number(data.queue_count || 0) },
    { status: "Cancelled", count: Number(data.cancelled_count || 0) },
  ].filter((r) => r.count > 0),
});
