// ---------------------------------------------------------------------------
// DEMO billing / advance-wallet / campaign fixtures (synthesized).
//
// The billing dashboards and bulk-communication widgets read the PRODUCTION
// billing + communication APIs in the real portal (not the analytics
// service), so no captured fixture exists for them. These builders synthesize
// plausible, fully-anonymized objects matching the EXACT shapes consumed by
// src/pages/analytics/service.js + analyticsHelpers.js:
//
//   billing  -> { summary: { totalBillAmount, totalPaidAmount, dueAmount,
//                 dueCount, refundedAmount, refundedCount, paidFullyAmount,
//                 paidFullyCount, count, paymentModeSummary:[{ paymentMode,
//                 receivedAmount, refundedAmount }] }, bills:[...] }
//   bill row -> { billNumber, date, patient:{name}, payableAmount, paidAmount,
//                 paidDues, dueAmount, refundedAmount, paymentStatus,
//                 (+ admissionId for IPD) }
//   advance  -> { summary: { totalAdvanceReceived/Refunded/Debited,
//                 advanceReceivedCount, advanceRefundedCount }, receipts:
//                 [{ transactionType:'Deposit'|'Refund',
//                    paymentModes:[{ paymentMode, amount }] }] }
//   credit   -> { userCredit }
//   campaign -> [{ campaign_name, campaign_date, total_patient, campaign_sent,
//                  success, failed, total_credit, campaign_status }]
//
// All dates are generated RELATIVE TO TODAY so the demo always looks fresh,
// and the PRNG is seeded so every page load shows identical numbers.
// ---------------------------------------------------------------------------

// Tiny seeded PRNG (mulberry32) — deterministic data across reloads.
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const FIRST = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Isha", "Kabir", "Meera", "Rohan", "Sneha", "Aditya", "Priya", "Kunal", "Nisha", "Raghav", "Pooja", "Sameer", "Kavya", "Nikhil", "Ritu"];
const LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Khan", "Gupta", "Nair", "Singh", "Desai", "Joshi", "Kulkarni", "Mehta", "Chopra", "Banerjee", "Rao"];
const MODES = ["Cash", "UPI", "Card", "Advance Deposit", "Net Banking"];

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function makeBills({ prefix, count, seed, baseAmount, spreadAmount, ipd }) {
  const rnd = mulberry32(seed);
  const bills = [];
  for (let i = 0; i < count; i++) {
    // Bias bill age toward the recent past so trends read "growing practice".
    const age = Math.floor(Math.pow(rnd(), 1.6) * 540); // 0..540 days back
    const billed = Math.round((baseAmount + rnd() * spreadAmount) / 10) * 10;
    const r = rnd();
    let paid;
    let due = 0;
    let refunded = 0;
    let status = "Paid";
    if (r < 0.72) {
      paid = billed;
    } else if (r < 0.84) {
      paid = Math.round(billed * (0.25 + rnd() * 0.5));
      due = billed - paid;
      status = "Partially Paid";
    } else if (r < 0.94) {
      paid = 0;
      due = billed;
      status = "Due";
    } else {
      paid = billed;
      refunded = Math.round(billed * (0.3 + rnd() * 0.7));
      status = "Refunded";
    }
    const name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    bills.push({
      billNumber: `${prefix}-${1001 + i}`,
      date: iso(daysAgo(age)),
      patient: { name },
      payableAmount: billed,
      paidAmount: paid,
      paidDues: [],
      dueAmount: due,
      refundedAmount: refunded,
      paymentStatus: status,
      paymentMode: MODES[Math.floor(rnd() * MODES.length)],
      ...(ipd ? { admissionId: `ADM-${9000 + i}` } : {}),
    });
  }
  bills.sort((a, b) => (a.date < b.date ? 1 : -1));
  return bills;
}

// Summary computed FROM the bills so KPI cards, the trend, the payment-mode
// donuts, the dues-aging bars and the bills table all reconcile exactly.
function summarize(bills) {
  const sum = (f) => bills.reduce((s, b) => s + f(b), 0);
  const modeMap = {};
  bills.forEach((b) => {
    const k = b.paymentMode;
    modeMap[k] = modeMap[k] || { paymentMode: k, receivedAmount: 0, refundedAmount: 0 };
    modeMap[k].receivedAmount += b.paidAmount;
    modeMap[k].refundedAmount += b.refundedAmount;
  });
  return {
    totalBillAmount: sum((b) => b.payableAmount),
    totalPaidAmount: sum((b) => b.paidAmount),
    dueAmount: sum((b) => b.dueAmount),
    refundedAmount: sum((b) => b.refundedAmount),
    paidFullyAmount: sum((b) => (b.paymentStatus === "Paid" ? b.payableAmount : 0)),
    count: bills.length,
    dueCount: bills.filter((b) => b.dueAmount > 0).length,
    refundedCount: bills.filter((b) => b.refundedAmount > 0).length,
    paidFullyCount: bills.filter((b) => b.paymentStatus === "Paid").length,
    paymentModeSummary: Object.values(modeMap),
  };
}

/** Demo twin of fetchBillingDashboard(params, careSetting). */
export function demoBillingDashboard(careSetting = "opd") {
  const bills =
    careSetting === "ipd"
      ? makeBills({ prefix: "IPD", count: 64, seed: 20260611, baseAmount: 6000, spreadAmount: 48000, ipd: true })
      : makeBills({ prefix: "OPD", count: 180, seed: 19840321, baseAmount: 200, spreadAmount: 3200, ipd: false });
  return { summary: summarize(bills), bills };
}

/** Demo twin of fetchAdvancedDepositDashboard(params). */
export function demoAdvanceDashboard(careSetting = "opd") {
  const ipd = careSetting === "ipd";
  const rnd = mulberry32(ipd ? 777001 : 424242);
  const receipts = [];
  const nDeposits = ipd ? 38 : 26;
  const nRefunds = ipd ? 6 : 4;
  let received = 0;
  let refunded = 0;
  for (let i = 0; i < nDeposits; i++) {
    const amount = Math.round((500 + rnd() * (ipd ? 20000 : 2500)) / 50) * 50;
    received += amount;
    receipts.push({
      receiptNumber: `ADV-${2000 + i}`,
      date: iso(daysAgo(Math.floor(rnd() * 540))),
      transactionType: "Deposit",
      paymentModes: [{ paymentMode: MODES[Math.floor(rnd() * 3)], amount }],
    });
  }
  for (let i = 0; i < nRefunds; i++) {
    const amount = Math.round((300 + rnd() * (ipd ? 8000 : 1200)) / 50) * 50;
    refunded += amount;
    receipts.push({
      receiptNumber: `ADVR-${3000 + i}`,
      date: iso(daysAgo(Math.floor(rnd() * 400))),
      transactionType: "Refund",
      paymentModes: [{ paymentMode: MODES[Math.floor(rnd() * 3)], amount }],
    });
  }
  return {
    summary: {
      totalAdvanceReceived: received,
      totalAdvanceRefunded: refunded,
      totalAdvanceDebited: Math.round(received * 0.55),
      advanceReceivedCount: nDeposits,
      advanceRefundedCount: nRefunds,
    },
    receipts,
  };
}

/** Demo twin of ApiBulkMessages.userCredit(). */
export const DEMO_USER_CREDIT = { userCredit: 1240 };

/** Demo twin of ApiBulkMessages.userCampaign(...) — an array works for the
 *  Object.values(...) consumption in bulkCommWidgets. */
export function demoCampaigns() {
  const names = [
    "Diwali health-checkup offer",
    "Flu vaccination drive",
    "Follow-up reminder — diabetes cohort",
    "New clinic timings announcement",
    "World Heart Day camp",
    "Monsoon wellness package",
    "Annual screening recall",
  ];
  const rnd = mulberry32(31415);
  return names.map((campaign_name, i) => {
    const total_patient = 80 + Math.floor(rnd() * 600);
    const failed = Math.floor(total_patient * rnd() * 0.08);
    return {
      campaign_name,
      campaign_date: iso(daysAgo(20 + i * 55 + Math.floor(rnd() * 20))),
      total_patient,
      campaign_sent: total_patient,
      success: total_patient - failed,
      failed,
      total_credit: total_patient,
      campaign_status: "Completed",
    };
  });
}
