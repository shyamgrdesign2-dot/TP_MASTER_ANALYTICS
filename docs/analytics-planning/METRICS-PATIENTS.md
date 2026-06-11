# Patients analytics — metric dictionary

**Audience:** Hospital Admin and Doctor Admin.
**Scope:** the patient panel — who the patients are, whether they come back, and
who is worth recalling. (A patient who goes to IPD always enters through OPD, so
this page speaks of **patients**, never "OPD patients".)

## The model: new vs returning is VISIT history, never registration date

A patient is **Returning** when they have **more than one visit on record** —
they came back. A patient is **New** when the selected period holds their **only
visit so far**. Registration date is never used: a patient "registered last year"
who visited once is still a one-and-done patient, not a returning one.

```
Total patients  =  New (this period)  +  Returning        (always reconciles)
Repeat-visit rate  =  patients with ≥2 lifetime visits ÷ lifetime panel
One-and-done rate  =  100% − repeat-visit rate
```

This fixes the earlier bug where "New" was registration-dated (so "Till date"
showed everyone as New while the Returning trend line sat at zero).

## How to read this doc

All figures obey the live filter scope (**Doctor · Clinic · Period**, plus the
in-page **Gender** segment on this leaf), restated in every info-tooltip.

**Single API endpoint** powers the page:

```
GET /api/v1/analytics/operational/patients
    ?startDate=YYYY-MM-DD
    &endDate=YYYY-MM-DD
    &careSetting=opd
    &doctorIds=<id,id>          (optional)
    &hospitalId=<hm_id,..>      (optional)
    &gender=Male|Female         (optional in-page segment)
    &bloodGroup=/&abha=/&status= (optional drill-downs; status=new|returning)
    Authorization: Bearer <JWT with result.hospital_business_id>
```

Builder: `pm-analytics-service/src/analytics/builders/patients.ts`. Read-only.

**Source tables**
- `tbl_appointment_master` — visits; patients are scoped to the business through
  their visits (the patient master is global).
- `tbl_patient_master p` — demographics, contact, ABHA, blood group, city.
- `tbl_opd_billing_overview` — lifetime billed value per patient (for the
  most-valuable / lapsed-high-value lists).

**Cohort:** patients with ≥1 visit at this business in the period. Per patient we
compute period visits AND **lifetime visits capped at the period end** — the
lifetime count is what drives new/returning.

**Zero-fill principle:** gender (Male/Female/Other), age bands, all 8 blood
groups, and all 5 RFM segments are always listed, 0 when empty. Cities show every
city with ≥1 patient plus one explicit **Unknown** bucket.

---

## A. Key metrics (KPI cards)

### Total patients  → `hero`
- **What:** Distinct patients seen in the period (a patient counts once, however
  many visits).
- **How:** `COUNT(DISTINCT patient_unique_id)` over the period cohort.

### One-time visitors  → `kpis[].new`
- **What:** Patients seen this period whose **only visit on record** (up to the
  period end) is this one — they have not returned yet.
- **Why / who:** Acquisition + the retention gap in one number.
  **One-time visitors + Returning patients = Total patients**, always.
- **How:** `SUM(lifetimeVisits = 1)` over the period cohort.

### Returning patients  → `kpis[].returning`
- **What:** Patients seen this period who have **more than one visit on record**
  — they came back.
- **Why / who:** Retention.
- **How:** `SUM(lifetimeVisits > 1)` over the period cohort.

### ~Avg patient age  → `kpis[].age`
- **What / how:** mean of `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())` over the
  period cohort, whole years, ~-marked (patients without a DOB excluded).
- **Why:** service-mix and communication planning.

### ABHA linked  → `kpis[].abha` (unit `%`)
- **What:** Share of patients seen with an ABHA (national health ID) linked.
- **How:** `pm_abha_address` non-empty ÷ total, %.

### Contactable  → `kpis[].reach` (unit `%`)
- **What:** Share with a mobile number **or email** on file — reachable for
  recalls and campaigns. (Mobile is mandatory at registration, so this normally
  reads ~100%; a lower number flags data-quality gaps worth fixing.)

### Top blood group  → `kpis[].topBlood`
- **What:** The most common **recorded** blood group among patients seen this
  period (count in tooltip); "—" when none recorded. Patients without a blood
  group on file are not counted toward the top.
- **How:** max over the 8 canonical groups after normalisation ("0-" → "O-").

**Removed on review:** *Active panel* and *Avg value (billed)* (earlier pass);
*Repeat-visit rate*, *One-and-done rate* and the *Lapsed high-value* card (this
pass) — the One-time-vs-Returning cards carry the rates and the recall table
below still names the lapsed high-value patients.

---

## B. Patients & retention (charts)

### Marital status  → `maritalMix` (donut)
- **What:** Patients seen this period by `pm_married_status` — Married / Single /
  Divorced / Separated / Widowed, all five 0-filled, plus an honest
  **Not recorded** bucket.
- **Reality check:** this field is rarely captured at registration (~0.2% of
  patients platform-wide), so 'Not recorded' will dominate — the chart is as
  much a front-desk data-quality prompt as a demographic.

### Blood group  → `bloodGroupMix` (donut)
- **What:** All 8 groups (A+, A-, B+, B-, O+, O-, AB+, AB-) **always listed,
  0-filled**; free-text variants are normalised ("0-" → O-, "A- (A negative)" →
  A-); patients with nothing on file appear as **Not recorded**.
- **Why:** clinical preparedness + data-quality visibility (a huge "Not recorded"
  is itself the finding).

### Top cities  → `cityMix` (bar)
- **What:** Every city with at least one patient, plus one explicit **Unknown**
  bucket (no city on file) at the end — visible on the chart, not only on hover.
- **Why:** catchment-area view for outreach.

### Visit frequency  → `visitFrequency` (bar)
- **What:** Lifetime visits per patient bucketed 1 / 2 / 3 / 4-5 / 6-10 / 10+
  (all buckets always shown).
- **Why:** the shape of loyalty — a tall "1 visit" bar is the retention gap made
  visible.

### Patient value segments (RFM)  → `rfmMix` (donut)
- **What:** EVERY patient the clinic has ever seen, placed in exactly one of
  five segments by **Recency** (days since their last visit) and **Frequency**
  (lifetime visit count). All five segments always shown.
- **The exact calculation** (also in the chart's info tooltip):
  1. **Anchor** = the clinic's most recent visit date (not "today"), so the
     segmentation stays meaningful even when data is stale.
  2. Per patient: `freq` = lifetime visits; `lastV` = last visit date;
     `recency` = `anchor − lastV` in days.
  3. Segment rules, evaluated top-down (first match wins):
     | Segment | Rule |
     |---|---|
     | **Champions** | recency ≤ 90 days AND freq ≥ 3 |
     | **Loyal** | recency ≤ 180 days AND freq ≥ 2 |
     | **Recent** | recency ≤ 180 days (single visit so far) |
     | **At risk** | recency 181–365 days |
     | **Lapsed** | recency > 365 days |
  4. The ₹ value shown per segment = those patients' **lifetime billing**
     (`tbl_opd_billing_overview`, cancelled bills excluded), joined per patient.
- **Why / who:** tells the admin where the panel is drifting (growing "At risk"
  → start recall campaigns; "Champions" are the referral engine).

### Gender / Age distribution  → `genderMix` · `ageMix`
- **What:** Male/Female/Other and the 5 age bands, all 0-filled.

---

## C. Action lists (tables)

### Most valuable patients  → `mostValuable`
- Lifetime spend per patient (billing join), with visits + last visit + mobile.
- **Use:** protect and prioritise these relationships.

### Lapsed high-value (recall list)  → `lapsedRecall`
- Named, phone-numbered patients with `freq ≥ 2`, lifetime billing > 0 and no
  visit in 180+ days, sorted by spend. **Use:** hand to the front desk as this
  week's call list.

### Patient register  → `patients` (downloadable)
- Full row-level register honouring every active filter (gender / blood group /
  ABHA / new-vs-returning), so a CSV export is exactly the segment on screen.

---

## Notes on integrity

- **Read-only** service; SELECT only.
- **Reconciliation by construction:** New + Returning = Total; repeat + one-and-
  done = 100%; the trend on the Appointments page uses the same visit-history
  basis, so no two retention numbers can contradict each other again.
- **Demo-data caveat:** visits end ~March 2025, so recent rolling windows
  legitimately show small cohorts; "Till date" shows the full panel.
