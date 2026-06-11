# Procedures: backend API spec

## Endpoints today

- `GET /api/v1/analytics/clinical/procedures-opd`: what the FE Procedures page calls (nav leaf `procedures` in analyticsNav.jsx). Served by `buildProceduresMockDashboard` (pm-analytics-service/src/analytics/builders/mock.ts): deterministic sample blocks, `meta: { live: false, note: SAMPLE DATA ... }`. Params accepted but ignored.
- `GET /api/v1/analytics/clinical/procedure`: separate LIVE builder (builders/procedures.ts) over the replica's `tbl_inpatient_doctor_procedure` (`tidp_title`, `tidp_date`, `tidp_del`, `tidp_anaesthetic_type`, `patient_unique_id`, `um_id`, `hm_business_id`). Inpatient-only and tiny; not wired to the OPD Procedures page. Blocks: hero, kpis (total/patients/distinct), procedureTrend, byDoctor, summary, genderMix, ageMix, patients register (LIMIT 5000).

## Sample response blocks (the page contract; the real feed must fill the SAME keys)

- `kpis`: `topProcedure`, `performed`, `distinctProcedures`, `patientsWithProcedure`.
- `procTopList`: `[k, count]` (bar). `procTrend`: `[k, count]` per period (line). `procByDoctor`: `[k, count]` (bar).
- `procRegister`: `[date, patient, procedure, doctor, notes]` (download table).
- `meta`: `{ live: false }` until real data; flip to `live: true` when the feed lands. The FE needs no changes: only the row sources swap.

## MISSING FEED: pm-patient-docs bulk export (required contract)

Source of truth: pm-patient-docs microservice (config `lab_params_api_url`), endpoint `/api/v1/surgeries`, today per-patient only. Two acceptable options (mirrors GYNEC-OBSTETRIC-INTEGRATION.md option A/B):

- **Option A (preferred), bulk export endpoint**: `GET /api/v1/surgeries/export?businessId=<hm_business_id>&from=YYYY-MM-DD&to=YYYY-MM-DD&page=&pageSize=` returning flattened rows: `{ recordId, patientUniqueId, doctorId (um_id), businessId (hm_business_id), procedureName, performedDate, notes, deleted, updatedAt }`. Service-to-service auth; paginated; `updatedAt` cursor support for incremental pulls.
- **Option B, nightly sync into the analytics replica**: same fields landed as a table (e.g. `rpt_opd_procedures`), keyed by recordId, soft-delete aware.

Field mapping to blocks: procedureName feeds topProcedure/procTopList/distinctProcedures; performedDate feeds procTrend (grain-aware `day|week|month`); doctorId joins `tbl_user_master.um_name` for procByDoctor; patientUniqueId joins `tbl_patient_master` for the register and distinct-patient KPIs; businessId is the mandatory scope filter; notes fills the register. Once available, clone builders/diagnosis.ts query patterns and replace the mock in analytics.service.ts case `procedures-opd`.
