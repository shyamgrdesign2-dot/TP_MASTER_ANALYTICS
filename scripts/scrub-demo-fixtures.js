#!/usr/bin/env node
/* eslint-disable no-console */
// ---------------------------------------------------------------------------
// scrub-demo-fixtures.js — one-shot (idempotent) demo-data hygiene pass over
// src/pages/analytics/demo/fixtures/*.json. Three jobs:
//
//   1. meta.note  — every fixture that has a `meta` object gets the standard
//      mock-data note (rendered as the per-page Note alert).
//   2. doctors    — every distinct real staff-name string found under
//      doctor-ish row keys (doctor / consultant / surgeon / anaesthetist /
//      prescriber / admittingDoctor / operatingDoctor ...) or as the k/name of
//      doctor-grouped blocks (byDoctor / otByDoctor / byAdmittingDoctor /
//      doctorScorecard / customByDoctor / certByDoctor / procByDoctor ...) is
//      remapped via a STABLE map to a fixed pool of plausible demo names.
//      Frequency-ordered (most frequent name gets the first pool name; ties
//      broken alphabetically) so the same input always yields the same output.
//      Pool exhausts into "Dr. Demo N". Non-person entries ("-", "Reception 1")
//      are left untouched. A second value-based pass also rewrites the SAME
//      names where they appear under audit-ish person fields (actor / editor /
//      creator / supplier / KPI value) so no real name survives anywhere.
//   3. junk sweep — explicit per-block replacements of obvious test strings
//      (abc / XYZ / Dummy / Test ...) with domain-appropriate values (counts
//      unchanged), plus the one absurd KPI numeric (overview net pharmacy
//      sales of ₹-10 crore -> ₹6,500, matching the Pharmacy page).
//
// Prints the doctor map and per-category change counts. Preserves each file's
// JSON formatting (pretty 2-space vs minified). Safe to re-run: already-mapped
// pool names and "Dr. Demo N" are never re-mapped.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const FIXDIR = path.join(__dirname, "..", "src", "pages", "analytics", "demo", "fixtures");

const NOTE_TEXT =
  "Sample data: this demo renders anonymized mock data captured from a test environment.";

// Fixed pool of plausible Indian demo doctor names; overflows to "Dr. Demo N".
const POOL = [
  "Dr. Asha Verma",
  "Dr. Rohan Iyer",
  "Dr. Kavita Rao",
  "Dr. Suresh Menon",
  "Dr. Neha Kulkarni",
  "Dr. Arjun Pillai",
  "Dr. Divya Nair",
  "Dr. Vikram Shetty",
  "Dr. Meera Joshi",
  "Dr. Sanjay Bhat",
];

// Row keys whose string value IS a doctor name.
const DOCTOR_KEY_RE = /doctor|consultant|surgeon|anaesthetist|prescriber|admitting/i;
// Blocks whose rows' k / name field is a doctor.
const DOCTOR_BLOCK_RE =
  /byDoctor|doctorScorecard|byAdmittingDoctor|otByDoctor|customByDoctor|certByDoctor|procByDoctor|advanceByDoctor|discountByDoctor/i;
// Audit-ish / loose fields that may also carry a (already-detected) doctor name.
const LOOSE_KEYS = new Set(["k", "name", "value", "actor", "editor", "creator", "supplier"]);
// Strings under doctor keys that are NOT people — never remap.
const NOT_A_PERSON = new Set(["-", "reception 1"]);

const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();
const isAlreadyDemo = (s) =>
  POOL.includes(String(s).trim()) || /^dr\. demo \d+$/i.test(String(s).trim());

// --- explicit junk-string replacements: file -> block -> field -> from -> to
const JUNK = [
  { file: "operational__pharmacy.json", block: "pharmaTopItems", field: "k", from: "abc", to: "Cetirizine 10mg" },
  { file: "operational__pharmacy.json", block: "pharmaMakerMix", field: "k", from: "XYZ", to: "Zydus Healthcare" },
  { file: "operational__pharmacy.json", block: "pharmaGenericMix", field: "k", from: "XYZ", to: "Cetirizine" },
  { file: "operational__custom-modules.json", block: "moduleMostUsed", field: "k", from: "Dummy module V2", to: "Diabetes Care Plan V2" },
  { file: "operational__custom-modules.json", block: "moduleRegister", field: "module", from: "Dummy module V2", to: "Diabetes Care Plan V2" },
  { file: "operational__certificates.json", block: "certTypeMix", field: "k", from: "Test Sohil", to: "Sports Fitness Certificate" },
  { file: "operational__certificates.json", block: "certTypeMix", field: "k", from: "Test rohit", to: "School Absence Certificate" },
  { file: "operational__certificates.json", block: "certTypeMix", field: "k", from: "test certificate setting", to: "Vaccination Certificate" },
  // ...and the same three type strings in the certificates register itself.
  { file: "operational__certificates.json", block: "certificates", field: "type", from: "Test Sohil", to: "Sports Fitness Certificate" },
  { file: "operational__certificates.json", block: "certificates", field: "type", from: "Test rohit", to: "School Absence Certificate" },
  { file: "operational__certificates.json", block: "certificates", field: "type", from: "test certificate setting", to: "Vaccination Certificate" },
  // Pharmacy stock register + counter-retail service lines.
  { file: "operational__pharmacy.json", block: "batchRegister", field: "medicine", from: "abc", to: "Cetirizine 10mg" },
  { file: "operational__pharmacy.json", block: "counterRetail", field: "item", from: "TEST", to: "Dressing" },
  { file: "operational__pharmacy.json", block: "counterRetail", field: "item", from: "test service name ", to: "Suture Removal" },
];

// --- absurd-numeric KPI fixes (negative / broken-on-sight values)
const KPI_FIXES = [
  // Overview "Net pharmacy sales" was ₹-10,00,00,099 (test sale-return). The
  // pharmacy page itself already nets ₹6,500 — align the overview card to it.
  { file: "operational__overview__opd.json", kpiKey: "pharmacy", when: (v) => typeof v === "number" && v < 0, to: 6500 },
];

const files = fs.readdirSync(FIXDIR).filter((f) => f.endsWith(".json"));
const docs = new Map(); // file -> parsed JSON
const rawStyle = new Map(); // file -> { pretty, trailingNL }
for (const f of files) {
  const raw = fs.readFileSync(path.join(FIXDIR, f), "utf8");
  rawStyle.set(f, { pretty: /^\{\s*\n/.test(raw), trailingNL: raw.endsWith("\n") });
  docs.set(f, JSON.parse(raw));
}

// ---------------------------------------------------------------------------
// Pass A — detect every distinct doctor-name string + frequency.
// ---------------------------------------------------------------------------
const freq = new Map(); // normName -> { count, sample }
function detect(node, inDoctorBlock) {
  if (Array.isArray(node)) return node.forEach((v) => detect(v, inDoctorBlock));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    const isDB = inDoctorBlock || DOCTOR_BLOCK_RE.test(k);
    const isDoctorVal =
      (DOCTOR_KEY_RE.test(k) && typeof v === "string") ||
      (isDB && (k === "k" || k === "name") && typeof v === "string");
    if (isDoctorVal) {
      const n = norm(v);
      if (n && !NOT_A_PERSON.has(n) && !isAlreadyDemo(v)) {
        const e = freq.get(n) || { count: 0, sample: v.trim() };
        e.count += 1;
        freq.set(n, e);
      }
    }
    detect(v, isDB);
  }
}
for (const f of files) detect(docs.get(f), false);

// Stable assignment: frequency desc, then name asc.
const ordered = [...freq.entries()].sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1));
const doctorMap = new Map(); // normName -> demo name
ordered.forEach(([n], i) => {
  doctorMap.set(n, i < POOL.length ? POOL[i] : `Dr. Demo ${i + 1}`);
});

// ---------------------------------------------------------------------------
// Pass B — apply. Doctor fields by key; loose fields by exact value match.
// ---------------------------------------------------------------------------
let doctorHits = 0;
function apply(node, inDoctorBlock) {
  if (Array.isArray(node)) return node.forEach((v) => apply(v, inDoctorBlock));
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    const isDB = inDoctorBlock || DOCTOR_BLOCK_RE.test(k);
    if (typeof v === "string") {
      const candidate =
        DOCTOR_KEY_RE.test(k) || (isDB && (k === "k" || k === "name")) || LOOSE_KEYS.has(k);
      if (candidate) {
        const mapped = doctorMap.get(norm(v));
        if (mapped) {
          node[k] = mapped;
          doctorHits += 1;
        }
      }
    }
    apply(v, isDB);
  }
}
for (const f of files) apply(docs.get(f), false);

// ---------------------------------------------------------------------------
// Junk strings + KPI numeric fixes
// ---------------------------------------------------------------------------
let junkHits = 0;
for (const j of JUNK) {
  const doc = docs.get(j.file);
  const block = doc && doc[j.block];
  if (!block || !Array.isArray(block.rows)) continue;
  for (const row of block.rows) {
    if (row && row[j.field] === j.from) {
      row[j.field] = j.to;
      junkHits += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Email anonymization — patient register rows still carried real-looking
// addresses (mobiles and names were already masked at capture, emails were
// not). Stable map: distinct originals sorted alphabetically -> sequential
// patientNN@example.com. Idempotent: already-anonymized values are skipped.
// ---------------------------------------------------------------------------
const DEMO_EMAIL_RE = /^patient\d+@example\.com$/i;
const emailSet = new Set();
function detectEmails(n) {
  if (Array.isArray(n)) return n.forEach(detectEmails);
  if (!n || typeof n !== "object") return;
  for (const [k, v] of Object.entries(n)) {
    if (/email/i.test(k) && typeof v === "string" && v.trim() && !DEMO_EMAIL_RE.test(v.trim())) {
      emailSet.add(v);
    }
    detectEmails(v);
  }
}
for (const f of files) detectEmails(docs.get(f));
const emailMap = new Map();
[...emailSet].sort().forEach((e, i) => {
  emailMap.set(e, `patient${String(i + 1).padStart(2, "0")}@example.com`);
});
let emailHits = 0;
function applyEmails(n) {
  if (Array.isArray(n)) return n.forEach(applyEmails);
  if (!n || typeof n !== "object") return;
  for (const [k, v] of Object.entries(n)) {
    if (/email/i.test(k) && typeof v === "string" && emailMap.has(v)) {
      n[k] = emailMap.get(v);
      emailHits += 1;
    }
    applyEmails(v);
  }
}
for (const f of files) applyEmails(docs.get(f));

let kpiHits = 0;
for (const fix of KPI_FIXES) {
  const doc = docs.get(fix.file);
  for (const kpi of (doc && doc.kpis) || []) {
    if (kpi.key === fix.kpiKey && fix.when(kpi.value)) {
      kpi.value = fix.to;
      kpiHits += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// meta.note
// ---------------------------------------------------------------------------
let noteHits = 0;
for (const f of files) {
  const doc = docs.get(f);
  if (doc && doc.meta && typeof doc.meta === "object") {
    if (doc.meta.note !== NOTE_TEXT) {
      doc.meta.note = NOTE_TEXT;
      noteHits += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Write back, preserving each file's formatting style.
// ---------------------------------------------------------------------------
for (const f of files) {
  const { pretty, trailingNL } = rawStyle.get(f);
  const out = JSON.stringify(docs.get(f), null, pretty ? 2 : 0) + (trailingNL ? "\n" : "");
  fs.writeFileSync(path.join(FIXDIR, f), out);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log("Doctor-name map (stable, frequency-ordered):");
ordered.forEach(([n, e]) => {
  console.log(`  ${JSON.stringify(e.sample)} (${e.count}x) -> ${doctorMap.get(n)}`);
});
console.log("");
console.log(`doctor name cells rewritten : ${doctorHits}`);
console.log(`junk strings replaced       : ${junkHits}`);
console.log(`emails anonymized           : ${emailHits} (${emailMap.size} distinct)`);
console.log(`absurd KPI numerics fixed   : ${kpiHits}`);
console.log(`meta.note set               : ${noteHits} fixtures`);
