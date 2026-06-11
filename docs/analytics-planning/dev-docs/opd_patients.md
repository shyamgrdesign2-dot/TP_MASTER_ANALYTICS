# Patients

## What this page is
The patient panel: who the patients are, whether they come back, and who is worth calling. Core model: **new vs returning is judged on visit history, never registration date**. A patient is Returning when they have more than one visit on record (up to the period end); New when this period holds their only visit so far. `Total patients = One-time visitors + Returning`, always.

## Key metrics
- **Total patients** (hero): distinct patients seen in the period, one count per patient however many visits.
- **One-time visitors**: patients whose only visit on record is this one. Acquisition plus the retention gap in one number.
- **Returning patients**: patients seen this period with more than one lifetime visit. Retention.
- **~Avg patient age**: mean age of the cohort (patients without a date of birth excluded).
- **ABHA linked %**: share with an ABHA (national health ID) on file.
- **Contactable %**: share with a mobile or email on file, reachable for recalls/campaigns. Mobile is mandatory at registration, so a low number flags data-quality gaps.
- **Top blood group**: most common recorded group (count in tooltip); "-" when none recorded.

## Charts
- **Gender / Age bands**: Male/Female/Other and 5 age bands, all 0-filled.
- **Blood group**: all 8 canonical groups always listed 0-filled, free-text variants normalised ("0-" reads as O-), plus an honest "Not recorded" bucket.
- **Marital status**: the registration form's 5 values 0-filled plus "Not recorded"; rarely captured, so the chart doubles as a front-desk data-quality prompt.
- **Top cities**: every city with at least 1 patient plus one explicit Unknown bucket. Catchment view.
- **Visit frequency**: lifetime visits bucketed 1 / 2 / 3 / 4-5 / 6-10 / 10+. A tall "1 visit" bar is the retention gap made visible.
- **Patient value segments (RFM)** (donut): every patient ever seen, placed in exactly one of five segments by recency (days since last visit, anchored to the clinic's latest visit date so stale data stays meaningful) and frequency (lifetime visits): Champions (<=90d, >=3 visits), Loyal (<=180d, >=2), Recent (<=180d, single), At risk (181-365d), Lapsed (>365d). Per-segment value = those patients' lifetime billing.

## Action lists
- **Most valuable patients**: lifetime spend per patient with visits, last visit, mobile. Protect these relationships.
- **Lapsed high-value (recall list)**: >=2 visits, billed > 0, no visit in 180+ days, sorted by spend. This week's call list for the front desk.
- **Patient register** (downloadable): honours every active filter (gender, blood group, ABHA, new/returning), so a CSV export is exactly the on-screen segment.

## Caveats
- The cohort is scoped to the business through visits (the patient master is global), so "patients" means patients seen here, not all registrations.
- RFM and the action lists use OPD lifetime history and OPD billing; they are hidden for an IPD-only care setting.
- Reconciliation by construction: this page's New/Returning uses the same visit-history basis as the Appointments trend, so retention numbers can never contradict each other.
