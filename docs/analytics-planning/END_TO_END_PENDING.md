# Analytics — End-to-End Pending Checklist

The single source of truth for everything still needed to make the Analytics
section **fully functional end-to-end** (entry → screen → real data → download),
not just "endpoints exist". Keep this updated as items land.

Legend: ✅ done · 🟡 partial/needs wiring · 🔴 not started · ⛔ blocked (needs data/infra)

---

## 0. Entry point (home page → new screen) — ✅ DONE
- `SidebarDoctor.js`: clicking **Data Analytics** now routes internally to
  `/analytics` (the native module) instead of the legacy PHP SSO link-out.
- Dev override: `localStorage.tp_analytics_native='1'` (or GrowthBook flag
  `analytics-dashboard`) enables the native route without a deploy.
- Duplicate standalone "Analytics" link is hidden when the tenant already has
  the `data_analytics` module item. Active-state highlight on `/analytics` fixed.

---

## 1. Backend endpoints (`pm-analytics-service`)

### Live & verified (26 endpoints) ✅ — `npm run smoke` → 27/27 (incl. /health)
- **Clinical:** diagnosis, drug, lab-test, consultations, medical-history, vitals,
  procedure, growth-chart, quality, gynec, vaccination. The case-based clinical
  dashboards (diagnosis/drug/lab/procedure) carry KPIs + a monthly trend + by-doctor.
- **IPD:** summary — beds/BOR/ALOS/readmit KPIs + specialty occupancy, beds-by-ward,
  discharge mix, LOS dist, ALOS trend, surgeries, **ALOS-by-specialty, admissions-by-doctor,
  payer mix, MLC mix, gender mix**, admissions register.
- **Financial:** summary (composite), collection-trend, revenue-trend, payment-mode-mix,
  daily-collection, 3c-report, incentives.
- **Operational:** appointments-trend, case-type-mix, pathology, pharmacy, abha, **patients**.

**Patients** (`operational/patients`): 6 KPIs + gender/age/blood-group/city mixes + a
13-field register, with **customizable filters** — `gender` (multi), `bloodGroup`, `abha`,
`status` — surfaced as quick-filters on the leaf; the register + CSV/Excel export segment
by exactly the selected filters.

**Connection is ON by default** (commit `95b10bbf3`): `isApiOn()` defaults true and
ApiAnalytics auto-targets `http://localhost:4000` on localhost (else `analytics_api_url`).
No localStorage needed — every leaf below renders live once the new bundle loads.

Leaf shell live: `overview`, `appointments`, `patients`, `payments_dashboard`,
`opd_billing`, `ipd_billing`, `daily_collection`, `diagnosis`, `rx`, `lab_tests`,
`consult_inclinic`, `medical_history`, `vitals`, `procedures`, `growth_chart`,
`clinical_quality`, `gynec`, `vaccination`, `inpatient_summary`, `pathology`,
`pharmacy`, `abha`, `bulk_comm`, `reports_hub` (+ 3C/incentive downloads).

### Remaining endpoints (with verified data reality)
| Endpoint | Status | Data reality / blocker |
|---|---|---|
| `clinical/procedure` | ⛔ | No clean OPD source. Only `tbl_inpatient_doctor_procedure` (53) + `tbl_doctor_procedure_template` (34). Could derive IPD procedures from `tbl_patient_ot_schedule` (already in ipd/summary). |
| `clinical/medical-history` | ✅ | LIVE — conditions parsed from the `medical_history` JSON tags (Hypertension/Diabetes/Asthma...). `medical_history` leaf renders. |
| `clinical/surgical-history` | ⛔ | No dedicated table. Closest is `tbl_patient_ot_schedule` (OT, names unpopulated). |
| `clinical/symptoms` | ⛔ | NOT structured — templates only. |
| `clinical/vitals` | ⛔ | `blood_press`/`spo2` junk free-text ("8","999"); not chartable. |
| `engagement/voice-rx` | ⛔ | EMR only WRITES voice logs; needs a read/aggregation API. |
| `engagement/symptom-collector` | ⛔ | EMR only WRITES; needs a read store. |
| `operational/pharmacy` | ✅ | LIVE — retail sales (gross/bills/avg/trend/top items). Pharmacy nav leaf wired. |
| `operational/pathology` (OPD/IPD) | ✅ | LIVE — revenue/stream/trend/top-tests from `tbl_path_*`. Pathology nav leaf wired. |
| `financial/collection-report` (general/detailed/day-wise) | 🔴 | report card; reuse billing UNION + reportType. |
| `financial/billing-overall` | 🔴 | report card; revenue + cash-flow summary. |
| `ipd/occupancy`, `ipd/ward-summary`, `ipd/discharge-summary` | 🟡 | data already in `ipd/summary`; expose as `{columns,rows}` for `API_REPORTS.ipdOperational`. |
| `POST /query` (generic engine) | 🔴 | semantic registry + SQL compiler (Analytics_API_Spec §2.1). |

Note: `clinical/lab-test` ships off the free-text `tcm_investigation` field (no
normalized per-order table exists — `tbl_investigation` is just a name catalog with
no patient/business scope). It carries a `meta.note` about the free-text source.

---

## 2. Frontend ↔ Backend wiring (the "functional" gap)

How the new leaf shell loads data (`service.loadLeaf`):
`isApiOn() && DASHBOARD_ENDPOINTS[leaf]` → `apiDashboardWidgets` (expects a
**dashboard-block**) → else `PAGE_MAP[leaf]` → built page (live billing/appointment
API) → else placeholder.

- ✅ **Result-set endpoints now surface in the leaf shell.** `blocksToWidgets`
  renders a lone `{columns,rows}` as a chart + downloadable table (time-like x →
  line, single series → donut, else bar). Verified against `financial/daily-collection`.
- ✅ **`daily_collection` leaf wired** → `financial/daily-collection` (DASHBOARD_ENDPOINTS).
- ✅ **Composite financial dashboard wired** — `payments_dashboard` leaf →
  `financial/summary` (KPIs + collection/revenue trends + payment-mode mix + ledger).
- 🟡 **Remaining leaves with no API mapping** (placeholder today): optionally
  overlay `operational/appointments-trend` + `case-type-mix` on the Appointments
  leaf (it currently uses the built page off the live appointment API).
- ✅ **Report cards** `report_3c`, `incentives` wired via `REPORT_CARDS` →
  `downloadReport` (CSV/Excel).
- 🟡 **Verify** `BLOCK_ORDER`/`BLOCK_TITLES`/`BLOCK_CHART_TYPE` cover every key
  `ipd/summary` emits (specialtyOccupancy, bedsByWard, dischargeMix,
  lengthOfStayDist, alosTrend, surgeries) so the IPD dashboard renders fully.
- 🟡 **`ipdOperational` API_REPORTS** references `ipd/occupancy|ward-summary|
  discharge-summary` — build those result-set endpoints (see §1).

---

## 3. Integration & configuration (required for a real deploy)
Runbook + artifacts now exist in the service repo (`DEPLOY.md`, `Dockerfile`,
`.dockerignore`, `/health` probe, configurable CORS, `.env.example`). Build + health
verified locally. Remaining items need your infra/secrets:
- 🔴 **Deploy `pm-analytics-service`** — `docker build` + run per `DEPLOY.md`, on a
  host with private-link/VPN to the read replica + HTTPS in front.
- 🔴 **`analytics_api_url`** in the EMR config (prod) + dev
  `localStorage.tp_analytics_api_url` → the deployed base URL.
- 🔴 **Turn on API routing**: `analytics-use-api` flag or
  `localStorage.tp_analytics_api_on='1'` (`isApiOn`).
- ✅ **CORS** configurable via `ANALYTICS_CORS_ORIGINS` — set it to the EMR origin(s).
- ✅ **JWT signature verification** in code — set `ANALYTICS_JWT_SECRET` (+ `_ALG`)
  in the deployed env to match the EMR signing key.
- 🔴 **Read-only DB user.** Provision `analytics_ro` with `GRANT SELECT` only
  (SQL in `DEPLOY.md` §2) and put those creds in the deployed `.env`.
- ✅ **Health probe** `GET /api/v1/analytics/health` for LB readiness/liveness.

---

## 4. Data-quality caveats (product decisions, not bugs)
- ⛔ **Vitals** free-text is unreliable (`blood_press="8"`, `spo2="999"`).
- ⛔ **Incentives** returns empty everywhere — config exists, no billed line uses
  an incentivised service yet. Populates when real data exists.
- ⛔ **Symptoms** captured as templates, not structured fields.
- ⚠️ Some legacy free-text shows `???` (lossy latin1 write at source — unrecoverable).
- ⚠️ Synthetic seed clinic `625381708076900` skews IPD (14,737 identical rows);
  use diverse clinics (e.g. `396458127`) for realistic output.

---

## 5. Performance & hardening (before scale)
- 🔴 Redis cache keyed by query+scope hash.
- 🔴 Nightly rollups for heavy tables (`tbl_medicine_report` is large) — read the
  rollup, not the raw table.
- 🟡 Patient registers are capped at `LIMIT 5000`; add pagination/streaming for full export.

---

## 6. "Done" verification checklist (per leaf)
- [ ] Sidebar entry → `/analytics` lands on the native shell.
- [ ] With `tp_analytics_api_on=1` + `tp_analytics_api_url` set, each wired leaf
      renders REAL data (no "No data"/"service unreachable").
- [ ] Charts + KPIs + patient/register tables populate; downloads export CSV/Excel.
- [ ] Unwired leaves show the honest placeholder (not fake data, not an error).
- [ ] Service is read-only (SELECT only), tenant-scoped, JWT-verified.
- [ ] Deployed; flags on; CORS ok; no console errors.
