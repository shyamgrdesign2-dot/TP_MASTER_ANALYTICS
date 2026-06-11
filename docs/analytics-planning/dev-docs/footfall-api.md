# Appointments: backend API spec

## Endpoint
`GET /api/v1/analytics/operational/footfall`
- Params: `startDate`, `endDate`, `grain=day|week|month` (FE auto: day <=10d, week <=92d, else month), `doctorIds` (um_id, repeatable), `hospitalId` (hm_id CSV, FIND_IN_SET). Bearer JWT, tenant = result.hospital_business_id.
- Builder: pm-analytics-service/src/analytics/builders/footfall.ts (buildFootfallDashboard). Routed via operational/:report in analytics.controller.ts. FE: DASHBOARD_ENDPOINTS.footfall = "operational/footfall".
- Base scope W: tbl_appointment_master a, pam_del=0, hm_business_id=:biz, pam_app_date in window AND >= '2000-01-01' (junk-date guard), + doctor/hospital filters. Joins: tbl_patient_master p (patient_unique_id), tbl_user_master u (um_id), tbl_opd_case_type t (toct_id), tbl_department d (dp_id), tbl_appointment_source s (pam_id), tbl_medicine_report mr (pam_id, Rx linkage).

## Load-bearing constants (reimplement exactly)
- Status: 0,7=Scheduled · 6=Draft · 3=Completed · 4=Cancelled · 1,2,5=Other (only if rows exist). Canonical order 0-filled.
- Walk-in: pam_appointment_type='Walk'. Booked: <>'Walk'. Video: BOOKED rows only with pam_status_type_appointment IN (1,2). inClinic = booked - bookedVideo.
- Booking SOURCE_CASE precedence (booked rows only): tas_source='CREATE_APPOINTMENT_SCREEN' -> Doctor portal; 'KEA' -> KEA portal (do NOT use kea_appointment_sequence, undercounts ~30x); IN ('APPOINTMENT_AGENT','CHIKITSALY-PORTAL') -> Appointment agent; THEN legacy check (old_id>0 OR old_trans_appointment_id non-zero) -> Legacy (migrated), which MUST precede the creator fallback; other non-empty tas_source -> Not tracked; pam_created_by = um_id -> Doctor portal; else Not tracked. Canonical 4 channels always 0-filled.
- Cancellation rate denominator = booked only: bookedCancelled/booked. Completion rate = completed/footfall.
- Projection gate: window ends within ~2 days of today AND spans 7-92 days; projected = round((appts/days) * daysInCurrentMonth).

## Response blocks (dashboard-block: kpis[] + { columns, rows } blocks)
- `kpis[]` keys: footfall, booked, walkins, inClinic, video, avgDuration (AVG(NULLIF(pam_appointment_duration,0))), peakDay (DAYOFWEEK max), peakHour (HOUR(pam_app_time) max), avgDay, projected. Deltas vs previous equal window (comparisonWindow); sparks from the 12-bucket trend.
- Charts: `apptStatusMix`, `typeMix` (3-way visit mix), `channelMix` (in-clinic vs video over ALL visits), `bookingChannelMix`, `newVsFollowupBooking`, `bookingByVisitType` (channel x first-ever-booking split, first = MIN(pam_app_date) over booked rows all time), `bookingSourceTrend` (all channels 0-filled per bucket), `channelTrend`, `newVsReturningTrend` (first-ever-visit bucket = New, later buckets = Returning, via MIN(pam_app_date) per patient all time), `byDayOfWeek` (7 rows 0-filled), `byHour` (24 rows 0-filled), `footfallTrend` (appointments + cancelled, 12 buckets), `caseMix` (canon New/Follow-up/Urgent/Revisit/Emergency 0-filled via toct_type), `bySpecialty` (all-time catalogue via window-less scope, in-period counts, dp_name), `conversionTrend` (appts vs COUNT(DISTINCT mr.pam_id)), `newVsReturning`, `genderMix`, `ageMix` (bands <18/18-30/30-45/45-60/>60 from pm_dob).
- Tables: `doctorScorecard` (HAVING appts>=5, LIMIT 30, peer-median note), `repeatBookers` (HAVING appointments>1, LIMIT 100), `frequentCancellers` (HAVING cancellations>0, LIMIT 100), `patients` register (LIMIT 5000).
- `meta`: { live, rowCount, compareLabel, channelTrackedShare, bookingSourceNote }.

## Missing feed
- **Pending digitisation**: that EMR tab = Completed INTERSECT the SnapRx microservice's undigitised list (POST apStatue:3 + ids from /digitization/undigitizedAppointments). The set lives only in SnapRx. Needed contract: an export of undigitised appointment ids (pam_id) by hospital_business_id + date range; until then the bucket is omitted, never zero-faked.
