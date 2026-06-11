# Patients: backend API spec

## Endpoint
`GET /api/v1/analytics/operational/patients`
- Standard params: `startDate`, `endDate`, `doctorIds` (um_id), `hospitalId` (hm_id CSV, FIND_IN_SET), `careSetting=opd|ipd|all` (FE sends `opd`).
- In-page filter params (optional, AND-combined, also segment the register): `gender=Male,Female,Other` (CSV; expand Male->('Male','M'), Female->('Female','F'): a minority of rows store single letters), `bloodGroup=B+` (exact pm_blood_group), `abha=linked|verified|notlinked` (pm_abha_address non-empty / pm_abha_verify=1 / NOT linked), `status=new|returning` (lifetime visits =1 / >1).
- Bearer JWT; tenant = result.hospital_business_id. Builder: pm-analytics-service/src/analytics/builders/patients.ts (buildPatientsDashboard). FE: DASHBOARD_ENDPOINTS.opd_patients = { endpoint: "operational/patients", params: { careSetting: "opd" } }.

## Cohort SQL (the part to get right)
- Visit sources: OPD = tbl_appointment_master (pam_del=0, hm_business_id=:biz, pam_app_date in window); IPD = tbl_atd_patient_master (tapm_delete=0, tapm_admitting_date). careSetting picks one or UNION ALL both.
- Base = GROUP BY patient_unique_id over the period sources (visits, MIN/MAX dt = first/last visit) JOIN tbl_patient_master ON patient_unique_id.
- Lifetime visits: same sources WITHOUT the start date, capped at the period END (`dt <= :e`), LEFT JOIN as lv.lifeVisits. new = COALESCE(lifeVisits, visits)=1; returning = >1. This cap is the new/returning definition; do not use pm_created_date.

## Response blocks
- `hero` Total patients = COUNT(*) over the cohort. `kpis[]`: new, returning, age (ROUND(AVG(TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())))), abha (% pm_abha_address non-empty), reach (% pm_contact_no OR pm_email non-empty), topBlood (max of the 8 canonical groups after normalisation).
- `genderMix` (M/F/Other 0-filled), `ageMix` (5 bands 0-filled), `bloodGroupMix` (8 canon groups 0-filled + normalised extras + 'Not recorded'; normalise: strip parenthetical, leading 0 -> O, uppercase), `maritalMix` (5 canon + 'Not recorded', pm_married_status), `cityMix` (pm_city, every named city + Unknown last, LIMIT 50).
- RFM blocks (skipped when careSetting=ipd): anchor = MAX(pam_app_date) <= CURDATE for the business (NOT CURDATE itself). Per patient: freq = lifetime appointment count, lastV = MAX(pam_app_date); monetary = SUM(tobo_invoice_grand_total) tbl_opd_billing_overview (tobo_delete=0, tobo_invoice_cancel=0) grouped by patient_unique_id (exact patient-level join, no pam_id needed). Segment CASE top-down: Champions (DATEDIFF(anchor,lastV)<=90 AND freq>=3), Loyal (<=180 AND freq>=2), Recent (<=180), At risk (<=365), Lapsed (else). Blocks: `rfmMix` (5 segments 0-filled), `visitFrequency` (buckets 1/2/3/4-5/6-10/10+ 0-filled), `mostValuable` (spent>0, ORDER BY spent DESC LIMIT 100), `lapsedRecall` (DATEDIFF>180 AND freq>=2, ORDER BY spent DESC LIMIT 100).
- `patients` register: UHID, name, gender, age, mobile, email, city, state, bloodGroup, ABHA status ('KYC verified' when pm_abha_verify=1, else 'Linked'/'Not linked'), registered (pm_created_date), visits, lastVisit; ORDER BY lastVisit DESC LIMIT 5000; honours every filter above.
- `meta`: { live, rowCount, filters: { gender, bloodGroup, abha, status } } (echo of the applied segment).

## Notes for extension
- No missing feeds block this page; all sources are in the replica.
- If adding acquisition-source analytics, reuse the footfall builder's SOURCE_CASE derivation (tbl_appointment_source) rather than inventing a new attribution.
- Keep zero-fill: gender, age bands, the 8 blood groups and the 5 RFM segments are fixed domains; an empty group must render at 0, never disappear.
