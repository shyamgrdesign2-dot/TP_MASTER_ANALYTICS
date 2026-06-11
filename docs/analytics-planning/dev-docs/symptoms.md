# Symptoms

## What this page is

Per-prescription symptom analytics. Every prescription has a "symptom box"; when a doctor uses the structured entry UI it stores entries like *Fever, since 2 days, severity High, note*. This page parses those entries and shows what patients present with, how severe, and how it trends.

## Key metrics

- **Top symptom**: the symptom mentioned most often on prescriptions this period. Case and spacing variants are counted together (lowercase plus whitespace normalization); the displayed name is the most frequent original casing. Why: the single fastest read on what the clinic is seeing.
- **Symptom entries**: total structured entries parsed in the period. One prescription can list several symptoms, so this counts mentions, not visits.
- **Distinct symptoms**: unique symptom names as typed. This is not a medical taxonomy: spelling variants count separately.
- **Patients with symptoms**: distinct patients with at least one structured entry. Why: separates breadth (patients) from intensity (entries).

## Charts and tables

- **Symptom severity** (donut): fixed 3-level scale plus Not recorded, always all four slices, zero-filled. Raw severities are folded: high becomes Severe, medium becomes Moderate, low becomes Mild; anything else is Not recorded.
- **Top symptoms** (bar): the 15 most-mentioned symptoms, by mentions.
- **Symptom entries over time** (line): entries and distinct patients per period, zero-filled so quiet periods still show.
- **Symptom register** (table, download): the 200 most recent entries: patient, date, symptom, severity, duration as typed ("since"), and the doctor's note.

## Honest caveats

- Only structured entries are counted. Legacy free-text symptom boxes that do not match the structured pattern yield no entries and are excluded (the page says so in its note).
- Volume guard: only the most recent 20,000 prescriptions in the window are parsed. If the guard trips, the note tells you to narrow the date range.
- Symptom names are doctor-typed free text, so "fever" and "feverish" are different symptoms.
