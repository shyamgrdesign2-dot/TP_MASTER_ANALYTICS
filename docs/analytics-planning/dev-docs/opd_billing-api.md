# Billing: backend API spec

## Three sources compose the page (FE: loadLeaf('opd_billing') -> financialWidgets('opd') in src/pages/analytics/service.js)

### 1. Production billing APIs (headline band, authoritative)
- `GET /api/v1/billing/bill/dashboard`: params startDate, endDate, page=1, limit=100 (limit=1000 returns HTTP 400), sortBy=date, sortOrder=desc, patientId:'', `doctorIds` REQUIRED (resolve from filter or JWT user_id). Returns `summary` { totalBillAmount, totalPaidAmount, dueAmount, dueCount, refundedAmount, refundedCount, count, payment/refund mode aggregates } + `bills[]` page.
- `GET /api/v1/billing/advancedDeposit/dashboard`: page, limit=100, startDate, endDate. Returns `summary` { totalAdvanceReceived, advanceReceivedCount, totalAdvanceRefunded, advanceRefundedCount, totalAdvanceDebited } + `receipts[]` (transactionType Deposit/Refund, feeds advance mode donuts; truncation honest-marked).
- FE-derived: avgBill = totalBillAmount/count; projectedBilled gated to rolling 7-92d windows ending today; collection trend + unpaid-bills aging built from the bills page.

### 2. `GET /api/v1/analytics/financial/summary` (registered composite; DASHBOARD_ENDPOINTS.opd_billing = financial/summary?careSetting=opd)
- Params: startDate, endDate, grain, doctorIds (doctor_unique_id on billing rows; b.doc filter), hospitalId (FIND_IN_SET on tobo/tibo/tpobo_hm_id), careSetting=opd|ipd|all (selects union branches).
- Source union: tbl_opd_billing_overview / tbl_ipd_billing_overview / tbl_path_opd_billing_overview, normalised to (g=grand_total, bal=balance, dt=invoice_date, mode, cancel, doc), delete=0.
- Money math (bal can be NEGATIVE when advances are held): billed=SUM(g) cancel=0; collected=SUM(g - GREATEST(bal,0)); outstanding=SUM(GREATEST(bal,0)); advances=-SUM(LEAST(bal,0)). Refund = SUM(tbrm_given_amount) tbl_opd_billing_refund_master (tbrm_total is always 0). Mode titles via tbl_biiling_payment_option (bpid->title, TRIM).
- Blocks: kpis (billed/collected/outstanding/rate/avgBill/invoices/topMode/refund/advances, with sparks + deltas), streamMix, byDoctor (JOIN tbl_user_master ON doctor_unique_id), duesAging (0-30/31-60/61-90/90+ anchored CURDATE), patientDues (per-patient union, LIMIT 100), collectionTrend, revenueTrend, paymentModeMix, summary daily ledger.
- Note: the FE currently renders the headline from source 1 instead, but this endpoint remains the self-contained composite for any consumer.

### 3. `GET /api/v1/analytics/financial/depth` (depth band)
- Params: startDate, endDate, careSetting=opd, doctorIds, hospitalId, grain. Builder financial.ts `case 'depth'`. FE drops res.paymentModeMix/duesAging/refundByMode/receiptsTrend and clears kpis (API band covers them), keeping: `byDoctor`, `streamMix`, `discountByDoctor`, `topServices`, `topServicesRevenue`, `billsByBuilder`, `advanceModeMix`, `advanceByDoctor`, `topBillEditors`, `cancelledByActor`, `negativeWallets`, `accountRegister3C`.
- Conventions (verified, reimplement exactly): debit docs only = tobo_invoice_type IN ('invoice','cash_memo'); refunds = tbrm_given_amount, tbrm_status=0; advance-wallet refunds = tbrm_advance_id_new LIKE 'ADRCPT%'; receipts = tbl_opd_billing_receipt_master (rm_status=0, date = COALESCE(NULLIF(rm_date,'1970-01-01'), DATE(rm_created_date))); advances = tbl_opd_billing_advance_master (am_status=0, am_parent NULL/0); service lines tbl_opd_billing_invoice_service JOIN invoice_master (is_status=0, im_status=0), catalogue JOIN tbl_bill_main_service ON service_id (NEVER the stale tbms_id column); discounts = line CASE per: price*qty*LEAST(pct,100)/100 else amount, plus bill-level im_rebate_type/im_rebate_amount, NEVER im_total_discount; builder role via tobo_created_by -> tbl_user_master -> tbl_user_type (ut_id 1,2,7,8 Doctor; 4 Front-office/Admin); aging anchored to :asof = endDate; account register via im_accountant -> tbl_bill_account_name. Each breakdown wrapped so one failing query degrades to an empty block, never a 500.

### Missing feeds (contracts needed)
- **Advance debited** per-window from analytics: lives only in the billing service; consumed via API (source 1).
- **Form-3C added/not-added flag**: only in the billing microservice (/billing/bill/addToForm3C store). Needed: bill-id -> isForm3C export by hospital + date range.
- **Discount provenance** (catalogue default vs manual edit) and **discount reason/approval**: no columns; product change required.
- Related result-set routes for the Reports hub: financial/realtime, collection-trend, revenue-trend, payment-mode-mix, daily-collection, 3c-report (reportType=OPD|IPD), incentives (reportType=Overall|Detailed).
