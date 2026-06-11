# Vitals: backend API spec

## Endpoint
- `GET /api/v1/analytics/clinical/vitals` (NestJS global prefix `api/v1/analytics`; controller `@Get('clinical/:entity')` dispatches to `buildVitalsDashboard` in `pm-analytics-service/src/analytics/builders/vitals.ts`).
- Params: `startDate`, `endDate` (YYYY-MM-DD; defaults 1970-01-01 / 2999-12-31, end expanded to 23:59:59), `doctorIds` (repeatable, normalised to array at the controller). `grain` not used. Tenant scope NEVER from params: `hm_business_id = scope.hospitalBusinessId` decoded from the Bearer JWT.

## Sources
- `tbl_casemanager_vitals` (alias cm): `tcv_del=0`, dated by `tcv_created_date`. Fields: `temp`, `pres` (pulse), `blood_press`, `resp_rate`, `spo2`, `general_rbs`, `fib4`, `waist_circumference`.
- `tbl_casemanager_b_composition`: `tcbc_del=0`, dated by `tcbc_created_date`. Fields: `height`, `weight`, `ofc`, `bmi`.
- `tbl_patient_master` LEFT JOIN on `patient_unique_id` for register names.
- Doctor filter: `cm.um_id IN (:doctorIds)` on both tables.

## Parsing rules (all value columns are VARCHAR)
- Numeric: `TRIM(col) REGEXP '^[0-9]+([.][0-9]+)?$'`. BP: `blood_press REGEXP '^[0-9]{2,3}/[0-9]{2,3}$'`, split with `SUBSTRING_INDEX`. BMI valid: numeric AND 10-60. RBS valid: numeric AND 20-1000.
- Each query wrapped in safeQ (per-query failure returns [], never 500s the page).

## Response blocks (dashboard-block contract)
- `hero` {label 'Vitals records', value}: COUNT(*) both tables.
- `kpis`: `avgVitalsPerPatient` (~records/patients), `topVital`, `patientsWithVitals` (COUNT DISTINCT patient_unique_id over the UNION of both tables).
- `vitalsCaptured` {k,count}: SUM(field <> '') per field, 12 rows fixed order, zero-filled.
- `bpMix` {k,count}: 5 fixed stage rows; note carries unparseable + not-recorded counts.
- `bmiMix` {k,count}: 4 fixed bands; note carries discard count.
- `bmiCoverage` {k,count}: With BMI (distinct patients with a valid BMI) vs Without.
- `rbsMix` {k,count}: 3 fixed bands; note carries fill rate + discards.
- `monitoredShare` {k,count}: patients with >=2 vs =1 entries (UNION universe).
- `patients` (register): date, patientUHID, patientName, source (Vitals | Body composition), recorded (comma list of filled fields), ORDER BY ts DESC LIMIT 100.
- `meta` {live:true, rowCount, note}.

## FE wiring
- `DASHBOARD_ENDPOINTS.vitals = "clinical/vitals"` (shell/analyticsNav.jsx); block keys must be in `BLOCK_ORDER`, titles in `BLOCK_TITLES`, chart types in `BLOCK_CHART_TYPE` (service.js): vitalsCaptured/bpMix/bmiMix/rbsMix bar, bmiCoverage/monitoredShare donut.
