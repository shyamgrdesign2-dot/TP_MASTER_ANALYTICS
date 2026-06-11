# Reports: backend API spec

## Backend notes: Reports hub

FE: `REPORT_CARDS` / `REPORT_SECTIONS` in `src/pages/analytics/analyticsPages.js`; download resolver `downloadReport(card, filters)` in `src/pages/analytics/service.js`. Two source kinds: `source:'billing'` builds rows from the production billing dashboard API (`billsTable`); `endpoint:` pulls the analytics service. All analytics routes below: base `GET /api/v1/analytics/...`, Bearer JWT, common params `startDate`, `endDate`, `doctorIds` (repeatable), `hospitalId`, `reportType`. All return the universal `{ columns:[{key,label,type?}], rows, meta:{live,rowCount} }` envelope.

### Endpoint-sourced reports (builders are ground truth)
- `GET financial/incentives` (`builders/financial.ts`): OPD invoice lines `tbl_opd_billing_invoice_service` JOIN `tbl_bill_main_service` (`set_incentive=1`, `tbms_tim_id` -> recipient) JOIN `tbl_incentive_master`. Per-line incentive: type LIKE 'per%' -> `ims_total * tbms_incentive / 100`, else `tbms_ins_total * ims_qty`. `reportType=Overall Report` -> per-user totals + Grand total row; default Detailed -> user, patient, billId, billType, billDate, service, servicePrice, incentiveAmount (LIMIT 5000).
- `GET financial/3c-report`: UNION of Invoice (`tbl_opd_billing_invoice_service`), Credit Note negative (`tbl_opd_billing_credit_service`), Cash Memo (`tbl_bill_reatil_sale_service`, OPD = `in_pid` null/0); `reportType=IPD` switches to the inpatient service tables and adds the Inpatient ID column. Columns: patientId, patient, billId, billingItem, type, date, amount (LIMIT 5000).
- `GET operational/appointment-analytics` (`builders/operational.ts`): `tbl_appointment_master` JOIN `tbl_patient_master`, LEFT JOIN `tbl_opd_case_type`, `tbl_user_master`; status CASE 0/7 Scheduled, 6 Draft, 3 Completed, 4 Cancelled. Default: 13-column per-appointment export (LIMIT 20000). `reportType` containing 'overall': per-doctor x status matrix with booked (`pam_appointment_type<>'Walk'`) vs walk-in vs total. Supports `doctorIds` (`a.um_id IN`) and `hospitalId` (`FIND_IN_SET(a.hm_id,...)`).
- `GET operational/prescription-analytics`: `tbl_medicine_report r` LEFT JOIN `tbl_medicine_master` WHERE `tmr_case_type='CM'` AND `tcm_datetime` in range; GROUP BY brand/generic/company; doses = `SUM(NULLIF(tmr_tmm_dose,0))`, lines = COUNT(*) (LIMIT 5000).
- `GET operational/medicine-analytics`: same source; COUNT(*) and COUNT(DISTINCT patient_unique_id) per brand/company/generic; supports `hospitalId` (LIMIT 5000).
- `GET operational/referred-by-patients`: `tbl_patient_master_logs` (`other_ref=1`) JOIN `tbl_reference_master` JOIN referring `tbl_patient_master`; COUNT(DISTINCT referred patient), MIN(log date) as First Referred. Not date-filtered (all-time register).
- `GET operational/referred-by-others`: `tbl_reference_master` (`rm_del=0`, named) with correlated count of `tbl_patient_master_logs` (`other_ref=0`). All-time register.

All queries tenant-scope on `hm_business_id = scope.hospitalBusinessId` from the JWT.

### Billing-sourced reports (no analytics endpoint yet)
Daily Collection, Collection Report, Billing Overall call the production billing dashboard (`fetchBillingDashboard`, params startDate, endDate, page, limit<=100, doctorIds required) and export `billsTable(bills)`.

### Needed-but-missing backend work
- `GET financial/collection-report?reportType=General|Detailed|Day Wise`: server-side full-period export reusing the billing UNION (the FE billing API caps at 100 bills/page; full export needs this endpoint). Day-Wise = `daily-collection` shape; Detailed adds issued-by, payment-mode, account columns.
- `GET financial/billing-overall`: revenue + cash-flow summary rows over the same UNION.
- Modal filter params still to wire end-to-end (legacy parity): `issuedBy`, `paymentMode`, `account`, `department`, `incentiveUser`, `medicine` multi-selects, in-modal hospital/doctor multi-selects, and `includeClinicalData` on Appointment Analytics (appends 16 clinical columns from the case manager). Each is a WHERE-clause addition or a wider SELECT on the queries above.
- Pagination/streaming for the LIMIT-capped registers when a tenant exceeds the cap.
