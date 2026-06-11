# Gynec (Menstrual): backend API spec

## Endpoint (today)
- `GET /api/v1/analytics/clinical/gynec` returns `buildGynecMockDashboard` (`pm-analytics-service/src/analytics/builders/mock.ts`): deterministic sample data, ignores all params, `meta: { live:false, note: SAMPLE_NOTE('pm-medicalhistory gynec service') }`.
- Sample blocks (the page contract to keep when going live): `kpis` (`patientsWithGynec`, `avgMenarche`, `avgCycle`, `avgFlowDays`, `irregularShare`), `cycleMix`, `flowMix`, `painMix`, `stageMix` (all {k,count} donuts), `gynecRegister` {patient,age,lmp,cycle,flow,pain,stage} table.
- FE wiring: `DASHBOARD_ENDPOINTS.gynec = "clinical/gynec"`; blocks already registered in BLOCK_ORDER / BLOCK_TITLES / BLOCK_CHART_TYPE.

## Where the real data lives (pm-medicalhistory microservice)
- `gynec_api_url = https://pm-medicalhistory-{env}.tatvacare.in/api/v1/gynec-history`.
- Existing calls (EMR `ApiGynec.js`): `GET /gynec/{patientId}/{userId}` (point lookup), `POST /gynec`, `PATCH /gynec/{patientId}/{userId}`. `userId` = doctor's `user_id` from the JWT.
- Document shape: `{ patientId, timeline: [{ lmp, ageAtMenarche, ageAtMenopause, intervalOfCycle, durationOfMenstrualFlow, numberOfPadsPerDay, cycle, flow, pain, occurrenceOfPain, clots, reproductiveLifeStages, typeOfMenopause, note, createdAt, createdBy }], createdAt, createdBy }`.

## Why analytics cannot read it (three blockers)
1. No bulk/list endpoint: per-patient GET only; N HTTP calls per cohort is not viable.
2. `pm-analytics-service` is a pure read-replica reader (mysql2 only): no HTTP client, and proxying the doctor's session token is wrong and blocked.
3. No tenant id in the payload: `patientId` must be joined back to `tbl_patient_master` in the replica for `hm_business_id` attribution.

## MISSING FEED, required contract (pick one; A recommended)
- **A. Bulk export on pm-medicalhistory**: `GET /gynec-history/export?businessId=&from=&to=` returning flattened timeline rows (one row per timeline entry, keys above plus patientId). Analytics reads it on a schedule or proxies it. Same shape needed for the obstetric collection.
- **B. Read replica** of the pm-medicalhistory datastore: analytics queries it directly, joins patient to tenant in the replica.
- **C. Nightly sync job** copying the flattened timeline into a `tatva_clinic` table keyed by `patient_unique_id` (best fit for the existing builder pattern).
- Full contract: `docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md`. When a feed lands, replace the mock's row sources; the page contract stays.
