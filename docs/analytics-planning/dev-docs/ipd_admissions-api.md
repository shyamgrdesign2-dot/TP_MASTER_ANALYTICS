# IPD Admissions & Discharges: backend API spec

## Endpoint conventions
- Base GET /api/v1/analytics/ipd/{report}; Bearer JWT (tenant from token); params startDate, endDate, grain=day|week|month, doctorIds (any um-id column), hospitalId.
- Builder: pm-analytics-service/src/analytics/builders/ipd.ts (buildIpdReport dispatcher).
- Source: legacy replica tables (tbl_atd_patient_master, tbl_ward_management/tbl_ward_room_management, tbl_atd_logs, tbl_inpatient_*). Modern pm-ipd microservice tenants need the export feed (MASTER-API.md Part 2 item 9).
- Key facts: cross-table admission key is the STRING in_pid (never tapm_id); no discharge-date column exists, precedence = redy_to_discharge log -> dis-summary created date -> modify date; beds = tbl_ward_room_management rows with room_type='bed', twrm_status=1 active; a 'bed occupied' = an active admission's twrm_id.

## Response (ipd/admissions)
- kpis: admissions, discharges, readmissions, mlcCases, avgLos, queueSize, queueTime (~hrs under 72h else ~days), longestStay.
- Blocks: admitTrend; byDepartment (tbl_department join on dp_id only, no business id on that master); byWard; byAdmittingDoctor; categoryMix; dischargeTypeMix; losDistribution (fixed buckets); admissionRegister; dischargeRegister; queueRegister; losRegister.
- Queue semantics (legacy): a redy_to_discharge row in tbl_atd_logs with tapm_discharge=0; queueTime = first queue log -> discharge timestamp. Modern equivalent: sentForApproval=true && isDischarged=false in pm-ipd.
