# Billing

## What this page is
The single money destination. Two bands:
1. **Headline band** sourced from the production billing APIs (the same source as the OPD Billing screen), so every figure reconciles with the EMR exactly, for every tenant, including hospitals on the new billing service whose data never reaches the analytics replica.
2. **Analytical depth band** from the read-only analytics service, adding what the billing screen does not have (per-doctor, discounts, services, audit/leakage tables).

## Headline KPI cards (billing APIs)
Bills family: **Total billed** (gross bills raised), **Total collected** (money received), **Total bill due** (outstanding, bill count in tooltip), **Total bill refunded**.
Advance-wallet family: **Total advance received** (deposits; "received" and "deposited" are the same event), **Total advance refunded**, **Total advance debited** (wallet money USED on bills; it can legitimately exceed "received" in a window because this window's bills consume earlier deposits; it reappears as the "Advance Deposit" slice of the payment-mode mix).
Derived: **~Avg bill value** (billed / bill count; "-" when no bills) and **~Projected billed (month)** (run-rate forecast, only for current rolling 7-92 day windows).

## Headline charts (billing APIs, work for every tenant)
Collection over time · Bill payment-mode mix (an "Advance Deposit" slice = bills paid from the wallet, already counted under Advance received) · Bill refunds by mode · Unpaid bills by age (how long ago unpaid bills were raised) · Advance payment-mode mix · Advance refunds by mode · Bills table (most-recent page; KPIs cover the full period).

## Depth band (analytics service)
- **Revenue by doctor**: who generates the revenue (incentive/coaching basis).
- **Revenue by stream**: OPD vs IPD vs Pathology.
- **Discount by doctor**: line discounts (converted to rupees) plus the bill-level extra discount, merged per doctor. Margin-erosion watch.
- **Top services by count and by revenue**: what drives footfall vs what drives money.
- **Bills built by role**: Doctor vs Front-office/Admin vs Other staff (by the creating login's role; no doctor-vs-KEA column exists anywhere, KEA writes no billing rows).
- **Advance deposits by mode and by doctor**.
- **Bills edited after issue** and **Cancelled/deleted by actor**: the leakage-review surface.
- **Advance wallet alerts**: patients refunded more than they deposited (data-entry reconciliation list).
- **Billing register by account**: the dimension the legacy Form-3C report partitions by.

## The honesty conventions
- Bill-level depth figures run over **debit documents only** (invoice + cash memo); the overview table also stores receipts, advances, refunds and credit notes as rows, and mixing them inflates billed and fabricates dues.
- Refund money is the given-amount column (the total column is always 0). Advance-wallet refunds are the refund rows whose advance id starts ADRCPT.
- Not buildable from this data, stated rather than faked: advance debited (billing-service store only, the headline card carries it from the API), the Form-3C added/not-added flag, predefined-vs-manual line discount provenance, and per-bill edit counts (only the last edit is stored).
