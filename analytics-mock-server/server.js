/* ============================================================================
 * Analytics Mock Server — a zero-dependency, contract-conformant stub of the
 * dedicated Analytics microservice (Node/NestJS, not yet built).
 *
 * Implements the dashboard-block contract from
 *   docs/analytics-planning/Analytics_Endpoint_Contracts.md
 * so the React app can be flipped onto a real HTTP service and the Clinical /
 * Voice-Rx / etc. dashboards light up END-TO-END before the real backend exists.
 *
 * This is the EXECUTABLE SPEC — the real NestJS service must match these shapes.
 * It returns synthetic (clearly non-clinical) data; it is a dev/integration tool,
 * NOT for production.
 *
 *   Run:  node analytics-mock-server/server.js   (or: npm run analytics:mock)
 *   Then in the browser console on /analytics:
 *     localStorage.setItem('tp_analytics_api_url','http://localhost:4000')
 *     localStorage.setItem('tp_analytics_api_on','1'); location.reload()
 * ========================================================================== */

const http = require("http");
const PORT = process.env.PORT || 4000;

// ---- deterministic pseudo-random so payloads are stable per key -------------
const seed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (rnd, n) => Math.floor(rnd() * n);

const AGE_BANDS = ["<18", "18-30", "30-45", "45-60", ">60"];
const FIRST = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Myra", "Ishaan", "Kabir"];
const LAST = ["Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Khan", "Das", "Bose", "Mehta", "Rao", "Gupta"];
const DOCTORS = ["Dr. GP General Physician", "Dr. Mehta", "Dr. Rao", "Dr. Iyer", "Dr. Khan"];

const ENTITIES = {
  "clinical/diagnosis": { hero: "Top diagnosis", items: ["Hypertension", "Type 2 Diabetes", "URTI", "Gastritis", "Anemia", "Hypothyroidism", "Viral Fever", "Asthma"], icd: ["I10", "E11", "J06.9", "K29.7", "D64.9", "E03.9", "B34.9", "J45"], unit: "Patients", col: "diagnosis" },
  "clinical/symptoms": { hero: "Top symptom", items: ["Fever", "Throat pain", "Cough", "Headache", "Fatigue", "Body ache", "Nausea", "Dizziness"], unit: "Patients", col: "symptom" },
  "clinical/drug": { hero: "Top drug", items: ["Dolo 650", "Augmentin 625", "Pan-D", "Azithral 500", "Crocin", "Shelcal", "Montair LC", "Ecosprin"], unit: "Prescriptions", col: "drug", drug: true },
  "clinical/lab-test": { hero: "Top lab test", items: ["CBC", "Lipid Profile", "HbA1c", "LFT", "TSH", "Urine Routine", "Vitamin D", "KFT"], unit: "Orders", col: "labTest" },
  "clinical/procedure": { hero: "Top procedure", items: ["Dressing", "Nebulization", "Injection", "Suturing", "ECG", "Biopsy"], unit: "Patients", col: "procedure" },
  "clinical/medical-history": { hero: "Top chronic condition", items: ["Hypertension", "Diabetes", "Asthma", "Thyroid", "CAD", "CKD"], unit: "Patients", col: "condition", history: true },
  "clinical/surgical-history": { hero: "Top surgery", items: ["Appendectomy", "C-Section", "Cholecystectomy", "Hernia Repair", "Cataract"], unit: "Patients", col: "surgery" },
  "engagement/voice-rx": { voice: true },
  "engagement/symptom-collector": { collector: true },
};

const num = (rnd, lo, hi) => lo + pick(rnd, hi - lo);

function patients(rnd, entity, n = 12) {
  return Array.from({ length: n }, (_, i) => {
    const name = `${FIRST[pick(rnd, FIRST.length)]} ${LAST[pick(rnd, LAST.length)]}`;
    const item = entity.items ? entity.items[pick(rnd, entity.items.length)] : "—";
    const age = num(rnd, 2, 82);
    const row = {
      date: `2026-0${1 + pick(rnd, 6)}-${String(1 + pick(rnd, 27)).padStart(2, "0")}`,
      doctor: DOCTORS[pick(rnd, DOCTORS.length)],
      patientUHID: `UH${100000 + pick(rnd, 899999)}`,
      patientName: name,
      gender: rnd() > 0.5 ? "M" : "F",
      age,
      mobile: `9${String(100000000 + pick(rnd, 899999999)).slice(0, 9)}`,
      slot: `${8 + pick(rnd, 9)}:${rnd() > 0.5 ? "30" : "00"} ${rnd() > 0.5 ? "AM" : "PM"}`,
    };
    row[entity.col || "item"] = item;
    if (entity.drug) { row.generic = item.split(" ")[0]; row.manufacturer = ["GSK", "Cipla", "Sun Pharma", "Abbott"][pick(rnd, 4)]; }
    return row;
  });
}

function summaryBlock(rnd, entity) {
  const cols = [{ key: entity.col, label: entity.col[0].toUpperCase() + entity.col.slice(1), type: "string" }];
  if (entity.icd) cols.push({ key: "icd_code", label: "ICD", type: "string" });
  cols.push({ key: "total", label: entity.unit, type: "number" });
  const rows = entity.items.map((it, i) => {
    const r = { [entity.col]: it, total: 60 - i * 6 - pick(rnd, 4) };
    if (entity.icd) r.icd_code = entity.icd[i];
    return r;
  }).sort((a, b) => b.total - a.total);
  return { columns: cols, rows };
}

const donut = (label, pairs) => ({ columns: [{ key: "k", label, type: "string" }, { key: "count", label: "Count", type: "number" }], rows: pairs.map(([k, count]) => ({ k, count })) });

const SPECIALTIES = ["Orthopedics", "General Surgery", "Cardiology", "Gynecology", "Pediatrics", "Urology", "Nephrology", "ENT"];
const WARDS = ["ICU", "General Ward", "Private", "Semi-Private", "Maternity"];
const IPD_SURGERIES = ["Total Knee Replacement", "C-Section", "Cholecystectomy", "Appendectomy", "Hernia Repair", "Angioplasty", "Hysterectomy", "Fracture Fixation"];
const DISCHARGE_TYPES = ["Recovered", "Referred", "LAMA", "Transferred", "Expired"];

function buildIpd(rnd) {
  const totalBeds = 60;
  const occupied = num(rnd, 38, 56);
  const specOcc = SPECIALTIES.map((s, i) => [s, num(rnd, 2, 14) + (i === 0 ? 6 : 0)]).sort((a, b) => b[1] - a[1]);
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const bar = (label, valLabel, pairs) => ({ columns: [{ key: "k", label }, { key: "v", label: valLabel }], rows: pairs.map(([k, v]) => ({ k, v })) });
  const line = (label, vLabel, vals) => ({ columns: [{ key: "month", label }, { key: "v", label: vLabel }], rows: months.map((month, i) => ({ month, v: vals[i] })) });

  const admissions = Array.from({ length: 14 }, () => {
    const admit = `2026-0${1 + pick(rnd, 5)}-${String(1 + pick(rnd, 27)).padStart(2, "0")}`;
    const los = num(rnd, 1, 18);
    return {
      admitDate: admit, los,
      patient: `${FIRST[pick(rnd, FIRST.length)]} ${LAST[pick(rnd, LAST.length)]}`,
      age: num(rnd, 5, 84), gender: rnd() > 0.5 ? "M" : "F",
      ward: WARDS[pick(rnd, WARDS.length)],
      specialty: SPECIALTIES[pick(rnd, SPECIALTIES.length)],
      doctor: DOCTORS[pick(rnd, DOCTORS.length)],
      surgery: rnd() > 0.4 ? IPD_SURGERIES[pick(rnd, IPD_SURGERIES.length)] : "—",
      dischargeType: DISCHARGE_TYPES[pick(rnd, DISCHARGE_TYPES.length)],
      bill: num(rnd, 12000, 180000),
    };
  });

  return {
    hero: { label: "Most occupied specialty", value: specOcc[0][0] },
    kpis: [
      { title: "Beds Occupied", value: `${occupied} / ${totalBeds}` },
      { title: "Bed Occupancy Rate", value: Math.round((occupied / totalBeds) * 100) + "%" },
      { title: "Current Admissions", value: String(occupied) },
      { title: "Discharges (period)", value: String(num(rnd, 80, 160)) },
      { title: "Avg Length of Stay", value: (3 + rnd() * 3).toFixed(1) + " d" },
      { title: "Avg Daily Census", value: String(num(rnd, 40, 55)) },
    ],
    specialtyOccupancy: bar("Specialty", "Beds occupied", specOcc),
    bedsByWard: { columns: [{ key: "k", label: "Ward" }, { key: "v", label: "Occupied" }], rows: WARDS.map((w) => [w, num(rnd, 3, 16)]).map(([k, v]) => ({ k, v })) },
    surgeries: bar("Surgery", "Count", IPD_SURGERIES.map((s, i) => [s, num(rnd, 2, 20) + (i === 0 ? 5 : 0)]).sort((a, b) => b[1] - a[1])),
    borTrend: line("Month", "BOR %", months.map(() => num(rnd, 58, 88))),
    alosTrend: line("Month", "ALOS (days)", months.map(() => +(3 + rnd() * 3).toFixed(1))),
    adcTrend: line("Month", "ADC", months.map(() => num(rnd, 38, 56))),
    dischargeMix: { columns: [{ key: "k", label: "Discharge type" }, { key: "v", label: "Count" }], rows: DISCHARGE_TYPES.map((t, i) => [t, num(rnd, 2, 40) + (i === 0 ? 30 : 0)]).map(([k, v]) => ({ k, v })) },
    lengthOfStayDist: { columns: [{ key: "k", label: "Length of stay" }, { key: "v", label: "Patients" }], rows: [["1d", num(rnd, 10, 40)], ["2-3d", num(rnd, 20, 60)], ["4-7d", num(rnd, 15, 45)], ["8-14d", num(rnd, 5, 25)], [">14d", num(rnd, 1, 10)]].map(([k, v]) => ({ k, v })) },
    patients: {
      columns: [
        { key: "admitDate", label: "Admit Date" }, { key: "los", label: "LOS (days)" },
        { key: "patient", label: "Patient" }, { key: "age", label: "Age" }, { key: "gender", label: "Gender" },
        { key: "ward", label: "Ward" }, { key: "specialty", label: "Specialty" }, { key: "doctor", label: "Doctor" },
        { key: "surgery", label: "Surgery" }, { key: "dischargeType", label: "Discharge" }, { key: "bill", label: "Bill (₹)" },
      ],
      rows: admissions,
    },
    meta: { live: true, source: "mock" },
  };
}

function buildDashboard(path) {
  if (path === "ipd/summary") return buildIpd(seed(path));
  const e = ENTITIES[path];
  if (!e) return null;
  const rnd = seed(path);

  if (e.voice) {
    return {
      kpis: [
        { title: "Voice Rx Sessions", value: String(num(rnd, 400, 900)) },
        { title: "Doctors Using", value: String(num(rnd, 6, 22)) },
        { title: "Avg Session (s)", value: String(num(rnd, 40, 120)) },
        { title: "Rx Generated", value: num(rnd, 70, 95) + "%" },
        { title: "Edit Rate", value: num(rnd, 10, 35) + "%" },
      ],
      adoptionTrend: { columns: [{ key: "week", label: "Week" }, { key: "sessions", label: "Sessions" }], rows: ["W1", "W2", "W3", "W4", "W5", "W6"].map((week) => ({ week, sessions: num(rnd, 40, 160) })) },
      byDoctor: { columns: [{ key: "doctor", label: "Doctor" }, { key: "sessions", label: "Sessions" }], rows: DOCTORS.map((doctor) => ({ doctor, sessions: num(rnd, 20, 200) })) },
      fieldCapture: donut("Field", [["Symptoms", num(rnd, 100, 300)], ["Diagnosis", num(rnd, 80, 250)], ["Medication", num(rnd, 120, 320)], ["Advice", num(rnd, 40, 160)]]),
      browserMix: donut("Browser", [["Chrome", num(rnd, 200, 500)], ["Safari", num(rnd, 40, 160)], ["Edge", num(rnd, 20, 90)], ["Firefox", num(rnd, 10, 50)]]),
      patients: { columns: [{ key: "date", label: "Date" }, { key: "doctor", label: "Doctor" }, { key: "patientName", label: "Patient" }, { key: "durationSec", label: "Duration (s)" }, { key: "generated", label: "Generated" }, { key: "edited", label: "Edited" }, { key: "browser", label: "Browser" }], rows: patients(rnd, { col: "x" }, 12).map((p) => ({ date: p.date, doctor: p.doctor, patientName: p.patientName, durationSec: num(rnd, 20, 180), generated: rnd() > 0.2 ? "Yes" : "No", edited: rnd() > 0.6 ? "Yes" : "No", browser: ["Chrome", "Safari", "Edge"][pick(rnd, 3)] })) },
      meta: { live: true, source: "mock" },
    };
  }

  if (e.collector) {
    const sent = num(rnd, 200, 600), resp = Math.round(sent * (0.3 + rnd() * 0.4));
    return {
      kpis: [
        { title: "Messages Sent", value: String(sent) },
        { title: "Responses", value: String(resp) },
        { title: "Response Rate", value: Math.round((resp / sent) * 100) + "%" },
        { title: "Patients Used", value: String(num(rnd, 80, 300)) },
      ],
      topReported: { columns: [{ key: "symptom", label: "Symptom" }, { key: "count", label: "Reports" }], rows: ["Fever", "Cough", "Headache", "Body ache", "Sore throat"].map((symptom, i) => ({ symptom, count: 80 - i * 12 })) },
      timeToResponse: { columns: [{ key: "band", label: "Time" }, { key: "count", label: "Count" }], rows: [["<1h", num(rnd, 40, 120)], ["1-6h", num(rnd, 30, 90)], ["6-24h", num(rnd, 20, 60)], [">24h", num(rnd, 5, 30)]].map(([band, count]) => ({ band, count })) },
      patients: { columns: [{ key: "date", label: "Sent" }, { key: "doctor", label: "Doctor" }, { key: "patientName", label: "Patient" }, { key: "mobile", label: "Mobile" }, { key: "status", label: "Status" }], rows: patients(rnd, { col: "x" }, 10).map((p) => ({ date: p.date, doctor: p.doctor, patientName: p.patientName, mobile: p.mobile, status: ["Responded", "Read", "Sent"][pick(rnd, 3)] })) },
      meta: { live: true, source: "mock" },
    };
  }

  // clinical triple-panel template
  const summary = summaryBlock(rnd, e);
  const out = {
    hero: { label: e.hero, value: summary.rows[0][e.col] },
    summary,
    genderMix: donut("Gender", [["Male", num(rnd, 20, 80)], ["Female", num(rnd, 20, 80)]]),
    ageMix: donut("Age band", AGE_BANDS.map((b) => [b, num(rnd, 5, 40)])),
    patients: (() => {
      const rows = patients(rnd, e);
      const cols = [{ key: "date", label: "Date" }, { key: "doctor", label: "Doctor" }, { key: "patientUHID", label: "Patient UHID" }, { key: "patientName", label: "Patient" }, { key: "gender", label: "Gender" }, { key: "age", label: "Age" }, { key: "mobile", label: "Mobile" }, { key: e.col, label: e.col }, { key: "slot", label: "Slot" }];
      if (e.drug) { cols.splice(8, 0, { key: "generic", label: "Generic" }, { key: "manufacturer", label: "Manufacturer" }); }
      return { columns: cols, rows };
    })(),
    meta: { live: true, source: "mock" },
  };
  if (e.drug) {
    out.genericMix = donut("Generic", e.items.slice(0, 6).map((it) => [it.split(" ")[0], num(rnd, 10, 60)]));
    out.manufacturerMix = donut("Manufacturer", ["GSK", "Cipla", "Sun Pharma", "Abbott", "Mankind"].map((m) => [m, num(rnd, 15, 70)]));
    out.genericVsBranded = donut("Type", [["Generic", num(rnd, 40, 120)], ["Branded", num(rnd, 60, 180)]]);
  }
  if (e.history) {
    out.allergyMix = { columns: [{ key: "k", label: "Allergy" }, { key: "count", label: "Patients" }], rows: [["Penicillin", 14], ["Sulpha", 9], ["Dust", 22], ["Pollen", 11], ["Peanut", 5]].map(([k, count]) => ({ k, count })) };
    out.comorbidityLoad = { columns: [{ key: "k", label: "Conditions" }, { key: "count", label: "Patients" }], rows: [["0", 40], ["1", 55], ["2", 28], ["3+", 12]].map(([k, count]) => ({ k, count })) };
  }
  return out;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, api_key, api_secret_key");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api\/v1\/analytics\//, "");

  res.setHeader("Content-Type", "application/json");
  const payload = buildDashboard(path);
  if (payload) { res.writeHead(200); res.end(JSON.stringify(payload)); return; }
  res.writeHead(404); res.end(JSON.stringify({ error: "Unknown analytics endpoint", path }));
});

server.listen(PORT, () => {
  console.log(`\n  📊 Analytics mock server  →  http://localhost:${PORT}`);
  console.log(`  Contract-conformant stub of the Analytics microservice (dev only).`);
  console.log(`  Endpoints: ${Object.keys(ENTITIES).map((p) => "/api/v1/analytics/" + p).join("\n             ")}\n`);
});
