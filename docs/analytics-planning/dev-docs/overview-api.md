# Overview: backend API spec

## Endpoint
`GET /api/v1/analytics/operational/overview`
- Params: `startDate`, `endDate` (YYYY-MM-DD), `grain=day|week|month`, `doctorIds` (repeatable, um_id), `hospitalId` (hm_id CSV, FIND_IN_SET), `careSetting=opd|ipd|all` (FE sends `opd`; drives which KPI set and which billing streams).
- Auth: `Authorization: Bearer <JWT>`; tenant = `result.hospital_business_id` (see src/common/scope.ts). Verify with ANALYTICS_JWT_SECRET in prod.
- Builder: pm-analytics-service/src/analytics/builders/operational.ts, `case 'overview'`. SELECT-only on the replica.
- FE registration: DASHBOARD_ENDPOINTS.overview = { endpoint: "operational/overview", params: { careSetting: "opd" } } in shell/analyticsNav.jsx.

## Response: `kpis[]` (key, label, value, unit?, description, delta?, spark?)
- `footfall`: COUNT(*) tbl_appointment_master, pam_del=0, hm_business_id=:biz, pam_app_date in window (+hm_id, um_id filters). Spark from the appointment trend.
- `avgConsult`: ROUND(AVG(NULLIF(pam_appointment_duration,0))) same scope.
- `billed`: ROUND(SUM(g)) over the billing union; OPD branch = tbl_opd_billing_overview (tobo_delete=0, tobo_invoice_cancel=0, tobo_invoice_date window, tobo_hm_id, doctor via doctor_unique_id mapped from um_id through tbl_user_master). care=all adds tbl_ipd_billing_overview + tbl_path_opd_billing_overview.
- `advance`: SUM(am_advance_amount) tbl_opd_billing_advance_master, am_status=0, am_parent NULL/0, am_date window.
- `topSymptom`: hardcoded "-" (missing feed, see below).
- `topDx`: top diagnosis by COUNT, tbl_casemanager_diagnosis (tcd_del=0, diagnosis<>'', tcd_created_date window, um_id filter).
- `topMed`: top tbl_medicine_report JOIN tbl_medicine_master (tmm_id), tcm_datetime window.
- `topLab`: tbl_case_manager.tcm_investigation free text, cleaned + counted in JS (cleanInvestigations from builders/lab.ts).
- `topCond`: tbl_micro_patient_medical_history.medical_history JSON, parsed in JS (extractSections from builders/medical.ts), conditions = section ids 1,2.
- `pharmacy`: SUM(tpsi_grand_total) tbl_pha_sales_invoice minus SUM(tpsr_grand_total) tbl_pha_sales_return (del=0, date window).
- `adherence`: kept/due % from tbl_case_manager.tcm_followup_date; due = followup date >= '2000-01-01' AND < CURDATE; kept = EXISTS appointment for that patient within 45 days after the followup date.
- `abha`: % of distinct period patients (via appointments) with tbl_patient_master.pm_abha_address non-empty.
- careSetting=ipd swaps in admissions/occupied/discharged from tbl_atd_patient_master (tapm_delete=0, tapm_admitting_date; occupied = tapm_discharge=0).
- Deltas: same aggregates re-run over the preceding window (comparisonWindow in builders/period.ts); `meta.compareLabel` names it.

## Response: chart blocks (universal { columns, rows })
- `apptStatusMix`: Completed=SUM(pam_status=3), Cancelled=SUM(pam_status=4), Scheduled=total minus both. Fixed 3-row domain.
- `footfallTrend`: DATE_FORMAT(pam_app_date, grain) buckets, last 12, appts + completed.
- `paymentModeMix`: SUM(g) per mode code over the billing union; titles via tbl_biiling_payment_option (bpid -> title); code '0'/blank = Cash.
- `topDiagnoses`: top 10 from tbl_casemanager_diagnosis.
- `meta`: { live, compareLabel, careSetting }.

## Missing feed (stated, not faked)
- **Top symptoms**: per-patient symptom records live only in the symptoms microservice. Needed contract: a bulk read (top-N symptom counts by hospital_business_id + date range + optional doctor), or a sync into the replica. Until then the card renders "-" with the explanation in its description.
