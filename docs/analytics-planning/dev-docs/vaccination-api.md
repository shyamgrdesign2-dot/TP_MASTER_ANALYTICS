# Vaccination: backend API spec

## Endpoint
- `GET /api/v1/analytics/clinical/vaccination` (dispatches to `buildVaccinationDashboard` in `pm-analytics-service/src/analytics/builders/vaccination.ts`).
- Params: `startDate`, `endDate` (window on `vp.tvp_given_date`). `doctorIds` accepted but IGNORED (`tvpv_user` is the recording user, not the doctor). Tenant scope from JWT, applied via the PATIENT's hospital (dose rows carry no business column).

## Sources and joins
- `tbl_vaccine_patient_vacc` v (dose rows: `tvpv_vaccine`, `tvpv_vaccine_all` varchar, `tvpv_temp_id`, `tvpv_dose`, `tvpv_route`, `patient_unique_id`, `tvp_id`).
- JOIN `tbl_vaccine` vc ON `vc.tvac_id = IF(v.tvpv_vaccine > 0, v.tvpv_vaccine, CAST(v.tvpv_vaccine_all AS UNSIGNED))` (the bulk-entry fallback; `vc.tvac_del` intentionally NOT filtered).
- JOIN `tbl_vaccine_patient` vp ON `tvp_id` for `tvp_given_date` (the only dose date; `> '1900-01-01'` drops NULLs and placeholders).
- JOIN `tbl_patient_master` p ON `patient_unique_id`, JOIN `tbl_hospital_master` h ON `h.hm_id = p.hm_id`; scope `h.hm_business_id = :biz`.
- IAP split: LEFT JOIN `tbl_vaccine_templete` t ON `t.tvt_id = v.tvpv_temp_id`; `t.pms_default IN (1,2)` = IAP, else (including unmapped) Other.

## Response blocks
- `hero` {label 'Top vaccine', value}.
- `kpis`: `doses` (COUNT(*)), `patients` (COUNT DISTINCT v.patient_unique_id), `vaccines` (COUNT DISTINCT vc.tvac_id).
- `summary` {vaccine,doses,patients}: per `COALESCE(NULLIF(vc.tvac_name,''),'(unnamed)')`, ORDER BY doses DESC LIMIT 50.
- `iapVsOther` {k,doses,patients}: two fixed rows ('IAP standard schedule', 'Clinic-customised or other'), zero-filled.
- `patients` (register): date (DATE(tvp_given_date)), patientUHID, patientName, vaccine, dose (`NULLIF(tvpv_dose,'')`), route (`NULLIF(tvpv_route,'')`); ORDER BY date DESC LIMIT 5000.
- `meta` {live:true, rowCount, note}: note states the given-date rule, the bulk-join recovery and the IAP derivation.

## FE wiring
- `DASHBOARD_ENDPOINTS.vaccination = "clinical/vaccination"`; `iapVsOther` donut; titles in BLOCK_TITLES (service.js).

## Known gaps (would need product/schema changes, no external feed)
- Refusal tracking: no status field exists anywhere in the vaccine tables.
- Brand-per-dose and batch/lot/expiry: not captured at administration time.
- Due/overdue list: requires evaluating the patient's template schedule against administered doses (template ages exist in `tbl_vaccine_templete.tvt_age` sections); buildable server-side later, no new feed needed.
