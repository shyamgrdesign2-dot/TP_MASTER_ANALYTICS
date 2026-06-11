# ABHA / ABDM (Grow): backend API spec

## Endpoint

- `GET /api/v1/analytics/operational/abha?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&grain=day|week|month`
- Auth: Bearer JWT; scope `hm_business_id` from token.
- Builder: `builders/operational.ts` `case 'abha'`. Dictionary: `docs/analytics-planning/METRICS-CARE.md` (ABHA section).
- FE: leaf `abha` maps to `operational/abha` (`analyticsNav.jsx:114`); blocks in `service.js` (`linkageMix` donut, `linkageTrend` line and SEQUENCE_BLOCK, `patients` register).

## Tables and joins

- Cohort: `(SELECT DISTINCT patient_unique_id FROM tbl_appointment_master WHERE pam_del = 0 AND hm_business_id = :biz AND pam_app_date BETWEEN :s AND :e) a JOIN tbl_patient_master p` (patient flags are global; period scoping rides on visits).
- Flags on `tbl_patient_master`: `pm_abha_address` (linked = non-empty), `pm_abha_verify`, `pm_abha_consent`; ALWAYS guard `IN (0,1)` (corrupted huge-int rows).
- Care contexts: `tbl_abha_hip_link_master` WHERE `tahlm_del = 0 AND hm_business_id = :biz AND hip_linking_token <> ''` (count only, not date-filtered).
- Enrolment trend: `tbl_patient_abha_with_hospital w JOIN tbl_hospital_master h ON h.hm_id = w.abha_hospital` WHERE `h.hm_business_id = :biz AND w.createdAt >= '2000-01-01'`, `COUNT(DISTINCT w.patient_unique_id)` per grain bucket (full history, not range-filtered).
- All sub-queries via a safe wrapper: a failing block degrades to empty, never a 500.

## Response blocks

- `kpis[]`: `linked`, `verified`, `unverified`, `consented`, `careCtx`, `rate` (% or value `'—'` when the cohort is empty). Descriptions carry the proxy labelling verbatim.
- `linkageMix`: fixed rows `{ k: 'Verified' | 'Linked (unverified)' | 'Not linked', count }`.
- `linkageTrend`: `{ k: grainBucket, count }` enrolments.
- `patients` (register): `{ patientUHID, patientName, gender, abhaAddress, abhaStatus }`, linked-first, LIMIT 5000.
- `meta`: `{ live: true, rowCount, note }` where note states the ABDM gaps.
- Known gap for extenders: `doctorIds`/`hospitalId` are accepted by the route but not applied in this builder (the Overview's ABHA KPI does apply the doctor filter via the appointment join; replicate that to add it here).

## MISSING FEED: ABDM-microservice export (required for the KYC depth)

To light up the three blocked cards, the ABDM service must persist and export, keyed by `hospital_business_id` (same pattern as the gynec feed contract in `docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md`):

1. **Enrolment events**: `patient_unique_id`, `hospital_business_id`, `channel` (KYC: aadhaar/biometric vs non-KYC), `created_at`. Yields the true KYC vs non-KYC ABHA-patient split (replacing the verification proxy).
2. **Consent requests**: request id, patient, purpose, `status` (granted/denied/expired), `kyc_flag`, timestamps. Yields request-level consent success/failure, with and without KYC.
3. **Care-context links**: link id, patient, `kyc_flag`, linked_at. Yields the KYC split of care contexts and a properly date-filterable care-context trend.
