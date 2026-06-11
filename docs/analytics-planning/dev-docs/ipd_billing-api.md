# IPD Billing: backend API spec

## Backend notes (IPD Billing)
- NO analytics endpoint: FE-orchestrated like OPD Billing. Loader financialWidgets("ipd") in src/pages/analytics/service.js -> fetchBillingDashboard(params, "ipd") (billing service POST {billing}/api/v1/billing/ipd-bill/dashboard) + shared GET /advancedDeposit/dashboard.
- Replica twin: tbl_ipd_billing_overview (tibo_), debit-doc convention confirmed: grand totals stored positive for ALL types; direction encoded by type + balance sign (invoice -> +balance receivable; advance/receipt/credit_note -> negative balance; refund -> positive balance). ANY dues computation must filter tibo_invoice_type IN ('invoice','cash_memo') or refunds masquerade as receivables (this guard is now in financial.ts patientDues).
- financial/summary?careSetting=ipd serves the dues register; financial/depth?careSetting=ipd is the planned extension (by-doctor revenue, discounts) pending verification of the IPD twin detail tables.
