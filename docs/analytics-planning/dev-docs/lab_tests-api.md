# Lab Tests: backend API spec

## Endpoint

`GET /api/v1/analytics/clinical/lab-test` (FE nav leaf `lab_tests` maps here)

- Params: `startDate`, `endDate`, `grain=day|week|month` (default day), `doctorIds` (repeatable). Scope from JWT.
- Builder: pm-analytics-service/src/analytics/builders/lab.ts.

## Source and parsing

- `tbl_case_manager cm JOIN tbl_patient_master p ON patient_unique_id`. WHERE: `cm.tcm_del = 0 AND cm.hm_business_id = :biz AND cm.tcm_investigation <> '' AND cm.tcm_datetime BETWEEN :s AND :e [AND cm.um_id IN (...)]`. Fetch newest-first, LIMIT 20000.
- `tbl_investigation` is only a catalogue of report names (no patient or business scope), hence the in-app split.
- `cleanInvestigations()` (exported, reuse it): converts `<br>` to the `//~//` delimiter, strips HTML tags, `&nbsp;`, and `Â` mojibake, splits on `//~//`, drops trailing `Remark: ...`, comma-splits only when the segment has no parentheses (preserves "Bilirubin (Total, Direct)"), collapses whitespace, drops empties, `[]`, 1-char strings, and lorem-ipsum junk.
- Per-test counting: DISTINCT patients per cleaned test name (Map of Sets in TS).

## KPIs

- `orders`: fetched row count (consults with at least one investigation).
- `patients`: distinct `patient_unique_id`. `distinct`: unique cleaned test names.

## Blocks

- `hero`: top investigation by distinct patients.
- `labTrend`: `[k, orders, patients]`, `DATE_FORMAT(tcm_datetime, :g)` (g = `%Y-%m-%d` / `%x-W%v` / `%Y-%m`), last 12 buckets DESC then reversed (NOT zero-filled).
- `byDoctor`: `[doctor, patients]`, `LEFT JOIN tbl_user_master`, `COUNT(DISTINCT patient_unique_id)`, top 15.
- `summary`: `[investigation, total]`, top 50 by distinct patients (computed in TS).
- `genderMix`: `[k, count]`, M/F folded to Male/Female, else Other; first-seen patient only.
- `ageMix`: `[k, count]`, bands from `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())`: <18, 18-30, 30-45, 45-60, >60 (only bands present are returned).
- `patients`: `[date, patientUHID, patientName, gender, age, mobile, investigations]` (cleaned, comma-joined).
- `meta.note`: free-text caveat on `tcm_investigation`.
