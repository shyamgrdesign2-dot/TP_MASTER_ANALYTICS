# Overview

## What this page is
The Overview is the landing scoreboard of Analytics: one headline number per section of the product, plus four orienting charts. It answers "how is my practice doing right now?" in five seconds. Detail lives on the section pages (Appointments, Billing, Patients, Care, Pharmacy, Grow); the Overview never duplicates their charts.

It obeys the global filters (Doctor, Clinic, Period) and is OPD-scoped in this product (`careSetting=opd`). Doctor logins land pre-filtered to themselves; owner/admin logins land clinic-wide.

## The 12 KPI cards (fixed order)
- **Total footfall**: all patient visits in the period, booked appointments plus walk-in consultations. The headline load signal.
- **~Avg consult time**: mean appointment duration in minutes (zero/blank durations excluded). Approximate, hence the ~.
- **Total billed**: gross value billed this period (OPD stream). Collections and dues live on the Billing page.
- **Advance received**: money deposited by patients into their advance wallet this period.
- **Top symptoms**: shows "-" today. Per-patient symptoms live in the separate symptoms microservice, not yet connected (the card says so honestly).
- **Top diagnosis**: the most-recorded diagnosis this period.
- **Top medication**: the most-prescribed medicine this period.
- **Top lab test**: the most-ordered investigation (cleaned from free-text Rx investigation boxes).
- **Top chronic condition**: the most-recorded condition in patients' medical history.
- **Net pharmacy sales**: pharmacy counter revenue, gross sales minus sale returns.
- **Follow-up adherence**: share of due follow-ups where the patient actually returned within 45 days.
- **ABHA linked**: % of this period's patients with an ABHA (national health ID) linked.

Cards 5-9 run in the clinical flow order: symptoms, diagnosis, medicine, investigation, history. Cards carry period-over-period deltas (vs the immediately-preceding window of equal length) and sparklines where a trend exists.

## The 4 orienting charts
- **Appointment status mix** (donut): Completed / Cancelled / Scheduled, always all three (0-filled).
- **Footfall over time** (line): appointments and completed per day/week/month bucket.
- **Payment-mode mix** (donut): billed amount per payment mode.
- **Top diagnoses** (bar): the 10 most-recorded diagnoses.

## Caveats
- Top symptoms is a stated gap, not a zero: the feed does not exist yet.
- Status here is the simple 3-way roll-up (Scheduled = everything not completed/cancelled); the Appointments page carries the full 5-status model including Draft.
- All queries are read-only and tenant-scoped from the JWT; nothing is editable from this page.
