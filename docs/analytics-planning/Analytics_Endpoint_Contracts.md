# Analytics Microservice — Endpoint Contracts (implementation-grade)

**Author:** Shyam · **Date:** 2026-06-06
**Reads with:** [Analytics_API_Spec.md](Analytics_API_Spec.md) (architecture/decision), [Legacy_Parity_Inventory.md](Legacy_Parity_Inventory.md) (legacy SQL), [Analytics_Master_Spec_v2.md](Analytics_Master_Spec_v2.md) (every dashboard), [Analytics_Buildability_and_Scope.md](Analytics_Buildability_and_Scope.md) (DB columns/tiers).

**Purpose:** the EXACT request + response shape for every endpoint the "Soon" dashboards need, tied 1:1 to the React widgets that consume them. A backend team can build straight from this; the frontend flips each dashboard live the moment its endpoint ships.

> **Status today:** 6 dashboards (Overview, OPD/IPD Billing, Appointments, Patients, Bulk Communication) are already LIVE on existing APIs. Everything below is what the **dedicated Analytics microservice** (decided: Node/NestJS + read replica) must expose to light up the rest.

---

## 1. Conventions (apply to every endpoint)

- **Base:** `config.analytics_api_url` → `https://pm-analytics-<env>.tatvacare.in`
- **Auth:** Bearer JWT (axios attaches it). Server resolves `user_id`, `hospital_business_id`, `hm_id`, `clinic_id`, role flags from the token.
- **Scope (non-negotiable):** server **injects** `hm_business_id` (and `doctor_id` for row-level) into every query from the JWT — never trusted from the client. (Validated vs Cube RLS — KPI doc §2.)
- **Common query params (all GET):**
  `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&doctorIds=<id>&doctorIds=<id>&hospitalId=<hm_id>&grain=day|week|month`
  (doctorIds repeatable; omit = all in scope. hospitalId optional = all sites.)
- **Read replica + nightly rollups** for the giant tables (buildability §2.1).
- **Two response shapes:**
  1. **Result set** (charts/tables) — the universal envelope:
     ```jsonc
     { "columns": [{ "key": "x", "label": "…", "type": "string|number|currency|date|percent" }],
       "rows": [ { "x": "…", "count": 12 } ],
       "meta": { "rowCount": 12, "live": true, "generatedAt": "…" } }
     ```
  2. **Dashboard block** (the triple-panel clinical pattern) — one round-trip returns every widget:
     ```jsonc
     { "hero":   { "label": "Top symptom", "value": "throat pain" },
       "kpis":   [ { "title": "…", "value": "…" } ],
       "summary":   { "columns": [...], "rows": [...] },   // summary table
       "genderMix": { "columns": [...], "rows": [...] },   // gender donut
       "ageMix":    { "columns": [...], "rows": [...] },   // age donut
       "patients":  { "columns": [...], "rows": [...] },   // patient list (download)
       "meta": { "live": true } }
     ```
- **Patient list = the download.** Every dashboard's `patients` block IS what the ↓ button exports (the frontend already wires `patientData`). Cap in-app at 5000 rows; `?format=csv` streams full.
- **Age bands (standardize everywhere):** `<18 · 18-30 · 30-45 · 45-60 · >60` (from `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())`).

---

## 2. Clinical dashboards — shared triple-panel template

All clinical dashboards return the **dashboard-block** shape above. They differ only in the entity and source table. Source columns verified in the buildability doc.

`GET /api/v1/analytics/clinical/{entity}` where entity ∈ `diagnosis | symptoms | drug | lab-test | procedure | vitals | medical-history | surgical-history`

### 2.1 Diagnosis — `clinical/diagnosis`
- **Source:** `tbl_casemanager_diagnosis` (`diagnosis`, `icd_code`, `tcd_created_date`, `tcd_del`) joined to `tbl_appointment_master`/`tbl_patient_master` for demographics + `tbl_case_manager` for doctor.
- **Blocks:**
  - `hero`: top diagnosis by patient count.
  - `summary`: `columns:[diagnosis, icd_code, total]` ordered desc.
  - `genderMix`: `columns:[gender, count]`.
  - `ageMix`: `columns:[band, count]`.
  - `patients`: `[date, doctor, clinic, patientUHID, patientName, gender, age, mobile, diagnosis, icd_code, status, slot]`.

### 2.2 Symptoms — `clinical/symptoms`
- **Source:** symptoms captured in `tbl_case_manager` (symptom rows) — `symptom_name`, `severity`, `duration`, `tcm_datetime`.
- Blocks: hero=top symptom; summary=`[symptom, totalPatients]`; genderMix; ageMix; patients=`[…, symptom, severity, slot]`.

### 2.3 Drug / Rx — `clinical/drug`
- **Source:** `tbl_medicine_report` (`tmm_medicine_name`, `tmm_generic`, `tmm_company`, `tmr_tmm_dose`, `tcm_datetime`; `hm_business_id`). **Rollup mandatory** (16 M rows).
- **Blocks (extends template):**
  - `hero`: top drug.
  - `summary`: `[drug, totalPrescriptions]`.
  - `genericMix`: `[generic, count]` (donut).
  - `manufacturerMix`: `[manufacturer, count]` (donut).
  - `genericVsBranded`: `[type(Generic|Branded), count]` (donut) — generic ratio.
  - `patients`: `[date, doctor, clinic, patientUHID, name, gender, age, mobile, drug, generic, manufacturer, frequency, duration, slot]`.

### 2.4 Lab Test — `clinical/lab-test`
- **Source:** investigation rows in `tbl_case_manager` (`tcm_investigation`).
- Blocks: hero=top test; summary=`[labTest, totalPrescriptions]`; genderMix; ageMix; `orderingRate` KPI (% consults with a lab order); patients=`[…, labTest, slot]`.

### 2.5 Procedure — `clinical/procedure`
- **Source:** surgical/procedure rows (`tbl_casemanager_surgery` or equivalent).
- Blocks: hero; summary=`[procedure, totalPatients]`; genderMix; ageMix; patients.

### 2.6 Vitals — `clinical/vitals`
- **Source:** `tbl_casemanager_vitals` — ⚠️ free-text varchars (buildability §4.2). Backend must **parse/normalize** (split `blood_press` → systolic/diastolic; coerce numerics; reject junk) into a typed projection before aggregating.
- **Blocks:** `bpDistribution` `[band(Normal|Elevated|Stage1|Stage2), count]`; `bmiDistribution` `[band(Under|Normal|Over|Obese), count]` (needs height+weight — may be null; return what's parseable + a `coverage` meta %); `spo2Distribution`; genderMix; ageMix; patients=`[…, bp, pulse, weight, height, bmi, spo2, temp, rbs, slot]`.
- **Note:** low data-quality expected; `meta.coverage` tells the UI how much was parseable.

### 2.7 Medical History — `clinical/medical-history`
- **Source:** `ApiMedicalHistory` tables — sections (`tmmhs_id`/title) + tags (condition, since, status, medication, relationship).
- **Blocks:** `topConditions` `[condition, patients]` (bar); `conditionMix` donut (top 8); `allergyMix` `[allergy, count]`; `comorbidityLoad` `[bucket(0|1|2|3+), patients]`; genderMix; ageMix; patients=`[patientUHID, name, age, gender, condition, since, status, medication, note, doctor]`.

### 2.8 Surgical History — `clinical/surgical-history`
- **Source:** `ApiSurgical` tables.
- Blocks: `topSurgeries` `[surgery, patients]`; byAge; byGender; patients=`[patientUHID, name, age, gender, surgery, notes, doctor, date]`.

---

## 3. Specialty / cohort dashboards

### 3.1 Gynec & Obstetrics — `clinical/gynec`
- **Source:** `ApiGynec` + obstetric tables (LMP, EDD, Gravida, Para).
- Blocks: `kpis`=[Active Pregnancies, Deliveries, Expectant Mothers, High-Risk]; `eddDistribution` `[week, due]`; `gravidaPara` `[g/p, count]`; `complications` donut; patients (Expectant Mothers Report) `[patient, age, lmp, edd, gravida, para, weeks, risk, doctor, lastVisit]`.

### 3.2 Growth Chart — `clinical/growth-chart`
- **Source:** `growth_chart_api_url` patient measurements vs WHO/IAP percentiles.
- Blocks: `kpis`=[Children Measured, Stunting %, Wasting %, Underweight %]; `heightForAge`/`weightForAge` scatter `[age, value, percentile]`; `percentileMix` donut `[band(<3|3-15|15-85|85-97|>97), count]`; patients=`[patient, ageMonths, date, height, weight, bmi, headCirc, heightPct, weightPct, category, doctor]`.

### 3.3 Vaccination — `clinical/vaccination`
- **Source:** `vaccination_api_url` tables.
- Blocks: `statusSummary` `[status(Given|Due|Missed|Refused), count]` (bar); `topBrands` `[brand, count]`; `refusalTrend` `[month, refusals]` (line); `adoptionTrend` `[month, coverage]`; `byDoctor` `[doctor, count]`; `due` patient list `[patient, dob, age, nextVaccine, dueDate, mobile, lastContact]`; `administered` patient list `[date, doctor, patient, age, vaccine, brand, dose, batch, status]`.

---

## 4. Voice Rx — `engagement/voice-rx` (TatvaCare's wedge vs eka.care)

- **Source:** the voice-log store written by `POST/PUT /api/v1/digitization/voice/logs` (createVoiceLog/updateVoiceLog). **A read/aggregate endpoint must be added** — today the logs API is write-only (verified). Fields per log (from `voiceRx2Logging.js`): `type`, `sourceDurationInSeconds`, `timeRequiredInMs`, `transcription`, `digitize`, `conversation`, `voiceModel`, `voiceRxVersion`, `isDoctorAgent`, `moduleName`, doctor/patient/clinic, createdAt; plus an edit signal (was the generated Rx subsequently modified).
- **Endpoint:** `GET /api/v1/analytics/engagement/voice-rx`
- **Blocks:**
  - `kpis`: `[Total Sessions, Doctors Using, Avg Session (s), Prescription Generated %, Edit Rate %, Accuracy %]`
  - `adoptionTrend`: `[week, sessions]` (line) + doctors-onboarded overlay.
  - `byDoctor`: `[doctor, sessions]` (bar).
  - `durationDist`: `[band(<1m|1-3m|3-5m|>5m), count]`.
  - `fieldCapture`: `[field(symptoms|diagnosis|medication|advice), count]` (donut) — which Rx fields voice fills (from `digitize`/`moduleName`).
  - `editRateByField`: `[field, editRatePct]`.
  - `browserMix`: `[browser, count]`.
  - `sessions` (download): `[date, doctor, patient, durationSec, generated(Y/N), edited(Y/N), fieldsCaptured, model, version, browser, status]`.
- **Definitions:** Edit Rate = sessions whose generated Rx was modified ÷ sessions that generated an Rx (lower = more accurate). Accuracy = 1 − (fields edited ÷ fields generated), per field where derivable.

---

## 5. Symptom Collector — `engagement/symptom-collector`
- **Source:** `symptoms_collector_api_url` (TalkativeWidget) — messages sent to patients + responses.
- **Blocks:** `kpis`=[Messages Sent, Responses, Response Rate %, Patients Used, Avg Symptoms/Response]; `sentTrend` `[day, sent]`; `responseRateTrend` `[week, pct]`; `topReported` `[symptom, count]` (bar); `timeToResponse` `[band(<1h|1-6h|6-24h|>24h), count]`; `byDoctor` `[doctor, responseRate]`; patients (download) `[dateSent, doctor, patientUHID, name, mobile, symptomsReported, responseTime, status]`.

---

## 6. Consultation (In-Clinic vs Video) — `consultation/{inclinic|video}`
- **Source:** `tbl_appointment_master.pam_appointment_type` (channel) + `ApiVideoConsult`/`ApiTeleconsult` for video specifics.
- **`consultation/summary`:** `channelTrend` `[week, inClinic, video]` (stacked); `videoAdoptionByDoctor` `[doctor, videoPct]`; `videoAdoptionTrend` `[week, videoSharePct]`.
- **`consultation/video`:** `kpis`=[Video Consults, Video %, Avg Duration, Slot Utilization %]; `durationDist`; `dropOff` (started not completed); `geography` `[city, count]`; patients=`[date, doctor, patient, durationMin, amount, status, device]`.

---

## 7. IPD — `ipd/*` (full set; see Master_Spec §21.1)
IPD runs as a separate service; these aggregate the ADT/billing tables.
| Endpoint | Returns (rows) | Source |
|---|---|---|
| `ipd/summary` | `{admissions, discharges, currentOccupancy, beds, alos, adc, bor}` | `tbl_atd_patient_master`, `tbl_ward_room_management` |
| `ipd/bor-trend` | `[month, borPct, patientDays, bedDays]` (9 mo) | + `cal_days_in_month` |
| `ipd/alos-trend` | `[month, alosDays, discharges]` | discharge ts from `tbl_atd_logs` (run **PB-3**) |
| `ipd/adc-trend` | `[month, adc]` | patient-days ÷ days |
| `ipd/ward-summary` | `[ward, admitted]` (prev month) | `tbl_ward_management` |
| `ipd/discharge-summary` | `[dischargeType, count]` (prev month) | `tbl_inpatient_discharge_type` |
| `ipd/case-mix` | `[department, admissions]` | |
| `ipd/los-distribution` | `[band(1|2-3|4-7|8-14|>14d), count]` | |
| `ipd/readmission` | `{rate30d, count}` | `tapm_readmit` |
| `ipd/revenue-trend` | `[week, collection, revenue]` | `tbl_ipd_billing_overview` |
| `ipd/patient-list` | admissions register (download) | |

**Formulas (legacy-exact, Parity Inventory §4):** BOR = patientDays ÷ (beds × days) × 100 · ALOS = Σ(discharge−admit) ÷ discharges (≥12:00 = full day, else +1) · ADC = patientDays ÷ days.

---

## 8. Financial gaps (beyond the 6 live dashboards)
| Endpoint | Returns | Source |
|---|---|---|
| `financial/daily-collection` | `[type(CashMemo|Receipt|Advance|Refund), billId, issuedBy, patient, mop, amount]` + net total | `tbl_*_retail_sale`, `tbl_receipt_master`, `tbl_advance_master`, `tbl_*_refund_master` |
| `financial/collection-report` | document rows; filters billType[]/issuedBy[]/mode[] | same |
| `financial/3c-report` | service-level `[patientId, patient, billId, item, type, date, amount]`; filters account/dept/billType | `get_*_3creport_service_data` |
| `financial/incentives` | detailed `[user, patient, bill, service, price, incentive]` + overall `[user, totalIncentive]` | `tbl_biiling_insentive_master` |
| `financial/dues-ageing` | `[bucket(0-30|31-60|61-90|90+), amount, count]` | `tbl_receipt_master.rm_pending_amount` |
| `growth/referrals` | `sourceMix` + `topReferrers` + `conversionFunnel` + patient list | `tbl_appointment_source` |
| `growth/follow-ups` | `adherenceByDoctor` + `overdue` patient list | `tcm_followup_date` vs actual |
| `growth/packages` | `assignment` + `statusMix` + `inactive30d` + `usage` | treatment-plan tables |

---

## 9. Frontend integration (already wired — just flip)
The client is **ready**:
- `ApiAnalytics.report(path, params)` → `GET /api/v1/analytics/<path>` → `{columns, rows, meta}` (src/api/services/ApiAnalytics.js).
- `analyticsConfig.API_REPORTS` maps section → endpoint paths; `service.loadSectionViaApi` builds widgets generically.
- GrowthBook flag **`analytics-use-api`** + `config.analytics_api_url` gate the cutover (default off).
- For **dashboard-block** endpoints (§2/§3), add a thin `loadPage` branch per dashboard that calls the endpoint once and maps each block → a widget (mirrors how `patientsWidgets`/`bulkCommWidgets` build KPIs + donuts + table). Each block already matches a widget kind, and `patients`/`*-list` blocks become `patientData` for the ↓ download.

**Cutover per dashboard:** ship endpoint → add `PAGE_MAP[leaf]` + a `loadPage` branch (or flip `analytics-use-api` for the generic ones) → the "Soon" pill drops automatically (BUILT_IDS = Object.keys(PAGE_MAP)).

---

## 10. Build order (backend)
1. **Profiling first:** PB-1 (appt status vocab), PB-2 (hm_id↔hm_business_id), PB-3 (discharge date), PB-5 (money semantics). [profiling SQL](profiling_queries_PB1-PB5.sql)
2. **Rollups:** `fact_appointments_daily`, `fact_billing_daily`, `fact_prescriptions_daily`.
3. **P1 endpoints:** clinical/diagnosis, clinical/drug, clinical/symptoms (highest clinical value; data is clean & ICD/generic-coded).
4. **P2:** voice-rx (the wedge), lab/procedure, consultation, medical-history.
5. **P3:** IPD/* (after PB-3 + census), vitals (after normalization), gynec/growth/vaccination.
6. **P4:** financial gaps (daily-collection, 3C, incentives), growth (referrals/follow-ups/packages), compliance (ABHA/GMB/questionnaire).

---

*Every "Soon" dashboard in the product now has an exact endpoint contract. The frontend is already shaped to consume them. This doc is the backend's build sheet — implement top-down by §10, and each dashboard lights up with a one-line frontend flip.*
