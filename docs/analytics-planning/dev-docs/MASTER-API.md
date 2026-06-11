# TP Analytics Master APIs: OPD + IPD

This is the master list of every API the analytics product runs on, both
modules: OPD Analytics (/analytics) and IPD Analytics (/analytics/ipd). It
exists so anyone (product, frontend, backend) can see the whole surface in one
file: what each API is FOR, and which APIs we still need written.

## The design philosophy (read this first)

Every analytics API here is a **superset API**: it returns EVERYTHING its
domain can say (all KPIs, all chart blocks, the full raw register up to an
honest cap), not just what today's screen renders. The frontend picks what to
display and handles its own logic; whatever it ignores is still in the
response. This is deliberate: when we add a chart, a filter, or an export
tomorrow, the data is already flowing and no backend change is needed. When
you write a NEW API for this module, follow the same rule: include every field
and every breakdown the source tables can give, even if no screen shows it yet.

Conventions for all pm-analytics-service routes: base `GET /api/v1/analytics/...`,
auth `Authorization: Bearer <JWT>` (tenant = `result.hospital_business_id` from
the token, never from the client), common params `startDate`, `endDate`
(YYYY-MM-DD), `grain=day|week|month`, `doctorIds` (repeatable), `hospitalId`
(hm_id CSV), `reportType` where noted. Every response is the universal
envelope: dashboard-block (`hero? / kpis[] / <block>{columns,rows} /
patients? / meta`) or a lone result-set (`{columns, rows, meta}`). All reads
are SELECT-only on the `tatva_clinic` replica.

---

## Part 1: APIs that exist today

### pm-analytics-service (NestJS, reads the replica)

Each row: the route, what it serves, and WHY we need it.

| Route | Serves | Why we need it |
|---|---|---|
| `GET operational/overview?careSetting=opd` | Overview page: 12 KPI cards + 4 charts | The landing scoreboard: one headline per section so the practice's health reads in five seconds without opening any page |
| `GET operational/footfall` | Appointments page | The demand engine: footfall = booked + walk-ins, channels, busiest patterns, new-vs-returning bookings; staffing and marketing decisions start here |
| `GET operational/patients?careSetting=opd` | Patients page | Who the practice serves and whether they come back: retention by visit history, RFM value segments, the lapsed high-value recall list |
| `GET financial/summary?careSetting=opd` | Billing depth blocks | The replica-side money detail the billing API cannot give: revenue by doctor, discounts by doctor, bill-builder roles, registers |
| `GET financial/depth` | Billing replica-only blocks | Same purpose, split endpoint: keeps the billing page fast by loading depth separately |
| `GET financial/incentives?reportType=` | Incentive report (Detailed/Overall) | Pays staff correctly: service-level incentive payouts per user, the accountant's monthly settlement sheet |
| `GET financial/3c-report` | 3C report rows | The audit cut: cash memo / invoice / credit-note at service level by account, what the auditor and accountant reconcile against |
| `GET operational/pharmacy` | Pharmacy page | The counter business: net sales, GST position, stock valuation, expiry risk (FEFO), supplier spend; entirely invisible without this |
| `GET operational/followups` | Follow-ups page | The retention engine: who was advised to return, who actually did, and the missed list the front desk should call |
| `GET operational/abha` | ABHA page | Government-programme compliance: ABHA adoption among the period's patients, with honest proxies where ABDM data is not persisted |
| `GET operational/certificates` | Certificates page | A real workload doctors do daily that no screen measured: who issues what certificate, from which template |
| `GET operational/appointment-analytics?reportType=` | Appointment report export | The raw per-appointment dump with patient demographics for offline analysis; Overall gives the per-doctor status matrix |
| `GET operational/prescription-analytics` | Prescription report export | Brand/generic/company dose volumes: the pharma-conversation and formulary sheet |
| `GET operational/medicine-analytics` | Medicine report export | Prescribed-medicine counts with patient reach per brand: simpler counting cut of the same source |
| `GET operational/referred-by-patients` | Reference report | Which patients bring other patients: the organic-growth signal |
| `GET operational/referred-by-others` | Reference report | Which external referrers send cases: the referral-network ledger |
| `GET clinical/diagnosis` | Diagnoses page | What the practice diagnoses, with the clinical statuses (Suspected/Confirmed/Ruled out) and ICD-coded vs free-text capture quality |
| `GET clinical/symptoms` | Symptoms page | What patients present with, parsed from the Rx symptom box with real severity: the demand-side clinical picture |
| `GET clinical/drug` | Medications page | What gets prescribed, polypharmacy load, and custom-vs-catalogue medicines (which flags catalogue gaps) |
| `GET clinical/lab-test` | Lab tests page | Which investigations get ordered and how often: utilisation of diagnostics |
| `GET clinical/vitals` | Vitals page | What actually gets measured (12-field capture grid), BP staging, BMI bands: clinical data-quality plus population health |
| `GET clinical/medical-history` | Medical history page | The chronic-disease registry: six segregations (condition/allergy/family/lifestyle/surgical/additional) by distinct patients |
| `GET clinical/obstetric` | Obstetrics page (legacy-gated) | Pregnancy events, delivery modes, EDD pipeline from the legacy tables, honestly bannered until the service feed lands |
| `GET clinical/growth-chart` | Growth page (pediatric-only) | Child growth monitoring: serial measurements, OFC capture, repeat-measurement coverage |
| `GET clinical/vaccination` | Vaccination page | Dose volumes and IAP-vs-other split (after fixing a join that silently dropped ~65% of doses) |
| `GET clinical/gynec` | Gynec page: **SAMPLE DATA** | Menstrual-history analytics, fully designed and visible; switches live when the Part-2 feed lands |
| `GET clinical/procedures-opd` | Procedures page: **SAMPLE DATA** | OPD procedures analytics, fully designed; switches live when the Part-2 feed lands |
| `GET operational/custom-modules` | Custom Modules page: **SAMPLE DATA** | RxPad module creation and cross-doctor reuse; switches live when the Part-2 feed lands |
| `GET ipd/summary` | IPD Overview | The hospital scoreboard: census, occupancy, queue, deaths; one glance answers how full are we and what is moving |
| `GET ipd/admissions` | IPD Admissions & Discharges | Throughput is THE inpatient operations question: who admits, where, how long, and how patients leave (DAMA and death rates are quality flags) |
| `GET ipd/wards` | IPD Wards & Beds | Bed management is the revenue ceiling: capacity, occupancy, transfers, and the predictive discharge/occupancy bands turn the census into a planning tool |
| `GET ipd/clinical` | IPD Clinical Activity | Documentation coverage is the medico-legal shield; OT volume is the high-revenue clinical activity |

### Production APIs the frontend reads directly

| API | Serves | Why we need it |
|---|---|---|
| `POST {billing}/bill/dashboard` | Billing headline band, mode mixes, dues-by-age, bills register | The ONLY source that works for every tenant (old and new billing service); figures reconcile exactly with the OPD Billing screen staff already trust |
| `POST {billing}/advancedDeposit/dashboard` | Advance wallet cards + advance mode mixes (OPD and IPD pages) | The wallet ledger (received/refunded/debited) lives only in the billing service, not the replica; it is patient-level and shared across care settings |
| `POST {billing}/api/v1/billing/ipd-bill/dashboard` | IPD Billing page band + IPD Bills report | The IPD bill ledger (one bill per admission) lives in the billing service; figures reconcile with the IPD billing screen staff already use |
| `POST /api/v1/appointment/listAppointment` | EMR parity reference | The ground truth our appointment numbers are verified against (the tab keys ARE the status codes) |
| `GET {bulk_messages}/communication/userCredit`, `POST {bulk_messages}/campaign/userCampaign` | Campaigns page | Campaign reach, delivery and credit spend belong to the messaging service; analytics renders what it returns |

---

## Part 2: APIs we NEED but DO NOT HAVE (write these)

> We do not have these APIs today. For each: why we need it, who owns it, and
> the contract hint a backend developer can build from. Follow the superset
> rule: export EVERY field the source stores, not just what today's design
> shows. Pattern options for every feed: (A) a bulk export endpoint the
> analytics service polls, (B) a read replica of the owning service's
> datastore, or (C) a nightly sync into a small `tatva_clinic` table.
> pm-analytics-service is mysql2-only today (no HTTP client), so (B)/(C) are
> drop-ins and (A) needs a small fetch layer.

### 1. Gynec menstrual history export: pm-medicalhistory service
**Why we need it:** the Gynec page (cycle regularity, flow, pain, menarche age,
reproductive life stages) runs on sample data; irregular-cycle share is a real
screening signal for PCOD and thyroid workups that doctors asked for.
**What exists:** only a per-patient `GET /gynec-history/gynec/{patientId}/{userId}`;
no list by hospital, and the stored document carries no `hm_business_id`.
**Hint:** `GET /gynec-history/export?businessId=&from=&to=` returning flattened
timeline rows with EVERY stored key: `patientId, lmp, ageAtMenarche,
ageAtMenopause, intervalOfCycle, durationOfMenstrualFlow, numberOfPadsPerDay,
cycle, flow, pain, occurrenceOfPain, clots, reproductiveLifeStages,
typeOfMenopause, note, createdAt, createdBy`. Include `businessId` in the
export. Full contract: `GYNEC-OBSTETRIC-INTEGRATION.md`.

### 2. Obstetric (current) export: same pm-medicalhistory service
**Why we need it:** the Obstetrics page covers only legacy rows frozen at
~mid-2024; current pregnancies, EDD pipeline and G/P/L/A/E counters are
invisible to analytics.
**Hint:** same export shape as (1) for the obstetric-history collection:
LMP/EDD/CEDD, gestation, G/P/L/A/E counters, pregnancy-history rows (mode of
delivery, date, gender, baby weight, remarks), current-examination values,
ANC schedule items, immunisation history, keyed by businessId + date range.

### 3. OPD procedures export: pm-patient-docs service
**Why we need it:** procedures are real revenue and clinical workload; the
Procedures page runs on sample data because the Rx "Surgeries/Procedures" box
writes only to this service (the replica's procedure table is inpatient-only,
~53 rows).
**Hint:** `GET /api/v1/surgeries/export?businessId=&from=&to=` returning one
row per performed procedure with every stored field: `patientId,
procedureName, performedAt, doctorId (userId), notes, template/source flags`.

### 4. Custom-modules registry + reuse log: dynamic-modules service
**Why we need it:** module reuse across doctors is the signal that the RxPad
investment is paying off; the page runs on sample data because the registry
and usage log exist only in this service.
**Hint:** two exports keyed by hospital: (a) modules: `module_id, name,
creator_userId, column_count, column_labels, created_at, origin_id (null =
original, else cloned-from), deleted`; (b) usage events: `module_id,
used_by_userId, used_at, rx_id`. `origin_id` + used_by != creator yields reuse
rate, most-used across doctors, created-vs-reused.

### 5. ABHA KYC + consent depth: ABDM service
**Why we need it:** the owner's asked-for cards (KYC vs non-KYC patients,
consent success with/without KYC, KYC split of care contexts) cannot be built;
the replica stores only coarse flags, shown today as labelled proxies.
**Hint:** persist + export three event sets keyed by businessId, with every
field the flow produces: (a) enrolments: `patientId, channel
(aadhaar-kyc | non-kyc), abhaAddress, createdAt`; (b) consent requests:
`requestId, patientId, purpose, status (granted|denied|expired), kycFlag,
requestedAt, decidedAt`; (c) care-context links: `linkId, patientId, kycFlag,
contextType, linkedAt`.

### 6. Per-patient symptoms read: symptoms service
**Why we need it:** the Overview "Top symptoms" card shows a dash; the
symptoms service holds richer per-patient data than the Rx-box parse the
Symptoms page uses.
**Hint:** `GET /symptoms/export?businessId=&from=&to=` row-level (patientId,
symptomName, severity, since, recordedAt, doctorId) so analytics can aggregate
any way the future needs, or at minimum `GET /symptoms/top?businessId=&from=&to=&limit=`.

### 7. Server-side collection-report export: pm-analytics-service (extend)
**Why we need it:** Daily Collection / Collection Report / Billing Overall
export the billing API's bills list, which pages at 100 rows; a busy month
exceeds the page and the export silently covers only the most-recent bills.
**Hint:** add `GET financial/collection-report?reportType=General|Detailed|Day Wise`
reusing the existing billing UNION, returning EVERY collection event in the
window with every column the tables hold (type, bill id, date, issued-by,
patient, mode, account, amounts, balance). Plus the per-report filters to wire
end-to-end: `issuedBy[]`, `paymentMode[]`, `account`, `department`,
`incentiveUser[]`, `medicine[]`, and `includeClinicalData` on
appointment-analytics (appends the 16 clinical columns).

### 8. Campaign message-level export: bulk-messages service
**Why we need it:** the campaign list is campaign-grain only, so delivery
trend, best send time, and per-template performance cannot be built.
**Hint:** `GET /api/v1/campaign/messages/export?businessId=&from=&to=`
returning one row per message: `campaignId, templateId, patientId, channel,
sentAt, deliveredAt|null, status, failureReason, credits`.

### 9. pm-ipd microservice export: modern IPD tenants
**Why we need it:** the IPD analytics module reads the legacy replica tables;
hospitals on the modern IPD microservice (pm-ipd, Mongo) keep admissions,
the discharge pipeline, wards/beds, assessments, notes and cross-referrals
THERE, invisible to the replica.
**Hint:** bulk exports keyed by hospitalId + date range, every stored field:
(a) admissions: patient, ward/room, admitting doctor, admittedOn, category,
MLC, caretaker, isDischarged, sentForApproval (the discharge queue flag),
isIntimateDischarged, dischargeType (Normal/Daycare/LAMA/Death), proposed
discharge datetime, dischargedAt, dischargeNo; (b) transfers/bed moves;
(c) cross-referrals: referring/receiving doctor, department, status,
timestamps (unlocks the requested cross-referral analytics); (d) notes
events: type, author, timestamp per admission.

### 10. VoiceRx / symptom-collector aggregation: owning services
**Why we need it:** adoption of these features is invisible; today's logs are
write-only.
**Hint:** counters by businessId + date range to start (sessions, adoption by
doctor, edit rate; messages sent, response rate), row-level exports preferred
per the superset rule.
