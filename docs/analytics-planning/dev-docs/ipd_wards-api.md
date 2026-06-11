# IPD Wards & Beds: backend API spec

## Endpoint conventions
- Base GET /api/v1/analytics/ipd/{report}; Bearer JWT (tenant from token); params startDate, endDate, grain=day|week|month, doctorIds (any um-id column), hospitalId.
- Builder: pm-analytics-service/src/analytics/builders/ipd.ts (buildIpdReport dispatcher).
- Source: legacy replica tables (tbl_atd_patient_master, tbl_ward_management/tbl_ward_room_management, tbl_atd_logs, tbl_inpatient_*). Modern pm-ipd microservice tenants need the export feed (MASTER-API.md Part 2 item 9).
- Key facts: cross-table admission key is the STRING in_pid (never tapm_id); no discharge-date column exists, precedence = redy_to_discharge log -> dis-summary created date -> modify date; beds = tbl_ward_room_management rows with room_type='bed', twrm_status=1 active; a 'bed occupied' = an active admission's twrm_id.

## Response (ipd/wards)
- kpis: bedsTotal, bedsOccupied, bedsAvailable, bedsBlocked, occupancyPct, roomShifts, bedTurnover.
- Blocks: wardFlow / deptFlow {k, admitted, discharged}; alosByDept; wardTransfers {k, transfersIn, transfersOut} (tal_transfer_type=ward, in by tal_new_twm_id, out by tal_old_twm_id); bedsByWard {k, occupied, available, blocked} (stacked); occupancyTrend; alosByWard; transfersRegister (tbl_atd_logs old/new pairs: tal_old_/tal_new_ dp_id, twm_id, twrm_id, admitting_doctor); expectedDischarges {k,count} and projectedOccupancy {k,occupied} (7-day heuristics documented in the builder).
- Capacity rule: bedsTotal = active (twrm_status=1) + blocked (twrm_block=1); status-0 unblocked rows are decommissioned.
