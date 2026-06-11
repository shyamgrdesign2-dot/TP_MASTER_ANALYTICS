# Medical History: backend API spec

## Endpoint
- `GET /api/v1/analytics/clinical/medical-history` (dispatches to `buildMedicalHistoryDashboard` in `pm-analytics-service/src/analytics/builders/medical.ts`).
- Params: `startDate`, `endDate` (apply ONLY to `captureTrend`), `grain` (day|week|month, DATE_FORMAT '%Y-%m-%d' | '%x-W%v' | '%Y-%m', default month). `doctorIds` accepted but IGNORED (no doctor column; stated in meta.note). Tenant scope from JWT (`hm_business_id = :biz`).

## Source
- `tbl_micro_patient_medical_history`: `medical_history` is a JSON string per row: `[{ tmmhs_id, no_know_history, tags:[{ tmmhst_id, title, enable }], medical_history_remarks? }]`.
- Registry query: latest row per patient via `JOIN (SELECT patient_unique_id, MAX(tmpmh_id) ...)`, filters `tmpmh_delete=0`, `medical_history NOT IN ('','[]')`, LIMIT 20000. No date filter.
- Trend query: COUNT(*) entries + COUNT(DISTINCT patient_unique_id) grouped by `DATE_FORMAT(tmpmh_created_date, :g)` within the window.
- JSON parsed in TS (`extractSections`): bucket by `tmmhs_id` 1-5, keep `enable='Y'` only, group by `LOWER(TRIM(title))` (display = most frequent casing). Parse failures counted into `meta.parseFails`.

## Response blocks
- `kpis` (no hero): `patientsWithHistory`, `topCondition` (section 2), `topAllergy` (4), `topFamilyHistory` (3), `topLifestyle` (1), `topSurgical` (5).
- `conditionDist` / `allergyDist` / `familyDist` / `lifestyleDist` / `surgicalDist` {k,count}: top 10 per section by distinct patients.
- `additionalHistory` {k,count}: with vs without non-empty `medical_history_remarks` on the latest record.
- `captureTrend` {k,entries,patients}: per-grain saves in the window.
- `historyRegister` {section,item,patients,lastRecorded}: all sections ranked by patients, top 150.
- `meta` {live:true, rowCount, parseFails, note} where note states the registry semantics, the enable='N' exclusion and the unsupported doctor filter.

## FE wiring
- `DASHBOARD_ENDPOINTS.medical_history = "clinical/medical-history"`; chart types: five dist bars, additionalHistory donut, captureTrend line; `historyRegister` is in TABLE_BLOCKS (renders as table).
