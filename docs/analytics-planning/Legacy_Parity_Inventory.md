# Legacy PHP Analytics — Parity Inventory (Phase 1 scope)

**Source:** `tatvacareclinic-master/data_analytics/` (legacy PHP clinic app) + backend `function.php` / `function_atd.php` / `function_billing.php` / `function_pharmacy.php`.
**Purpose:** the authoritative "rebuild this" list. Every legacy report below, with its filters, charts, metrics/formulas, SQL source, and role gating — mapped to a **React data-source status** so we know what ships now vs. what needs a backend endpoint.

> **The central constraint.** Legacy PHP queried the OLTP DB directly (one bespoke `get_*_chart_data` SQL function per report). The React EMR exposes only two analytics-usable APIs today: the **billing dashboard** (`/billing/bill|ipd-bill/dashboard`) and the **appointment list** (`/appointment/listAppointment`). So Phase-1 parity = implement everything reachable from those two now, and for the rest, this doc captures the exact legacy SQL each one needs so a dedicated **Analytics API** (PRD §12) can expose it without re-deriving anything.

**Status legend:** ✅ buildable from existing React APIs now · 🟡 partially buildable (some series missing) · 🔴 needs a new backend endpoint (SQL documented here).

---

## 0. Legacy dashboard IA (the master report list)

From `analytics_dashboard_top.php` — the legacy nav, in order, with gating:

| # | Legacy page | Gate | Our section mapping |
|---|---|---|---|
| 1 | Clinics Dashboard (`data_clinic_consultations.php`) | ut_id 1/2 (admin/jr doctor) | **Clinical** |
| 2 | Analytics Dashboard (`analytics_dashboard.php`) | all | **Overview** |
| 3 | Reports (`data_analytics_reports.php`) | per-report roles | **Reports/Exports** |
| 4 | OPD Billing Analytics | roles 394/395 | **Financial · OPD** |
| 5 | IPD Billing Analytics | module 3 + 394/395 | **Financial · IPD** |
| 6 | Appointments Analytics | all | **Operational · OPD** |
| 7 | Inpatient Summary | module 3 | **Operational/Overview · IPD** |
| 8 | Others Analytics (pharmacy + pathology) | module 15 / 3 | **Operational** |

This maps cleanly onto our **care-setting toggle (OPD/IPD/Both) × sections (Overview/Financial/Operational/Clinical)** plus a **Reports** area for the tabular/export reports.

---

## 1. Financial (Billing · Collections · 3C · Incentives)

### 1.1 OPD / IPD Billing Analytics — `opd_billing_analytics.php`, `ipd_billing_analytics.php`
- **Filters:** bill counter (or "All"); period 7/15/30/90/365 days. Roles 394 (collection chart) / 395 (revenue chart). IPD also requires module 3.
- **Charts:** (1) **Collection vs Refund** bar by day; (2) **Revenue vs Credit Note** bar by day.
- **Backend:** `get_collection_chart_data_opd|ipd($DB,$hm_id,$Days,$Bill_Id)` → [dates, collection, refund]; `get_collection_revenue_chart_data_opd|ipd(...)` → [dates, revenue, credit_note].
- **React status:** Collection vs Refund ✅ (billing `summary` + bills aggregated by date). Revenue ✅ (`totalBillAmount`). **Credit Note 🟡** — not in the dashboard API; needs a field/endpoint. → ship Collection/Refund/Revenue now; add credit-note series when exposed.

### 1.2 Daily Collection — `daily_collection.php`
- **Filters:** OPD/IPD toggle; date = today. Role 389.
- **Table:** Type · Bill ID · Issued By · Patient · Patient ID · (Inpatient ID for IPD) · Mode of Payment · Amount. Rows = Cash Memo + Receipt + Advance − Refund.
- **Total:** `cash_memo + receipt + advance − refund`.
- **Backend:** `get_all_out_retail_sale_date`, `get_all_opd_receipt_sale_by_daily`, `get_all_opd_advance_sale_by_daily`, `get_all_opd_refund_sale_by_daily` (tables `bill_retail_sale_master` / `receipt_master` / `advance_master` / `bill_refund_master`).
- **React status:** 🟡 — bills list gives collection/refund per day; receipts/advances aren't broken out in the dashboard API. Approximate now from bills; full parity needs a daily-collection endpoint.

### 1.3 Collection Report — General & Detailed — `collection_report_table.php`, `collection_all_report_detaield.php`
- **Filters:** dept (OPD/IPD), date range; Detailed adds bill-type[] (Cash Memo/Receipt/Advance/Refund), issued-by[], payment-mode[]. Role 390; exports role 369.
- **Table:** Type · Bill ID · Date · (Bill Type) · Issued By · Patient · Patient ID · (Inpatient ID) · Mode of Payment · Amount. CSV + PDF.
- **Backend:** `get_opd_cm_cr_from_to_date` + `_re_/_ad_/_refund_` (and `_all_para` variants for Detailed) for OPD & IPD.
- **React status:** 🔴 needs a collection-report endpoint (document-level rows across cash-memo/receipt/advance/refund with issued-by + payment-mode filters). Document here = the spec.

### 1.4 3C Report — `3c_reprt_table.php`, `3c_details_table.php`
- **Filters:** account (`tban_id`), dept (OPD/IPD), bill-type (cash_memo/invoice/credite_notes), date range. Role 23/392; export 369.
- **Table:** Sr · Patient ID · (Inpatient ID) · Patient · Bill ID · Billing Item · Type · Date · Amount — **service-level** rows. CSV + PDF.
- **Backend:** `get_opd_3creport_data`, `get_opd_3creport_service_data` (+ IPD). Totals: `tbrss_total` (cash memo), `ims_total` (invoice), `−tbcs_total` (credit note).
- **React status:** 🔴 needs a 3C endpoint (service-level breakdown by account/dept/bill-type).

### 1.5 Incentive Reports — Detailed & Overall — `3c_details_table.php`, `overall_incentive_table.php`
- **Filters:** incentive user[], dept, date range. Role 23/391; export 369.
- **Detailed table:** Incentive User · Patient ID · Inpatient ID · Patient · Bill ID · Bill Type · Bill Date · Service Item · Service Price · Incentive Amount (server-side paginated).
- **Overall table:** Sr · Incentive User · Incentive Amount (per-user total + grand total).
- **Backend:** `get_all_incentive_master`, `count_incentive_user_total_amount(...)`, AJAX `ajax_get_details_report_search.php`.
- **React status:** 🔴 needs an incentive endpoint.

---

## 2. Operational (Appointments · Pharmacy · Pathology)

### 2.1 Appointments Analytics — `appointments_analytics.php`
- **Filters:** hospital (or All); period 7/15/30/90/365.
- **Charts:** (1) **Total vs Cancelled appointments** line by day (cancelled = `pam_status=4`); (2) **Case type** donut — New (`toct_id=1`) / Follow-up (2) / Urgent (3).
- **Backend:** `get_appointment_chart_data`, `get_case_type_chart_data` (table `appointment_master`).
- **React status:** ✅ Case-type donut + status mix already live. **Total-vs-Cancelled daily trend 🟡** — appointment list returns `queue_count/finished_count/cancelled_count` (totals) + one page of `app_data`; a true daily series needs either pagination or a counts-by-date endpoint.

### 2.2 Appointment Overall (PDF) & Detailed (Excel) — `template_appointment_analytics_overall.php`, `export_appointment_analytics_detailed.php`
- **Overall:** per-doctor matrix of Scheduled/Arrived/Engaged/Finished/Cancel × New/Old. **Detailed export:** per-appointment rows with full patient demographics + referral source; filters by dept/doctor/status/case-type/gender/age.
- **React status:** 🟡 — appointment list has the rows + status; the by-doctor matrix and demographic/referral columns need richer appointment fields (or an export endpoint).

### 2.3 Others — Pharmacy + Pathology — `others_analytics.php`
- **Charts:** (1) Pharmacy **stacked bar** — Purchase Invoice / Purchase Return / Sale Invoice / Sale Return by day (module 15); (2) Pathology **line** — OPD vs IPD test volume by day (module 3).
- **Backend:** `get_pharmacy_summary_graph` (tables `pha_purchase_invoice/return`, `pha_sales_invoice/return`); `get_pathology_chart_data` (`path_bill_retail_sale_master`).
- **React status:** 🔴 needs pharmacy + pathology endpoints (the React app links out to the pharmacy module via SSO; no analytics API).

---

## 3. Clinical (Consultations · Diagnosis · Rx)

### 3.1 Consultations — `data_clinic_consultations.php`
- **Filters:** hospital, doctor (ut_id 1/2), month. Charts are weekly (Week 1–4), current vs last month.
- **Charts/metrics:** weekly **total consultations**, **unique patients**, **repeat patients**, **planned vs followed-up** follow-ups; consultation % change vs last month.
- **Formulas:** consultations = `COUNT(case_manager.tcm_id)`; unique = `COUNT(DISTINCT patient_master_logs.patient_unique_id)`; repeat = patients with `>1` appointment in period; follow-up adherence = planned (`tcm_followup_date` in range) vs actually-followed-up.
- **React status:** 🔴 needs a consultations endpoint (case_manager aggregation).

### 3.2 Diagnosis — `data_clinic_diagnosis.php`
- **Charts:** Top diagnoses (line, top 10), Top investigations (pie), Age profile (0–10/11–25/26–40/41–59/60+ bar, cur vs last), Gender profile (bar).
- **Formulas:** diagnosis counts from `GROUP_CONCAT(tcd_id)` joined to `casemanager_diagnosis`; investigations parsed from `tcm_investigation`; age via `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())`.
- **React status:** 🔴 needs a diagnosis/investigation endpoint. (Consultation data exists in `casemanager` but is only written, never aggregated — confirmed in PRD §4.3.)

### 3.3 Rx Analytics — `data_clinic_rx_analytics.php` + `template_prescription_analytics.php`
- **Charts:** Top prescribed brands (h-bar, top 5, % of total), Share of companies (h-bar), **Top generic salts × company** (stacked h-bar). Print template: Brand · Generic · Company · Total dose.
- **Formulas:** from `case_manager.tcm_tmm_id`/`tcm_tmr_type` joined to `medicine_master` (`tmm_medicine_name`/`tmm_generic`/`tmm_company`) or `pha_medicine*`; generic-vs-branded is derivable.
- **React status:** 🔴 needs an Rx endpoint. **Note:** the data is rich (brand+generic+company captured per medication — see PRD §2.3), so this is high-value once an endpoint exists.

### 3.4 Clinic Dashboard cards — `data_clinic_deshboard.php`
- Consultations (+% vs last month), Prescriptions (+% vs last month), Top-4 diagnoses. 🔴 same endpoints as above.

---

## 4. IPD / Inpatient (Inpatient Summary) — `inpatient_summary.php`

- **Filter:** hospital (or All). Module 3.
- **Charts & formulas** (last 9 months unless noted):
  - **BOR** (line, %): `patient_days / (bed_count × days_in_month) × 100`. bed_count = `COUNT(ward_room_management.twrm_id)`.
  - **ALOS** (line, days): `Σ(discharge − admit days) / discharged_count`; discharge ≥12:00 counts as full day, else +1. Discharge timestamp from `atd_patient_master.tapm_modify_date` (PRD/buildability note: in current DB it's the ADT log `tbl_atd_logs` — run PB-3).
  - **ADC** (line): `patient_days / days_in_month`.
  - **Ward Summary** (donut, prev month): admissions per ward (`atd_patient_master` × `ward_management`).
  - **Discharge Summary** (donut, prev month): count per discharge type (`inpatient_discharge_type`).
  - **Weekly IPD collection / revenue** (90d): `get_weekly_ipd_chart_data_hospital`, `..._revenue_...`.
- **SQL tables:** `atd_patient_master` (tapm_admitting_date, tapm_modify_date, tapm_discharge, twm_id, tidt_id), `ward_room_management`, `ward_management`, `inpatient_discharge_type`.
- **React status:** 🔴 IPD runs as a separate app; React has only IPD *billing* + `checkPatientAdmitted`. BOR/ALOS/ADC/ward/discharge need the IPD analytics API. Weekly IPD collection/revenue 🟡 via `ipd-bill/dashboard`.

---

## 5. Phase-1 build matrix (what ships now vs. needs backend)

| Domain | Report | Now | Needs |
|---|---|:--:|---|
| Financial | OPD/IPD collection vs refund, revenue, payment-mode mix, KPIs, bills table | ✅ | — (credit-note series later) |
| Financial | Daily collection (receipt/advance split) | 🟡 | daily-collection endpoint |
| Financial | Collection report (general/detailed), 3C, incentives | 🔴 | report endpoints |
| Operational | Appointment status + case-type mix | ✅ | — |
| Operational | Total-vs-cancelled daily trend; by-doctor matrix | 🟡 | counts-by-date / richer appt endpoint |
| Operational | Pharmacy (PI/PR/SI/SR), Pathology OPD/IPD | 🔴 | pharmacy + pathology endpoints |
| Clinical | Consultations, diagnosis, investigations, Rx (brands/companies/generic) | 🔴 | casemanager aggregation endpoints |
| IPD | BOR / ALOS / ADC / ward / discharge | 🔴 | IPD analytics endpoints (run PB-3 for discharge date) |
| IPD | Weekly IPD collection/revenue | 🟡 | via ipd-bill dashboard |

**The dedicated Analytics API (PRD §7/§12) is the unlock for all 🔴 rows.** Each 🔴 row's exact legacy SQL is captured above, so the API's semantic registry can expose them 1:1 — no re-derivation.

---

## 6. New functionalities (on top of parity)

Parity is the floor; these are the upgrades the legacy app can't do (and our engine can, because every view is a structured query + chart spec):

1. **Configurable, not fixed** — user-built widgets (measure × dimension × filter × chart), saved dashboards, drag-drop (PRD §6 Builder). Legacy reports are hardcoded pages.
2. **OPD/IPD/Both unified** — one workspace, one filter bar cascading across domains; legacy splits these across separate pages.
3. **Per-widget CSV/Excel export everywhere** (already live) — legacy only exports specific report tables.
4. **Trends + compare-periods + drill-down** — click a bar → detail table; this-vs-last-period overlays. Legacy is static.
5. **Rule-based highlights** — BOR > 90% red, collection-efficiency < target, no-show spikes (PRD §14), without AI.
6. **Collection efficiency, due-ageing, AR** — revenue-cycle KPIs the legacy lacks (HFMA-aligned, KPI doc).
7. **Scheduled email of dashboards** (PRD §15 Phase 3).
8. **AI-ready** — NL→query on the same contract later (PRD §14), no rework.

---

*Phase 1 = reproduce this catalog. Reachable-now reports are live in `src/pages/analytics`; the rest are precisely scoped to backend endpoints (legacy SQL captured here). Next gate: the Analytics-API decision (PRD §12) to unlock Clinical + IPD + Reports parity.*
