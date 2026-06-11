# Lab Tests

## What this page is

Investigation-ordering analytics: which tests doctors order, how often, for whom (age and gender), and by which doctor, with a per-consult register for download.

## Key metrics

- **Top investigation** (hero): the test ordered for the most distinct patients this period.
- **Consults with tests**: consultations where at least one investigation was ordered. This counts consultations, not individual tests.
- **Patients**: distinct patients who had a test ordered.
- **Distinct tests**: number of different investigation names ordered.

## Charts and tables

- **Investigations over time** (line): consults with tests and distinct patients per period.
- **By doctor** (bar): top 15 doctors by distinct patients with tests ordered.
- **Investigation summary** (table): top 50 tests ranked by distinct patients.
- **Gender mix / Age mix** (donuts): distinct patients by gender and by standard age band (<18, 18-30, 30-45, 45-60, >60).
- **Patients** (table, download): per consultation: date, UHID, name, gender, age, mobile, and the cleaned list of investigations ordered.

## Honest caveats

- Investigations are captured as free text on the prescription; there is no normalized per-order table. Top tests reflect the field verbatim, so typos and placeholder entries from test clinics can appear, and name variants count separately.
- The page parses the most recent 20,000 consultations in the window; extremely wide windows on busy clinics may be partially covered.
- Test counts are by distinct patients per test, so a panel re-ordered for the same patient counts once.
