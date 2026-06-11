# Appointments analytics — metric dictionary

**Audience:** Hospital Admin (multi-clinic / multi-doctor owner) and Doctor Admin
(a doctor reviewing their own practice).
**Scope:** OPD only. Every figure on the Appointments page is documented here —
what it is, *why* it's shown, *who* it helps, *how* it's calculated, and *where*
the data comes from.

## The model: footfall = booked + walk-in

A **walk-in is not an appointment**. It is a consultation that happened without a
booking. The page is therefore built on three disjoint-but-reconciling numbers:

```
Total footfall  =  Booked appointments  +  Direct walk-ins
```

- **Booked appointment** — booked in advance through a channel
  (`pam_appointment_type <> 'Walk'`).
- **Walk-in consultation** — patient seen without a prior booking
  (`pam_appointment_type = 'Walk'`).

Everything that only makes sense for bookings (booking channels, cancellation
rate, booking lead behaviour) is computed **over booked appointments only**.
Everything about clinic load (busiest day/hour, footfall trend, avg per day)
is computed over total footfall.

## How to read this doc

Every metric obeys the **live filter scope** at the top of the page —
**Doctor · Clinic · Period** — and the heading info-tooltip restates that scope
("Showing: All doctors · All clinics · Till date") so a number is never ambiguous.

**Single API endpoint** powers the whole page:

```
GET /api/v1/analytics/operational/footfall
    ?startDate=YYYY-MM-DD
    &endDate=YYYY-MM-DD
    &doctorIds=<id,id>      (optional; omit = all doctors)
    &hospitalId=<hm_id,..>  (optional; omit = all clinics)
    &grain=day|week|month   (auto: day ≤10d span, week ≤92d, month >92d)
    Authorization: Bearer <JWT with result.hospital_business_id>
```

Each KPI and chart below names the **response field** it maps to. Builder source:
`pm-analytics-service/src/analytics/builders/footfall.ts`. Tenant is scoped from
the JWT `hospital_business_id`; the service is **read-only** (SELECT only).

**Core source tables**
- `tbl_appointment_master a` — one row per visit (date, time, status, type,
  doctor `um_id`, department `dp_id`, creator `pam_created_by`, legacy id
  `old_trans_appointment_id`, KEA marker `kea_appointment_sequence`).
- `tbl_appointment_source s` (`pam_id` → `tas_source`) — explicit booking channel
  where captured.
- `tbl_opd_case_type t` (`toct_id` → `toct_type`) — New / Follow-up / Urgent …
- `tbl_patient_master p`, `tbl_user_master u`, `tbl_department d`.

**Status codes** — verified by reverse-engineering the EMR's appointment tabs
(each tab posts `apStatue=<key>` to `listAppointment`; reproduced counts match
the tab badges exactly): 0 Scheduled/Queue · 7 Clinic queue (shown as Scheduled)
· **6 Draft** (Rx in progress — the "Resume" rows) · 3 Completed/Finished ·
4 Cancelled. **"Pending digitisation" is NOT a status** — that EMR tab is a UI
view = Completed ∩ the SnapRx microservice's undigitised-appointment list
(`apStatue:3` + ids from `/digitization/undigitizedAppointments`); the set
lives only in SnapRx, so analytics does not fake it as a zero bucket
(surfacing it needs a SnapRx API join — separate ticket). Codes 1/2/5 are
legacy/unused → 'Other', shown only if rows exist.

**Video** — PRODUCT RULE: a walk-in is a physical clinic visit and is **never a
video consult**. Video therefore counts **booked rows only**:
`pam_appointment_type <> 'Walk' AND pam_status_type_appointment IN (1,2)`.
(Raw `Walk` rows carrying a video flag exist in the data but are not product
video consults — they stay inside Walk-in.)

**Scoping note:** every EMR tab badge is scoped to the logged-in doctor and its
own date window (the EMR's "Till Date" starts 2024-10-28, not all-time);
analytics is clinic-wide with user-selected windows — apply the Doctor filter
and matching dates before comparing numbers side-by-side.

**Zero-fill principle.** A field that *could* exist is **always shown, even at
zero** — every status, case type, weekday, hour, booking channel, visit type,
and every specialty the clinic has ever used. A `GROUP BY` silently drops empty
buckets; we re-fill the canonical/known domain so "Walk-in: 0" or "KEA portal: 0"
reads as a real empty state, never a missing field.

---

## A. Key metrics (KPI cards)

Response field: `kpis[]`. Each card carries `{ label, value, unit?, description,
delta?, spark? }`. `delta` is the % change vs the immediately-preceding window of
equal length (green/red/amber tag); absent when no comparison window applies.

### Total footfall  → `kpis[].footfall`
- **What:** All patient visits in the period = booked appointments + walk-in
  consultations.
- **Why / who:** The headline load signal — how many patients came through,
  however they arrived. Hospital Admin sizes capacity off this.
- **How:** `COUNT(*)` over `tbl_appointment_master` within scope + period.

### Booked appointments  → `kpis[].booked`
- **What:** Visits that were booked in advance through a channel (doctor portal,
  KEA portal, appointment agent). Walk-ins excluded.
- **Why / who:** The real "appointments" number — bookings the channels produced.
  Compare with walk-ins to see how much demand is planned vs unplanned.
- **How:** `SUM(pam_appointment_type <> 'Walk')`.

### Direct walk-ins  → `kpis[].walkins`
- **What:** Patients seen without a prior booking (always physical clinic visits).
- **Why / who:** Unplanned load — high walk-in share means front-desk queueing
  pressure and harder slot planning. **Booked + Direct walk-ins = Total footfall**, so
  the three cards always reconcile.
- **How:** `SUM(pam_appointment_type = 'Walk')`.

### Booked (clinic)  → `kpis[].inClinic` · Booked (video)  → `kpis[].video`
- **What:** Within BOOKED appointments: patient visits the clinic vs takes a
  video / teleconsultation. **Booked (clinic) + Booked (video) = Booked
  appointments**, the second reconciliation level. (Walk-ins are physical
  visits by definition and live in their own card.)
- **Why / who:** tele-adoption and physical-capacity planning, split at the
  level where the choice is actually made: the booking.
- **How:** booked-video = `SUM(pam_appointment_type <> 'Walk' AND
  pam_status_type_appointment IN (1,2))`; clinic = booked − booked-video.

### Outcome counts (Completed / Cancelled / Draft) — *not KPI cards*
- Curated out of the KPI band on review: the **Appointment status donut**
  directly below carries the real statuses (Scheduled / Draft / Completed /
  Cancelled) with counts and shares, so the band keeps
  only the arrival funnel + time-shape numbers.

### Avg consult time  → `kpis[].avgDuration` (unit `min`)
- **What:** Mean visit duration in minutes (zero/blank durations excluded).
- **How:** `ROUND(AVG(NULLIF(pam_appointment_duration, 0)))`.

### Busiest day  → `kpis[].peakDay` · ~Busiest hour  → `kpis[].peakHour`
- **What:** The day of week / hour of day with the most visits **across the
  whole period** — a recurring pattern, not a single date. The longer the
  window, the more it reads as "your typical busiest day/hour", which is why
  the hour carries the ~ marker and both tooltips say "a pattern over the
  period".
- **Why / who:** Staffing the right days and slots. The full distributions are
  the "Visits by day of week" and "Visits by hour of day" charts.
- **How:** `DAYOFWEEK(pam_app_date)` / `HOUR(pam_app_time)`, max-count bucket.

### ~Avg visits / day  → `kpis[].avgDay`
- **What:** Total footfall ÷ number of days in the selected period, rounded to
  a whole number (visits don't come in decimals; the ~ marks the rounding).
- **Why / who:** A period-length-independent demand rate.

### Projected this month  → `kpis[].projected` *(conditionally shown)*
- **What:** Forecast footfall for the **full current calendar month** at the
  period's daily run-rate.
- **How (formula):** `round( (footfall ÷ days_in_period) × days_in_current_month )`.
- **Gating:** shown **only** when the period ends on (or within ~1 day of) today
  AND spans 7–92 days (Last 7 / 15 / 30 / 90). Hidden for historical ranges,
  "Today" (too few days to extrapolate) and "Till date" (a 15-year span dilutes
  the run-rate to nonsense).

---

## B. Appointments & demand (charts)

### Appointment status  → `apptStatusMix` (donut)
- **What:** Visits by outcome — Scheduled / Draft / Completed / Pending
  digitization / Cancelled (+ any other real code).
- **How:** `GROUP BY` status; all 5 canonical statuses always listed (0-filled).

### Case-type mix  → `caseMix` (bar)
- **What:** Visits by OPD case type — New / Follow-up / Urgent / Revisit /
  Emergency (all 0-filled).
- **How:** `GROUP BY toct_type` (`tbl_opd_case_type`).

### Visit mix (booked vs walk-in)  → `typeMix` (donut)
- **What:** How patients arrived, in three explicit segments: **Booked (clinic)**,
  **Booked (video)**, and **Direct walk-in**. Walk-ins are physical visits, never video. The two booked segments sum to
  the Booked-appointments KPI and all three sum to Total footfall — the donut
  and the cards can never disagree.
- **How:** booked-video = `<> 'Walk' AND pam_status_type_appointment IN (1,2)`;
  booked in-clinic = booked − booked-video; walk-in = `= 'Walk'`. All three
  always shown, 0-filled.

### Visits by day of week  → `byDayOfWeek` (bar) · Visits by hour of day  → `byHour` (bar)
- **What:** ALL visits in the period grouped by weekday / by hour, 0-filled —
  the Monday bar is every Monday in the period combined, the 11 AM bar every
  11 AM visit. Renamed from "Busiest days/hours" because over a month or a
  year these are recurring patterns, not a literal single week or day; the
  info tooltips state that explicitly.
- **Why / who:** Weekly and intra-day staffing pattern, incl. the quiet slots.

### Footfall over time  → `footfallTrend` (line)
- **What:** Visits vs cancellations per bucket (day/week/month by span).

### Appointments by specialty  → `bySpecialty` (bar)
- **What:** Visit volume per department/specialty, driven off the **all-time
  catalogue** of departments this scope has ever used — so a specialty with zero
  bookings in the window still appears at 0.
- **Limitation:** a specialty configured but never booked isn't listed (no
  reliable business-scoped department master exists in `tatva_clinic`).

---

## C. Booking sources  *(booked appointments only)*

> **Why walk-ins are excluded:** a walk-in has no booking, so it has no booking
> channel. Including it would double-count it as both a "channel" and a visit
> type. The walk-in volume lives in the Booked-vs-walk-in donut and its own KPI.
>
> **The real channels.** An appointment can be booked through exactly these:
> - **Doctor portal** — booked inside this EMR (any portal login; there is no
>   separate receptionist role).
> - **KEA portal** — booked through the KEA front-desk product.
> - **Appointment agent** — the AI booking agent; bookings from the website /
>   symptom-collector link / patient app also arrive through it.
> - **Legacy portal (migrated)** — historical bookings migrated from the old PHP
>   portal.
>
> **Attribution precedence** (explicit source wins, then hard row markers):
> 1. `tas_source = 'KEA'` or `kea_appointment_sequence` present → **KEA portal**
> 2. `tas_source ∈ {APPOINTMENT_AGENT, CHIKITSALY-PORTAL, VISIT-PATIENT-APP}` →
>    **Appointment agent**
> 3. `old_trans_appointment_id` present → **Legacy portal (migrated)**
> 4. `tas_source = 'CREATE_APPOINTMENT_SCREEN'` or `pam_created_by` present →
>    **Doctor portal**
> 5. otherwise → **Not tracked** (shown only when it has rows)
>
> All 4 canonical channels are always shown 0-filled. The derivation is restated
> in the chart tooltip and `meta.bookingSourceNote`.

### Booking channels  → `bookingChannelMix` (bar)
- **What:** Booked-appointment volume per channel.
- **Why / who:** Channel mix — how much of the book the doctor creates vs KEA vs
  the agent. Guides where to invest (e.g. push the website/symptom-collector link
  to grow agent bookings).

### New vs returning bookings  → `newVsFollowupBooking` (donut)
- **What:** Every booking in the period classified by the patient's BOOKING
  HISTORY: a booking is **New patient** iff it is that patient's first-ever
  booking on record (judged over all time, never just the window); every later
  booking is **Returning patient**. New + Returning = Booked appointments.
- **Why / who:** Acquisition vs retention balance of the booked demand, judged
  on actual history — not on the case-type field (that's a different axis,
  charted in the visit-type mix).

### Booking channels (new vs returning)  → `bookingByVisitType` (stacked bar)
- **What:** One chart for the whole booking story: per channel, the bar splits
  into new-patient vs returning-patient bookings (same definition as above).
- **Why / who:** *Which channels bring new patients* — e.g. the agent may skew
  New (acquisition) while doctor-portal skews Returning (retention).

### Booking sources over time  → `bookingSourceTrend` (line)
- **What:** ALL FOUR channels (Doctor portal, KEA portal, Appointment agent,
  Legacy) per bucket, every series 0-filled so a quiet channel shows flat
  instead of disappearing. A **Not tracked** line appears only when some
  bookings carry no recorded source (older rows from before source tracking) —
  it is residual data, not a fifth channel.

---

## D. Patients & retention (on this page)

### New vs returning over time  → `newVsReturningTrend` (line)
- **What:** Per bucket, patients making their **first-ever visit** (New) vs
  patients **coming back** (Returning — they have an earlier visit on record).
- **Why / who:** The retention heartbeat: is the clinic running on new acquisition
  or on patients who return?
- **How:** each patient's lifetime first visit (`MIN(pam_app_date)` per patient,
  business-scoped) is compared to the bucket: first-visit bucket → New; any later
  bucket they appear in → Returning. **Visit history, never registration date** —
  so the Returning line reflects real repeat visits in every period selection.

### New vs returning patients  → `newVsReturning` (bar)
- **What:** Single-visit vs repeat patients within the period cohort.

### Gender / Age  → `genderMix` (donut) · `ageMix` (bar)
- **What:** Demographics of the patients seen; all groups/bands 0-filled.

---

## E. Doctor performance & registers (tables)

### Doctor scorecard  → `doctorScorecard`
- Doctor · Appointments · Completion % · Cancellation %, vs the peer-median
  cancellation rate stated in the note (coaching surface).

### Patients with most visits  → `repeatBookers` · Frequent cancellers  → `frequentCancellers`
- Recall lists: loyal patients to nurture; chronic cancellers to manage.

### Patient list  → `patients`
- Row-level register (date, time, UHID, name, gender, age, doctor, **type:
  Booked / Walk-in**, status), exportable to CSV/Excel.

---

## Notes on integrity

- **Read-only:** the analytics service runs `SELECT` only; nothing is written.
- **Reconciliation by construction:** footfall = booked + walk-in everywhere; the
  donut, the KPI cards and the channel chart can never disagree because they are
  cuts of the same base set.
- **Honesty over gloss:** where attribution is inferred (booking channel) the
  derivation is disclosed in-product; where a field can't be sourced, the
  limitation is stated rather than faked.
- **Demo-data caveat:** this tenant's visits are historical (≈2024–early 2025), so
  current rolling windows legitimately read 0 — and "Projected this month"
  correctly hides or shows 0 rather than inventing a number.
