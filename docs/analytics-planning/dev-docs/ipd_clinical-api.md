# IPD Clinical Activity: backend API spec

## Endpoint conventions
- Base GET /api/v1/analytics/ipd/{report}; Bearer JWT (tenant from token); params startDate, endDate, grain=day|week|month, doctorIds (any um-id column), hospitalId.
- Builder: pm-analytics-service/src/analytics/builders/ipd.ts (buildIpdReport dispatcher).
- Source: legacy replica tables (tbl_atd_patient_master, tbl_ward_management/tbl_ward_room_management, tbl_atd_logs, tbl_inpatient_*). Modern pm-ipd microservice tenants need the export feed (MASTER-API.md Part 2 item 9).
- Key facts: cross-table admission key is the STRING in_pid (never tapm_id); no discharge-date column exists, precedence = redy_to_discharge log -> dis-summary created date -> modify date; beds = tbl_ward_room_management rows with room_type='bed', twrm_status=1 active; a 'bed occupied' = an active admission's twrm_id.

## Response (ipd/clinical)
- kpis: assessmentCoverage (%), progressPerDay (~, nurse notes / patient-days), consultantPerDay (~), otNoteCoverage (%), labResults (count), crossReferrals ('-', microservice gap incl. medical-records uploads in pm-patient-docs).
- Also: noteInterval KPI (~hrs between consecutive nurse notes; note charting time = tinn_date + tinn_time, NOT created_date); noteIntervalByDept {k, progress, consultant} avg gap hours per department.
- Blocks: notesByType (8 fixed rows, product labels); docFunnel (5 fixed rows: Admissions, With admission assessment, With progress notes, With consultant notes, With discharge summary; independent coverages, not a strict subset chain); notesByStayDay (Day 1..7, Day 8+, zero-filled, DATEDIFF(note, admit)+1); topAdmitDx; topDischargeDx; otByDoctor; anaesthesiaMix; summaryCompletion; otRegister.
- Mapping: assessment = tbl_inpatient_admit_notes; progress = tbl_inpatient_nurse_notes; consultant = tbl_inpatient_doctor_notes; OT note = tbl_inpatient_doctor_procedure via tpos_id; labs = tbl_inpatient_lab_parameter/lab_val (in_pid, tilv_delete) + radiology. Patient-days = in-period days between admit and discharge/now per admission.
