# Vitals

## What this page is
Capture and quality view of the vital signs recorded at the clinic: what gets measured, how often, and what the readings look like once parsed. It reads BOTH capture tables (the consultation vitals drawer and the body-composition entries), because the older report ignored the second one.

All vitals values are stored as free text at source. Every chart parses defensively (numeric regex plus sanity bounds) and states how many values were discarded. "Captured" means the field was filled in, nothing more: this page measures capture, not clinical validity.

## Key metrics
- **Vitals records** (hero): total entries across both tables in the period. Why: the raw activity volume of vitals capture.
- **~Avg vitals per patient**: records / distinct patients, rounded. Why: capture depth per patient, not just volume.
- **Most captured vital**: the field filled in most often across all entries. Why: shows what the desk actually measures.
- **Patients with vitals**: distinct patients with at least one entry in either table. Why: reach of vitals capture.

## Charts
- **What gets measured** (bar): entries per field across all 12 capturable vitals (Temperature, Pulse, BP, Resp. rate, SpO2, RBS, FIB-4, Waist, Height, Weight, OFC, BMI), fixed order, zero-filled so a never-captured vital stays visible.
- **Blood pressure stages** (bar): parseable systolic/diastolic readings staged Normal, Elevated, Stage 1, Stage 2, Crisis (the higher of the two component stages wins). The note states how many readings were unparseable and how many entries had no BP.
- **BMI distribution** (bar): Underweight / Normal / Overweight / Obese, parsed with sanity bounds 10 to 60; discards noted.
- **BMI coverage** (donut): of patients with any vitals record this period, how many have at least one usable BMI.
- **Random blood sugar bands** (bar): <140 / 140-199 / 200+ mg/dl, bounds 20 to 1000; RBS fill is low and the note says exactly how low.
- **Repeat monitoring** (donut): patients with 2+ entries (trackable trend) vs a single one-off capture.
- **Recent entries register** (table): last 100 entries with patient, source table and which fields were recorded.

## Caveats
- Free-text source: every banded chart excludes unparseable values and says so on the chart.
- BMI is FE-computed at capture time; per-visit linkage and BMR/BSA analytics are not buildable from this data.
