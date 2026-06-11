# TatvaCare Analytics — Complete Specification
## All dashboards, all metrics, all charts — ready to code

**Author:** Shyam  
**Date:** 2026-06-06  
**Source:** (1) eka.care analytics platform — 22 reference screenshots; (2) legacy PHP `data_analytics/` suite; (3) TatvaCare EMR existing APIs  
**Purpose:** Definitive list of every analytics screen, every chart/widget, every metric, and every UX pattern we will build. This is the document we write code against.

---

## 0. Navigation (Left Sidebar — eka.care model + our additions)

| # | Section | Sub-pages | Priority |
|---|---|---|---|
| 1 | **Appointment** | Appointment Dashboard | P1 |
| 2 | **Patients** | Patient Dashboard | P1 |
| 3 | **Payment Report** | Payments Dashboard, Real-Time Report | P1 |
| 4 | **Prescription** | Drug, Symptoms, Diagnosis, Lab Test, Procedure, Diabetes, Vitals, Raw Data | P1–P2 |
| 5 | **Vaccine** | Vaccine Dashboard | P2 |
| 6 | **Questionnaire** | Questionnaire Dashboard | P2 |
| 7 | **IPD** | IPD Dashboard (BOR/ALOS/ADC/ward) | P2 |
| 8 | **De-Identified Data** | Anonymised aggregate export | P3 |
| 9 | **GMB** | Google My Business signals | P3 |
| 10 | **ABDM / ABHA** | ABHA linking stats | P3 |
| 11 | **Package** | Treatment plan / package tracking | P2 |
| *(our additions)* | **Clinical Quality** | Generic-vs-branded, formulary | P2 |
| *(our additions)* | **Referrals** | Referral source, doctor referrals | P2 |
| *(our additions)* | **OPD Billing** | Collection, 3C, incentives | P1 |
| *(our additions)* | **IPD Billing** | IPD revenue, credit notes | P1 |

**Global filters (every page):** Doctor Name (multi-select) · Clinic Name (multi-select) · Date range preset (Last 7 / 15 / 30 / 90 / 365 days or custom) · Apply / Clear All

---

## 1. APPOINTMENT DASHBOARD

**Source:** `appointments_analytics.php` + eka.care Appointment Dashboard  
**Filters:** Doctor, Clinic, Date range

### 1.1 KPI Row (3 headline cards)
| Metric | Description |
|---|---|
| **Total Appointments** | Count of all appointments in period |
| **Average Waiting Time (min)** | Avg minutes from check-in to consultation start |
| **Average Consultation Time (min)** | Avg minutes of actual consultation |

### 1.2 Weekly Appt & RX Trend (line chart)
- X: weeks in period
- Series: **Total Appointments** (line) + **Total Prescriptions** (line, different color)
- Insight: correlates appointment volume with prescription generation rate

### 1.3 Status Distribution — Appointments (grouped bar)
- X: date/week
- Series: Completed · Pending · Queued · Urgent · Cancelled  
- Per-bar stacked or grouped (user toggle)

### 1.4 Channel Type Distribution — Appointments (grouped bar)
- X: date/week  
- Series: Walk-in Appointment · Teleconsultation · Other channel types

### 1.5 Appointment Types — Old vs New Patient (grouped bar)
- X: doctor or date
- Series: **Old Appointment** (existing patient) · **New Appointment** (first visit)

### 1.6 Tool Usage (table)
- Columns: Date · Doctor Name · Specialisation · Partner Clinic · Clinic Code · Facility Name · Total Appointments · Free · Paid · Assessments

### 1.7 Appointment Report (detailed table)
- Columns: Date · Partner Clinic · Doctor Name · Specialisation · Clinic Name · Patient Name · Patient Gender · Patient Age · Patient Mobile · Patient UH ID · Appointment Type · Appointment Date · Notes

### 1.8 Next 30 Days Appointments (bar chart)
- X: next 30 days · Y: scheduled appointment count · Forward-looking view

---

## 2. PATIENTS DASHBOARD

**Source:** `patients_analytics.php` + eka.care Patients Dashboard  
**Filters:** Doctor, Clinic, Date range

### 2.1 KPI Row
| Metric | Description |
|---|---|
| **New Patients** | First-time visits in period |
| **Old Patients** | Return patients in period |

### 2.2 Patient Waiting & Consultation Time (table)
- Columns: Doctor Name · Clinic Name · Average Waiting Time (min) · Average Consultation Time (min)
- Searchable, paginated

### 2.3 Patient Status — New vs Returning (table with flags)
- Columns: Doctor Name · Clinic Name · Patient UHD · Patient Name · Patient Score · Patient Number · Patient Age · Age Distribution · New/Old flag · Remind Contact

### 2.4 Referred To — By Referral (table)
- Columns: Date · Referred By ID · Patient Name · Patient UHD · (clinic data)

### 2.5 Referral From — PT/GMB (table)
- Source of referral (patient referral vs Google My Business vs direct)
- Columns: Date · Patient ID · Patient Name · Patient Mobile · Tokens Age · Tokens Age by Number

### 2.6 Patient Database (master table)
- Columns: Clinic Registration Date · Clinic Name · Patient Name · Patient DOB · Patient Score · Patient Number · Patient Department · Patient Mobile (masked) · Phone
- CSV export available (note: first 5000 rows — use CSV for full data)

### 2.7 Patient Chart (sparkline)
- Simple volume trend for the current filter period

---

## 3. PAYMENT REPORT DASHBOARD

**Source:** `opd_billing_analytics.php`, `ipd_billing_analytics.php`, `daily_collection.php` + eka.care Payments Report  
**Filters:** Doctor, Clinic, Date range

### 3.1 KPI Row
| Metric | Description |
|---|---|
| **Payments Collected** | Total cash actually received |
| **Total Bills Amount** | Gross billed amount |
| **Old Bill Amount** | Carried-forward / unpaid from previous period |
| **Total Payments Collected** | Net of all payment types |

### 3.2 Total Face-to-Face Collection (bar chart)
- In-person vs teleconsultation payment breakdown over time

### 3.3 Payment Mode Mix (donut)
- Segments: Cash · Card · UPI · Insurance · Credit · Cheque · Advance Deposit · Others

### 3.4 Online Payments (bar chart)
- Payment gateway collections over time

### 3.5 Services Made — Case type (bar)
- Revenue by service / case type over time

### 3.6 Daily Payments Overview (table)
- Columns: Date · Doctor Name · Clinic Name · Payment Type · Total Amount · Discount · Total Paid Amount · Total Remaining Amount · (invoice detail columns)

### 3.7 Patient Level FD (full detail table)
- Row per visit/invoice: Date · Doctor · Clinic · Patient Name · Patient UHID · Patient Mobile · Bill No · Bill Amount · Amount Paid · Amount Due · Payment Mode · Bill Type

### 3.8 Service Wise Report (table)
- Columns: Service Name · Doctor · Clinic · Total Quantity · Rate · Total Amount · Discount · Net Amount

### 3.9 Invoiced Wise Test Report (table)
- Columns: Bill No · Invoice Date · Doctor · Clinic · Patient · Patient Mobile · Total Amount · Discount · Paid · Due · Tests Ordered

### 3.10 Online Fee Payment Report (table)
- Online gateway payment rows: Doctor · Patient · Amount · Mode · Transaction ID · Status

### 3.11 Note (KPI)
- Outstanding notes / dues summary at period close

---

## 4. REAL-TIME REPORT DASHBOARD

**Source:** eka.care Real-Time Report  
**Filters:** Doctor, Clinic  
**Note:** Near-real-time (minutes-fresh) — no date range filter, always "now"

### 4.1 Total Amount Collected (KPI)
- Live running total for today

### 4.2 Paymode Wise Payment — Real Time (bar)
- Live breakdown: Cash / Card / UPI etc. for today

### 4.3 Real Time Raw (table)
- Live row-per-transaction feed for today

### 4.4 Daily Payments Real Time (table)
- Scrolling list of today's payments with patient + doctor

### 4.5 Patient Level FD Real Time (table)
- Patient-level detail for today's consultations

### 4.6 Service Wise Real Time (table)
- Service revenue running total for today

### 4.7 IPD Raw — Real Time (bar/table)
- IPD admissions and payments flowing in today

---

## 5. PRESCRIPTION → DRUG DASHBOARD

**Source:** `data_clinic_rx_analytics.php` + eka.care Drug Dashboard  
**Filters:** Doctor, Clinic, Date range

### 5.1 Top Drug (headline text)
- The single most prescribed drug name in large text (visual hero)

### 5.2 Drug Summary (table)
- Columns: Drug name · Total Prescriptions (sorted desc)
- Searchable

### 5.3 Generic Distribution — Drugs (table)
- Generic Name · Total Prescription count

### 5.4 Manufacturer Distribution — Drugs (table)
- Manufacturer · Total Prescription count

### 5.5 Top Manufacturers Prescribed (donut)
- Segments: each manufacturer with count labels

### 5.6 Top Generic Prescribed (donut)
- Segments: each generic/molecule with count labels

### 5.7 Patient List — Drugs (detailed table)
- Columns: Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Gender · Patient Age · Patient Mobile · Drug(s) · Slot

---

## 6. PRESCRIPTION → SYMPTOMS DASHBOARD

**Source:** eka.care Symptoms Dashboard  
**Filters:** Doctor, Clinic, Date range

### 6.1 Top Symptom (headline text hero)
- Most reported symptom in large text

### 6.2 Symptoms Summary (table)
- Symptom · Total Patients (sorted desc)

### 6.3 Age Distribution — Symptoms (donut)
- Segments: <18 Years · 18–30 Years · 30–45 Years · 45–60 Years · >60 Years

### 6.4 Gender Distribution — Symptoms (donut)
- Segments: Female · Male

### 6.5 Patient List — Symptoms (table)
- Columns: Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Gender · Patient Mobile · Patient Age · Age Distribution · Symptom(s) · Slot

---

## 7. PRESCRIPTION → DIAGNOSIS DASHBOARD

**Source:** `data_clinic_diagnosis.php` + eka.care Diagnosis Dashboard  
**Filters:** Doctor, Clinic, Date range

### 7.1 Diagnosis Summary (table)
- Diagnosis · Total Patients (sorted desc, ICD-coded)

### 7.2 Gender Distribution — Diagnosis (donut)
- Female vs Male patient split per diagnosis

### 7.3 Age Distribution — Diagnosis (donut)
- <18 / 18–30 / 30–45 / 45–60 / >60

### 7.4 Patient List — Diagnosis (table)
- Columns: Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Gender · Patient Age · Patient Mobile · Diagnosis (all, ICD-coded) · Slot

---

## 8. PRESCRIPTION → LAB TEST DASHBOARD

**Source:** eka.care Lab Test Dashboard  
**Filters:** Doctor, Clinic, Date range

### 8.1 Top Lab Test (headline text hero)
- Most ordered investigation

### 8.2 Lab Test Summary (table)
- Lab Test · Total Prescriptions (ordered)

### 8.3 Gender Distribution — Lab Test (donut)

### 8.4 Age Distribution — Lab Test (donut)

### 8.5 Patient List — Lab Test (table)
- Columns: Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Gender · Patient Age · Patient Mobile · Lab Test(s) ordered · Slot

---

## 9. PRESCRIPTION → PROCEDURE DASHBOARD

**Source:** eka.care Procedure Dashboard  
**Filters:** Doctor, Clinic, Date range

### 9.1 Top Procedure (headline text hero)

### 9.2 Procedure Summary (table)
- Procedure name · Total Patients

### 9.3 Age Distribution — Procedure (bar/donut)

### 9.4 Gender Distribution — Procedure (donut)

### 9.5 Patient List — Procedure (table)
- Columns: Date · Doctor · Clinic · Patient UHID · Patient Name · Gender · Age · Mobile · Procedure · Slot

---

## 10. PRESCRIPTION → DIABETES DASHBOARD

**Source:** eka.care Diabetes Dashboard  
**Filters:** Doctor, Clinic, Date range  
**Note:** Specialty-specific clinical quality dashboard — template for other specialties (Cardiology, Ortho, Gynec, etc.)

### 10.1 KPI Row (6 cards)
| Metric | Description |
|---|---|
| **Total Base Type 2 Diabetes** | Diabetic patient count in period |
| **LDL Cholesterol Control Rate** | % patients with LDL < target |
| **Abdominal Obesity Rate** | % patients with waist circumference >threshold |
| **BP Patients Rate** | % diabetic patients with BP measured |
| **Glycemic Control Rate (HbA1c)** | % patients with HbA1c at target |
| **Weight Control Rate** | % patients at healthy BMI |

### 10.2 Diabetes Rate (line chart)
- Diabetic patients over time, trend analysis

---

## 11. PRESCRIPTION → VITALS DASHBOARD

**Source:** eka.care Vitals Dashboard  
**Filters:** Doctor, Clinic, Date range

### 11.1 Gender Distribution — Vitals (donut)
- Male vs Female patient split

### 11.2 Age Distribution — Vitals (donut)
- Age-band breakdown

### 11.3 Patient List — Vitals (raw data table)
- Columns: Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Mobile · Patient Gender · Patient Age · Blood Pressure · Pulse Rate · Body Weight (kg) · Body Height (cm) · SpO2 · Temperature · BMI · Other Vitals (free-text field) · Slot

---

## 12. PRESCRIPTION → RAW DATA DASHBOARD

**Source:** eka.care Rx Raw Data Dashboard  
**Note:** Export-first design; first 5000 rows in-app, CSV for full dataset

### 12.1 Admission Recommendations Report (table)
- Full prescription-level rows with referral recommendations

### 12.2 Prescription Data (full raw table)
- Columns: Date · Doc ID · Doctor Name · Clinic Name · Patient UHID · Patient Phone · Patient UHD · Patient DOB · Patient Age · Patient Tag · Age (consent) · Referred By · Follow-up Date · Follow-up Name · Prescription ID · Prescription Date/Time · Prescription Link (URL) · Name · Type · Quantity · Value · Unit · Remarks · Booking Date

### 12.3 Medical History (table)
- Columns: Visit Date · Doctor Name · Clinic Name · Patient UHID · Patient Name · Patient Mobile · Patient Gender · Patient Age · Notes · Voice · Remarks · Type

### 12.4 Expectant Mothers Report (table)
- Pregnancy tracking: EDD · Week · Gravida · Para · LMP date

---

## 13. VACCINE DASHBOARD

**Source:** eka.care Vaccine Dashboard  
**Filters:** Doctor (optional), Date range

### 13.1 Vaccination Status Summary (bar chart)
- Given / Due / Missed / Refused per vaccine type

### 13.2 Top Vaccine Brands Used (bar)
- Most administered brands

### 13.3 Refusal Trend Over Time (line)
- Vaccine refusals over time — public-health signal

### 13.4 Vaccine Adoption Over Time (line)
- Vaccination coverage trend

### 13.5 Doctor-Wise Vaccination Summary (bar)
- Which doctors vaccinated most patients

### 13.6 Vaccine Administered Report — Brand Wise (table)
- Vaccine brand · Count · Patients

### 13.7 Patient-Wise Vaccination Report (table)
- Patient · Vaccine · Dose · Date · Status

### 13.8 Refusal/Missed Report — Patient Wise (table)
- Patient · Vaccine · Reason · Date

### 13.9 Due Vaccination (table)
- Upcoming vaccination schedule — actionable list

### 13.10 Vaccination — Real Time (bar)
- Today's vaccinations as they happen

---

## 14. QUESTIONNAIRE DASHBOARD

**Source:** eka.care Questionnaire Dashboard  
**Filters:** Doctor, Clinic, Date range

### 14.1 Doctor-Wise SA Completed (bar)
- Which doctors completed how many structured assessments

### 14.2 SA Raw (table)
- Raw structured-assessment submission rows

### 14.3 Patient-Wise Assessment Details (full table)
- Columns: Appt Date · Doctor Name · Specialisation · Partner ID · Clinic Code · Clinic Name · Patient UHID · Patient Name · Patient Gender · Patient Mobile · Appt ID · Appointment Tag · Prescriptions Written · Cancelled Appointment · Assessment Status · Assessment Name · Assessment Notes · Authorised By · Admission Details · Assessment Result

---

## 15. IPD DASHBOARD

**Source:** `inpatient_summary.php` + our IPD planning  
**Filters:** Hospital, Date range

### 15.1 KPI Row
| Metric | Formula |
|---|---|
| **Total Admissions** | COUNT(admissions in period) |
| **Total Discharges** | COUNT(tapm_discharge=1 in period) |
| **Current Occupancy** | Active patients now (live) |
| **Average Length of Stay (ALOS)** | Σ(discharge−admit) ÷ discharges |
| **Bed Occupancy Rate (BOR)** | patient-days ÷ (beds × days) × 100 |
| **Average Daily Census (ADC)** | patient-days ÷ days in period |

### 15.2 BOR Trend (line, last 9 months)
### 15.3 ALOS Trend (line, last 9 months)
### 15.4 ADC Trend (line, last 9 months)
### 15.5 Ward Summary — prev month (donut): admissions per ward
### 15.6 Discharge Mix — prev month (donut): discharge type (Medical / Death / LAMA / Absconded / Transferred)
### 15.7 Admissions vs Discharges daily trend (line)
### 15.8 Case Mix (bar): admission category / department
### 15.9 IPD Revenue trend (bar): weekly IPD collection + revenue
### 15.10 Admissions Table: Date · Patient · Ward · Admitting Doctor · Diagnosis · Days Admitted · Status

---

## 16. DE-IDENTIFIED DATA DASHBOARD

**Source:** eka.care De-Identified Data Dashboard  
**Note:** Aggregate-only, PII removed — for population health / research use

Contains multiple anonymised aggregate reports:
- Total Appointments — Avoidable (donut)
- Total Appointments — Diagnosis wise (bar)
- Appointment Status wise (bar)
- Total Prescriptions wise (table)
- Doctors Appointment — Total wise (table)
- Lab by Patient type (bar)
- Appointments by Patient — Total wise (table)
- Prescriptions — Total wise (bar)
- Referral — Total wise (bar)
- Prescriptions by Diagnosis (table)
- Lab Test Trends (line)
- Lab Test — Avoidable (donut)
- Lab Results — Available (table/counts)

---

## 17. GMB (GOOGLE MY BUSINESS) DASHBOARD

**Source:** eka.care GMB Dashboard  
**Filters:** Doctor  
**Purpose:** Online visibility & reputation analytics

### 17.1 Number of Times Profile Was Viewed (bar/KPI)
### 17.2 Number of Times Profile Was Viewed On Device (bar — mobile vs desktop split)
### 17.3 Number of Times Profile Appeared On Google Maps (KPI + trend)
### 17.4 Patient Interactions With You (bar — calls / directions / website clicks)
### 17.5 Number of Reviews (KPI)
### 17.6 Ratings Breakdown (bar — 1★ to 5★ distribution)
### 17.7 Tasks Completed By You (KPI — profile completeness score)

---

## 18. ABDM / ABHA DASHBOARD

**Source:** eka.care ABHA Dashboard  
**Filters:** Clinic Name

### 18.1 KPI Row
| Metric | |
|---|---|
| Total Care Contexts Linked | ABHA records linked total |
| Total KYC Care Contexts Linked | Verified/KYC linked |
| Total Non-KYC Care Contexts Linked | Unverified linked |
| Total ABHA Patients | Patients with ABHA ID |
| Total ABHA KYC Patients | KYC-verified ABHA patients |
| Total ABHA Non-KYC Patients | Non-KYC ABHA patients |
| Consent — Success with KYC | Successful consent with KYC |
| Consent — Success without KYC | Successful consent without KYC |

---

## 19. PACKAGE / TREATMENT PLAN DASHBOARD

**Source:** eka.care Package Dashboard  
**Filters:** Doctor, Clinic, Date range

### 19.1 Package Assignment Overview (bar)
- How many packages/plans assigned by doctor/clinic over time

### 19.2 Patient Plan Summary (bar)
- Plan status breakdown per patient

### 19.3 Inactive Plans — No activity 30+ days (table)
- Plans at risk of churn: Patient · Plan · Assigned Date · Last Activity · Doctor

### 19.4 Treatment Plan Usage (bar)
- Usage rate of pre-built treatment templates

---

## 20. OUR ADDITIONS — NOT IN EKA.CARE (what they missed)

These are the areas eka.care does not cover that are high value for a practice-management+billing EMR:

### 20.1 Financial Command Center
| Widget | Source |
|---|---|
| **Collection Efficiency** | Paid ÷ Billed × 100 (HFMA metric) |
| **AR / Dues Ageing** | Outstanding dues bucketed by 0–30 / 31–60 / 61–90 / 90+ days |
| **3C Report** | Service-level cash/invoice/credit-note breakdown (roles 23/392) |
| **Incentive Report** | Doctor/staff incentive payout summary + detail |
| **Daily Collection Close** | Cash memo + receipt + advance – refund totals per counter |
| **OPD vs IPD Revenue Split** | Stacked bar, trend |
| **Credit Note Volume** | Credit note trend — billing error / dispute signal |
| **Payment Mode Trend** | Cash/UPI/insurance shift over time |

### 20.2 Referral Analytics
| Widget | Source |
|---|---|
| Referral Source Mix | Patient-referred / Doctor-referred / Walk-in / GMB / Other |
| Top Referring Doctors | Which external doctors send most patients |
| Referral-to-Visit Conversion | Referrals booked vs actually seen |
| Referral Revenue Contribution | Revenue from referred patients |

### 20.3 Follow-up Adherence
| Widget | |
|---|---|
| Planned vs Completed Follow-ups | Follow-up rate per doctor |
| Overdue Follow-ups | Patient list with overdue follow-up dates |
| Follow-up Conversion (came back) | % of patients who came back as scheduled |

### 20.4 Pharmacy Analytics (from `others_analytics.php`)
| Widget | |
|---|---|
| Purchase Invoice / Return / Sale Invoice / Return (stacked bar, daily) | Pharmacy module |
| Top Selling Drugs | by quantity + by revenue |
| Drug Stock Velocity | Fast vs slow moving |

### 20.5 Pathology / Lab Analytics
| Widget | |
|---|---|
| OPD vs IPD test volume (line) | Daily |
| Top ordered tests | bar |
| Test turnaround time | time from order to result |

### 20.6 Doctor Performance
| Widget | |
|---|---|
| Consultations per doctor (bar) | Productivity |
| Average consultation time per doctor | Efficiency |
| Prescription rate per doctor | Ratio of visits generating prescriptions |
| Generic prescribing ratio per doctor | Quality metric |
| Follow-up scheduling rate | Continuity of care |
| Revenue generated per doctor | Financial contribution |
| New-vs-returning patient mix per doctor | Growth vs retention |

### 20.7 Practice Growth
| Widget | |
|---|---|
| Patient acquisition (new patients/month) | Growth rate |
| Patient retention rate | % returning within 90 days |
| Visit frequency per patient | Loyalty metric |
| Patient lifetime value (visits × avg bill) | Revenue per patient |
| Churn rate (patients not seen in 90+ days) | Retention alert |

---

## 21. DESIGN PATTERNS (from eka.care screenshots)

Apply these patterns uniformly across all dashboards:

| Pattern | Spec |
|---|---|
| **Global date presets** | Last 7 / 15 / 30 / 90 / 365 days + custom range |
| **Per-page filters** | Doctor Name (multi-select) · Clinic Name (multi-select) |
| **Hero metric** | Most-common item shown in large colored text at top of section (e.g., "throat pain", "dolo") |
| **Triple-panel row** | Summary table + Gender donut + Age donut — standard prescription section layout |
| **Patient list at bottom** | Every prescription sub-section ends with a drillable patient-level table |
| **⋮ menu per widget** | Each card has a three-dot menu (export, embed, fullscreen) |
| **Export note** | "Excel Downloads only first 5000 rows. Use CSV Download for full data." |
| **KPI card style** | Large number, no graph, just the count — clean, single-focus |
| **Sample tag** | Charts with no data show graceful empty state with icon; NOT blank |
| **Real-time badge** | Real-time widgets labelled distinctly; show "Waiting on database…" while loading |

---

## 22. BUILD ORDER (phased)

### P0 — Foundation (already done)
- Route + sidebar + chart.js wrapper + query builder ✅

### P1 — Core Operations (highest ROI — data exists today)
1. Appointment Dashboard (KPIs + weekly trend + status/channel/type charts)
2. Payment Report Dashboard (KPIs + collection trend + payment-mode donut + bills table)
3. Real-Time Report (today's collections — live)
4. Patients Dashboard (new vs old + patient table)
5. Financial additions: Collection Efficiency · Dues Ageing · Daily Collection

### P2 — Clinical (needs Analytics API for aggregation)
1. Drug Dashboard (top drug + manufacturer/generic donuts + patient list)
2. Symptoms Dashboard (top symptom + age/gender donuts + patient list)
3. Diagnosis Dashboard (same pattern)
4. Lab Test Dashboard (same pattern)
5. Procedure Dashboard (same pattern)
6. Vitals Dashboard (gender/age donuts + vitals raw table)
7. Prescription Raw Data (export-first)
8. Doctor Performance widgets

### P2 — Operational
1. IPD Dashboard (BOR/ALOS/ADC/ward/discharge)
2. Package Dashboard (treatment plan tracking)
3. Vaccine Dashboard
4. Referral Analytics
5. Follow-up Adherence

### P3 — Specialty + Compliance + Growth
1. Diabetes Dashboard (template for specialty quality metrics)
2. Questionnaire Dashboard (structured assessments)
3. De-Identified Data (population health)
4. ABHA/ABDM Dashboard
5. GMB Dashboard
6. 3C / Incentive / Pharmacy / Pathology reports
7. Practice Growth metrics

---

## 23. DATA SOURCE MAP

| Dashboard | Existing React API | Needs Analytics API |
|---|---|---|
| Appointment KPIs + status | `listAppointment` (partial) | counts-by-day, by-doctor |
| Payment Report | `billing/bill/dashboard` ✅ | credit notes, daily close |
| Real-Time Report | `billing/bill/dashboard` (today only) | service-wise, IPD real-time |
| Drug / Symptoms / Diagnosis / Lab / Procedure | — | casemanager aggregation |
| Vitals | — | vitals normalization |
| Prescription Raw | — | full prescription rows |
| IPD | — | IPD API / ATD tables |
| Vaccine | — | vaccination tables |
| Questionnaire | — | assessment tables |
| ABHA | — | ABDM integration |
| GMB | — | Google API integration |
| Package | — | treatment plan tables |

---

*This is the complete, actionable spec. Every section maps to a real data source (or an honest "needs API" flag) and every chart has a type, dimensions, and filters defined. Start building P1 first — it ships with no new backend needed.*
