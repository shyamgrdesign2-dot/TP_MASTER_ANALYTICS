# Procedures

## What this page is

OPD procedures and minor surgeries recorded on prescriptions (the Rx "Surgeries/Procedures" box): what is performed, how often, by which doctor, and a per-procedure register.

## Status: SAMPLE DATA (microservice-blocked)

This page currently renders deterministic, clearly-labelled sample data. The source records live in the pm-patient-docs microservice, which is not connected to analytics yet. The page is fully designed so it is visible and testable; it switches to live data automatically once the bulk feed lands. Every response carries a banner note saying exactly this.

Why blocked: pm-patient-docs only exposes a per-patient lookup (`/api/v1/surgeries`), so analytics cannot aggregate across a hospital and date range. The analytics replica has only a tiny INPATIENT procedure table (`tbl_inpatient_doctor_procedure`), which is the wrong population for this OPD page (a separate replica-backed builder exists for it).

## Metrics (as designed, sample values today)

- **Top procedure**: the most performed procedure this period.
- **Procedures performed**: total procedures recorded on prescriptions.
- **Distinct procedures**: unique procedure names.
- **Patients with a procedure**: distinct patients who underwent at least one.

## Charts and tables (as designed)

- **Top procedures** (bar), **Procedures over time** (line), **Procedures by doctor** (bar), **Procedure register** (table, download: date, patient, procedure, doctor, notes).

## Honest caveats

- Every number on this page is illustrative until the pm-patient-docs feed ships; sample rows are prefixed "Sample:".
- Procedure names will be doctor-typed free text once live, so name variants will count separately (same caveat as Symptoms and Lab Tests).
