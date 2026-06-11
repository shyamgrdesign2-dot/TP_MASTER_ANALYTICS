# Medications: backend API spec

## Endpoint

`GET /api/v1/analytics/clinical/drug` (FE nav leaf `rx` maps here)

- Params: `startDate`, `endDate`, `grain=day|week|month` (default day), `doctorIds` (repeatable). Scope from JWT.
- Builder: pm-analytics-service/src/analytics/builders/drug.ts.

## Source

- `tbl_medicine_report r` (`patient_unique_id`, `um_id`, `hm_business_id`, `tcm_datetime`, `tcm_id`, `tmm_id`, `tmm_generic`, `tmm_company`) JOIN `tbl_medicine_master m ON m.tmm_id = r.tmm_id` for the brand (`m.tmm_medicine_name`; brand is NOT on the report row). Doctor names via `tbl_user_master u ON u.um_id = r.um_id`.
- WHERE: `r.hm_business_id = :biz AND r.tcm_datetime BETWEEN :s AND :e [AND r.um_id IN (...)]` (no soft-delete column here).
- JUNK filter (top-N, registers, topMedication only): `NOT (LOWER(tmm_generic) LIKE 'testing%' OR LOWER(tmm_company) = 'test')`. Raw count KPIs skip it.
- CUSTOM definition: `LEFT JOIN tbl_medicine_master`; `IS_CUSTOM = (m.tmm_id IS NULL OR m.pms_default = 0)` (orphan free-typed lines bucket to custom).
- Prod note: the raw table is large; read the nightly rollup, SQL identical.

## KPIs

- `topMedication`: top brand by `COUNT(*)` lines (junk-filtered) with distinct patients.
- `medsPrescribed`: `COUNT(*)`. `distinctDrugs`: `COUNT(DISTINCT r.tmm_id)`. `patientsWithMeds`: `COUNT(DISTINCT r.patient_unique_id)`.
- `avgDrugsPerRx`: `ROUND(AVG(LEAST(linesPerTcmId, 30)))` over `GROUP BY r.tcm_id`.
- `customMeds`: `SUM(IS_CUSTOM)` plus % of all lines.

## Blocks

- `medCustomMix`: `[k, count]`, two fixed rows (From catalogue / Custom).
- `customByDoctor`: `[k, count]`, top 15 doctors by custom lines.
- `customMedsRegister`: `[medicine, company, lines, patients, lastPrescribed]`, `GROUP BY tmm_generic, tmm_company`, LIMIT 150.
- `rxTrend`: `[k, lines, patients]`, `DATE_FORMAT(tcm_datetime, :g)`, last 12 buckets (DESC then reversed; NOT zero-filled).
- `topGenerics`: top 10 `GROUP BY LOWER(TRIM(tmm_generic))`. `topManufacturers`: top 10 by `TRIM(tmm_company)`.
- `polypharmacy`: `[k, count]`, buckets 1/2/3/4/5+ over lines per `tcm_id`, zero-filled.
- `genericVsBranded`: `[k, count]`, `SUM(COALESCE(tmm_generic,'') <> '')` vs remainder (capture completeness).
- `drugsRegister`: `[brand, generic, company, lines, patients, lastPrescribed]`, `GROUP BY r.tmm_id`, LIMIT 100. `genericsRegister`: `[generic, brands, lines, patients]`, LIMIT 100.
- `meta.note`: junk-filter disclosure.
