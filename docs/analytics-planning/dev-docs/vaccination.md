# Vaccination

## What this page is
Doses-administered analytics: which vaccines are given, to how many patients, and whether they follow the standard IAP schedule or a clinic-customised one.

Two data fixes define this page's numbers:
- **Join fix**: bulk-entered doses store the vaccine id in a different column than single entries. The old report joined only the single-entry column and silently dropped ~65% of doses (one reference tenant went from 0 to 148 doses). The join now falls back to the bulk column.
- **Date fix**: doses are dated strictly by their recorded GIVEN date. The old fallback to the catalog row's creation date invented dates; doses without a given date (or with a placeholder before 1901) are excluded from every count rather than guessed.

## Key metrics
- **Top vaccine** (hero): the vaccine with the most doses this period.
- **Doses administered**: dose rows with a valid given date in the period. Why: true administration volume.
- **Patients vaccinated**: distinct patients receiving at least one dated dose. Why: reach.
- **Distinct vaccines**: number of different vaccines administered. Why: breadth of the immunisation service.

## Charts and tables
- **Summary** (per-vaccine): top 50 vaccines with doses and distinct patients.
- **IAP schedule vs other** (donut): doses recorded against the system-provided IAP vaccination chart vs a clinic-customised or unmapped template; both rows always shown, zero-filled. Why: schedule standardisation signal.
- **Dose register** (table): up to 5000 rows with date, patient, vaccine, dose label and route.

## Caveats
- A deleted catalog entry does not erase administered doses: the catalog delete flag is deliberately not filtered.
- The Doctor filter is ignored: dose rows carry the recording user, not necessarily the doctor.
- Not buildable from this data: refusal status (not stored anywhere), administered brand per dose, batch/lot/expiry.
