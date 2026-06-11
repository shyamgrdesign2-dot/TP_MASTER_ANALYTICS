# Certificates (Care): backend API spec

## Endpoint

- `GET /api/v1/analytics/operational/certificates?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&grain=day|week|month&doctorIds=...`
- Auth: Bearer JWT; scope = `hospital_business_id` from token.
- Builder: `builders/operational.ts` `case 'certificates'`. SELECT-only, every sub-query wrapped in a catch that degrades to an empty block.
- FE: leaf `certificates` maps to `operational/certificates` (`analyticsNav.jsx:126`); titles/viz registered in `service.js` (`certTypeMix` donut, `certTrend` line and a SEQUENCE_BLOCK single-colour bar, `certByDoctor` bar, `certificates` register table).

## Tables and joins

- Facts: `tbl_certificate_upgrade c` (filter `c.tcu_del = 0 AND c.hm_business_id = :biz AND c.tcu_created_date BETWEEN :s AND :e`).
- Templates: `LEFT JOIN tbl_certificate_document d ON d.id = c.tcu_content_id` (`d.pms_default`: 1 system/global with `hm_business_id = 0`, 0 custom; library filter `del = 0`).
- Doctor names: `LEFT JOIN tbl_user_master u ON u.doctor_unique_id = c.doctor_unique_id` (string token join, NOT um_id).
- Patients: `LEFT JOIN tbl_patient_master p ON p.patient_unique_id = c.patient_unique_id`.
- Canonical type expression: `COALESCE(NULLIF(TRIM(d.title),''), NULLIF(TRIM(c.tcu_title),''), 'Untitled')`.
- NOTE for reimplementers: the `doctorIds` filter is bound directly against `c.doctor_unique_id IN (...)`. The FE sends um_id values elsewhere; if you extend this, map um_id to doctor_unique_id via `tbl_user_master` (the billing pages already do this).

## Response blocks

- `kpis[]`: `issued`, `topType` (value = type string, count in description), `topDoctor`, `patients`, `customTemplates` (system count in description). Empty period: `topType`/`topDoctor` render value `'—'`.
- `certTypeMix`: `{ k: type, count }` top 12.
- `certTrend`: `{ k: grainBucket, count }` (DATE_FORMAT by grain: `%Y-%m-%d` / `%x-W%v` / `%Y-%m`).
- `certByDoctor`: `{ k: doctor, count }` top 15, grouped by `c.doctor_unique_id`.
- `certificates` (register): `{ date, type, patient, doctor, source }`, latest 200; `source` = `d.pms_default = 0` ? 'Custom template' : `d.id` non-null ? 'System template' : 'Ad-hoc'.
- Template KPI source: `SELECT SUM(pms_default = 0 AND hm_business_id = :biz) AS custom, SUM(pms_default = 1) AS system FROM tbl_certificate_document WHERE del = 0` (not date-filtered: library size is point-in-time).
- `meta`: `{ live: true, rowCount }`.

No missing feeds: fully served from the replica.
