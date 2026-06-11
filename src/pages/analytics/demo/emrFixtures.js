// ---------------------------------------------------------------------------
// DEMO appointment / patient fixtures (synthesized).
//
// The Overview KPI band, the Operational section (status donut, case-type
// mix, appointments table) and the Patients dashboard read the PRODUCTION
// appointment + patient-list EMR APIs in the real portal (not the analytics
// service), so no captured fixture exists for them. These builders synthesize
// plausible, fully-anonymized objects matching the EXACT shapes consumed by
// src/pages/analytics/service.js + analyticsHelpers.js:
//
//   appointments -> { finished_count, queue_count, cancelled_count,
//                     rowsComplete, app_data:[{ pam_app_date, um_name,
//                     patient_name, pm_gender, ageYears, patient_mobile,
//                     toct_type, pam_status }] }
//   patients     -> { total, patients:[{ pm_salutation, pm_fullname,
//                     pm_gender, ageYears, pm_contact_no, pm_city, category,
//                     lastVisitDate, abhaAddress }] }
//
// Appointment dates are generated INSIDE the requested period (falling back
// to the last 180 days) so the date-range filter visibly re-slices the data,
// and the PRNG is seeded so every load shows identical numbers. Counts are
// derived from the generated rows, so the KPI band, the status donut and the
// table always reconcile.
// ---------------------------------------------------------------------------

import { DEMO_DOCTORS } from "./demoApi";

// Tiny seeded PRNG (mulberry32) — same generator as billingFixtures.js.
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
const CITIES = ["Mumbai", "Pune", "Thane", "Nashik", "Nagpur", "Surat", "Indore", "Hyderabad"];
const CASE_TYPES = ["New case", "Follow-up", "Urgent"];
const CATEGORIES = ["General", "Insurance", "Corporate", "Camp"];

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
// Masked mobile, as on every other demo surface — never a dialable number.
const maskedMobile = (rnd) => `98XXX XX${String(10 + Math.floor(rnd() * 90))}`;
const personName = (rnd) => `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;

/** Resolve a {startDate,endDate} filter to a bounded day-span ending at `end`. */
const periodOf = ({ startDate, endDate } = {}) => {
  const end = endDate && !Number.isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date();
  const start = startDate && !Number.isNaN(Date.parse(startDate)) ? new Date(startDate) : daysAgo(180);
  const span = Math.round((end - start) / 86400000);
  return { end, span: Math.min(Math.max(span, 1), 540) };
};

/**
 * Synthesized appointment workload for a period. Shape-exact stand-in for the
 * merged getAppointments() result (and a superset of getAppointmentCounts()).
 */
export function demoAppointments(filters = {}) {
  const { end, span } = periodOf(filters);
  const rnd = mulberry32(20260611);
  // A busy-but-believable OPD: ~9 appointments/day, capped for table sanity.
  const count = Math.min(Math.round(span * 9), 420);
  const app_data = [];
  const counts = { finished_count: 0, queue_count: 0, cancelled_count: 0 };
  for (let i = 0; i < count; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - Math.floor(rnd() * span));
    const r = rnd();
    // 74% completed / 12% still in queue / 14% cancelled.
    const status = r < 0.74
      ? { pam_status: "Completed", key: "finished_count" }
      : r < 0.86
        ? { pam_status: "In queue", key: "queue_count" }
        : { pam_status: "Cancelled", key: "cancelled_count" };
    counts[status.key] += 1;
    app_data.push({
      pam_app_date: iso(d),
      um_name: DEMO_DOCTORS[Math.floor(rnd() * DEMO_DOCTORS.length)].um_name,
      patient_name: personName(rnd),
      pm_gender: rnd() < 0.52 ? "M" : "F",
      ageYears: 1 + Math.floor(rnd() * 84),
      patient_mobile: maskedMobile(rnd),
      toct_type: CASE_TYPES[rnd() < 0.45 ? 0 : rnd() < 0.78 ? 1 : 2],
      pam_status: status.pam_status,
    });
  }
  app_data.sort((a, b) => (a.pam_app_date < b.pam_app_date ? 1 : -1));
  return { ...counts, app_data, rowsComplete: true };
}

/**
 * Synthesized patient register: a large believable total plus a recent
 * `limit`-row demographics sample, mirroring fetchAllPatients().
 */
export function demoPatients({ limit = 200 } = {}) {
  const rnd = mulberry32(19470815);
  const patients = [];
  for (let i = 0; i < limit; i++) {
    const gender = rnd() < 0.52 ? "M" : "F";
    patients.push({
      pm_salutation: gender === "M" ? "Mr." : rnd() < 0.5 ? "Ms." : "Mrs.",
      pm_fullname: personName(rnd),
      pm_gender: gender,
      ageYears: 1 + Math.floor(rnd() * 84),
      pm_contact_no: maskedMobile(rnd),
      pm_city: CITIES[Math.floor(rnd() * CITIES.length)],
      category: CATEGORIES[Math.floor(rnd() * CATEGORIES.length)],
      lastVisitDate: iso(daysAgo(Math.floor(rnd() * 120))),
      abhaAddress: rnd() < 0.38 ? `patient${100 + i}@abdm` : "",
    });
  }
  return { total: 4832, patients };
}
