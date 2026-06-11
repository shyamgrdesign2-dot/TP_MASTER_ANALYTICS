# Diagnoses: backend API spec

## Endpoint

`GET /api/v1/analytics/clinical/diagnosis` (the worked REFERENCE clinical builder; clone it for new entities)

- Params: `startDate`, `endDate` (inclusive), `grain=day|week|month` (default day), `doctorIds` (repeatable). Scope from JWT.
- Builder: pm-analytics-service/src/analytics/builders/diagnosis.ts.

## Source

- `tbl_casemanager_diagnosis d` (`diagnosis`, `icd_code`, `type`, `patient_unique_id`, `um_id`, `hm_business_id`, `tcd_del`, `tcd_created_date`), join `tbl_patient_master p` on `patient_unique_id` (register only).
- Base WHERE: `d.tcd_del = 0 AND d.hm_business_id = :biz AND d.diagnosis <> '' AND d.tcd_created_date BETWEEN :s AND :e [AND d.um_id IN (...)]`.
- Status WHERE adds `d.tcd_created_date >= '2024-01-01'` (STATUS_FLOOR constant). Status CASE on `LOWER(TRIM(d.type))`: suspected/suspect to Suspected, confirmed to Confirmed, ruled out/rule-out/ruleout to Ruled out, else Unspecified.

## KPIs (key: formula)

- `patientsDiagnosed`: `COUNT(DISTINCT d.patient_unique_id)`.
- `diagnosesRecorded`: `COUNT(*)`.
- `distinctConditions`: `COUNT(DISTINCT LOWER(TRIM(d.diagnosis)))`.
- `icdCoded`: `SUM(d.icd_code <> '' AND d.icd_code IS NOT NULL)`; description embeds rate = coded/total, 1 decimal.
- `suspected` / `confirmed` / `ruledOut`: `COUNT(DISTINCT patient_unique_id)` per status bucket (status-floored WHERE).

## Blocks

- `hero`: top condition name.
- `diagnosisTrend`: `[k, diagnoses, patients]`, `DATE_FORMAT(tcd_created_date, :g)` with g = `%Y-%m-%d` / `%x-W%v` / `%Y-%m`; zero-filled via a TS skeleton spanning startDate..endDate (skipped if window invalid or over 1500 days, then raw buckets).
- `statusMix`: `[k, count]`, entry counts, fixed 4-bucket domain, zero-filled.
- `topConditions`: `[k, count]`, `GROUP BY LOWER(TRIM(diagnosis))`, `COUNT(DISTINCT patient_unique_id)`, top 15, first letter capitalised.
- `patients`: `[date, patientUHID, patientName, gender, age, mobile, diagnosis, icd_code]`, `GROUP BY patient_unique_id, DATE(tcd_created_date)` with `GROUP_CONCAT(DISTINCT ...)`, age = `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())`, newest first, LIMIT 5000.
- `meta.note` repeats the 2024 status-floor caveat.

Every query runs through a catch-to-empty wrapper so one schema drift cannot 500 the dashboard. FE: nav leaf `diagnosis` maps to `clinical/diagnosis`.
