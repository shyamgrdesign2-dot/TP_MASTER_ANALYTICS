-- ============================================================================
-- TatvaCare Analytics — Pre-Build Profiling Pack (PB-1 … PB-5)
-- ============================================================================
-- Purpose : Resolve the data unknowns that gate Spec-Card finalization.
-- Grounded: Column names verified against data_dictionary.json (2026-05-17).
-- Run on  : READ REPLICA, read-only user. All queries are read-only + bounded.
-- How     : Replace :BIZ with a real hm_business_id; run the multi-tenant
--           variants where present to confirm values are consistent across sites.
-- Output  : Feed results into the semantic registry (status_map, tenant rules,
--           discharge-date source, money semantics).
-- ============================================================================


-- ============================================================================
-- PB-1  APPOINTMENT VOCABULARY  → unblocks no-show, cancellation, new/follow-up
-- The business meaning lives in free-text varchars. Learn the actual value set.
-- ============================================================================

-- 1a. Distinct status values + frequency (the canonical vocabulary)
SELECT pam_status, COUNT(*) AS n
FROM tbl_appointment_master
WHERE pam_del = 0
  AND pam_app_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
GROUP BY pam_status
ORDER BY n DESC;

-- 1b. Case type vocabulary (new / follow-up / urgent ...)
SELECT pam_case_type, COUNT(*) AS n
FROM tbl_appointment_master
WHERE pam_del = 0
  AND pam_app_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
GROUP BY pam_case_type
ORDER BY n DESC;

-- 1c. Appointment type vocabulary (in-person / tele / ...)
SELECT pam_appointment_type, COUNT(*) AS n
FROM tbl_appointment_master
WHERE pam_del = 0
GROUP BY pam_appointment_type
ORDER BY n DESC;

-- 1d. Numeric status code vs string status — is one derivable from the other?
SELECT pam_status_type_appointment, pam_status, COUNT(*) AS n
FROM tbl_appointment_master
WHERE pam_del = 0
GROUP BY pam_status_type_appointment, pam_status
ORDER BY pam_status_type_appointment, n DESC;

-- 1e. Do the same status strings appear across tenants? (consistency check)
SELECT hm_business_id, pam_status, COUNT(*) AS n
FROM tbl_appointment_master
WHERE pam_del = 0
  AND pam_app_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
GROUP BY hm_business_id, pam_status
ORDER BY hm_business_id, n DESC
LIMIT 500;


-- ============================================================================
-- PB-2  TENANT-RESOLUTION MAP  → unblocks scoping for hm_id / ward-keyed tables
-- Build the authoritative hm_id <-> hm_business_id mapping.
-- ============================================================================

-- 2a. The master mapping (one row per clinic)
SELECT hm_id, hm_business_id, hm_name
FROM tbl_hospital_master
WHERE hm_del = 0
ORDER BY hm_business_id, hm_id;

-- 2b. Is hm_id -> hm_business_id strictly many-to-one? (must be, for safe scoping)
SELECT hm_id, COUNT(DISTINCT hm_business_id) AS distinct_biz
FROM tbl_hospital_master
WHERE hm_del = 0
GROUP BY hm_id
HAVING distinct_biz > 1;          -- expect ZERO rows; any row = ambiguous mapping

-- 2c. Patient table is keyed by hm_id only — confirm every patient's hm_id maps
SELECT COUNT(*) AS patients_with_unmapped_hm_id
FROM tbl_patient_master p
LEFT JOIN tbl_hospital_master h ON h.hm_id = p.hm_id AND h.hm_del = 0
WHERE p.pm_del = 0 AND h.hm_id IS NULL;   -- expect 0; >0 = orphan patients

-- 2d. Confirm ward tables' renamed tenant column carries the same value space
SELECT 'ward_room' AS src, COUNT(DISTINCT twrm_business_id) AS distinct_biz
FROM tbl_ward_room_management WHERE twrm_del = 0
UNION ALL
SELECT 'ward', COUNT(DISTINCT twm_business_id)
FROM tbl_ward_management WHERE twm_del = 0;


-- ============================================================================
-- PB-3  DISCHARGE DATE SOURCE  → unblocks ALOS, turnover, bed-day occupancy
-- tapm_discharge is a FLAG (int), not a date. Recover the discharge timestamp
-- from the ADT event log (preferred) or the discharge-summary timestamp.
-- ============================================================================

-- 3a. ADT log transfer-type vocabulary — which value means "discharge"?
SELECT tal_transfer_type, COUNT(*) AS n
FROM tbl_atd_logs
GROUP BY tal_transfer_type
ORDER BY n DESC;

-- 3b. Coverage: of discharged admissions, how many have a discharge event in the log?
--     (replace 'DISCHARGE' with the real value found in 3a)
SELECT
  COUNT(*)                                          AS discharged_admissions,
  SUM(l.tapm_id IS NOT NULL)                        AS with_adt_discharge_event,
  ROUND(100*SUM(l.tapm_id IS NOT NULL)/COUNT(*),1)  AS pct_covered
FROM tbl_atd_patient_master a
LEFT JOIN (
    SELECT DISTINCT tapm_id
    FROM tbl_atd_logs
    WHERE tal_transfer_type LIKE '%discharge%'       -- adjust to 3a result
) l ON l.tapm_id = a.tapm_id
WHERE a.tapm_delete = 0 AND a.tapm_discharge = 1;

-- 3c. Candidate ALOS using ADT-log discharge date (sanity: distribution, no negatives)
SELECT
  ROUND(AVG(DATEDIFF(d.discharge_dt, a.tapm_admitting_date)),2) AS alos_days,
  MIN(DATEDIFF(d.discharge_dt, a.tapm_admitting_date))          AS min_days,
  MAX(DATEDIFF(d.discharge_dt, a.tapm_admitting_date))          AS max_days,
  SUM(DATEDIFF(d.discharge_dt, a.tapm_admitting_date) < 0)      AS negative_los_rows  -- expect 0
FROM tbl_atd_patient_master a
JOIN (
    SELECT tapm_id, MAX(tal_create_date) AS discharge_dt
    FROM tbl_atd_logs
    WHERE tal_transfer_type LIKE '%discharge%'        -- adjust to 3a result
    GROUP BY tapm_id
) d ON d.tapm_id = a.tapm_id
WHERE a.tapm_delete = 0 AND a.tapm_discharge = 1
  AND a.tapm_admitting_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY);

-- 3d. Backup source — discharge-summary creation timestamp coverage
SELECT
  COUNT(DISTINCT a.tapm_id) AS discharged,
  COUNT(DISTINCT s.ip_id)   AS with_dis_summary
FROM tbl_atd_patient_master a
LEFT JOIN tbl_inpatient_dis_summary s
       ON s.pm_pid = a.pm_pid AND s.tids_del = 0
WHERE a.tapm_delete = 0 AND a.tapm_discharge = 1;


-- ============================================================================
-- PB-4  BED CENSUS FEASIBILITY  → unblocks point-in-time + historical occupancy
-- Beds exist; confirm active-bed counts and current occupancy are derivable.
-- ============================================================================

-- 4a. Active bed inventory per clinic (denominator for occupancy)
SELECT twrm_business_id AS hm_business_id, COUNT(*) AS active_beds
FROM tbl_ward_room_management
WHERE twrm_del = 0 AND twrm_status NOT IN ('inactive','blocked')  -- adjust per 4b
GROUP BY twrm_business_id
ORDER BY active_beds DESC;

-- 4b. Bed status vocabulary (learn the real status values)
SELECT twrm_status, COUNT(*) AS n
FROM tbl_ward_room_management
WHERE twrm_del = 0
GROUP BY twrm_status
ORDER BY n DESC;

-- 4c. Currently-occupied beds = admissions not yet discharged, with a bed assigned
SELECT COUNT(*) AS occupied_now
FROM tbl_atd_patient_master
WHERE tapm_delete = 0 AND tapm_discharge = 0 AND twrm_id IS NOT NULL AND twrm_id > 0;
-- NOTE: historical bed-day occupancy still needs a nightly fact_ipd_census_daily
--       snapshot (no time-series bed-state log exists). This query is the seed
--       for that snapshot job (run nightly, store occupied_now / active_beds).


-- ============================================================================
-- PB-5  MONEY SEMANTICS  → define "revenue" vs "collection" ONCE (with Finance)
-- Confirm what *_grand_total includes, and the refund linkage.
-- ============================================================================

-- 5a. OPD billing: is grand_total gross or net of discount/tax? (inspect components)
SELECT
  tbrsm_total_gross, tbrsm_total_discount, tbrsm_total_net_tax_amt,
  tbrsm_sub_total, tbrsm_grand_total,
  (tbrsm_sub_total - tbrsm_total_discount + tbrsm_total_net_tax_amt) AS recomputed
FROM tbl_bill_retail_sale_master
WHERE tbrsm_status NOT IN ('cancelled')
ORDER BY tbrsm_id DESC
LIMIT 50;   -- compare grand_total vs recomputed to learn the formula

-- 5b. Payment-status & payment-option vocabulary (for collection-efficiency + mix)
SELECT tbrsm_payment_status, payment_option, COUNT(*) AS n,
       SUM(tbrsm_grand_total) AS total_amt
FROM tbl_bill_retail_sale_master
GROUP BY tbrsm_payment_status, payment_option
ORDER BY n DESC;

-- 5c. Refund magnitude vs billing (so "net collection" nets refunds correctly)
SELECT
  (SELECT SUM(tobo_invoice_grand_total) FROM tbl_opd_billing_overview
     WHERE tobo_delete = 0
       AND tobo_invoice_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) AS opd_billed_90d,
  (SELECT COUNT(*) FROM tbl_opd_billing_refund_master)                 AS opd_refund_rows,
  (SELECT COUNT(*) FROM tbl_bill_refund_master)                        AS ipd_refund_rows;

-- 5d. Receipts (actual cash collected) vs invoiced — the collection-efficiency gap
SELECT
  DATE_FORMAT(rm_date,'%Y-%m')      AS month,
  bill_type,
  payment_option,
  SUM(rm_given_amount)              AS collected,
  SUM(rm_pending_amount)            AS still_pending
FROM tbl_receipt_master
WHERE rm_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
GROUP BY month, bill_type, payment_option
ORDER BY month DESC, collected DESC;

-- ============================================================================
-- END. Each block's output finalizes one part of the semantic registry:
--   PB-1 -> status_map           PB-2 -> tenant-resolution rules
--   PB-3 -> discharge-date source (enables ALOS Spec Card)
--   PB-4 -> occupancy denominator + census-snapshot seed
--   PB-5 -> revenue/collection definitions (Finance sign-off)
-- ============================================================================
