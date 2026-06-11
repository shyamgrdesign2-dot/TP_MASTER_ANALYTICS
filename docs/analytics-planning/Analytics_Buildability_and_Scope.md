# TatvaCare Analytics — Buildability & Scope Assessment
### Grounded against the real `data_dictionary.json` (391 MySQL tables, snapshot 2026-05-17)

**Purpose:** PRD v2.0 says *what* to build. This document answers *what is actually buildable on the database we have, what isn't, and how to make the gaps workable.* It is the reality-check layer that turns the PRD into a committed scope. Read it alongside PRD v2.0 (§8 Spec Cards, §9 Data architecture, §21 Roadmap) — where this document finds a data gap, it overrides the PRD's optimism.

---

## 1. Executive verdict

**The dashboard is buildable, and most of it is buildable cleanly.** The schema is healthier than the legacy code suggested:

- **Tenant isolation is real and consistent.** 213 of 391 tables carry `hm_business_id` **directly**; every core fact table we need (appointments, OPD/IPD billing, retail sale, pharmacy, prescriptions, diagnosis, admissions, incentives) has it. The PRD's "scope-injection" safety stage is therefore enforceable for ~95% of analytics with a single column.
- **Every Tier-1 financial & volume metric has the exact columns it needs** — verified column-by-column (Section 3).
- **There are exactly four real data constraints** (Section 4) that change scope. None is a blocker; two need a small engineering job, two need a data-profiling pass before we finalize definitions.

**Bottom line for scope:** ship the **Financial + Volume + Clinical-mix** dashboards first (they sit on clean, typed, indexed, tenant-tagged columns). Treat **IPD length-of-stay/occupancy** and **vitals/clinical-quality** metrics as a second wave. ALOS/turnover are *de-risked* — the discharge timestamp is recoverable from the ADT event log (`tbl_atd_logs`), one profiling query from buildable. **Bed-day occupancy** still needs a nightly census snapshot, and **BMI/BP-control are not honestly computable** (vitals are free-text varchars with no height/weight) — exclude those two from the MVP.

---

## 2. The database landscape (grounded, not inferred)

### 2.1 Scale — rollups are mandatory, not optional
Five tables dominate and will define query performance:

| Table | Rows | Area |
|---|---:|---|
| `tbl_patient_visit_logs` | 16.6 M | Patient |
| `tbl_medicine_report` | 16.2 M | Prescriptions |
| `tbl_appointment_master` | 10.1 M | Appointments |
| `tbl_case_manager` | 8.5 M | Case mgmt |
| `tbl_patient_master` | 7.0 M | Patient |
| `tbl_bill_reatil_sale_service` | 2.2 M | Billing |
| `tbl_opd_billing_overview` | 1.66 M | OPD billing |
| `tbl_bill_retail_sale_master` | 1.66 M | Billing |

→ Any "last 365 days, grouped by month" query over raw `tbl_appointment_master`/`tbl_medicine_report` scans millions of rows. **Default dashboards must read nightly rollup tables** (`fact_appointments_daily`, `fact_billing_daily`, `fact_prescriptions_daily`), exactly as PRD §15.2 states. This is confirmed, not theoretical.

### 2.2 Tenant-key coverage (the isolation reality)
| Tenant key (first token) | # tables | Implication |
|---|---:|---|
| `hm_business_id` (direct) | **213** | ✅ scope-inject directly |
| `UNTAGGED` | 89 | mostly lookups/config/logs — not analytics facts; verify before use |
| `hm_id` | 32 | needs `hm_id → hm_business_id` map (incl. **`tbl_patient_master`**) |
| `um_id` / `patient_unique_id` | 30 | scope via user/patient association |
| ward tables (`twrm_business_id`, `twm_business_id`) | 2 | same value, different column name — alias in the registry |

**Action:** the semantic registry must record, per table, *which column* carries the tenant and *how to reach `hm_business_id`* (direct / via `hm_id` map / via join). This is a registry config detail, not a code fork — the Controlled Query Layer's scope-injection stage reads it.

### 2.3 PII posture
39 tables high-PII, 50 medium, 33 low, 269 none. The high-PII tables are exactly the clinical/identity ones (`tbl_patient_master`, `tbl_appointment_master`, `tbl_casemanager_diagnosis`). **Aggregate metrics never select PII**; only role-gated drill-down/detail touches these — supports PRD §18's PHI-minimization stance with concrete targets for the audit list.

---

## 3. Metric buildability matrix (verified column-by-column)

Legend: ✅ Tier 1 = clean, build now · ⚠️ Tier 2 = buildable after a profiling step · 🔴 Tier 3 = data gap, needs engineering first.

| Metric | Tier | Source table → key columns (verified present) | Notes |
|---|:--:|---|---|
| **OPD revenue / collection** | ✅ | `tbl_opd_billing_overview` → `tobo_invoice_grand_total`, `tobo_invoice_date`, `tobo_mod_of_payment`, `tobo_delete`; `hm_business_id` | Typed money + date + payment mode + soft-delete. Clean. |
| **Retail-sale billing (counter)** | ✅ | `tbl_bill_retail_sale_master` → `tbrsm_grand_total`, `tbrsm_total_discount`, `tbrsm_total_net_tax_amt`, `tbrsm_payment_status`, `payment_option`, `tbrsm_invoice_date` | Full money breakdown incl. tax/discount. |
| **IPD revenue / collection** | ✅ | `tbl_ipd_billing_overview` → `tibo_invoice_grand_total`, `tibo_invoice_date`, `tibo_mod_of_payment`, `tibo_delete` | Mirror of OPD. Clean. |
| **Receipts / advances / dues** | ✅ | `tbl_receipt_master` → `rm_given_amount`, `rm_pending_amount`, `rm_date`, `bill_type`, `payment_option` | Daily collection + AR buildable. |
| **Payment-mode mix** | ✅ | `*_mod_of_payment` / `payment_option` on all billing tables | Pie/stacked-bar ready. |
| **Appointment volume / footfall** | ✅ | `tbl_appointment_master` → `pam_app_date`, `pam_del`, `dp_id`, `um_id` (indexed) | Counts, trends, by-doctor/dept. Clean. |
| **Prescriptions: generic vs branded, top molecules/companies** | ✅ | `tbl_medicine_report` → `tmm_generic`, `tmm_company`, `tmr_tmm_dose`, `tcm_datetime`; `hm_business_id` | Big table → rollup. Columns clean. |
| **Diagnosis mix / top conditions** | ✅ | `tbl_casemanager_diagnosis` → `diagnosis`, `icd_code`, `tcd_created_date`, `tcd_del` | ICD-coded — clean grouping. High-PII → aggregate only. |
| **Pharmacy sale/purchase volume** | ✅ | `tbl_pha_sales_invoice` → `tpsi_grand_total`, `tpsi_date`, `patient_type`, `tpsi_del` (+`_qty`, purchase tables) | Clean money/date. |
| **Incentive payouts** | ✅ | `tbl_biiling_insentive_master` → `tbinsm_ins_amount`, `tbinsm_billing_type`, `tbinsm_ins_userid`, `tbinsm_create_date` | Small table. Clean. |
| **Appointment status mix / no-show / cancellation** | ⚠️ | `tbl_appointment_master` → `pam_status` *(varchar 35)*, `pam_case_type` *(varchar 30)*, `pam_appointment_type` *(varchar 50)* | Columns exist but are **free-text strings**. Must `SELECT DISTINCT pam_status, pam_case_type` per tenant to learn the actual value vocabulary before defining "no-show", "new", "follow-up". **#1 pre-build profiling task.** |
| **Patient demographics (age/gender/geo)** | ⚠️ | `tbl_patient_master` → `pm_gender`, `pm_dob`, `pm_city`, `pm_area`, `pm_pincode`, `pm_created_date` | Columns clean, **but table is tenant-keyed by `hm_id` (no `hm_business_id`)** → must scope via `hm_id→hm_business_id` map. dob→age computed. |
| **New vs returning patients / acquisition source** | ⚠️ | `tbl_patient_master` (`pm_created_date`) + `tbl_appointment_source` (1.4 M) | Buildable; "new vs follow-up" definition depends on the status-vocabulary profiling above. |
| **ALOS (avg length of stay)** | ⚠️ | admit: `tbl_atd_patient_master.tapm_admitting_date` ✅; discharge date: **`tbl_atd_logs`** (ADT event log → `tal_transfer_type`, `tapm_id`, `tal_create_date`, 261 k rows) ✅ | `tapm_discharge` is a flag, but the **discharge *timestamp* is recoverable from the ADT log** (the row where `tal_transfer_type` = discharge). Buildable after one profiling query (PB-3) to confirm the transfer-type value + coverage. Backup: `tbl_inpatient_dis_summary.tids_created_date` (113 k rows). |
| **Bed-occupancy rate (historical, bed-days)** | 🔴 | `tbl_ward_room_management` (`twrm_status`, `room_type`, `twrm_block`) + `tbl_ward_management` | Beds & current status exist → **point-in-time** occupancy works. **Historical bed-day occupancy needs a nightly `fact_ipd_census_daily` snapshot** (no time-series bed log exists). Per PRD §9.4 — confirmed accurate. |
| **Vitals / BMI / BP-control** | 🔴 | `tbl_casemanager_vitals` → `temp`, `pres`, `resp_rate`, `blood_press`, `spo2`, `general_rbs`, `waist_circumference` — **all `varchar(11–25)`** | Free-text strings, **no height/weight → no BMI**, `blood_press` is one string ("120/80"). Clinical-quality metrics need parsing + cleaning and will be low-confidence. **Defer; scope narrowly if at all.** |
| **Bed turnover / readmission rate** | ⚠️/🔴 | `tbl_atd_patient_master` → `tapm_readmit` (int) ✅; turnover depends on discharge date (see ALOS) | Readmission count buildable; turnover blocked on discharge date. |

**Tally:** 10 metrics ✅ build-now · 4 ⚠️ build-after-profiling · 3 🔴 need-a-data-fix. The clean 10 already cover the entire Financial domain and most of Appointments + Clinical-mix — i.e., the highest-value, most-used reports.

---

## 4. The four constraints — and how to make each workable

### 4.1 ⚠️ IPD discharge **date** is in the ADT log, not the admissions table (affects ALOS, turnover)
- **Finding:** `tapm_discharge` is a status flag (int 0/1), not a timestamp — BUT **`tbl_atd_logs`** (the Admission/Discharge/Transfer event log, 261 k rows, keyed to `tapm_id`, tenant `hm_business_id`) records each status change with `tal_transfer_type` + `tal_create_date`. The discharge **timestamp** is the `tal_create_date` of the discharge event. Backup source: `tbl_inpatient_dis_summary.tids_created_date` (113 k rows, written at discharge).
- **Make it workable:**
  1. **PB-3 profiling** — `SELECT DISTINCT tal_transfer_type` to learn the exact "discharge" value, then measure coverage (what % of discharged admissions have a log event) and sanity-check the LOS distribution (no negatives). SQL provided in `profiling_queries_PB1-PB5.sql`.
  2. If ADT-log coverage is high (likely), **ALOS, bed turnover, and discharge-mix become Tier-1 buildable** — this is better than originally assessed.
  3. **Still start `fact_ipd_census_daily`** (PB-4 seed query provided): historical bed-*day* occupancy needs a nightly snapshot because there's no time-series bed-state log; the ADT log gives discharge events, not a daily census.
- **Scope decision:** ALOS/turnover → **P3 but de-risked** (one profiling query from buildable). Bed-day occupancy → **P3**, needs the census snapshot running first. MVP IPD still ships clean items: admissions count, current (point-in-time) occupancy, case-mix, IPD revenue.

### 4.2 🔴 Vitals are free-text varchars (blocks BMI/BP-control quality metrics)
- **Finding:** no height/weight columns; `blood_press` etc. are unparsed strings.
- **Make it workable:** treat as a **data-quality / future-capture** problem, not an analytics problem. Option: a parsing+normalization job into a typed `fact_vitals` (split BP into systolic/diastolic, coerce numerics, reject junk) — but adoption/quality will be low until the EMR captures structured vitals. **Recommendation: exclude from v1 scope;** revisit after structured capture exists.

### 4.3 ⚠️ Status/case-type are free-text (blocks precise no-show / new-vs-followup)
- **Finding:** `pam_status` (varchar 35), `pam_case_type` (varchar 30) hold the business meaning but we don't know the value set.
- **Make it workable:** **profiling pass before finalizing the Spec Cards** — `SELECT pam_status, COUNT(*) ... GROUP BY pam_status` (and `pam_case_type`, `pam_appointment_type`) across a representative tenant set. Map the discovered strings → canonical enums in the registry (`status_map`). Then no-show/cancellation/new/follow-up are clean. *(Profiling task PB-1 — do this in P0; it unblocks the whole Appointments domain.)*

### 4.4 ⚠️ Mixed tenant keys (`hm_id`, `twrm_business_id`, …) on ~95 tables
- **Finding:** `tbl_patient_master` and 31 others use `hm_id`; ward tables use `twrm_business_id`/`twm_business_id` (same value, renamed).
- **Make it workable:** build a small authoritative **`hm_id ↔ hm_business_id` mapping** (from `tbl_hospital_master`) and register per-table tenant-resolution rules. The scope-injection stage uses the rule; no per-report code. *(Profiling task PB-2.)*

---

## 5. "Make it workable" — the engineering approach the data forces

The schema dictates five concrete decisions (all consistent with PRD §10/§15, now justified by evidence):

1. **Read replica, read-only user.** The clinical app runs on these same tables (`tbl_appointment_master` alone is 7.3 GB incl. indexes). Analytics aggregation **must not** run on the primary. Non-negotiable.
2. **Rollup/summary tables for the 5 giant tables.** Default dashboards never touch raw 10–16 M-row tables. Nightly jobs → `fact_*_daily`, partitioned by `(date, hm_business_id)`.
3. **A tenant-resolution layer in the registry** (Section 4.4) so the single `hm_business_id` scope contract works across the `hm_id`/`twrm_*` tables too.
4. **A status-vocabulary map** (Section 4.3) so free-text columns become governed enums.
5. **Index-aware query planning.** Good news: the hot columns are already indexed — `tbl_appointment_master` has composite indexes on `(hm_business_id, pm_pid, pam_status, pam_del, pam_id)` and `(hm_id, pam_del, patient_unique_id, pam_app_date)`. The Controlled Query Layer's "require ≥1 indexed predicate" guard (PRD §10.3 stage 6) is satisfiable for the core facts — we should align rollup/query predicates to these existing indexes.

---

## 6. Recommended scope (data-tiered)

| Phase | Ships (because data is clean) | Explicitly deferred (data gap) | Pre-req profiling |
|---|---|---|---|
| **P0 — Foundation** | Semantic registry + tenant-resolution map + status-vocabulary map; rollup design; read replica | — | **PB-1, PB-2, PB-3** (Section 7) |
| **P1 — Financial + Volume (highest ROI)** | OPD/IPD revenue, collections, daily collection, refunds, payment-mode mix, incentives; appointment footfall & by-doctor/dept; pharmacy sales | no-show% precision (until PB-1) | finish PB-1 |
| **P2 — Builder + Clinical-mix** | View Builder; diagnosis mix, top molecules, generic-vs-branded, prescription volume; patient demographics & new-vs-returning; status-based appointment metrics | vitals/BMI/BP | — |
| **P3 — IPD depth** | Admissions, current occupancy, case-mix, readmission count; **ALOS/bed-day occupancy/turnover once 4.1 lands** + `fact_ipd_census_daily` running | vitals quality metrics | finish PB-3 + census job |

This sequences by **data readiness × business value**: the cleanest, most-demanded data (money + footfall) ships first; the gappy data (IPD LOS, vitals) ships only after it's made honest.

---

## 7. Pre-build checklist (must run against the DB before finalizing Spec Cards)

These are read-only profiling queries on the replica — none blocks design, all unblock specific metrics:

- **PB-1 (Appointments vocab):** `SELECT pam_status, COUNT(*)` / `pam_case_type` / `pam_appointment_type` GROUP BY, across ≥5 tenants. → builds `status_map`. *Unblocks no-show, cancellation, new/follow-up.*
- **PB-2 (Tenant map):** confirm `hm_id ↔ hm_business_id` from `tbl_hospital_master`; list every analytics table's tenant column. → builds tenant-resolution rules.
- **PB-3 (Discharge date):** confirm the `tal_transfer_type` value that means "discharge" in `tbl_atd_logs`, measure coverage vs discharged admissions, sanity-check the LOS distribution. → finalizes the ALOS Spec Card (Section 4.1). *(SQL ready in `profiling_queries_PB1-PB5.sql`.)*
- **PB-4 (Mongo):** the dictionary has **collection names only, no fields** for 132 Mongo collections. `findOne()`-sample any collection we intend to use (clinical detail, ABDM). → unblocks any Mongo-backed metric. *(Until done, build only on the 391 MySQL tables — which is plenty for P1–P2.)*
- **PB-5 (Money semantics):** confirm with Finance whether `*_grand_total` is gross/net of tax & discount, and the refund/void/credit-note linkage, so "revenue" vs "collection" are defined once. *(PRD §8 already flags this.)*

---

## 8. What this changes vs PRD v2.0

| PRD v2.0 said | Reality from the dictionary | Change |
|---|---|---|
| ALOS source = `tbl_atd_patient_master` (+discharge tables), visual bar (§8.3) | `tapm_discharge` is a flag, but the discharge **timestamp lives in `tbl_atd_logs`** (ADT event log) | ALOS **de-risked, not blocked** — one profiling query (PB-3) from buildable. Keep in P3 only because it pairs with the census snapshot for occupancy. |
| Vitals/BP-BMI control under Clinical (§6.2) | vitals are **free-text varchars, no height/weight** | **Defer** BMI/BP-control; not v1 scope (Section 4.2). |
| Tenant key = `hm_business_id` everywhere (§9.6) | `tbl_patient_master` + 31 tables use `hm_id`; wards renamed | Add **tenant-resolution map** (Section 4.4); mostly clean but not universal. |
| Spec Cards reference status values | status/case-type are **free-text** | Add **PB-1 vocabulary profiling** as a P0 gate. |
| "Mongo for some clinical detail" (§9.3) | **zero field info** for 132 collections | Build P1–P2 on **MySQL only**; Mongo metrics wait on PB-4. |

Everything else in PRD v2.0 (Controlled Query Layer, query-spec DSL, API surface, rollups, governance, IA, UI/builder) is **validated by the schema** and stands.

---

*Conclusion: the analytics platform is not just well-designed — it is buildable on the existing database, with the highest-value 70% (all Financial, most Appointments & Clinical-mix) sitting on clean, indexed, tenant-tagged columns ready for P1. The remaining 30% (IPD LOS/occupancy, vitals) is gated on four small, well-understood data tasks, not on redesign.*
