# Diagnoses

## What this page is

What the clinic diagnoses: condition mix, clinical status (suspected vs confirmed vs ruled out), ICD coding discipline, and a patient-level register.

## Key metrics

- **Top diagnosis** (hero): the most common condition by distinct patients.
- **Patients diagnosed**: distinct patients with at least one diagnosis entry in the period.
- **Diagnoses recorded**: total entries (a patient can have several).
- **Distinct conditions**: unique diagnosis names as recorded. Mostly free text, not ICD-deduplicated, so spelling variants count separately.
- **ICD-coded entries**: entries carrying a standard ICD code, with the coded share (%). Why: a data-quality lever; uncoded free text cannot feed registries or claims cleanly.
- **Suspected / Confirmed / Ruled out (patients)**: distinct patients with at least one entry in each status. See the status caveat below.

## Charts and tables

- **Diagnoses over time** (line): entries and distinct patients per period, zero-filled so quiet days still show.
- **Diagnosis status mix** (donut): entry counts across Suspected, Confirmed, Ruled out, Unspecified; all four slices always shown.
- **Top conditions** (bar): top 15 conditions by distinct patients, case and spacing variants merged.
- **Patients** (table, download): one row per patient per day with diagnoses and ICD codes concatenated, plus demographics (gender, age, mobile). Capped at 5,000 rows.

## Honest caveats

- Status is computed only from entries dated 2024-01-01 onward, regardless of the selected window: a 2023 legacy bulk import marks every row "Primary", which carries no clinical status. Legacy and blank statuses appear as Unspecified.
- Diagnosis names are free text; "DM II" and "Type 2 Diabetes" count as different conditions.
