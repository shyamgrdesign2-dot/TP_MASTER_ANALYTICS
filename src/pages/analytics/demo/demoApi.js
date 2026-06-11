// ---------------------------------------------------------------------------
// DEMO layer — TP Master Analytics standalone demo.
//
// This repo is a self-contained demo of the TP OPD + IPD Analytics module.
// `DEMO` is hard-wired ON: every analytics-service call resolves to a local
// ANONYMIZED fixture (captured from the real Analytics microservice against a
// busy tenant, then anonymized) instead of any HTTP request, and auth is
// bypassed. The production code paths live in the company repos — nothing in
// this folder exists there.
// ---------------------------------------------------------------------------

export const DEMO = true;

// CRA/webpack needs STATIC require() calls to bundle JSON — no dynamic paths.
// Keys mirror docs in fixtures/index.json: "endpoint" or "endpoint?careSetting=x".
const FIXTURES = {
  "operational/overview?careSetting=opd": require("./fixtures/operational__overview__opd.json"),
  "operational/footfall": require("./fixtures/operational__footfall.json"),
  "operational/patients?careSetting=opd": require("./fixtures/operational__patients__opd.json"),
  "operational/pharmacy": require("./fixtures/operational__pharmacy.json"),
  "operational/followups": require("./fixtures/operational__followups.json"),
  "operational/abha": require("./fixtures/operational__abha.json"),
  "operational/certificates": require("./fixtures/operational__certificates.json"),
  "operational/custom-modules": require("./fixtures/operational__custom-modules.json"),
  "clinical/symptoms": require("./fixtures/clinical__symptoms.json"),
  "clinical/diagnosis": require("./fixtures/clinical__diagnosis.json"),
  "clinical/drug": require("./fixtures/clinical__drug.json"),
  "clinical/lab-test": require("./fixtures/clinical__lab-test.json"),
  "clinical/vitals": require("./fixtures/clinical__vitals.json"),
  "clinical/medical-history": require("./fixtures/clinical__medical-history.json"),
  "clinical/obstetric": require("./fixtures/clinical__obstetric.json"),
  "clinical/growth-chart": require("./fixtures/clinical__growth-chart.json"),
  "clinical/vaccination": require("./fixtures/clinical__vaccination.json"),
  "clinical/gynec": require("./fixtures/clinical__gynec.json"),
  "clinical/procedures-opd": require("./fixtures/clinical__procedures-opd.json"),
  "financial/summary?careSetting=opd": require("./fixtures/financial__summary__opd.json"),
  "financial/summary?careSetting=ipd": require("./fixtures/financial__summary__ipd.json"),
  "financial/depth?careSetting=opd": require("./fixtures/financial__depth__opd.json"),
  "ipd/summary": require("./fixtures/ipd__summary.json"),
  "ipd/admissions": require("./fixtures/ipd__admissions.json"),
  "ipd/wards": require("./fixtures/ipd__wards.json"),
  "ipd/clinical": require("./fixtures/ipd__clinical.json"),
};

// The capture step lost some date-like cell values: they were serialized as
// empty objects ({}), which crash React when a table renders them ("Objects
// are not valid as a React child"). Sanitize every block's rows on the way
// out: any cell that is still an object/array becomes null, which the table
// honestly renders as "—". Charts read named scalar keys, so a null is inert.
function sanitizeCells(node) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node.rows) && Array.isArray(node.columns)) {
    node.rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      Object.keys(row).forEach((k) => {
        if (row[k] && typeof row[k] === "object") row[k] = null;
      });
    });
    return node;
  }
  Object.values(node).forEach((v) => sanitizeCells(v));
  return node;
}

/**
 * Resolve an analytics endpoint path (+ params) to its demo fixture.
 * careSetting variants resolve via "path?careSetting=x"; everything else by
 * plain path. Returns a DEEP CLONE — callers (service.js) mutate the response
 * (delete blocks, reset kpis), and require() caches a shared object.
 * Throws when an endpoint has no fixture (the few non-demo endpoints, e.g.
 * operational/pathology) so callers fall to their honest empty-widget path.
 */
export function getFixture(path, params = {}) {
  const clean = String(path || "").replace(/^\/+/, "").split("?")[0];
  const candidates = [];
  if (params && params.careSetting) candidates.push(`${clean}?careSetting=${params.careSetting}`);
  candidates.push(clean);
  candidates.push(`${clean}?careSetting=opd`);
  for (const key of candidates) {
    if (FIXTURES[key]) return sanitizeCells(JSON.parse(JSON.stringify(FIXTURES[key])));
  }
  throw new Error(`No demo fixture for "${clean}" — this endpoint isn't part of the demo dataset.`);
}

// Static doctor list so the Doctor filter is populated without the user-
// management API. Names match the anonymized doctors inside the fixtures
// (e.g. the doctor scorecard / by-doctor blocks) so the filter reads
// plausibly. NOTE: fixtures are pre-aggregated, so picking a doctor does not
// re-slice the demo data — it only scopes the live-API paths in production.
export const DEMO_DOCTORS = [
  { um_id: "501", um_name: "Dr. Asha Verma" },
  { um_id: "502", um_name: "Dr. Rohan Iyer" },
  { um_id: "503", um_name: "Dr. Suresh Menon" },
  { um_id: "504", um_name: "Dr. Neha Kulkarni" },
];
