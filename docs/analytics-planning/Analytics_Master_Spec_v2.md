# TatvaCare Analytics — Master Specification v2
## Complete, Extensive, Code-Ready

**Author:** Shyam  
**Date:** 2026-06-06  
**Supersedes:** Analytics_Complete_Spec.md (adds prescription depth, IPD API spec, VoiceRx, teleconsult, bulk SMS, billing, symptom collector, download fix)  
**Status:** Build against this document

---

## CRITICAL: IPD BACKEND STATUS

> **IPD runs as a SEPARATE app** (`ipd_portal_url` / `ipd_api_url`). This repo has only ONE IPD endpoint: `checkPatientAdmitted`. **We must write NEW analytics API endpoints for ALL IPD metrics.** They are specced in §10 with exact request/response shapes. Do not start building IPD analytics UI until the IPD analytics APIs are confirmed live.

---

## CRITICAL: DOWNLOAD FIX

> **Current behaviour (wrong):** clicking ↓ downloads a chart image.  
> **Required behaviour:** every widget's ↓ button downloads a **complete patient-level data table** as Excel (.xlsx) or CSV — all columns, all rows, no aggregation. Clicking the chart icon and clicking ↓ are two different actions.  
> Implementation: `ExportButton` already uses `xlsx`. Fix needed — pass the **raw patient rows** (not the aggregated chart rows) as `fullData` prop. When `fullData` is provided, export that instead of the chart data.

---

## 0. LEFT NAVIGATION (final structure)

```
Analytics
├── Overview                    (KPI summary of all domains)
├── Appointment
├── Patients
├── Payment Report
│   ├── Payments Dashboard
│   └── Real-Time
├── Prescription
│   ├── Drug / Rx
│   ├── Symptoms
│   ├── Diagnosis
│   ├── Lab Tests
│   ├── Procedures
│   ├── Vitals
│   ├── Medical History
│   ├── Surgical History
│   ├── Gynecology & Obstetrics
│   ├── Growth Chart
│   ├── Vaccination
│   └── Raw Data
├── Clinical Quality            (generic ratio, formulary, specialty-specific)
├── Consultation
│   ├── In-Clinic
│   └── Video / Teleconsult
├── Voice Rx
├── Symptom Collector
├── Bulk Communication
├── Billing
│   ├── OPD Billing
│   ├── IPD Billing
│   ├── Daily Collection
│   ├── 3C Report
│   └── Incentives
├── IPD                         (NEW APIs required — specced in §10)
├── Referrals
├── Vaccine
├── Questionnaire
├── Package / Treatment Plans
├── De-Identified Data
├── GMB
├── ABHA / ABDM
└── Reports (hub)
```

**Global filters (every page):** Doctor Name · Clinic Name · Date range (Last 7/15/30/90/365 or custom) · Apply · Clear All  
**Download on every widget:** downloads complete patient-level table (not chart image) as Excel/CSV

---

## 1. APPOINTMENT DASHBOARD

### 1.1 KPIs
| Metric | Calc |
|---|---|
| Total Appointments | COUNT |
| New Patient Appointments | appointments where patient = first-ever visit |
| Old Patient Appointments | returning patients |
| Completed | status = completed |
| Cancelled | status = cancelled |
| No-show | scheduled but didn't arrive |
| Avg Waiting Time (min) | avg(consult_start − check_in) |
| Avg Consultation Time (min) | avg(consult_end − consult_start) |
| In-Clinic Appointments | channel = walk-in |
| Video / Tele Appointments | channel = teleconsult |

### 1.2 Charts
- **Weekly Appointment + Prescription Trend** — dual line (appts vs prescriptions generated)
- **Status Distribution over time** — stacked bar (Completed / Pending / Cancelled / No-show)
- **Channel Distribution** — bar (Walk-in vs Teleconsult vs Other)
- **New vs Old Patient trend** — stacked bar by week
- **Appointment type donut** — New / Follow-up / Urgent split
- **Slot utilization heatmap** — days × time slots × fill%
- **Next 30 days forecast** — scheduled count per day

### 1.3 Tables (patient-level, downloadable)
- **Appointment Report**: Date · Doctor · Clinic · Patient Name · UHID · Gender · Age · Mobile · Appointment Type · Channel · Status · Duration · Slot
- **Tool Usage table**: Doctor · Specialisation · Clinic · Total Appts · Free · Paid · Assessments
- **Next 30 Days Appointments**: Patient · Date · Slot · Doctor · Type

---

## 2. PATIENTS DASHBOARD

### 2.1 KPIs
- New Patients · Old Patients · Total Unique Patients · Patients with ABHA · Patients via Referral · Avg Visits per Patient

### 2.2 Charts
- New vs Old patient trend (line, monthly)
- Patient age-band distribution (bar: <18 / 18–30 / 30–45 / 45–60 / >60)
- Gender distribution (donut)
- Geography distribution (city/state bar)
- Patient retention rate (monthly: % returning within 90 days)
- Acquisition source (referral / walk-in / GMB / teleconsult)

### 2.3 Tables (patient-level, downloadable)
- **Patient Database**: Registration Date · Clinic · Patient Name · DOB · Age · Gender · Mobile · UHID · ABHA ID · Total Visits · Last Visit · New/Old
- **Waiting & Consultation Time**: Doctor · Clinic · Avg Wait (min) · Avg Consult (min)
- **New vs Returning by Doctor**: Doctor · New Count · Old Count · Total
- **Patient Churn List**: Patients not seen in 90+ days

---

## 3. PAYMENT REPORT DASHBOARD

### 3.1 KPIs
- Total Collection · Total Billed · Outstanding Due · Refunded · Collection Efficiency (%) · Today's Collection (real-time)

### 3.2 Charts
- Collection over time (line/bar, daily/weekly/monthly)
- Revenue vs Credit Note (bar)
- Payment mode mix (donut: Cash/UPI/Card/Insurance/Credit/Cheque/Advance)
- In-clinic vs Teleconsult revenue (stacked bar)
- Service-wise revenue (horizontal bar, top 10)
- Doctor-wise revenue (bar)
- Dues ageing (bar: 0–30 / 31–60 / 61–90 / 90+ days)

### 3.3 Tables (patient-level, downloadable)
- **Daily Payments**: Date · Doctor · Clinic · Bill No · Patient · Type · Amount · Mode · Status
- **Patient-Level Full Detail**: all columns including invoice breakdown
- **Service Wise**: Service · Doctor · Qty · Rate · Total · Discount · Net
- **Online Payments**: Gateway · Transaction ID · Patient · Amount · Status

### 3.4 Real-Time sub-page
- Total collected today (live KPI)
- Payment mode wise — real time (bar, updates every 60s)
- Today's transactions (live scrolling table)
- Patient-level FD real time
- Service-wise real time
- IPD real time collection

---

## 4. PRESCRIPTION → DRUG / RX DASHBOARD

### 4.1 KPIs
- Total Prescriptions · Total Unique Drugs · Generic % · Branded % · Avg Drugs per Prescription · Avg Duration per Drug

### 4.2 Charts
- Top Drug (hero text — #1 prescribed)
- **Top Manufacturers prescribed** (donut)
- **Top Generic / Molecules prescribed** (donut)
- **Drug Summary table** (Drug name · Total Prescriptions)
- **Generic Distribution** (Generic name · Count)
- **Manufacturer Distribution** (Manufacturer · Count)
- **Generic vs Branded ratio** (donut + trend line)
- **Frequency distribution** (OD/BD/TDS/QID) (bar)
- **Duration distribution** (1–3d / 4–7d / 7–14d / 14+d) (bar)
- **Avg drugs per prescription by doctor** (bar)

### 4.3 Tables (full patient-level download)
- **Patient List — Drugs**: Date · Doctor · Clinic · Patient UHID · Name · Gender · Age · Mobile · Drug(s) (each drug as separate row) · Generic · Manufacturer · Frequency · Duration · Slot
- **Polypharmacy Alert List**: Patients with >5 drugs in single prescription

---

## 5. PRESCRIPTION → SYMPTOMS DASHBOARD

### 5.1 KPIs
- Total Symptom Records · Unique Symptoms · Most Common Symptom · Avg Symptoms per Visit

### 5.2 Charts
- **Top Symptom** (hero text)
- **Symptoms Summary table** (Symptom · Total Patients)
- **Top 10 symptoms** (horizontal bar)
- **Symptom severity distribution** (Severe / Moderate / Mild donut)
- **Age Distribution — Symptoms** (donut: <18 / 18–30 / 30–45 / 45–60 / >60)
- **Gender Distribution — Symptoms** (donut: M / F)
- **Symptom + Diagnosis correlation** (heatmap: most common symptom→diagnosis pairs)
- **Symptom trend over time** (top 5 symptoms, line chart)

### 5.3 Tables (patient-level, downloadable)
- Date · Doctor · Clinic · Patient UHID · Name · Gender · Age · Mobile · Age Band · Symptom(s) · Severity · Duration · Slot

---

## 6. PRESCRIPTION → DIAGNOSIS DASHBOARD

### 6.1 KPIs
- Total Diagnosis Records · Unique Diagnoses (ICD count) · Most Common Diagnosis · Avg Diagnoses per Visit

### 6.2 Charts
- **Diagnosis Summary table** (Diagnosis · ICD Code · Total Patients)
- **Top 10 Diagnoses** (horizontal bar)
- **Gender Distribution** (donut)
- **Age Distribution** (donut)
- **Diagnosis by status** (Confirmed / Suspected / Ruled-Out donut)
- **Top diagnosis by doctor** (bar — who diagnoses what most)
- **Comorbidity pairs** (which diagnoses appear together most often)
- **ICD chapter distribution** (bar — infectious / cardiovascular / endocrine etc.)
- **Chronic vs Acute split** (donut)

### 6.3 Tables (patient-level, downloadable)
- Date · Doctor · Clinic · Patient UHID · Name · Gender · Age · Mobile · Diagnosis (each as row) · ICD Code · Status (Confirmed/Suspected) · Slot

---

## 7. PRESCRIPTION → LAB TESTS (INVESTIGATIONS) DASHBOARD

### 7.1 KPIs
- Total Lab Tests Ordered · Unique Tests · Test Ordering Rate (% consults with lab tests) · Most Ordered Test

### 7.2 Charts
- **Top Lab Test** (hero text)
- **Lab Test Summary** (Test · Total Prescriptions)
- **Top 10 tests ordered** (horizontal bar)
- **Gender Distribution** (donut)
- **Age Distribution** (donut)
- **Tests ordered by doctor** (bar — who orders most)
- **Test ordering rate trend** (% consults with investigation, monthly line)
- **Test + Diagnosis correlation** (which tests are ordered with which diagnoses)

### 7.3 Tables (patient-level, downloadable)
- Date · Doctor · Clinic · Patient UHID · Name · Gender · Age · Mobile · Lab Test(s) · Notes · Slot

---

## 8. PRESCRIPTION → PROCEDURES DASHBOARD

### 8.1 KPIs
- Total Procedures · Unique Procedures · Most Common Procedure

### 8.2 Charts
- **Top Procedure** (hero text)
- **Procedure Summary** (table)
- **Age Distribution** (donut)
- **Gender Distribution** (donut)
- **Procedures by doctor** (bar)
- **Procedure trend** (monthly line)

### 8.3 Tables (patient-level, downloadable)
- Date · Doctor · Clinic · Patient UHID · Name · Gender · Age · Mobile · Procedure · Notes · Slot

---

## 9. PRESCRIPTION → VITALS DASHBOARD

### 9.1 KPIs
- Total Vitals Records · Avg BP (Systolic/Diastolic) · Avg BMI · Avg SpO2 · Hypertension Prevalence % · Obesity Prevalence % · Hypoxia Prevalence %

### 9.2 Charts
- **Gender Distribution** (donut)
- **Age Distribution** (donut)
- **BP Distribution** (bar: Normal / Elevated / Stage 1 HT / Stage 2 HT)
- **BMI Distribution** (bar: Underweight / Normal / Overweight / Obese)
- **SpO2 Distribution** (bar: <94 / 94–96 / 97–100)
- **Avg vitals trend over time** (multi-line: BP systolic, BMI)
- **Vitals by doctor** (avg BP / BMI per doctor — outlier detection)

### 9.3 Tables (patient-level, downloadable)
- Date · Doctor · Clinic · Patient UHID · Name · Mobile · Gender · Age · BP · Pulse · Weight · Height · BMI · SpO2 · Temp · RBS · FIB4 · BSA · BMR · Other Vitals · Slot

---

## 10. PRESCRIPTION → MEDICAL HISTORY DASHBOARD

**Data source:** `ApiMedicalHistory` → `getPatientLastHistory`, `listSectionwithTag`  
Medical history has structured **sections** (Diabetes, Hypertension, Asthma, etc.) and **tags** within each.

### 10.1 KPIs
- Total Medical History Records · Most Common Chronic Condition · Most Common Allergy · % Patients with Comorbidities · % Patients with Known Allergies

### 10.2 Charts
- **Top Chronic Conditions** (horizontal bar — ordered by frequency across all patients)
- **Chronic condition distribution** (donut — top 8 conditions)
- **Allergy distribution** (horizontal bar — drug / food / environmental)
- **Comorbidity count distribution** (0 / 1 / 2 / 3+ conditions) (bar)
- **Hereditary conditions** (bar — family history patterns)
- **Condition by age band** (stacked bar — which conditions appear in which age groups)
- **Condition by gender** (bar — M vs F for each condition)
- **Active vs Inactive conditions** (donut per condition)
- **Medication for chronic conditions** (which drugs most used per condition)

### 10.3 Tables (patient-level, downloadable)
- Patient UHID · Name · Age · Gender · Condition · Since · Status (Active/Inactive) · Medication · Note · Doctor · Last Updated

---

## 11. PRESCRIPTION → SURGICAL HISTORY DASHBOARD

**Data source:** `ApiSurgical.js`

### 11.1 KPIs
- Total Surgical History Records · Most Common Surgery · Patients with Prior Surgery (%)

### 11.2 Charts
- **Top Surgeries** (horizontal bar)
- **Surgery by age band** (stacked bar)
- **Surgery by gender** (bar)
- **Surgical history trend** (when patients report prior surgeries — useful for surgical load)

### 11.3 Tables (patient-level, downloadable)
- Patient UHID · Name · Age · Gender · Surgery · Notes · Doctor · Clinic · Date Recorded

---

## 12. PRESCRIPTION → GYNECOLOGY & OBSTETRICS DASHBOARD

**Data source:** `ApiGynec.js`, `Obstetric.js`, obstetric APIs  
**Applicable to:** Gynecology / Obstetrics specialities only (filter by specialty)

### 12.1 KPIs
- Total Gynec Records · Active Pregnancies · Total Deliveries (period) · Expectant Mothers Count · High-Risk Pregnancies

### 12.2 Charts
- **Obstetric history distribution** (Gravida/Para distribution bar)
- **LMP tracking** (how many patients have LMP recorded — data quality)
- **EDD distribution** (deliveries due in which week — planning chart)
- **Pregnancy complications** (donut — normal / high-risk flag)
- **Age of pregnancy at first visit** (bar: <8wk / 8–12wk / 12–20wk / >20wk)
- **Menstrual irregularity patterns** (bar)
- **Contraception types documented** (donut)

### 12.3 Tables (patient-level, downloadable)
- **Expectant Mothers Report**: Patient · Age · LMP · EDD · Gravida · Para · Weeks · Risk Level · Doctor · Last Visit
- **Gynec History Raw**: Patient · Diagnosis · LMP · Cycle details · Notes

---

## 13. PRESCRIPTION → GROWTH CHART DASHBOARD

**Data source:** `src/pages/growthChart/`, growth chart APIs (`growth_chart_api_url`)  
**Applicable to:** Pediatrics (filter by specialty)

### 13.1 KPIs
- Total Growth Chart Records · Children Measured · Underweight Prevalence % · Stunting % · Wasting %

### 13.2 Charts
- **Height-for-Age distribution** (scatter: actual vs WHO/IAP percentile bands)
- **Weight-for-Age distribution** (scatter: actual vs percentile bands)
- **BMI-for-Age distribution**
- **Head circumference distribution** (for <2yr)
- **Growth velocity trend** (avg height/weight gain per month across cohort)
- **Percentile category distribution** (donut: <3rd / 3–15 / 15–85 / 85–97 / >97)
- **Stunting/Wasting/Underweight prevalence by age band** (stacked bar)

### 13.3 Tables (patient-level, downloadable)
- Patient · Age (months) · Date · Height (cm) · Weight (kg) · BMI · Head Circumference · Height Percentile · Weight Percentile · Category (Normal/Underweight/Stunted/Wasted) · Doctor

---

## 14. PRESCRIPTION → VACCINATION DASHBOARD

**Data source:** `src/pages/vaccination/`, vaccination APIs

### 14.1 KPIs
- Total Vaccines Administered · Vaccines Due (upcoming 30 days) · Refusal Count · Coverage Rate %

### 14.2 Charts
- **Vaccination Status Summary** (bar: Given / Due / Missed / Refused)
- **Top Vaccine Brands** (bar)
- **Refusal Trend** (line — monthly)
- **Vaccine Adoption over time** (line — cumulative coverage)
- **Doctor-Wise Vaccination Summary** (bar)
- **Age-wise vaccination coverage** (bar: 0–6m / 6–12m / 1–2yr / 2–5yr / 5–12yr)
- **Vaccine schedule adherence** (% who received at correct age)

### 14.3 Tables (patient-level, downloadable)
- **Vaccine Administered**: Date · Doctor · Patient · Age · Vaccine · Brand · Dose · Batch No · Status
- **Due Vaccination**: Patient · DOB · Age · Next Due Vaccine · Due Date · Mobile · Last Contact
- **Refusal/Missed**: Patient · Vaccine · Reason · Date
- **Patient-wise vaccination history**: Full vaccination card per patient

---

## 15. PRESCRIPTION → RAW DATA (Export Hub)

### 15.1 Reports available for export (all with doctor/clinic/date filters)
- Prescription Data (full rows — date, doctor, patient, drug, dose, freq, duration)
- Medical History Raw
- Surgical History Raw
- Admission Recommendations
- Expectant Mothers Report
- Vaccination Raw
- Vitals Raw
- Growth Chart Raw

*All: first 5000 rows in-app table; full data via CSV/Excel download*

---

## 16. CONSULTATION DASHBOARD

### 16.1 In-Clinic vs Video split
- **KPIs**: Total Consultations · In-Clinic Count · Video/Tele Count · Video % share · Avg Duration (each type)
- **Channel trend** (stacked bar — in-clinic vs video, weekly)
- **Video adoption by doctor** (bar — who uses video most)
- **Video adoption trend** (line — is video share growing)
- **Geography of video patients** (city-level bar — patients consulting remotely)

### 16.2 Video Consultation Deep Dive
**Data source:** `ApiVideoConsult.js`, `ApiTeleconsult.js`
- Video slots filled vs available (utilization %)
- Video consultation duration distribution (bar: <5min / 5–15min / 15–30min / >30min)
- Video vs in-clinic revenue comparison
- Video consultation drop-off (started but didn't complete — tech issues signal)
- **Table**: Date · Doctor · Patient · Video Duration (min) · Amount · Status · Device Type

---

## 17. VOICE RX DASHBOARD

**Data source:** `voiceRx2Logging.js` → logs at `/api/v1/digitization/voice/logs`  
**This is unique to TatvaCare — eka.care does not have this**

### 17.1 KPIs
- Total Voice Rx Sessions · Total Doctors Using Voice Rx · Avg Session Duration (min) · Prescription Generated % · Edit Rate % · Accuracy Rate %

### 17.2 Charts
- **Voice Rx adoption trend** (line — sessions per week, which doctors started using)
- **Sessions by doctor** (bar — who uses it most)
- **Session duration distribution** (bar: <1min / 1–3min / 3–5min / >5min)
- **Prescription generation rate** (% voice sessions that produced a prescription)
- **Edit rate after voice** (% of voice-generated prescriptions that were manually edited — lower = more accurate)
- **Fields captured by voice** (donut: symptoms / diagnosis / medication / advice — which fields voice fills)
- **Voice model accuracy by field** (bar — symptoms/diagnosis/drugs accuracy %)
- **Browser/device distribution** (donut: Chrome / Safari / Firefox / Edge)
- **Time of day distribution** (heatmap: when do doctors use voice Rx)
- **Module usage** (which section of the prescription voice fills most)

### 17.3 Tables (patient/session-level, downloadable)
- Date · Doctor · Patient · Session Duration · Prescription Generated (Y/N) · Edit Made (Y/N) · Fields Captured · Audio Duration (sec) · Model Version · Status · Browser

---

## 18. SYMPTOM COLLECTOR DASHBOARD

**Data source:** `TalkativeWidget.js` → `symptoms_collector_api_url`  
**Also called:** Talkative Widget / Patient-reported symptom capture

### 18.1 KPIs
- Messages Sent to Patients (symptom collection invitations) · Responses Received · Response Rate % · Patients Who Used It · Avg Symptoms Reported per Response · Most Reported Symptom (from patient self-report)

### 18.2 Charts
- **Messages sent trend** (line — daily count)
- **Response rate trend** (line — % who responded, by week)
- **Top patient-reported symptoms** (horizontal bar — frequency from self-report)
- **Self-report vs doctor-recorded symptom correlation** (do patients report what doctors find?)
- **Time to response** (bar: <1hr / 1–6hr / 6–24hr / >24hr)
- **Response rate by doctor** (bar — which doctor's patients respond most)
- **Patient engagement over time** (repeat use — patients who used it multiple visits)

### 18.3 Tables (patient-level, downloadable)
- Date Sent · Doctor · Patient UHID · Name · Mobile · Symptoms Reported · Response Time · Status (Sent/Read/Responded)

---

## 19. BULK COMMUNICATION DASHBOARD

**Data source:** `ApiBulkMessages.js` → `bulk_messages` API

### 19.1 KPIs
- Total Campaigns Sent · Total Messages Delivered · Total Credits Used · Remaining Credits · Delivery Rate % · Response Rate %

### 19.2 Charts
- **Campaign volume trend** (bar — campaigns per month)
- **Messages sent by campaign type** (donut: appointment reminder / follow-up / health tip / custom)
- **Delivery rate by channel** (SMS / WhatsApp / Email — bar)
- **Campaign performance** (each campaign: sent / delivered / read / responded)
- **Credit consumption trend** (line)
- **Patient reach** (unique patients contacted per month)
- **Best send time** (heatmap — when messages get highest open rate)

### 19.3 Tables (campaign-level, downloadable)
- Campaign Date · Campaign Name · Template · Target Count · Sent · Delivered · Failed · Credits Used · Status  
**Patient-level Table**: Patient · Mobile · Message · Status · Delivered At · Read At

---

## 20. BILLING DASHBOARD (Extensive)

### 20.1 OPD Billing
**KPIs**: Total Billed · Collected · Due · Refunded · Collection Efficiency % · Credit Notes · Avg Bill Value

**Charts:**
- Collection vs Refund (bar, daily/weekly)
- Revenue vs Credit Note (bar)
- Payment mode mix (donut)
- Bill count by status (donut: FullyPaid / Due / CarriedForward / Refunded)
- Revenue by doctor (bar)
- Revenue by service category (bar)
- Bill value distribution (bar: <500 / 500–2000 / 2000–5000 / >5000)
- Discount analysis (bar: total discount given by doctor)

**Tables (patient-level download):**
- Full Bills Table (all columns)
- Service-wise Revenue
- Doctor-wise Revenue

### 20.2 IPD Billing
Same structure as OPD but scoped to IPD bills (`in_pid IS NOT NULL`)

### 20.3 Daily Collection Close
- Cash Memo total · Receipt total · Advance received · Refund given
- Net collection = Cash Memo + Receipt + Advance − Refund
- Per-counter breakdown table
- Payment mode mix for the day

### 20.4 Advance Deposit
- Total Advance Received · Refunded · Debited (applied to bills)
- Advance balance = Received − Refunded − Debited
- Advance by patient (table)

### 20.5 3C Report (Clinical–Commercial–Compliance)
**Filters:** Account, Department (OPD/IPD), Bill Type (Cash Memo/Invoice/Credit Note), Date range  
**Table columns:** Sr · Patient ID · Patient · Bill ID · Billing Item · Type · Date · Amount  
**Totals:** Cash Memo total · Invoice total · (minus) Credit Note total  
**Export:** mandatory CSV/PDF

### 20.6 Incentive Reports
**Detailed:** Incentive User · Patient · Bill · Service · Service Price · Incentive Amount  
**Overall:** User · Total Incentive · % of Revenue  
**Charts:** Incentive by doctor (bar) · Incentive trend (line) · Incentive as % of revenue

### 20.7 Revenue Analytics (new beyond legacy)
- **Net Revenue vs Gross** (bar: gross − discount − credit notes = net)
- **Collection Efficiency Trend** (line — target: >95%)
- **AR Ageing** (0–30 / 31–60 / 61–90 / 90+ days outstanding bar)
- **Bad Debt Risk** (patients with 90+ day dues — table)

---

## 21. IPD DASHBOARD (NEW APIs REQUIRED)

> **Backend status:** IPD is a separate service at `ipd_api_url`. We have NO analytics endpoints. Must write new APIs.  
> **Before building UI:** confirm IPD DB access / read replica. Run profiling queries PB-3 (discharge date) first.

### 21.1 New API Endpoints to Write

```
GET  /api/v1/analytics/ipd/summary
     Params: hm_id, startDate, endDate
     Returns: { admissions, discharges, currentOccupancy, beds }

GET  /api/v1/analytics/ipd/bor-trend
     Returns: [{ month, bor_pct, patient_days, bed_days }] — last 9 months

GET  /api/v1/analytics/ipd/alos-trend
     Returns: [{ month, alos_days, discharge_count }]

GET  /api/v1/analytics/ipd/adc-trend
     Returns: [{ month, adc }]

GET  /api/v1/analytics/ipd/ward-summary
     Returns: [{ ward_name, admitted_count }] — previous month

GET  /api/v1/analytics/ipd/discharge-summary
     Returns: [{ discharge_type, count }] — previous month

GET  /api/v1/analytics/ipd/case-mix
     Returns: [{ department, admissions }]

GET  /api/v1/analytics/ipd/revenue-trend
     Returns: [{ week, collection, revenue }]

GET  /api/v1/analytics/ipd/patient-list
     Returns: patient-level rows for the period (download)
```

### 21.2 KPIs
| Metric | Formula | Source Table |
|---|---|---|
| Total Admissions | COUNT(tapm_id) WHERE period | atd_patient_master |
| Total Discharges | COUNT WHERE tapm_discharge=1 | atd_patient_master |
| Current Occupancy | COUNT WHERE tapm_discharge=0 | atd_patient_master |
| Bed Occupancy Rate | patient_days ÷ (bed_count × days) × 100 | + ward_room_management |
| Avg Length of Stay | Σ(discharge_dt − admit_dt) ÷ discharges | + tbl_atd_logs (discharge event) |
| Avg Daily Census | patient_days ÷ days_in_period | |
| Bed Turnover | discharges ÷ available_beds | |

### 21.3 Charts
- **BOR trend** (line, 9 months)
- **ALOS trend** (line, 9 months)
- **ADC trend** (line, 9 months)
- **Ward Summary** (donut — admissions per ward, prev month)
- **Discharge Mix** (donut — Medical/Death/LAMA/Absconded/Transferred)
- **Admissions vs Discharges daily** (dual-line)
- **Case mix by department** (bar)
- **IPD Revenue trend** (bar, weekly)
- **Length of Stay distribution** (bar: 1d / 2–3d / 4–7d / 8–14d / >14d)
- **Readmission rate** (% re-admitted within 30 days)

### 21.4 Tables (patient-level, downloadable)
- Admission Date · Discharge Date · LOS (days) · Patient · UHID · Age · Gender · Ward · Doctor · Admitting Diagnosis · Discharge Type · Bill Amount

---

## 22. REFERRAL ANALYTICS DASHBOARD

### 22.1 KPIs
- Total Referrals · Referrals from Doctors · Patient Self-Referrals · GMB/Online Referrals · Referral Conversion % (referred → booked → visited)

### 22.2 Charts
- **Referral source mix** (donut: Doctor / Patient / GMB / Walk-in / Online)
- **Top referring doctors** (horizontal bar)
- **Referral trend** (monthly line)
- **Referral conversion funnel** (referral → booked → attended → prescribed)
- **Revenue from referred patients** (bar)
- **Speciality of referring doctors** (bar — which specialities refer most)

### 22.3 Tables
- **By-Doctor Referrals**: Referring Doctor · Speciality · Count · Revenue Generated
- **By-Patient Referrals**: Patient Referrer · Count
- **Referral Detail**: Date · Referred By · Patient · Status

---

## 23. CLINICAL QUALITY DASHBOARD

### 23.1 Generic vs Branded (critical quality metric)
- Generic prescribing % overall · Generic % by doctor (bar) · Generic % trend (line) · Formulary compliance % (if formulary defined)

### 23.2 Polypharmacy
- % prescriptions with >5 drugs · Avg drugs per prescription · Doctor with highest avg (table)

### 23.3 Specialty-Specific Quality (Diabetes template — extend to all)
**Diabetes:**
- HbA1c control rate · LDL control rate · BP control rate · BMI control rate · Glycemic control trend

**Cardiology:**
- BP control rate · LDL control rate · Statin prescribing rate

**Pediatrics:**
- Vaccination coverage · Growth chart recording rate · Antibiotic prescribing rate

**Gynecology:**
- Antenatal visit adherence · Iron/Folic acid prescribing rate · ANC registration <12 weeks %

---

## 24. PACKAGE / TREATMENT PLAN DASHBOARD

### 24.1 KPIs
- Total Packages Assigned · Active Packages · Expired Packages · Inactive (no activity 30d) · Package Revenue · Avg Package Value

### 24.2 Charts
- Package assignment trend (line)
- Package status distribution (donut: Active/Inactive/Expired/Completed)
- Revenue by package type (bar)
- Inactive packages (30+ days no activity) — churn risk
- Treatment plan usage (which templates used most)

### 24.3 Tables
- **Package Assignment**: Patient · Plan · Assigned Date · Doctor · Status · Last Activity · Revenue
- **Inactive Plans**: Patient · Plan · Days Since Last Activity · Mobile (to call)

---

## 25. FOLLOW-UP ADHERENCE DASHBOARD

### 25.1 KPIs
- Follow-ups Planned · Follow-ups Completed · Adherence Rate % · Overdue Follow-ups

### 25.2 Charts
- Adherence rate by doctor (bar)
- Adherence trend (monthly line — is follow-up culture improving?)
- Overdue follow-ups by days overdue (bar: 1–7d / 8–14d / 15–30d / >30d)
- Follow-up completion by condition (which conditions have best follow-up)

### 25.3 Tables
- **Overdue Follow-up List**: Patient · Mobile · Last Visit · Follow-up Date · Days Overdue · Doctor — *this is actionable, not just analytical*

---

## 26. GMB DASHBOARD (§ see v1 spec — unchanged)

---

## 27. ABHA / ABDM DASHBOARD (§ see v1 spec — unchanged)

---

## 28. QUESTIONNAIRE / STRUCTURED ASSESSMENT DASHBOARD (§ see v1 spec — unchanged)

---

## 29. DE-IDENTIFIED DATA DASHBOARD (§ see v1 spec — unchanged)

---

## 30. UX RULES (apply everywhere)

| Rule | Detail |
|---|---|
| **Download = patient table, not chart** | ↓ on any widget exports complete patient-level data table (all columns, all rows) as Excel/CSV. Chart image download is a separate icon (camera). |
| **Hero metric** | #1 item shown in large colored text at top of each prescription section |
| **Triple-panel** | Summary table + Gender donut + Age donut — standard for symptom/diagnosis/drug/lab/procedure pages |
| **Patient list mandatory** | Every page ends with a drillable patient-level table |
| **⋮ menu per widget** | Export data · Fullscreen · Embed (future) |
| **Export note** | "Showing first 5000 rows. Download CSV for full data." |
| **Real-time badge** | Live widgets show "LIVE" badge + last-updated timestamp |
| **Sample tag** | Charts from the Analytics API (not yet live) tagged orange "Sample" |
| **Empty state** | Icon + message + "No data for this period" — never blank |
| **Date grain auto-switch** | 7d → day grain; 30–90d → week grain; 365d → month grain |
| **Filters sticky** | Selected doctor/clinic/date remembered across navigation |

---

## 31. API STATUS MATRIX

| Dashboard | Existing API | New API Needed |
|---|---|---|
| Appointment | `listAppointment` (partial) | counts-by-day, by-doctor, wait-time |
| Patients | `listDashboard` (partial) | new-vs-returning, demographics |
| Payment Report | `billing/bill/dashboard` ✅ | daily-close split, service-wise |
| Real-Time | billing (today scope) ✅ | service-wise, IPD real-time |
| Drug/Rx | — | casemanager/medicine aggregation |
| Symptoms | — | casemanager/symptoms aggregation |
| Diagnosis | — | casemanager/diagnosis aggregation |
| Lab Tests | — | casemanager/investigation aggregation |
| Procedures | — | casemanager/surgery aggregation |
| Vitals | — | vitals aggregation (needs normalization) |
| Medical History | — | medicalhistory aggregation |
| Surgical History | — | surgical aggregation |
| Gynec/Obstetric | — | gynec/obstetric aggregation |
| Growth Chart | growth_chart_api_url (patient-level) | cohort aggregation |
| Vaccination | vaccination_api_url (patient-level) | cohort aggregation |
| IPD | NONE — separate service | 9 NEW endpoints (§21.1) |
| Consultation | `listAppointment` (type field) | teleconsult-specific metrics |
| Voice Rx | `/api/v1/digitization/voice/logs` ✅ | aggregation endpoint |
| Symptom Collector | `symptoms_collector_api_url` | message/response aggregation |
| Bulk SMS | `bulk_messages` API ✅ | campaign-level analytics |
| OPD Billing | `billing/bill/dashboard` ✅ | service-wise, 3C, incentives |
| IPD Billing | `billing/ipd-bill/dashboard` ✅ | service-wise |
| Referrals | — | referral source aggregation |
| Clinical Quality | — | casemanager aggregation + rule engine |

---

## 32. BUILD ORDER

### P0 (now — no new APIs) ✅ Done
Route · sidebar · chart wrapper · query builder · PHP-faithful dashboard shell

### P1 (2–3 weeks — existing APIs only)
1. Appointment Dashboard (full layout)
2. Payment Report (full layout + real-time)
3. Patients Dashboard
4. OPD/IPD Billing (full layout + daily collection)
5. Voice Rx Dashboard (logs API exists)
6. Bulk SMS Dashboard (API exists)
7. **Fix download** → patient table Excel/CSV

### P2 (needs Analytics microservice)
1. Drug / Symptoms / Diagnosis / Lab / Procedure (triple-panel template × 5)
2. Vitals (with normalization)
3. Medical History
4. Surgical History
5. Gynec & Obstetrics
6. Consultation (in-clinic vs video)
7. Symptom Collector

### P3 (needs IPD API + growth/vaccination aggregation)
1. IPD Dashboard (write 9 new API endpoints first)
2. Growth Chart cohort analytics
3. Vaccination cohort analytics
4. Referral Analytics
5. Clinical Quality (specialty dashboards)
6. Package / Treatment Plans
7. Follow-up Adherence

### P4 (compliance + digital presence)
1. 3C Report · Incentives
2. ABHA/ABDM · GMB
3. Questionnaire
4. De-Identified Data

---

*This is the complete, build-ready specification. Every section maps to an existing API (with the endpoint named), or precisely documents the new API that must be written. No guessing — write the API spec from §21.1 for IPD, then build the UI shell, then wire the data.*
