# IPD Analytics: project scope

The complete picture of the inpatient analytics module: what it is, who it
serves, what it covers, how it is built, and where it is headed. One read
should orient anyone: a doctor, a hospital admin, a new developer, or a
product owner.

## What it is

The inpatient half of TP Analytics, at `/analytics/ipd`, sharing one
workspace shell with OPD Analytics (`/analytics`): same filters, same cards,
same info drawers, a separate nav tree. It answers the hospital's standing
questions: **how full are we, what is moving, where are the bottlenecks, and
is the stay being documented and billed properly?** Strictly read-only
(SELECT-only replica user plus the production billing APIs) and tenant-scoped
from the login token, never from the client.

## Who it is for

- **Admitting doctors**: their own admissions, stays, OT volume and
  documentation coverage.
- **Hospital owners / bed managers**: census, occupancy, ward throughput,
  transfer load, the predictive discharge and occupancy bands.
- **Nursing and quality leads**: documentation cadence (progress-note
  intervals), the documentation funnel, discharge-summary completion, DAMA
  and death shares.
- **Accountants**: the IPD bill ledger, dues ageing, deposit coverage, the
  raw registers.

## The pages

- **Overview**: current census, admitted/discharged this period, discharge
  queue, ~avg length of stay, bed occupancy; flow and census trends, ward
  occupancy, discharge-type mix.
- **Admissions & Discharges**: throughput by department, ward and admitting
  doctor; patient-category and discharge-type mixes; LOS distribution; the
  discharge queue with ~time in queue (the discharge-process bottleneck
  metric); admission, discharge, queue and LOS registers.
- **Wards & Beds**: bed capacity (active/occupied/available/blocked), room
  shifts, bed turnover; beds by ward, occupancy trend, ALOS by ward and by
  department; ward and department admission/discharge flow; transfers in and
  out per ward; predictive expected discharges and projected occupancy
  (next 7 days, labelled heuristics).
- **Clinical Activity**: built on the real per-artifact documentation model
  (admission assessment once per admission; nurse progress notes multiple
  per day; doctor consultant notes through the stay; OT notes per operation;
  cross referral request and response; lab results; medical-record uploads;
  discharge summary). Coverage and cadence per artifact: assessment coverage,
  ~progress and consultant notes per patient-day, ~nurse note interval, OT
  note coverage; the documentation funnel; notes by stay day; admit vs
  discharge diagnoses; OT volume, anaesthesia mix, summary completion.
- **Billing**: the IPD bill ledger and the shared advance wallet (mirroring
  OPD Billing), plus the replica depth the billing API cannot give: revenue
  by doctor and the named patient-dues register (debit documents only).
- **Reports**: 8 raw-data downloads: admission, discharged, discharge-queue,
  LOS, transfers and OT registers, IPD bills, outstanding dues.

## The rules every page obeys

Same house rules as OPD: honesty first (no fabricated numbers; source notes
on every page), zero-filled fixed domains, ~ marked approximations, stable
KPI layout, semantic status colors, superset APIs (every endpoint returns
everything its domain can say; the frontend picks what to render).

## How it is built

- **Data source today**: the legacy replica IPD tables (`tbl_atd_patient_master`,
  ward/room management, the `tbl_atd_logs` transfer log, the OT schedule and
  procedure tables, ~20 `tbl_inpatient_*` clinical tables, the IPD billing
  overview). Key facts the builders encode: the cross-table admission key is
  the string `in_pid`; legacy has NO discharge-date column (precedence:
  ready-to-discharge log, then discharge-summary date, then last-modified);
  a bed is a ward-room row of type bed; occupancy derives from active
  admissions' room assignment.
- **The discharge queue**: an admission sent for discharge approval and not
  yet discharged (modern: `sentForApproval` without `isDischarged`; legacy
  proxy: a ready-to-discharge log with the discharge flag still 0).
- **Modern-tenant gap, stated everywhere it matters**: hospitals on the
  modern pm-ipd microservice keep admissions, the discharge pipeline,
  wards/beds, notes and cross-referrals in that service's own datastore,
  invisible to the replica. The export contract that lights them up (and
  unlocks cross-referral analytics and medical-records counts) is specified
  in MASTER-API.md Part 2.

## Where to read more

- **MASTER-API.md**: every analytics API (OPD + IPD) with why it exists, and
  every API still needed, with contract hints.
- **Per-page guides**: every IPD page's info button carries its own guide and
  backend spec; the full pack downloads as a ZIP.
