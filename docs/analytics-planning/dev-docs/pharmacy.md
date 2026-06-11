# Pharmacy

## What this page is

The full pharmacy-counter picture from the standalone pharmacy module's own tables (the `tbl_pha_*` family): sales and returns, purchases and suppliers, stock and expiry, plus the legacy counter-retail services band. Audience: pharmacy in-charge (returns, stock, expiry, reorder) and hospital admin (net sales, GST, purchases). A correction shipped with this page: the earlier view read `tbl_bill_retail_sale_*`, which are SERVICE bills (X-ray, bed), not medicines; that data now sits honestly at the bottom as "Counter retail (services)".

## Key metrics (12 cards, fixed order)

- **Net pharmacy sales** (hero): gross sale invoices minus sale returns: `SUM(tpsi_grand_total) - SUM(tpsr_grand_total)`. The true counter revenue.
- **Gross sales**: `SUM(tpsi_grand_total)`. Top line before refunds.
- **Sale returns**: `SUM(tpsr_grand_total)` (document count in the tooltip). Refund leakage, lower is better.
- **Bills**: sale-invoice count. Volume signal.
- **~Avg bill value**: `AVG(tpsi_grand_total)`. Basket size (approximate, a mean).
- **~Items / bill**: medicine LINES per bill (line rows over distinct invoices, not unit counts: unit sums are polluted by junk quantities). Cross-sell depth.
- **GST collected (net)**: `SUM(tpsi_gst_total + tpsi_sgst_total) - SUM(tpsr_gst_total + tpsr_sgst_total)`. GST filing input.
- **Discount given**: `SUM(tpsi_dis_total)`. Discounting discipline.
- **~Unique buyers**: distinct registered patients (`patient_unique_id > 0`). Approximate by design: walk-in sales carry no patient record, so the true number is higher.
- **Outstanding on bills**: `SUM(tpsi_pending_balance)`. Credit extended at the counter.
- **Purchases (PI)**: `SUM(tppi_grand_total)`. Procurement spend, read against net sales for cash flow.
- **~Projected sales (month)**: net-sales run-rate times days in the current month; only shown for a current rolling 7 to 92 day window ending today, otherwise the card shows "—".

## Charts and tables

- **Sales & returns over time** (line): refund spikes stand out against the sales line.
- **Payment-mode mix** (donut): the pharmacy module's own fixed payment domain (Bank Credit Cards, Online Bank Transfers, Bank Transfers, Mobile Payments, E-wallet, Cash Payment, UPI), all listed zero-filled, plus Other only when present.
- **Top medicines by revenue** (bar) · **Manufacturer mix** (donut) · **Top molecules** (bar): sold lines joined to company and generic masters (both verified fully joinable).
- **One-time vs repeat buyers** (donut): registered patients only, same walk-in caveat.
- **Sales by weekday** (bar): all 7 days, zero-filled.
- **Purchases over time** (line) · **Top suppliers** (table): LEFT JOIN keeps purchases from since-deleted suppliers, shown as "(deleted supplier)".
- **Stock snapshot** and **Stock by expiry window**: point-in-time as of today, the date filter does NOT apply; valuation at MRP (complete) and at purchase cost (only where recorded). Five expiry buckets always shown (Expired / 30 / 60 / 90 / beyond).
- **Batch register**: every in-stock batch, first-expiry-first-out: the dispensing or return-to-supplier worklist.
- **Documents over time**: SI / SR / PI / PR counts per bucket on one chart.
- **Counter retail (services)**: the old "pharmacy" numbers, clearly labelled as services, not medicines.

## Honest gaps (stated, never faked)

Schedule H/H1 mix (no schedule column exists), HSN-wise GST (HSN only on ~25% of purchase lines), doctor-attributed pharmacy revenue (invoices carry only a free-text doctor name), true margin / FIFO COGS (cost on only about a third of batches), stock value over time (no historical snapshots), supplier outstanding (amounts stored as unjoinable text).
