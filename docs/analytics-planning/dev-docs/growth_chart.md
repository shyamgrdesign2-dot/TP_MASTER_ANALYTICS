# Growth Chart

## What this page is
Pediatric growth measurement analytics: how many children get measured, what the recorded heights and weights look like, whether head circumference is captured, and whether children are measured repeatedly (a growth chart only has value with serial measurements).

## Pediatric scope (the defining rule)
Only measurements taken while the patient was UNDER 18 at the time of measurement count (age computed from date of birth vs the measurement date). Rows with no usable DOB (missing, zero-date, or DOB after the measurement) are excluded, because age at measurement cannot be established. This fixed the old page, where adult consultation vitals inflated the numbers.

Adult BMI bands (18.5/25/30) are clinically meaningless for children (pediatric BMI is age-and-sex percentile based), so the adult-banded BMI chart was removed. Raw height and weight distributions are shown instead.

## Key metrics
- **Measurements**: height/weight entries for under-18 patients in the period. Why: capture volume.
- **Children measured**: distinct children with at least one measurement. Why: reach.
- **Growth-screen entries**: entries made on the growth-chart screen itself (source flag); the rest of the height/weight data comes from the consultation vitals drawer. Why: adoption of the dedicated tool vs incidental capture.

## Charts and tables
- **Height distribution** (bar): fixed centimetre bands (Under 50 up to 150-200), plus explicit 'Implausible value' (over 200 cm or non-positive) and 'Not recorded' buckets; nothing is silently dropped.
- **Weight distribution** (bar): fixed kilogram bands (Under 5 up to 60-120), same implausible/missing treatment (implausible = over 120 kg or non-positive).
- **Head circumference capture** (donut): measurements with OFC recorded vs not.
- **Repeat measurement coverage** (donut): children measured 2+ times vs once in the period. Why: serial measurement is the real value signal of a growth module.
- **Measurement register** (table): up to 5000 rows with date, patient, gender, age at measurement, height, weight, BMI (shown only when plausible), OFC.

## Caveats
- Percentile / z-score analytics (height-for-age, weight-for-age, stunting/wasting) need WHO/IAP reference tables and clean sex+DOB data; not built yet.
- Doctor filter applies (entries carry the recording doctor).
