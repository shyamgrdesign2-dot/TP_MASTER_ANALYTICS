# OPD Analytics: project scope

The complete picture of what this module is, who it serves, what it covers,
and where it is headed. One read should orient anyone: a doctor, an admin, a
new frontend or backend developer, or a product owner.

## What it is

A native analytics module inside the TatvaCare doctor portal that replaces the
legacy PHP `data_analytics` link-out. It answers one question for an OPD
practice: **how is the practice doing, and where exactly should I act?** It
ships as TWO modules from the same workspace shell: **OPD Analytics**
(`/analytics`) and **IPD Analytics** (`/analytics/ipd`), both strictly
read-only (a SELECT-only user on the `tatva_clinic` replica plus the
production billing/messaging APIs; nothing here writes anywhere), and
tenant-scoped from the login token, never from the client.

## Who it is for

- **Doctors**: land pre-filtered to their own practice (the role-default
  landing); their numbers line up with the EMR screens they already trust.
- **Clinic owners / admins**: land clinic-wide; compare doctors, watch money,
  staff the busy hours, run the recall lists.
- **Accountants / auditors**: the Reports hub's downloadable cuts (collection,
  3C, incentives, registers).
- **Developers**: every page self-documents (the info button), and the
  documentation pack + master API file specify every route and every missing
  feed.

## What it covers (the sections)

- **Overview**: one headline per section, the practice scoreboard.
- **Appointments**: footfall = booked + walk-ins, channels, statuses, busiest
  patterns, new-vs-returning bookings, doctor scorecard.
- **Billing**: the bill ledger and the advance wallet as two explicit
  families, payment/refund mode mixes, dues by age, replica depth (revenue and
  discounts by doctor, registers).
- **Patients**: retention by visit history, demographics, blood groups,
  marital status, RFM value segments, lapsed high-value recall.
- **Care**: Symptoms, Diagnoses, Medications (incl. custom-vs-catalogue), Lab
  Tests, Procedures, Vitals, Medical History (six segregations), Gynec
  (menstrual), Obstetrics, Growth Chart, Vaccination, Custom Modules,
  Certificates.
- **Pharmacy**: the standalone PHP pharmacy module's full business: sales,
  purchases, suppliers, stock, expiry risk.
- **Grow**: Follow-ups (the retention loop), ABHA/ABDM, Campaigns.
- **Reports**: 16 downloadable cuts in four groups (Financial, Clinical,
  Reference, Registers), CSV and Excel.

### The IPD module (`/analytics/ipd`)
- **Overview**: census, admissions/discharges, discharge queue, ~avg length of
  stay, bed occupancy, deaths.
- **Admissions & Discharges**: by department/ward/admitting doctor, discharge
  types, LOS distribution, queue size and ~time in queue.
- **Wards & Beds**: capacity/occupied/available/blocked, room shifts, ALOS by
  ward, transfers log, predictive expected discharges + projected occupancy.
- **Clinical Activity**: assessment and note coverage, admit vs discharge
  diagnoses, OT volume by doctor, anaesthesia mix, summary completion.
- **Billing**: the IPD bill ledger + advance wallet, mirroring OPD billing.
- **Reports**: 8 raw-data registers (admissions, discharges, queue, LOS,
  transfers, OT, bills, dues).
Source: the legacy replica IPD tables; hospitals on the modern pm-ipd
microservice need the export feed in MASTER-API.md Part 2.

## The rules every page obeys

- **Honesty first**: no fabricated numbers. Pages whose source lives in an
  unconnected microservice run on clearly-bannered SAMPLE data (Gynec,
  Procedures, Custom Modules) or labelled proxies (ABHA KYC), never silent
  zeros. Truncated registers say so.
- **Zero-fill**: every fixed domain renders all its buckets (all 24 hours, all
  7 weekdays, all 8 blood groups), zero included. Missing data appears as an
  explicit "Not recorded" bucket.
- **Reconciliation**: identities hold everywhere (footfall = booked +
  walk-ins; one-time + returning = total patients; the donut always sums to
  the cards). Numbers were verified against the EMR's own screens and write
  paths, not assumed.
- **Approximations are marked** (~), counts are whole numbers, forecasts only
  show for current rolling windows.
- **Stable layout**: KPI card positions never change with the period or
  filters; conditional cards show a dash instead of disappearing.
- **Semantic colors**: completed is green, cancelled red, scheduled amber,
  residual buckets grey, everywhere.

## How it is built (one paragraph each)

**Frontend**: a self-contained React module at `src/pages/analytics` (Tailwind
+ vendored shadcn primitives + Recharts, scoped so the rest of the EMR is
untouched). A single workspace shell drives every page: shared Doctor / Clinic
/ Period filters, a sidebar, KPI bands, chart widgets with per-chart download,
and the info drawer with the documentation pack.

**Backend**: `pm-analytics-service`, a NestJS service exposing
`/api/v1/analytics/...` routes (the master API file lists all of them). Every
builder is a superset API: it returns all KPIs, all blocks and the full
register its domain supports; the frontend chooses what to render.

**Data**: the `tatva_clinic` MySQL replica (read-only) plus the production
billing and messaging APIs. Five domains await microservice feeds (gynec,
obstetric-current, procedures, custom modules, ABHA KYC/consent depth); the
master API file carries the exact contract each owning team should build.

## Where to read more

- **MASTER-API.md**: every API that exists (with why), and every API we still
  need (with the contract hint).
- **architecture.md**: the system contract in detail (response envelope,
  frontend registration rules, auth).
- **Per-section guides**: every page's info button carries its own guide and
  backend spec; the full pack downloads as a ZIP.
