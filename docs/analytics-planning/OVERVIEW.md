# Analytics — Overview Section (Scope)

## Why this section exists
The Overview is the **landing dashboard** of the Analytics module — the first thing a
doctor or clinic admin sees. Its job is to answer "**how is my practice doing right
now?**" in five seconds, without reading any chart. It is a **scoreboard, not a report**:
one headline number per thing that matters, pulled from every section below.

The Overview is a **command center**: a band of headline KPIs at the top, plus a small
set of orienting charts (appointment-status mix, footfall over time, payment-mode mix,
top diagnoses). Detailed breakdowns and patient registers still live in their own
sections (Appointments, Patients, Billing & Payments, Prescription, …) — tapping in is
how you go deeper.

## Role-default landing

The landing scope adapts to who logged in (no extra screens — the same pages,
pre-scoped):

- **Doctor login** (the user's `um_id` is one of the clinic's consulting
  doctors): every page opens with the Doctor filter **pre-set to themselves** —
  "how is *my* practice doing". "Reset all" returns to this own-practice
  default, and the doctor can widen to "All doctors" manually at any time.
  This also makes side-by-side comparison with the EMR's own (doctor-scoped)
  tab badges line up out of the box.
- **Owner / admin login** (their `um_id` is not a consulting doctor): pages
  open clinic-wide — all doctors, all clinics.
- **Specialty admin** has no role representation in the portal today; the
  multi-select Doctor filter covers that need manually.

> Updated 2026-06-10: the Overview keeps **numbers + a few orienting charts** (decided
> with the product owner), superseding the earlier "numbers only" rule below.

## Design rules
- **Headline KPIs + a few orienting charts.** The detailed tables/registers belong to
  their sections; the Overview shows the scoreboard plus a handful of command-center charts.
- **One value per card**, with a one-line description of what it means.
- **1–3 cards per area**, grouped logically; full-width grid, 3 cards per row.
- Scoped by the active **Doctor / Period** filters like every other dashboard.

## What the Overview shows
`GET operational/overview` → 12 KPI cards in this fixed order — the Overview is
the **combination of all the sections below**: one headline per section, nothing
that duplicates a section's own page.

| # | Card | From section | Meaning / source |
|---|---|---|---|
| 1 | Total footfall | Appointments | All visits = booked + walk-in (`tbl_appointment_master`) |
| 2 | ~Avg consult time | Appointments | Mean appointment duration (approximate) |
| 3 | Total billed | Billing | Gross value billed this period |
| 4 | Advance received | Billing | Wallet deposits this period (`tbl_opd_billing_advance_master`) |
| 5 | Top symptoms | Care | "—" today — per-patient symptoms live in the symptoms microservice (integration pending; the card states this) |
| 6 | Top diagnosis | Care | Most-recorded diagnosis (`tbl_casemanager_diagnosis`) |
| 7 | Top medication | Care | Most-prescribed medicine (`tbl_medicine_report`) |
| 8 | Top lab test | Care | Most-ordered investigation (case-manager free text, cleaned) |
| 9 | Top chronic condition | Care | Most-recorded condition in medical history (JSON, parsed) |
| 10 | Net pharmacy sales | Pharmacy | Gross medicine sales − returns (`tbl_pha_sales_*`) |
| 11 | Follow-up adherence | Grow → Follow-ups | Kept ÷ due follow-ups (returned within 45 days) |
| 12 | ABHA linked | Grow → ABHA | % of the period's patients with an ABHA address |

The clinical tops (5–9) run in the **clinical flow order** — symptoms →
diagnosis → medicine → investigation → history — and the Care section's nav
follows the same order.

Below the band: a small set of orienting charts (appointment-status mix,
footfall over time, payment-mode mix, top diagnoses). Everything else lives on
the section pages.

All queries are read-only and tenant-scoped (`hm_business_id` from the JWT).

## Explicitly NOT on the Overview (and why)
- **Diagnosis summary / "patients diagnosed"** — every visit gets a diagnosis, so it's
  noise at the overview level; it lives in the Diagnosis section.
- **Gender distribution** — a breakdown, not a headline; lives in Patients / Appointments.
- **Video consults** — a channel split that belongs *next to* Appointments, not as a
  standalone top-level number.
- **Trends/charts** — every section already has its own trend.

## Future (optional)
- Make each card a shortcut into its section.
- Period-over-period deltas (↑/↓ vs previous period) on each card.
- A configurable "pin" so a clinic can choose which 6–9 cards it cares about.
