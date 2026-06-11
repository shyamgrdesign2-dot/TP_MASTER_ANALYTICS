# Certificates (Care)

## What this page is

Medical-certificate issuance for the clinic: how many certificates were issued, of what type, by which doctor, and whether they came from system templates or the clinic's own custom templates. Useful for admins (workload, template adoption) and for audit (who certified whom, when). Live data, verified against the reference tenant (194 issued, top type Medical Fitness, top doctor Dr Sheela BR).

## Key metrics

- **Certificates issued**: count of certificates issued to patients in the period. Source: `tbl_certificate_upgrade` rows (`tcu_del = 0`, dated by `tcu_created_date`). Why: the headline volume.
- **Most-issued type**: the top certificate type with its count. Type is canonicalised: the linked template title where available, else the saved snapshot title, blanks bucket to "Untitled". Why: what the clinic actually certifies.
- **Top issuing doctor**: the doctor who issued the most (the **issuing** doctor, not the template author). Why: workload attribution.
- **Patients certified**: distinct patients who received a certificate (`COUNT(DISTINCT patient_unique_id)`). Why: reach, vs repeat issuance.
- **Custom templates**: templates this clinic built itself (`tbl_certificate_document.pms_default = 0` for this business), shown against the count of system templates (`pms_default = 1`, global). Why: template-library adoption.

## Charts and tables

- **Certificate types** (donut, top 12): issued certificates by canonical type.
- **Certificates over time** (line, per selected grain): issuance trend.
- **Certificates by doctor** (bar, top 15): issuing doctor ranking.
- **Certificate register** (table, latest 200): date, type, patient, issuing doctor, and template source (System template / Custom template / Ad-hoc when no template is linked).

## Caveats

- Type names come from titles, not a coded taxonomy: renamed templates change historical labels via the join; blank titles show as Untitled.
- The doctor dimension joins on `tbl_user_master.doctor_unique_id` (a string token, NOT `um_id`); unmatched tokens display as "Unknown".
