# Care analytics — metric dictionary (clinical sections)

Every number below was derived by reverse-engineering the EMR's own write path
(Rx screen component → API → table), then verified against live data. Sources
are read-only `tatva_clinic` replica tables. House rules apply everywhere:
zero-filled fixed domains, explicit "Not recorded" buckets, no em dashes,
whole-number averages with `~`, honest not-buildable lists.

---

## Symptoms  → `clinical/symptoms`

**Source (corrected):** per-Rx structured symptom entries parsed from
`tbl_case_manager.tcm_history_box` (`tcm_history_box_type = 1`), format
`<b>name</b>- since X, severity -<b>Y</b>, note;` per entry. The old
consultation-template framing is gone (that was screen configuration, not
patient data). Date `tcm_datetime`; doctor filter via `cm.um_id`.

| KPI | Meaning |
|---|---|
| Top symptom | Most-mentioned symptom (names normalized for case/spacing) |
| Symptom entries | Total structured entries parsed in the window |
| Distinct symptoms | Unique symptom names as typed; **not a medical taxonomy** (spelling variants count separately; the tooltip says so) |
| Patients with symptoms | Distinct patients with at least one entry |

Charts: **Severity mix** donut (Mild / Moderate / Severe zero-filled +
Not recorded; voice-path values high/medium/low are folded onto the 3-level
scale, stated in the info) · Top symptoms bar (top 15) · Symptom entries over
time (zero-filled) · Symptom register (patient, date, symptom, severity,
duration as typed, note; capped 200).

**Not buildable:** duration ("since") analytics (~5% fill, free text; raw in
register only) · canonical symptom taxonomy (dictionary lives in the
search-engine service, no id persisted).

## Diagnoses  → `clinical/diagnosis`

**Source:** `tbl_casemanager_diagnosis` (`tcd_del=0`, `diagnosis<>''`).

KPIs: Patients diagnosed · Diagnoses recorded · **Distinct conditions**
(unique diagnosis names as recorded, mostly free text, not ICD-deduplicated;
tooltip says so) · **ICD-coded entries** (count + rate; remainder = free text)
· **Suspected / Confirmed / Ruled out** (distinct patients, from the `type`
column; all status numbers floor at `tcd_created_date >= 2024-01-01` because a
2023 legacy bulk import marks every row "Primary", which is not a clinical
status).

Charts: Diagnosis status mix donut (Suspected / Confirmed / Ruled out /
Unspecified) · Top conditions bar · Diagnoses over time · Diagnosis register.

**Removed on review:** doctor-performance block, age-distribution block.
**Not buildable:** DDx/AI-suggestion analytics (flag dropped on save) ·
time-to-confirmation (no episode key).

## Medications  → `clinical/drug`

**Source:** `tbl_medicine_report r JOIN tbl_medicine_master m`. A documented
junk filter excludes catalogue test entries (`generic LIKE 'testing%'`,
`company = 'test'`) from top-N charts and the top KPIs only.

KPIs: **Top medication** (brand by lines; long names truncate with the full
name on hover) · Medicines prescribed (line count) · **Distinct drugs**
(unique catalogue products, id-based) · Patients with a prescription ·
**~Avg drugs per prescription** (whole number; per-Rx lines capped at 30
before averaging, caveat in tooltip).

Charts: Top generics (top 10) · Top manufacturers (top 10) · Drugs per
prescription histogram (1/2/3/4/5+, the polypharmacy signal) · Generic name
capture (relabelled honestly: data-capture completeness, NOT a clinical
generic-vs-branded split) · Prescribing trend.
Tables: **Drug register** (per product: brand, generic, company, lines,
patients, last prescribed) and **Generics register** (per generic: brands,
lines, patients).

**Removed:** doctor-performance. **Not buildable:** dosing/duration (field is
always 0), therapeutic class, cost, dispense linkage.

## Vitals  → `clinical/vitals`

**Source (corrected):** BOTH `tbl_casemanager_vitals` (temp, pulse, BP, resp
rate, SpO2, RBS, FIB-4, waist) AND `tbl_casemanager_b_composition` (height,
weight, OFC, BMI) — the old builder ignored the second table. All values are
free text; everything is parsed defensively with sanity bounds and the
discard counts shown on the charts.

KPIs: **~Avg vitals per patient** · **Most captured vital** · **Patients with
vitals**. (The old BP-capture-rate framing is removed.)

Charts: **What gets measured** (entries per field across all 12 capturable
vitals, zero-filled — the most/least-filled view) · **Blood pressure stages**
(parsed `sys/dia`, staged Normal → Crisis, higher stage wins) · **BMI
distribution** (bands, bounds 10–60) + **BMI coverage** (patients with vs
without a usable BMI) · RBS bands · **Repeat monitoring** (patients with 2+
entries vs one-off) · recent-entries register.

**Not buildable:** per-visit linkage (`pam_id` mostly 0) · precise BMR/BSA
analytics (FE-computed snapshots).

## Medical History  → `clinical/medical-history`  *(the crucial section)*

**Source:** `tbl_micro_patient_medical_history.medical_history` JSON.
**Registry basis: each patient's LATEST history record (all time)** — history
is a registry, not an event stream; the date window applies only to the
captures-over-time trend. A tag counts only when `enable='Y'` (`'N'` =
documented denial, excluded from prevalence). Sections bucket strictly by
`tmmhs_id`: **1 Lifestyle · 2 Medical condition · 3 Family history ·
4 Allergies · 5 Surgical**; the sixth segregation, **Additional history**, is
the free-text remarks key (presence only).

KPIs: Patients with history · Top condition · Top allergy · Top family
history · Top lifestyle factor · Top past surgery.

Charts: five distribution bars (conditions, allergies, family, lifestyle,
surgical; top 10 by distinct patients each) + Additional-history split +
History captures over time.
Table: **History register** — all five sections in one ranked table
(Section | Item | Patients | Last recorded).

**Notes:** no doctor column → the Doctor filter does not apply here.
**Not buildable:** the "-" unanswered state (never persisted) · additional-
history content analytics · surgical timelines · onset ("since") trends.

## Gynec (Menstrual)  → honest placeholder

Menstrual gynec history is stored **only in the `pm-medicalhistory`
microservice** (`gynec_api_url`), verified by tracing the EMR's Gynec History
screen (`MedicalHistoryBox.js` → `ApiGynec.js`) — zero tables for it in
`tatva_clinic`. The document is a longitudinal `timeline` of entries with these
keys (vocabularies fixed in `gynec_constants.js`): `lmp` (date), `ageAtMenarche`,
`ageAtMenopause`, `intervalOfCycle`, `durationOfMenstrualFlow`,
`numberOfPadsPerDay`, `cycle` (Regular/Irregular), `flow` (Heavy/Moderate/
Scanty), `pain` (None/Mild/Moderate/Severe), `occurrenceOfPain`, `clots`,
`reproductiveLifeStages` (Menopause/Perimenopause/Lactational amenorrhea),
`typeOfMenopause`, `note`. The service exposes only a **per-patient GET**
(`/gynec/{patientId}/{userId}`) — no bulk feed, and the payload carries no
`hm_business_id` — so analytics cannot read it yet. Full contract + the three
ways to unblock it: [GYNEC-OBSTETRIC-INTEGRATION.md](GYNEC-OBSTETRIC-INTEGRATION.md).
The page is an honest "feed pending" placeholder listing the planned metrics
(~avg age at menarche, cycle, flow, pain, reproductive-stage mixes, ~avg cycle
interval/flow duration, patients with gynec history). The old page mixed
obstetric tables into "gynec"; that is removed.

## Obstetrics  → `clinical/obstetric`  *(new page, legacy-gated)*

**Source:** legacy `tbl_case_obstetrics_history` (+ `_pregnancy`,
`tbl_doctor_anc_scheduler`) — frozen ~mid-2024; the modern obstetric screen
saves to the gynec service. The page banner states this; clinics with no
legacy rows see the explicit pending note, not fake zeros.

KPIs: Patients with obstetric record · Obstetric records · Pregnancy/delivery
events · Abortion events · Ectopic events · Marked currently pregnant.
**G/P/L/A/E counters are NOT persisted in this database** — the event mix is
the honest proxy and is labelled as such.
Charts: Event mix · Delivery mode mix · Gestation at delivery (preterm/term
bands) · Expected deliveries by month (historical pipeline) · ANC schedule
status · obstetric register.

## Growth Chart  → `clinical/growth-chart`  *(fixed)*

Now **pediatric-only** (age at measurement < 18; rows without a usable DOB
excluded) — consultation vitals of adults no longer inflate it. Adult BMI
bands removed (invalid for children); instead: height and weight band
distributions, OFC capture share, **repeat-measurement coverage** (children
with 2+ measurements — the real value signal of a growth module), and a
**Growth-screen entries** KPI (`tcbc_source='GROWTH_CHART'`).

## Medications — custom vs catalogue  *(added to `clinical/drug`)*

A medicine line is **custom** when the doctor added it themselves rather than
picking from the system catalogue: `tbl_medicine_master.pms_default = 0`, or no
catalogue match at all (free-typed). **Catalogue** = `pms_default = 1`.

KPI **Custom medicines** (count + % of all lines). Charts: **Catalogue vs custom
medicines** donut · **Custom medicines by doctor** bar (which doctors free-type
the most — a high count flags drugs the catalogue is missing) · downloadable
**Custom medicines register** (doctor-filterable via the top filter). Verified
live: ~14% custom on the reference tenant, ~43% on the dev tenant.

**Other clinical sections (diagnosis, symptoms, lab tests, procedures): custom
vs catalogue is NOT BUILDABLE** — those fact rows carry no reliable
master-vs-free-text flag (diagnosis/labs/procedures are free text with no
catalogue FK; symptoms are parsed free text). Diagnosis already has the honest
"ICD-coded vs free text" split, which is a coding-rate, not a custom signal.

## ABHA  → `clinical/abha`  *(rebuilt)*

Built on what `tatva_clinic` actually stores. **Source:** patient flags on
`tbl_patient_master` (scoped via appointments) — `pm_abha_address` (linked),
`pm_abha_verify` (verified), `pm_abha_consent` (consent flag), all guarded
`IN (0,1)` against ~50 corrupted rows — plus `tbl_abha_hip_link_master` (care
contexts) and `tbl_patient_abha_with_hospital` (enrolment dates).

KPIs: **Total ABHA patients** (linked, out of patients seen) · **ABHA verified**
· **Linked, unverified** · **Consent-flagged patients** · **Care contexts
linked** · **Linkage rate** (linked ÷ patients who visited the period; "—" when
no visits). Charts: ABHA status donut · ABHA enrolments over time · patient
register.

**NOT BUILDABLE (the owner's KYC-split asks):** the KYC vs non-KYC enrolment
channel, request-level **consent success/failure** (with/without KYC), and the
**KYC vs non-KYC split of care contexts** are not persisted in this database —
they live only transiently in the ABDM microservices (`ApiAbha.js`). The cards
use the patient-level flags that ARE stored, labelled honestly as proxies
(verification state ≠ KYC channel), and `meta.note` states the gap. Wiring the
true KYC/consent depth needs a feed from the ABDM service (same pattern as the
gynec feed).

## Certificates  → `operational/certificates`  *(new Care leaf)*

**Source:** `tbl_certificate_upgrade` (issued certificates: patient, doctor,
type snapshot, date) ⋈ `tbl_certificate_document` (templates; `pms_default` 1 =
system / 0 = custom doctor-built). Doctor join is on
`tbl_user_master.doctor_unique_id` (a string token, NOT `um_id`).

KPIs: **Certificates issued** · **Most-issued type** · **Top issuing doctor**
(issuing, not template author) · **Patients certified** · **Custom templates**
(this clinic's own, beyond the system templates). Charts: certificate-type mix
(canonicalised via the template title; blanks bucket to Untitled) · issuance
trend · by-doctor · certificate register (with system/custom template source).
Verified live: reference tenant 194 issued, top type Medical Fitness, top doctor
Dr Sheela BR (193).

## Procedures  → honest placeholder  *(re-pointed)*

OPD procedures/surgeries entered in the Rx "Surgeries/Procedures" box are
stored in the **pm-patient-docs microservice** (`lab_params_api_url`,
`/api/v1/surgeries`), not in `tatva_clinic`. The replica only holds a tiny
inpatient procedure table (`tbl_inpatient_doctor_procedure`, ~53 rows total,
6 tenants) — which the page was wrongly reading, returning all zeros for OPD
tenants. Re-pointed to a "feed pending" placeholder listing the planned metrics
(top procedure, procedures performed, distinct procedures, patients with a
procedure, trend, by-doctor, register). Needs a bulk export from the surgeries
service (by hospital + date), same pattern as gynec and custom modules.

## Custom Modules  → honest placeholder  *(new Care leaf)*

RxPad custom modules (the reusable Rx blocks doctors build and share across the
hospital) live in the **dynamic-modules microservice** (`custom_module_api_url`,
`ApiCustomModule.js`), not in `tatva_clinic` — the registry and the reuse log
are absent from the replica (the only in-DB trace is an opaque per-doctor
template blob, which cannot yield reuse-by-other-doctor or most-used). So the
page is a "feed pending" placeholder listing the planned metrics (total modules,
created this period, per-doctor created, reuse rate, most-used across doctors,
created-vs-reused, module register). Building it needs a bulk export from the
dynamic-modules service keyed by hospital + an `origin_id` reuse marker.

## Vaccination  → `clinical/vaccination`  *(fixed)*

**Dose-join bug fixed** (`tvpv_vaccine_all` fallback) — the old join silently
dropped ~65% of doses (reference tenant: 0 → 148 doses recovered). Dates now
strictly `tvp_given_date` (placeholder/zero dates excluded; no created-date
fallback). New **IAP schedule vs other** split via the vaccine-template
mapping. **Not buildable:** "refused" status (does not exist anywhere),
administered brand per dose, batch/lot/expiry.
