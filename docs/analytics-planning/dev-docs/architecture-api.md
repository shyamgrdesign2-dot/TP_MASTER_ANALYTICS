# Architecture overview: backend API spec

## Backend notes: Architecture

### Routes (NestJS, global prefix `api/v1/analytics`)
- `GET health` (unauthenticated probe).
- `GET clinical/:entity` (diagnosis, symptoms, drug, lab-test, vitals, medical-history, growth-chart, vaccination, obstetric, quality...).
- `GET operational/:report` (overview, footfall, patients, pharmacy, pathology, abha, followups, certificates, the report exports...).
- `GET financial/:report` (summary, collection-trend, revenue-trend, payment-mode-mix, daily-collection, 3c-report, incentives, depth).
- `GET ipd/:report`, `GET engagement/:entity`, `POST query` (generic engine, not built yet).
- Controller normalises repeatable params: a single `doctorIds=408` becomes `['408']` before any builder runs.
- Common params (`src/common/scope.ts` AnalyticsQuery): `startDate`, `endDate`, `doctorIds[]`, `hospitalId`, `grain` (day|week|month), `reportType`; leaf extras passed through by the FE: `careSetting`, `gender`, `bloodGroup`, `abha`, `status`.

### Auth
- Bearer JWT on every call; the `@Scope()` decorator verifies (when `ANALYTICS_JWT_SECRET` + `ANALYTICS_JWT_ALG` are set; dev falls back to unverified decode with a logged warning) and extracts `result.hospital_business_id` -> `scope.hospitalBusinessId`, plus `user_id`, `clinic_id`, `doctor_unique_id`, `roles`.
- EVERY builder query filters `hm_business_id = :biz` from that scope. Tenant scope is never accepted from the client.

### Universal response contract (what every endpoint returns)
- **Dashboard-block**: `{ hero?: {label, value}, kpis?: [{key, label, value, unit?, description?, delta?, spark?}], <blockKey>: {columns:[{key,label,type?}], rows:[...], note?}, patients?: {columns, rows}, meta: {live, rowCount, compareLabel?, note?} }`. KPI `unit:'₹'` renders as a money prefix; `key` is the stable identity for per-card customization.
- **Lone result-set**: `{ columns, rows, meta }` (the report exports); the FE auto-renders chart + downloadable table (time-like x -> line, single series -> donut, else bar; wide tables render table-only).

### FE registration maps (src/pages/analytics/service.js)
A dashboard-block key renders ONLY if it appears in `BLOCK_ORDER`; an unregistered key is silently ignored. To ship a new block: add the key to the builder response AND register it in: `BLOCK_TITLES` (display title), `BLOCK_INFO` (tooltip copy), `BLOCK_CHART_TYPE` (donut|bar|line|stackedBar; default bar), `BLOCK_ORDER` (render gate + page order), `BLOCK_GROUP` + `SECTION_ORDER` (labelled band; unmapped -> More insights; tables collect under Patient data), `TABLE_BLOCKS` (renders as searchable table, not chart), `SEQUENCE_BLOCKS` (ordered sequences: single-colour bars + line/bar toggle; donuts never toggle). Leaf -> endpoint wiring: `DASHBOARD_ENDPOINTS` in `src/pages/analytics/shell/analyticsNav.jsx` (string or `{endpoint, params}`); `PAGE_MAP` routes the FE-built pages (overview, opd_billing, bulk_comm, reports_hub).

### Needed-but-missing backend feeds (one-line contracts)
- **Gynec (menstrual)**: pm-medicalhistory `GET /gynec-history/export?businessId=&from=&to=` -> flattened timeline rows (lmp, ageAtMenarche, cycle, flow, pain, reproductiveLifeStages...); today only a per-patient GET exists and the doc carries no tenant id (join patientId -> `tbl_patient_master`). Contract: docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md.
- **Obstetric (current)**: same service, same export shape for the obstetric-history collection; replica obstetric tables are frozen ~mid-2024 so the page is legacy-only.
- **Procedures (OPD)**: pm-patient-docs (`lab_params_api_url`, `/api/v1/surgeries`) bulk export: procedures by hospital + date range; the replica only holds a tiny inpatient procedure table.
- **Custom modules**: dynamic-modules service (`custom_module_api_url`) bulk export: modules + reuse log by hospital (created, creator, used-by-other-doctor events).
- **ABHA KYC / consent**: ABDM service export of request-level consent success/failure and the KYC vs non-KYC enrolment channel; the replica only has coarse patient flags (`pm_abha_verify`, `pm_abha_consent`), used as stated proxies.
- **Symptoms service**: per-patient symptoms read endpoint for the Overview Top-symptoms card (the Care > Symptoms page already parses structured Rx entries from `tcm_history_box`).
- **VoiceRx / symptom-collector**: read/aggregation API over today's write-only logs before `engagement/*` can build.
- Each feed should land as either a bulk export the service polls, a read replica connection, or a nightly sync into a small `tatva_clinic` table (pattern A/B/C in the gynec doc); pm-analytics-service is mysql2-only today (no HTTP client).
