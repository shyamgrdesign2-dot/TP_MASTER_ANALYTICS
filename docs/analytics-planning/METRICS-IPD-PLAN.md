# IPD Analytics: the plan

Modeled on the OPD build: research-verified sources, honest gaps, value-first
metric selection (we show what helps run the hospital, not everything we can
count). Entry: the appointment-page sidebar gets two options, **OPD Analytics**
(`/analytics`) and **IPD Analytics** (`/analytics/ipd`), one shared workspace
shell, separate nav trees.

## Ground truth (research-verified)

**Two IPD generations coexist:**
- **Modern IPD** = dedicated microservice (`ipd_api_url`, pm-ipd-prod, Mongo).
  Admissions, discharge pipeline, wards/beds, assessments, notes,
  cross-referrals live THERE, not in the replica. The FE can read it with the
  user's session the same way the IPD screens do (`GET /patients` with
  `isDischarged/sentForApproval/isIntimateDischarged` filters + pagination,
  `GET /patients/wards?all=true`, `GET /patients/filters?field=ward|doctor`).
- **Legacy IPD** = replica tables: `tbl_atd_patient_master` (admissions; NO
  discharge-date column), `tbl_ward_management` + `tbl_ward_room_management`
  (2-level; a "bed" is a room row with room_type='bed'; no occupancy column),
  `tbl_atd_logs` (transfer log: ward/department/doctor changes + the
  `redy_to_discharge` timestamp = best legacy discharge moment),
  `tbl_inpatient_discharge_type` (Medical/DAMA/Transfer Out/Death),
  OT (`tbl_patient_ot_schedule`, `tbl_ot_management`/rooms,
  `tbl_inpatient_doctor_procedure`), ~20 small `tbl_inpatient_*` clinical
  tables (admit notes, doctor/nurse notes, vitals, medication, labs,
  radiology, admit/discharge diagnoses with ICD, discharge summary),
  `tbl_ipd_billing_overview` (+ pathology twin) and `tbl_advance_master`.

**The discharge pipeline (modern):** intimate discharge (Zydus-gated) → send
for approval (**this is the "discharge queue"**: `sentForApproval=true`,
`isDischarged=false`) → mark discharged (server stamps `dischargedAt`,
assigns `dischargeNo`). Discharge types: Normal / Daycare / LAMA / Death.
Time-in-queue = proposed discharge datetime → `dischargedAt`.

**Billing:** one bill per admission via the billing service
(`/api/v1/billing/ipd-bill/dashboard`, shared `/advancedDeposit/dashboard`,
`/ipd-bill/itemized-bill-data` for line items incl. bed/OT charges).
`financial/summary?careSetting=ipd` already works server-side; the FE
`financialWidgets("ipd")` loader already exists.

## The pages (value-first selection)

### 1. IPD Overview (`ipd_overview`)
The hospital scoreboard. KPIs: **In hospital now** (census), **Admitted /
Discharged this period**, **In discharge queue now**, **~Avg length of stay**,
**Bed occupancy %** (census ÷ active beds), **IPD billed / collected**,
**Deaths this period**. Charts: admissions vs discharges over time, census
trend, ward occupancy snapshot, discharge-type mix. Why: one glance answers
"how full are we, what's moving, anything alarming."

### 2. Admissions & Discharges (`ipd_admissions`)
KPIs: admissions, discharges, readmissions, MLC cases, ~avg LOS, discharge
queue size + **~avg time in queue** (the user's asked-for
initiated→completed measure), longest current stay. Charts: admissions trend;
by department; by ward; **by admitting doctor**; patient-category mix
(Emergency/Insurance/Cash/Corporate); discharge-type mix (Normal/Daycare/
LAMA/Death; legacy: Medical/DAMA/Transfer Out/Death); LOS distribution
(0-1d, 2-3d, 4-7d, 8-14d, 15+); admission register + discharge-queue register
(tables). Why: throughput is THE inpatient operations question; DAMA% and
death% are quality flags; queue time exposes discharge bottlenecks.

### 3. Wards & Beds (`ipd_wards`)
KPIs: total beds (active), occupied now, available now, blocked, occupancy %,
**room shifts this period**, ~bed turnover (discharges ÷ beds). Charts: beds
by ward (occupied/available/blocked stacked); occupancy trend (derived
census); ALOS by ward; transfers log register (ward/department/doctor moves
from `tbl_atd_logs`); **predictive band**: expected discharges next 7 days
(in-queue + intimated + patients past ward-median LOS) and projected
occupancy. Why: bed management is the revenue ceiling of an IPD; the
predictive piece turns the census into a planning tool.

### 4. Clinical Activity (`ipd_clinical`)
KPIs: admissions with assessment, progress-note coverage (% of stay-days with
a note), OT procedures this period, cross-referrals (microservice; honest
placeholder/sample until feed). Charts: notes volume by type (doctor/nurse/
consultant); vitals charting frequency; admit vs discharge diagnosis (top,
ICD-coded share); OT: procedures by operating doctor, anaesthesia mix,
theatre utilisation; medication/treatment lines per admission; discharge
summary completion rate (% discharges with summary). Why: documentation
coverage is the medico-legal shield and the quality signal; OT volume is
the high-revenue clinical activity.

### 5. IPD Billing (`ipd_billing`)
Mirror of OPD billing (loaders exist): bill family (billed/collected/due/
refunded) + advance family (received/refunded/debited, with the shared-wallet
caveat), collection trend, payment-mode mixes, dues ageing, bills register
with **Admission ID**. IPD-specific: **~avg bill per admission**, **deposit
coverage %** (advance ÷ billed), top billed services from itemized data
(surfaces bed/OT charges). Depth band once `financial/depth?careSetting=ipd`
ships. Why: IPD bills are large and slow; dues ageing and deposit coverage
are the cash-flow guards.

### 6. IPD Reports (`ipd_reports`)
Raw-data downloads, same modal pattern as OPD: Admission Register, Discharged
Patients Register, Discharge Queue Register, Transfers/Room-shift Register,
OT Register, IPD Bills Register, Outstanding IPD Dues, LOS Report (per
admission with ward/doctor/LOS). CSV/Excel.

### Deliberately NOT built (data exists, value doesn't)
Per-nurse note counts (surveillance, not insight); bed-level history (the log
only captures ward-level moves reliably); insurance TPA fields (free text,
unaggregatable); legacy `tbl_operation_type` master (polluted test data).

## Sources per page (hybrid rule)
Modern-first via IPD microservice APIs from the FE (census, queue, wards) —
exactly like OPD billing reads the billing service; replica builders
(`ipd/:report` family) for legacy tenants + clinical/OT/transfer depth +
registers; billing via existing `financialWidgets("ipd")` + `financial/summary
?careSetting=ipd`. Every response stays a superset API. Missing feeds (cross-
referrals, modern notes detail) go in MASTER-API.md Part 2 with contracts.

## Wiring
Route `analytics/:module?` (path segment, not query, so sidebar active states
stay exact); `MODULES` registry {nav, brand, defaultLeaf}; IPD leaf ids
prefixed `ipd_*` (zero collision, zero service.js changes); SidebarDoctor:
tenant `data_analytics` item → OPD entry, new standalone "IPD Analytics"
NavLink beside it (Apollo-pattern), icon pair in ICON_MAP + assets.
