# Medications

## What this page is

Prescribing analytics: what gets prescribed, by whom, generics and manufacturers, polypharmacy, and (critically for catalogue upkeep) how much prescribing happens OUTSIDE the medicine catalogue via doctor-added custom medicines.

## Key metrics

- **Top medication**: the most prescribed brand this period, with its line count and distinct patient reach. Catalogue test entries are excluded so junk never tops the list.
- **Medicines prescribed**: total medicine lines written (each drug on a prescription counts once).
- **Distinct drugs**: unique catalogue products prescribed.
- **Patients with a prescription**: distinct patients who received at least one medication.
- **Avg drugs per prescription**: mean lines per prescription, rounded; prescriptions over 30 lines count as 30 so data-entry outliers cannot skew the mean.
- **Custom medicines**: lines that were doctor-added rather than picked from the catalogue, with the % of all lines. Why: a high share usually means the catalogue is missing the drugs this clinic actually prescribes.

## Charts and tables

- **Catalogue vs custom medicines** (donut): prescription lines from the system catalogue vs doctor-added.
- **Custom medicines by doctor** (bar): top 15 doctors by custom lines; flags whose catalogue gaps to fix first.
- **Prescribing trend** (line): medicine lines and distinct patients over time.
- **Top generics / Top manufacturers** (bars): top 10 each by lines, name variants merged for generics.
- **Drugs per prescription** (bar): fixed buckets 1, 2, 3, 4, 5+, always shown; the polypharmacy profile.
- **Generic name capture** (donut): lines where a generic name was recorded vs not. This is data-capture completeness, NOT a clinical generic-vs-branded prescribing split.
- **Registers** (tables, download): drug register (top 100 catalogue products: brand, generic, manufacturer, lines, patients, last prescribed), generics register (top 100), custom medicines register (top 150 doctor-added medicines with maker, reach, last prescribed).

## Honest caveats

- Top lists and registers exclude catalogue test entries; the raw count KPIs include every line (honest totals).
- Generic and manufacturer are free-entry fields on the prescription line, so coverage varies.
