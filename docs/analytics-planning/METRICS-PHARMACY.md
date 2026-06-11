# Pharmacy analytics — metric dictionary

**Audience:** Pharmacy in-charge (operations: returns, stock, expiry, reorder)
and Hospital Admin (money: net sales, GST, purchases, supplier spend).
**Scope:** the standalone pharmacy module (the legacy PHP screen at
`/pharmacy/pharmacy.php`). It has no React API of its own — but it writes to
the same `tatva_clinic` database, so the read-only analytics service reads its
tables directly. No backend was added for this page; it is one more report on
the existing service.

```
GET /api/v1/analytics/operational/pharmacy
    ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&grain=day|week|month
    Authorization: Bearer <JWT with result.hospital_business_id>
```

Builder: `pm-analytics-service/src/analytics/builders/operational.ts`
(`case 'pharmacy'`). SELECT-only; tenant-scoped by the JWT business id.

## The data model (verified live against the schema)

The pharmacy module keeps **four document families plus batch-level stock**:

| Family | Header table | Line table |
|---|---|---|
| Sale invoice (SI) | `tbl_pha_sales_invoice` (tpsi_*) | `tbl_pha_sales_invoice_qty` (tpsiq_*) |
| Sale return (SR) | `tbl_pha_sales_return` (tpsr_*) | `tbl_pha_sales_return_qty` |
| Purchase invoice (PI) | `tbl_pha_purchase_invoice` (tppi_*) | `tbl_pha_purchase_invoice_qty` |
| Purchase return (PR) | `tbl_pha_purchase_return` (tppr_*) | `tbl_pha_purchase_return_qty` |
| Stock | `tbl_pha_medicine` (tpm_*) | `tbl_pha_medicine_batch` (tpmb_*) — **with expiry dates**; `tpm_qty = SUM(tpmb_qty)` reconciles exactly |

Catalogue dimensions: `tbl_pha_medicine_company` (manufacturer),
`tbl_pha_medicine_generic` (molecule), `tbl_supplier`.

> **Correction shipped with this page:** the earlier pharmacy view read
> `tbl_bill_retail_sale_*` — those are **service** bills (X-ray, bed,
> checkups), not medicines. That data now appears honestly at the bottom as
> "Counter retail (services)"; everything above it is real medicine data.

**Data-hygiene guards baked into every query:** per-family soft-delete flags;
dates ≥ 2000-01-01 (epoch junk); purchase-return dates clamped to today (demo
rows dated 2027/2030); stock aggregates require `tpmb_qty > 0` (demo contains
million-unit junk batches that would otherwise corrupt valuations).

---

## A. Key metrics (12 cards, fixed order, always present)

| Card | What / why | Formula · source |
|---|---|---|
| **Net pharmacy sales** (hero) | The true counter revenue — gross sales minus refunds. | `SUM(tpsi_grand_total) − SUM(tpsr_grand_total)` |
| **Gross sales** | Top-line before returns. | `SUM(tpsi_grand_total)` |
| **Sale returns** | Refund leakage (count in tooltip). Lower is better. | `SUM(tpsr_grand_total)` |
| **Bills** | Sale invoices raised — volume signal. | `COUNT(*)` on SI |
| **~ Avg bill value** | Basket value (approximate — a mean). | `AVG(tpsi_grand_total)` |
| **~ Items / bill** | Cross-sell depth — average medicine LINES per bill (line count, not units: unit sums are polluted by junk quantities). | line rows ÷ distinct invoices |
| **GST collected (net)** | GST filing input: CGST+SGST charged minus GST credited on returns. | `SUM(tpsi_gst_total + tpsi_sgst_total) − SUM(tpsr_gst_total + tpsr_sgst_total)` |
| **Discount given** | Counter discounting discipline. | `SUM(tpsi_dis_total)` |
| **~ Unique buyers** | Distinct registered patients who bought. **Approximate by design** — walk-in counter sales carry no patient record (~quarter of bills), so the real number is higher; the tooltip says so. | `COUNT(DISTINCT patient_unique_id > 0)` |
| **Outstanding on bills** | Credit extended at the counter. | `SUM(tpsi_pending_balance)` |
| **Purchases (PI)** | Procurement spend (invoice count in tooltip) — read against net sales for cash flow. | `SUM(tppi_grand_total)` |
| **~ Projected sales (month)** | Net-sales run-rate × days in current month. Gated exactly like every other page: only for a current rolling 7–92-day window; otherwise the card stays in place showing "—". | derived |

## B. Sales (charts)

- **Sales & returns over time** (`salesTrend`, line) — gross vs returned value
  per bucket; refund spikes stand out against the sales line.
- **Payment-mode mix** (`pharmaPayMix`, donut) — the pharmacy module's own
  payment-option domain (Bank Credit Cards / Online Bank Transfers / Bank
  Transfers / Mobile Payments / E-wallet / Cash Payment / UPI), **all listed,
  zero-filled**, + 'Other' only when present.
- **Top medicines (by revenue)** (`pharmaTopItems`, bar) — grouped by medicine
  id (display name), restock/negotiation priorities.
- **Manufacturer mix** (`pharmaMakerMix`, donut) · **Top molecules**
  (`pharmaGenericMix`, bar) — revenue by company and by active ingredient
  (both verified 100% joinable from sold lines).
- **One-time vs repeat buyers** (`pharmaBuyerMix`, donut, both rows always
  shown) — registered patients only (same walk-in caveat as the KPI).
- **Sales by weekday** (`pharmaWeekday`, bar) — all 7 days, zero-filled.

## C. Purchases & suppliers

- **Purchases over time** (`purchaseTrend`, line) — `SUM(tppi_grand_total)` per
  bucket. (Demo note: one ₹99,999,999 test invoice makes Feb-2024 spike — that
  is the data, not a bug.)
- **Top suppliers** (`topSuppliers`, table) — purchase value + invoice count
  per supplier; LEFT JOIN so historical purchases from since-deleted suppliers
  still count (shown as "(deleted supplier)").
- **Documents over time** (`docVolume`, 4-series line) — SI / SR / PI / PR
  counts per bucket: the legacy pharmacy dashboard's activity view, on one chart.
- Purchase-return value rides in `meta` when present (demo PRs contain
  duplicate full-value returns, so a return-rate KPI would mislead — deferred).

## D. Stock & expiry  *(point-in-time — "as of today"; the date filter does not apply)*

- **Stock snapshot** (`stockSnapshot`, table) — stock value **at MRP**
  (complete) and at purchase cost (only batches with a recorded cost — partial
  by nature and labelled so), expired-stock value, expired-batch count.
- **Stock by expiry window** (`expiryBuckets`, bar) — Expired / ≤30 / 31–60 /
  61–90 days / beyond, **all five buckets always shown** — an empty bucket is
  a good sign, not missing data. Units + MRP value per bucket.
- **Batch register** (`batchRegister`, table) — every in-stock batch in
  first-expiry-first-out order with days-left and value: the dispensing /
  return-to-supplier worklist.

## E. Counter retail (services)  *(bottom band)*

The old "pharmacy" numbers: service items billed at the retail counter
(checkups, X-ray, bed charges) via `tbl_bill_reatil_sale_service` joined to the
service catalogue on `service_id`. Kept for continuity, clearly labelled as
services — **not medicines**.

## Not buildable from this data (stated, not faked)

- **Schedule H/H1 mix** — no schedule column exists anywhere in the schema.
- **HSN-wise GST summary** — HSN exists only on purchase lines (≈25% filled,
  junk values); joining to sales fans out rows.
- **Doctor-attributed pharmacy revenue** — sale invoices carry only a free-text
  doctor name (~half filled, no id).
- **True margin / FIFO COGS** — purchase cost is recorded on only ~⅓ of
  batches; a margin number would mislead. Revisit when cost capture improves.
- **Stock value over time / days-of-stock** — no historical stock snapshots
  exist; only the current position is knowable.
- **Supplier outstanding** — the supplier-account table stores amounts as text
  with unjoinable references; deferred until the schema hardens.

## Notes on integrity

- Read-only service; SELECT only; resilient (a failing breakdown degrades to an
  empty card, never a broken page).
- Demo-tenant distortions (₹99,999,999 test documents, million-unit batches)
  are **excluded only where they are impossible** (negative stock) and
  otherwise shown as-is — charts spike because the data spikes.
