# IPD Overview: backend API spec

## Endpoint conventions
- Base GET /api/v1/analytics/ipd/{report}; Bearer JWT (tenant from token); params startDate, endDate, grain=day|week|month, doctorIds (any um-id column), hospitalId.
- Builder: pm-analytics-service/src/analytics/builders/ipd.ts (buildIpdReport dispatcher).
- Source: legacy replica tables (tbl_atd_patient_master, tbl_ward_management/tbl_ward_room_management, tbl_atd_logs, tbl_inpatient_*). Modern pm-ipd microservice tenants need the export feed (MASTER-API.md Part 2 item 9).
- Key facts: cross-table admission key is the STRING in_pid (never tapm_id); no discharge-date column exists, precedence = redy_to_discharge log -> dis-summary created date -> modify date; beds = tbl_ward_room_management rows with room_type='bed', twrm_status=1 active; a 'bed occupied' = an active admission's twrm_id.

## Response (ipd/summary)
- kpis: census, admitted, discharged, inQueue, avgLos, occupancy (%).
- Blocks: ipdFlowTrend {k, admitted, discharged}; censusTrend {k, count} (census computed in JS from the admission set per bucket); wardOccupancy {k, occupied, available}; dischargeTypeMix {k, count} (tbl_inpatient_discharge_type: Medical, DAMA, Transfer Out, Death).
- meta {live, rowCount, note}.
