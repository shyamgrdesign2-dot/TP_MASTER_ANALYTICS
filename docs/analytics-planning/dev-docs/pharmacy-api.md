# Pharmacy: backend API spec

## Endpoint

- `GET /api/v1/analytics/operational/pharmacy?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&grain=day|week|month`
- Auth: Bearer JWT, tenant scope `hm_business_id = :biz` from token. `doctorIds`/`hospitalId` are NOT applied here (sale invoices carry no doctor id, only a half-filled free-text name).
- Builder: `builders/operational.ts` `case 'pharmacy'`. Dictionary: `docs/analytics-planning/METRICS-PHARMACY.md`.

## Tables (verified live)

- SI `tbl_pha_sales_invoice` (tpsi_*) + lines `tbl_pha_sales_invoice_qty` (tpsiq_*); SR `tbl_pha_sales_return` (tpsr_*); PI `tbl_pha_purchase_invoice` (tppi_*); PR `tbl_pha_purchase_return` (tppr_*).
- Catalogue: `tbl_pha_medicine` (tpm_*) joined to `tbl_pha_medicine_company` (tpmc_*) and `tbl_pha_medicine_generic` (tpmgn_*). Stock: `tbl_pha_medicine_batch` (tpmb_*, with expiry; `tpm_qty = SUM(tpmb_qty)` reconciles). Suppliers: `tbl_supplier` (ts_*).
- Sold-line base: `tpsiq` JOIN `tpsi` ON tpsi_id JOIN `tpm` ON tpm_id, business-scoped via the invoice.
- Counter retail: `tbl_bill_reatil_sale_service` (sic, misspelled in schema) LEFT JOIN `tbl_bill_main_service` ON `service_id`.

## Mandatory data-hygiene guards (reimplement exactly)

- Per-family soft deletes: `tpsi_del/tpsr_del/tppi_del/tppr_del/tpsiq_del/tpm_del/tpmb_del = 0`.
- All dates `>= '2000-01-01'` (epoch junk); PR dates additionally clamped `<= CURDATE()` (demo rows dated 2027/2030).
- Stock aggregates require `tpmb_qty > 0` (demo has negative-million-unit junk batches).
- Purchase-cost valuation only where `tpmb_single_pur_cost > 0`.

## Response blocks

- `kpis[]` (12, fixed order): `netSales`, `gross`, `returns`, `bills`, `avgBill`, `itemsPerBill`, `gst`, `discount`, `buyers`, `pending`, `purchases`, `projected` (gated: rolling 7 to 92 days ending today, else value `'—'`).
- `salesTrend` `{ k, sales, returns }` (SI and SR merged per bucket, returns zero-filled); `pharmaPayMix` `{ k, amount }` fixed label map `1..6,8`; `pharmaTopItems` `{ k, revenue }` top 15 by medicine id; `pharmaMakerMix` / `pharmaGenericMix` `{ k, revenue }` top 12; `pharmaBuyerMix` fixed 2 rows; `pharmaWeekday` all 7 days.
- `purchaseTrend` `{ k, amount, invoices }`; `topSuppliers` `{ supplier, invoices, amount }` top 15.
- `stockSnapshot` (4 metric rows + note), `expiryBuckets` (fixed 5 buckets: Expired / Within 30 days / 31-60 / 61-90 / Beyond 90, zero-filled), `batchRegister` (50 rows FEFO, `{ medicine, batch, expiry, daysLeft, units, value }`): all three are as-of-today, ignore the date filter.
- `docVolume`: per-bucket counts for 'Sale (SI)', 'Sale return (SR)', 'Purchase (PI)', 'Purchase return (PR)'.
- `counterRetail` `{ item, count, amount }` top 20 (`tbrss_status = 0`).
- `meta`: `{ live: true, rowCount, prNote? }` (purchase-return value rides in meta; a return-rate KPI was deliberately deferred: demo PRs contain duplicate full-value returns).

No missing feeds: fully served from the replica. Extension warning: do not attempt margin, HSN GST, schedule mix or doctor attribution from these tables (see the honest-gaps list); the data cannot support them today.
