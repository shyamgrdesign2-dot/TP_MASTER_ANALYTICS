# Reports section — downloadable exports

Modeled on the legacy `data_analytics/data_analytics_reports.php`, rebuilt
native and **OPD-only** (IPD/inpatient reports and the `Inpatient ID` column
dropped). Reports download client-side as CSV or Excel from JSON
`{columns, rows}` via `exportRows`. The hub renders three labelled sections.

## Financial

| Report | Source | Notes |
|---|---|---|
| Daily Collection | billing API (`billsTable`) | cash memo / receipt / advance / refund bills for the period |
| Collection Report | billing API (`billsTable`) | report-type radio (General / Detailed / Day-Wise); exports the bills list |
| Incentive Report | `financial/incentives` | Detailed (service-level) / Overall (per-user) |
| 3C Report | `financial/3c-report` | service-level cash / invoice / credit-note |
| Billing Overall | billing API (`billsTable`) | revenue / cash-flow over the bills list |

## Clinical *(new)*

| Report | Endpoint | Columns |
|---|---|---|
| Appointment Analytics | `operational/appointment-analytics` | **General:** per-appointment row (appt id, patient id/name, age, gender, contact, city, state, date, type, case type, status, doctor). **Overall:** per-doctor status matrix (doctor, status, booked, walk-in, total). |
| Prescription Analytics | `operational/prescription-analytics` | Sr, Brand, Generic, Company, Total doses, Prescriptions. OPD only (`tmr_case_type='CM'`), dose sum from `tbl_medicine_report`. |
| Medicine Analytics | `operational/medicine-analytics` | Sr, Brand, Company, Generic, Count, Patients. Prescribed-medicine counts by clinic. |

## Reference *(new)*

| Report | Endpoint | Columns |
|---|---|---|
| Referred by Patients | `operational/referred-by-patients` | No, Patient Name, Patient Id, Phone, Referred Cases, First Referred (`patient_master_logs.other_ref=1`) |
| Referred by Others | `operational/referred-by-others` | No, Name, Email, Phone, Referred Cases, Created On (`reference_master` + log counts) |

Verified live (reference tenant): appointment-analytics 5,582 rows / per-doctor
matrix 31 rows; prescription 328; medicine 328; referred-by-others 6;
referred-by-patients 0 (genuinely no patient-to-patient referrals).

## Design notes

- **Download CTA fixed:** the in-card button was a faint ghost-primary visible
  only on hover; it is now a solid, always-visible secondary button
  (`.analytics-report-dl`) that inverts to filled on hover.
- **Per-chart raw export:** every chart/table on every module page already
  carries a download (↓) that exports its underlying patient rows
  (`patientData`) to CSV/Excel — the raw-data export at the chart level.
- **`reportType`** flows through the generic query serializer, so the
  Appointment-analytics Overall matrix and the Collection report types switch
  server-side.

## Planned enhancements (next increment)

The legacy PHP exposes richer per-report filter forms. The current modal carries
report-type + date range + the page's doctor scope; still to add as a
config-driven form: **issued-by**, **payment-mode**, **account**,
**department**, **incentive-user**, **medicine** multi-selects, the
**hospital/doctor** multi-selects inside the modal, the **include-clinical-data**
toggle on Appointment Analytics (appends 16 clinical columns), and the
**Collection Detailed / Day-Wise** richer column layouts. Each is a known
filter → existing-block or a thin new SELECT (mapped in the build spec).
