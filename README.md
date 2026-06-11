# TP Master Analytics — standalone demo

A **self-contained demo** of the TatvaPractice **OPD + IPD Analytics** module
(the native React analytics workspace), running entirely on **anonymized mock
data**. There is **no backend and no login** — open it and you land directly
on the analytics dashboards.

## Run it

```bash
npm install --legacy-peer-deps
npm start
```

Then open http://localhost:3000 — the root path redirects straight to
`/analytics` (OPD). The IPD module lives at `/analytics/ipd`.

## What you're looking at

- **OPD Analytics** (`/analytics`): Overview, Appointments (footfall, booking
  sources, doctor scorecard), Patients (retention, RFM, demographics),
  Billing, clinical dashboards (diagnosis, prescriptions, symptoms, vitals,
  medical history, growth, vaccination, gynec, procedures), follow-ups,
  pharmacy, ABHA, certificates, custom modules, bulk communication, and a
  downloadable Reports hub.
- **IPD Analytics** (`/analytics/ipd`): inpatient overview, admissions,
  wards & beds, clinical documentation/OT, IPD billing and IPD reports.

## Mock vs real-shaped data

> **Everything you see is mock data.** ALL names — patients **and** doctors —
> emails, phone numbers, identifiers and figures are anonymized or synthesized
> demo values. Patient names are `Demo Patient N`, doctor names come from a
> fixed fictional pool (`Dr. Asha Verma`, `Dr. Rohan Iyer`, …, `Dr. Demo N`),
> emails are `patientNN@example.com`, mobiles are masked. No value on any
> dashboard identifies a real person or a real clinic's finances. The
> anonymization pass is reproducible: `node scripts/scrub-demo-fixtures.js`.

Two kinds of demo data, both fully anonymized:

1. **Captured fixtures** (`src/pages/analytics/demo/fixtures/*.json`) — real
   responses from the production Analytics microservice (26 endpoints,
   dispatched through the real query builders against a busy tenant's read
   replica), with all names/identifiers anonymized. Everything routed through
   `ApiAnalytics.report()` — i.e. most dashboards — renders these.
2. **Synthesized fixtures** (`src/pages/analytics/demo/billingFixtures.js`) —
   the OPD/IPD billing dashboards, advance-deposit wallet and bulk-message
   campaigns read *production* billing/communication APIs in the real portal,
   so no capture exists; the demo synthesizes deterministic, shape-exact data
   (seeded PRNG, dates relative to today) so KPIs, charts and tables reconcile.

The **shapes are the real contracts** — the widget/normalization code between
the API client and the screen is identical to production. What the demo does
*not* do: re-aggregate fixtures when you change the Doctor/Clinic/Gender
filters or the period (fixtures are pre-aggregated over their full span); the
default period is therefore "Till date".

## How demo mode is wired

Everything demo-specific lives behind one flag — `DEMO` in
`src/pages/analytics/demo/demoApi.js` (hard-wired `true` in this repo):

- `src/api/services/ApiAnalytics.js` — `report()` resolves from the local
  fixture map before any HTTP.
- `src/pages/analytics/service.js` — billing / advance / campaign loaders
  return the synthesized fixtures.
- `src/pages/auth/components/PrivateRoute.js` — pass-through (no auth).
- `src/App.js` — `/` redirects to `/analytics`; live-service chrome
  (teleconsult sync, plan banners, support widget) is skipped.
- `src/pages/analytics/AnalyticsWorkspace.jsx` — default period "Till date",
  static demo doctor list for the Doctor filter.

Chart image downloads and CSV/Excel exports work — they are client-side.
Report-hub downloads that map to a fixture endpoint work too; the few reports
whose endpoints aren't in the demo dataset say so honestly.

## Provenance

This repo is a snapshot of the TatvaPractice doctor portal (tracked files
only) plus the demo layer above. **The production code paths live in the
company repositories** (`Pm-Doctor-Portal` for the frontend,
`pm-analytics-service` for the Analytics microservice); nothing here should
be treated as the source of truth. Do not deploy this build.
