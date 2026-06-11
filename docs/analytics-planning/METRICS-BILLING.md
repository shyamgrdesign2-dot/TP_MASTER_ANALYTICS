# Billing analytics — metric dictionary

**Audience:** Hospital Admin (revenue & leakage), Doctor Admin (own billing),
front desk / accountant (settlement & reconciliation).
**Scope:** OPD billing. Two bands power the page:

1. **Headline band** — the production billing API (the same source as the OPD
   Billing screen), so these figures reconcile with the EMR exactly.
2. **Analytical depth band** — the read-only analytics service over the replica,
   adding the analytics the billing screen doesn't have.

```
Headline:  GET /api/v1/billing/bill/dashboard          (production billing API)
           GET /api/v1/billing/advancedDeposit/dashboard
Depth:     GET /api/v1/analytics/financial/depth
              ?startDate&endDate&careSetting=opd&doctorIds&hospitalId&grain
              Authorization: Bearer <JWT with result.hospital_business_id>
```

Depth builder: `pm-analytics-service/src/analytics/builders/financial.ts`
(`case 'depth'`). Read-only (SELECT only).

## The conventions that make the numbers honest

- **Real bills only.** `tbl_opd_billing_overview` stores SIX document types in
  one table (invoice, cash memo, advance, receipt, refund, credit note). Every
  bill-level figure in the depth band runs over **debit documents only**
  (`tobo_invoice_type IN ('invoice','cash_memo')`). Mixing the others inflates
  "billed" with receipts and fabricates phantom dues from refund rows.
- **Refund money** is `tbrm_given_amount` (the `tbrm_total` column is always 0).
- **Advance-wallet refunds** are refund-master rows with
  `tbrm_advance_id_new LIKE 'ADRCPT%'` — the other rows there are credit notes.
- **Payment-mode names** come from `tbl_biiling_payment_option` (schema's own
  spelling), joined without a tenant filter and `TRIM`med (titles contain stray
  spaces like `' UPI'`).
- **Service names** join the catalogue on **`service_id`** — the column named
  `tbms_id` on line rows is stale and returns wrong names.
- **Discount math** never reads `im_total_discount` (it stores raw percent
  numbers for percentage lines). Line discounts convert to rupees as
  `price × qty × pct/100` (pct capped at 100); the bill-level **extra discount**
  comes from `im_rebate_type/im_rebate_amount`.

## The advance wallet: received vs refunded vs debited

A patient's advance wallet has three movements:

- **Deposit / received** — money INTO the wallet. ("Advance received" and
  "advance deposited" are the **same event** — one card, not two.)
- **Refund** — wallet money returned to the patient in cash/UPI/etc.
- **Debit** — wallet money USED to pay a bill.

**Why "debited" can exceed "received" in a period — and why that is not a bug:**
the cards are date-filtered. A bill paid this week can consume a deposit made
last month, so a window's debits are often funded by *earlier* deposits. The
balance identity holds per patient over a lifetime
(`balance = received − refunded − debited`), not inside an arbitrary window.
Genuine per-patient inversions (refunded > deposited) do exist as data-entry
issues — they surface in the **Advance wallet alerts** table rather than being
silently corrected.

---

## A. Headline band — two families (production billing APIs; works for every tenant)

> **Sourcing principle:** hospitals billing through the NEW billing service
> have **no rows in the `tatva_clinic` replica** — so every card and every
> mode/aging chart sources the billing APIs the page already fetches
> (`/billing/bill/dashboard` + `/billing/advancedDeposit/dashboard`). The
> replica serves only blocks with no API equivalent (by-doctor, discounts,
> stream split, registers), which honestly empty-state on new-service tenants.

**Bills family**

| Card | What / why | Source |
|---|---|---|
| **Total billed** | Gross value of bills raised — the revenue anchor. | `summary.totalBillAmount` |
| **Total collected** | Money actually received against bills. | `summary.totalPaidAmount` |
| **Total bill due** | Outstanding balance owed by patients (bill count in tooltip). | `summary.dueAmount` / `dueCount` |
| **Total bill refunded** | Money refunded against bills (count in tooltip). | `summary.refundedAmount` / `refundedCount` |

**Advance-wallet family**

| Card | What / why | Source |
|---|---|---|
| **Total advance received** | Deposits into patient wallets (count in tooltip). | advance API `totalAdvanceReceived` |
| **Total advance refunded** | Wallet money returned to patients. | `totalAdvanceRefunded` |
| **Total advance debited** | Wallet money USED on bills; it shows up as the **"Advance Deposit" slice of the Bill payment-mode mix** and can exceed "received" in a window (tooltip explains). | `totalAdvanceDebited` |

> The four "Top … mode" cards were curated out of the band on review — the four
> mode donuts (bill payment / bill refund / advance payment / advance refund)
> directly below carry the full mode story.

**Derived:** **~Avg bill value** (`totalBillAmount ÷ summary.count`; "—" when no
bills) · **~Projected billed (month)** (run-rate, the module-standard rolling
7–92-day gating; "—" otherwise — the card never moves).

**Charts on the API path** (so they populate for every tenant): Collection over
time · **Bill payment-mode mix** (an "Advance Deposit" slice means bills paid
from the wallet — already counted under Advance received; it reconciles with
Advance debited) · **Bill refunds by mode** · **Unpaid bills — how old**
(renamed from "Receivables aging": unpaid bills grouped by how long ago they
were raised, from the API's own bill rows) · **Advance payment-mode mix** ·
**Advance refunds by mode**.

## B. Depth band — KPIs (`/analytics/financial/depth → kpis[]`)

### Avg bill value  → `avgBill`
- **What:** average per **real bill** (debit documents only).
- **Why / who:** Hospital Admin — pricing / case-mix signal. The all-documents
  average would be misleadingly low (receipts and credit notes drag it down).
- **Formula:** `SUM(grand_total) ÷ COUNT(*)` over debit docs.

### Fully-paid rate  → `fullyPaidRate` (%)
- **What:** fully-settled bills ÷ all bills raised (count basis in the tooltip).
- **Why / who:** front-desk settlement discipline — how often patients pay at
  the point of service.
- **Formula:** `SUM(balance ≤ 0) ÷ COUNT(*)` over debit docs.

### Top payment mode  → `topPayMode` · Top refund mode  → `topRefundMode`
- **What:** the dominant collection mode (by receipt count, amount in tooltip)
  and the mode most refunds went back through.
- **Why / who:** POS/UPI terminal investment; card-reversal vs UPI-return
  reconciliation for the accountant.
- **Source:** `tbl_opd_billing_receipt_master` / `tbl_opd_billing_refund_master`
  joined to the payment-option lookup.

### Total discount given  → `totalDiscount` (₹)
- **What:** all rupee value given away = per-line discounts (converted to ₹) +
  the bill-level **extra (manual) discount**, whose share is stated inside this
  card's tooltip (it no longer has a card of its own).
- **Why / who:** Hospital Admin — margin erosion in one number.
- **Honest limitation:** per-line discounts cannot be split into
  predefined-catalogue vs manually-edited — the catalogue default lives in the
  billing microservice, and lines store only the final value. The provable
  split is line-level vs bill-level-extra.

**Curated out on review** (the detail survives in tables/tooltips):
*Collection rate* (derivable from the headline billed/collected pair),
*Extra discount* (folded into Total discount's tooltip), *Bills edited after
issue* (the named editors remain in the "Bills edited — by user" table; an edit
COUNT per bill is not recorded by the system), and *Net advance held* (the
headline band carries received / refunded / debited directly).

### Projected billed (month)  → `projectedBilled` *(conditionally shown)*
- **Formula:** `(billed ÷ days_in_period) × days_in_current_month`.
- **Gating:** identical to the appointments projection — shown only for a
  current rolling window of 7–92 days ending today; never for historical ranges
  or "Till date".

## C. Depth band — charts & tables

| Block | Type | What / why |
|---|---|---|
| `receiptsTrend` — Payments received over time | line | Money received per period from receipts — the observable view of dues being cleared. (A true "dues cleared" series is impossible: the balance column is last-write-wins, so historical due snapshots don't exist. Labelled honestly.) |
| `paymentModeMix` — Payment-mode mix | donut | Collections per mode (count + ₹) for reconciliation effort and gateway fees. |
| `refundByMode` — Refund by mode | donut | Refund ₹ per mode; one mode dominating refunds flags gateway disputes. |
| `byDoctor` — Revenue by doctor | bar | Who generates the revenue (coaching + incentive basis). |
| `duesAging` — Receivables aging | bar | Outstanding dues bucketed 0-30 / 31-60 / 61-90 / 90+ days, anchored to the period end. |
| `streamMix` — Revenue by stream | donut | OPD vs IPD vs Pathology split. |
| `discountByDoctor` — Discount by doctor | bar | Line + extra discount per doctor — coach systematic over-discounters. |
| `topServices` / `topServicesRevenue` | bar | The services billed most often / earning the most (catalogue joined on `service_id`). What drives footfall vs what drives revenue. |
| `billsByBuilder` — Bills built by role | donut | Who creates bills: Doctor vs Front-office/Admin vs Other (by the creating login's role, zero-filled). **Honest limitation:** no doctor-vs-KEA column exists anywhere in this schema and KEA writes no billing rows — a literal "doctor vs KEA" split would read 100/0 by construction, so the provable split is by user role. |
| `advanceModeMix` / `advanceByDoctor` | donut / bar | Deposit mode mix and per-doctor advance collection. |
| `negativeWallets` — Advance wallet alerts | table | Patients refunded more than they deposited — front-desk reconciliation list (names + mobiles). |
| `accountRegister3C` — Billing register by account | table | Bills per billing account — the dimension the legacy Form-3C report partitions by. **Honest limitation:** the `isForm3C` added/not-added flag lives ONLY in the billing microservice's datastore (`/billing/bill/addToForm3C`); it does not exist in `tatva_clinic`, so a true added-vs-not count needs an API integration (separate ticket). |
| `topBillEditors` / `cancelledByActor` | tables | Post-issue edit and cancel/delete actors — the leakage-review surface. |

## Not buildable from this data (stated, not faked)

- **Advance debited** (analytics-side) — billing-service store only; the
  headline card shows it from the billing API.
- **Form-3C added vs not added** — flag lives in the billing service.
- **Predefined vs manual line discount** — no provenance column.
- **Discount reason / approval** — no column; needs a product change.
- **Edit count per bill** — only the last edit is stored.

## Notes on integrity

- Depth-band figures use the debit-document convention and may differ from any
  legacy report that mixes document types — the depth numbers are the honest
  ones, and the convention is stated here and in the tooltips.
- All depth queries are SELECT-only against the replica; tenant-scoped by the
  JWT business id; resilient (a failing breakdown degrades to an empty card,
  never a broken page).
