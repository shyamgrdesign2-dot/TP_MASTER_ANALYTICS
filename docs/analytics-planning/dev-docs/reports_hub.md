# Reports

# Reports (downloadable exports)

The export counter of the module: 10 report cards in three labelled sections (Financial, Clinical, Reference), rebuilt native from the legacy `data_analytics_reports.php` and **OPD-only** (inpatient reports and the Inpatient ID column dropped). Each card opens a filter modal (date range, the page's doctor scope, and a report-type radio where the legacy had one), then downloads CSV or Excel **client-side** from a JSON `{columns, rows}` result via `exportRows`. Nothing renders on screen: these are raw registers for accountants, auditors and pharma conversations.

## Financial
- **Daily Collection**: cash memo / receipt / advance / refund bills for the period. Built from the live billing API bills list.
- **Collection Report**: the bills list with a report-type radio (General / Detailed / Day-Wise). Billing API sourced.
- **Incentive Report**: service-level incentive payouts (Detailed) or per-user totals with a grand total (Overall). Note: currently empty on every tenant: incentive config exists but no billed line uses an incentivised service yet; populates when real data exists.
- **3C Report**: service-level Cash memo / Invoice / Credit-note rows by account (credit notes appear as negative amounts).
- **Billing Overall**: revenue / cash-flow over the bills list. Billing API sourced.

## Clinical (new vs legacy)
- **Appointment Analytics**: General = one row per appointment with patient demographics (id, name, age, gender, contact, city, state, date, type, case type, status, doctor). Overall = per-doctor status matrix (booked vs walk-in vs total per status).
- **Prescription Analytics**: brand / generic / company with total doses and prescription-line counts. OPD prescriptions only.
- **Medicine Analytics**: prescribed-medicine counts and distinct patients per brand.

## Reference
- **Referred by Patients**: patients who referred other patients, with referred-case counts and first-referred date.
- **Referred by Others**: external referrers (reference master) with case counts.

## Caveats
- Verified live on the reference tenant: appointment-analytics 5,582 rows, prescription 328, medicine 328, referred-by-others 6, referred-by-patients 0 (genuinely none).
- Registers are row-capped server-side (5,000 to 20,000 depending on report); the cap is honest, not silent truncation of totals.
- Every chart on every module page also carries its own download arrow exporting its underlying patient rows; this hub is for the named, accountant-shaped cuts.
