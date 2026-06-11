# Follow-ups (Grow): backend API spec

## Endpoint

- `GET /api/v1/analytics/operational/followups?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&grain=day|week|month`
- Auth: Bearer JWT; scope `cm.hm_business_id = :biz` from token.
- Builder: `builders/operational.ts` `case 'followups'`.
- FE: leaf `followups` maps to `operational/followups` (`analyticsNav.jsx:120`); blocks registered in `service.js` (`adherenceMix` donut, `followupTrend` line, `byDoctor` table, `patients` register).

## Tables and joins

- Base: `tbl_case_manager cm`, filter `cm.tcm_del = 0 AND cm.hm_business_id = :biz AND cm.tcm_datetime BETWEEN :s AND :e`.
- Predicates (verbatim): `ADV: cm.tcm_followup_date >= '2000-01-01'`; `DUE: cm.tcm_followup_date < CURDATE()`; `KEPT: EXISTS (SELECT 1 FROM tbl_appointment_master a2 WHERE a2.patient_unique_id = cm.patient_unique_id AND a2.pam_del = 0 AND a2.hm_business_id = :biz AND a2.pam_app_date BETWEEN DATE(cm.tcm_followup_date) AND DATE_ADD(DATE(cm.tcm_followup_date), INTERVAL 45 DAY))`.
- Doctor names: `LEFT JOIN tbl_user_master u ON u.um_id = cm.um_id`. Patient details for the register: `LEFT JOIN tbl_patient_master p ON p.patient_unique_id = cm.patient_unique_id`.

## Response blocks

- `kpis[]`: `advised`, `rate` (% = advised/consults), `kept`, `adherence` (% = kept/due), `missed`, `avgInterval` (days, `AVG(DATEDIFF(tcm_followup_date, DATE(tcm_datetime)))` over advised rows).
- `adherenceMix`: fixed rows `{ k: 'Kept' | 'Missed' | 'Upcoming', count }` (Upcoming = advised AND NOT due).
- `followupTrend`: `{ k: grainBucket, advised, kept }`, last 12 buckets, chronological.
- `byDoctor`: `{ doctor, advised, kept }` top 15 by advised.
- `patients` (register): `{ patientUHID, patientName, mobile, visitDate, followUpDate, status }`, advised rows only, ORDER BY due date DESC, LIMIT 5000.
- `meta`: `{ live: true, rowCount }`.

## Known gap for extenders

- `doctorIds` and `hospitalId` are accepted by the route but NOT applied in this builder (its local WHERE clause omits the doctor/clinic filters; the Overview page's adherence KPI does apply `cm.um_id IN (...)`). To add: filter `cm.um_id` for doctors and `cm.hm_id` (FIND_IN_SET) for clinics, matching the Overview's `dCm` pattern.
- No missing microservice feeds: fully served from the replica.
