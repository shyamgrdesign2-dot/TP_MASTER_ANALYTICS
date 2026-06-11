# Appointments

## What this page is
Everything about appointments on one page: volume, how patients arrived, what happened, when load peaks, which channels book, and who the patients are. Core model: **a walk-in is not an appointment**. `Total footfall = Booked appointments + Direct walk-ins`, and within booked, `Booked (clinic) + Booked (video) = Booked`. Every card and chart is a cut of the same base set, so the numbers always reconcile.

## Key metrics (KPI band)
- **Total footfall**: all visits = booked + walk-in. Capacity headline.
- **Booked appointments**: visits booked in advance through a channel. Planned demand.
- **Direct walk-ins**: seen without a booking, always physical visits. Unplanned load.
- **Booked (clinic) / Booked (video)**: the consult mode chosen at booking. Product rule: a walk-in is never a video consult (raw Walk rows with a video flag are not product video consults).
- **~Avg consult time**: mean visit duration in minutes.
- **Busiest day / ~Busiest hour**: the weekday/hour with most visits across the whole period, a pattern, not one date. Staffing signal.
- **~Avg visits / day**: footfall / days in period.
- **Projected this month**: footfall forecast at the period's daily run-rate. Only shown for a current rolling window of 7-92 days ending today; otherwise the card stays with "-" (so layout never shifts).
Completed/Cancelled/Draft are deliberately not cards: the status donut carries them.

## Charts
- **Appointment status** (donut): Scheduled / Draft / Completed / Cancelled (verified status codes; "Pending digitisation" is an EMR UI view, not a status, and is not faked).
- **Visit mix** (donut): Booked (clinic) / Booked (video) / Direct walk-in, sums to footfall.
- **Booking channels** (bar): Doctor portal / KEA portal / Appointment agent / Legacy (migrated), always shown 0-filled; "Not tracked" only when residual rows exist. Walk-ins excluded (no booking happened).
- **New vs returning bookings** (donut) and **per channel** (stacked bar): a booking is New iff it is that patient's first-ever booking on record (all time), else Returning. Shows which channels acquire vs retain.
- **Booking sources over time** (line), **In-clinic vs video over time**, **New vs returning patients over time** (by visit history, never registration date).
- **Visits by day of week / by hour** (bars, 0-filled), **Footfall over time** (visits vs cancellations), **Case-type mix** (New/Follow-up/Urgent/Revisit/Emergency), **By specialty** (all-time department catalogue, 0-filled), **Appointment-to-prescription conversion** (appointments vs appointments with an Rx).
- **Demographics**: gender and age bands of patients seen.

## Tables
- **Doctor scorecard**: appointments, completion %, cancellation % per doctor, with the peer-median cancellation rate in the note (coaching surface).
- **Patients with most visits** and **Frequent cancellers**: recall/manage lists with mobiles.
- **Patient list**: row-level register (date, time, UHID, name, gender, age, doctor, Booked/Walk-in, status), exportable.

## Caveats
- Booking channel is partly inferred (explicit source wins, then hard row markers); the derivation is disclosed in the chart tooltip and meta note.
- Zero-fill principle: every status, weekday, hour, channel, case type and known specialty is shown even at zero, never silently dropped.
- EMR tab badges are doctor-scoped with their own date floor; match the Doctor filter and dates before comparing side by side.
