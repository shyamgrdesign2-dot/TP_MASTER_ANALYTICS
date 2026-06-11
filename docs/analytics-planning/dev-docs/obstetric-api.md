# Obstetrics: backend API spec

## Endpoint
- `GET /api/v1/analytics/clinical/obstetric` (dispatches to `buildObstetricDashboard` in `pm-analytics-service/src/analytics/builders/obstetric.ts`).
- Params: `startDate`, `endDate` (window applies to `tbl_case_obstetrics_history` blocks via `tcoh_created_date`; the EDD pipeline, ANC mix and pregnancy totals are deliberately not windowed: legacy registry reads), `doctorIds` (filters `o.um_id` on the history table only). Tenant scope from JWT (`hm_business_id = :biz` on all three tables).

## Sources (all legacy, frozen ~mid-2024)
- `tbl_case_obstetrics_history` (o): `tcoh_del=0`. Event type from `UPPER(LEFT(tcoh_box_type,1))`: P=Pregnancy/delivery, A=Abortion, E=Ectopic, else Other. Detail fields: `tcoh_p_delivery` (mode), `tcoh_p_weeks` (free text, weeks via `REGEXP_SUBSTR('[0-9]+')`), `tcoh_p_gender`, `tcoh_p_status`.
- `tbl_case_obstetrics_history_pregnancy` (hp): `tcohp_del=0`; `tcohp_expected_delivery_date > '1900-01-01'` for the EDD pipeline; `tcohp_pregnant IN ('yes','y','1')` for currently-pregnant.
- `tbl_doctor_anc_scheduler` (a): `anc_del=0`, `anc_status` mix, top 8.
- `tbl_patient_master` LEFT JOIN for register name + age (`TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())`).

## Response blocks
- `kpis` (no hero): `patients`, `records`, `pregnancies`, `abortions`, `ectopic`, `currentlyPregnant`.
- `outcomeMix` {k,count}: fixed order Pregnancy/delivery, Abortion, Ectopic; Other appended only when nonzero.
- `deliveryModeMix` {k,count}: P-events only, `COALESCE(NULLIF(TRIM(tcoh_p_delivery),''),'Not recorded')`, top 10.
- `gestationMix` {k,count}: 5 fixed bands, zero-filled.
- `eddPipeline` {k,count}: per `DATE_FORMAT(tcohp_expected_delivery_date,'%Y-%m')`.
- `ancStatusMix` {k,count}: per `anc_status`.
- `patients` (register): date, patientUHID, patientName, age, outcome, delivery, gestationWeeks, babyGender, babyStatus; ORDER BY tcoh_created_date DESC LIMIT 200.
- `meta` {live:true, rowCount, note}: note is the legacy banner (has-data vs no-data variants).

## Missing feed
- Modern obstetric entries live at `obstetric_api_url = https://pm-medicalhistory-{env}.tatvacare.in/api/v1/obstetric-history` (per-patient pattern, no bulk feed). Required contract = the same A/B/C options as the gynec page (recommended: `GET /obstetric-history/export?businessId=&from=&to=` returning flattened rows). See `docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md`.

## FE wiring
- `DASHBOARD_ENDPOINTS.obstetric = "clinical/obstetric"`; outcomeMix/deliveryModeMix/ancStatusMix donut, gestationMix bar, eddPipeline line.
