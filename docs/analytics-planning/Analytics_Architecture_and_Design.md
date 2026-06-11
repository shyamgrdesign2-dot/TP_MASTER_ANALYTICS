# TatvaCare EMR — Standalone Analytics Module
## Product, Architecture & UI Design Document (v1.0)

**Author:** Product / Design (Shyam)
**Date:** 2026-06-03
**Status:** Draft for review
**Scope:** Replace the legacy PHP `data_analytics` link-out with a native, configurable analytics experience inside the React EMR (TP_Master_L1). Supports OPD + IPD today; designed to grow into HMS. **Zero AI in v1**, but "semi-automatic" assistance and AI-readiness baked into the architecture.

---

## 0. How to read this document

This is written for three audiences at once:

- **Product** → Sections 1–6 (vision, why, personas, capabilities).
- **Design** → Sections 6, 9, 10 (information architecture, UI architecture, interaction model).
- **Engineering** → Sections 7, 8, 11–14 (system architecture, data layer, query contract, frontend plan, security, roadmap).

Everything is grounded in what already exists in the two codebases, so this is a *migration + upgrade* plan, not a greenfield fantasy.

### Table of contents
1. Executive summary & vision
2. Goals, non-goals & guiding principles
3. Why analytics matters for a hospital (the "why")
4. Users, personas & jobs-to-be-done
5. Current state — what the PHP analytics does today (and its limits)
6. Target capabilities — the two-mode model (Default + Builder)
7. System architecture (end-to-end)
8. The configurable analytics engine — the semantic layer & query contract
9. Data architecture (why we don't query OLTP directly)
10. Information architecture — the metric & dimension catalog
11. UI / UX architecture
12. Frontend implementation plan (fits existing React conventions)
13. Security, roles, multi-tenancy & PII
14. "Semi-automatic" without AI — and the path to AI later
15. Exports, scheduling & reporting
16. Performance & scale
17. Phased roadmap
18. Open decisions / questions for the team
19. Appendix — metric dictionary & glossary

---

## 1. Executive summary & vision

Today, when a doctor or admin clicks **Analytics** in the new React EMR, they are silently SSO-redirected out into the old PHP application (`pms-upgrade.azurewebsites.net`, `&module=data_analytics`). They leave the product, land in a visually inconsistent, fixed-layout set of ~18 report pages, and cannot change anything beyond a date range and a hospital dropdown.

**Vision:** A single, native **Analytics workspace** inside the React EMR that:

1. **Opens to a curated default dashboard** tailored to the user's role (doctor vs. owner vs. billing vs. hospital admin) — answers the top 5 questions each role asks, with zero setup.
2. Lets any user **build their own views** — pick what to measure, slice it by any dimension, filter it, and choose how to visualize it (pie / bar / line / table / KPI card). These views are **saved, named, reorderable, and shareable**.
3. Is **driven by a generic query contract**: the UI assembles a structured query (measures + dimensions + filters + grain), sends it to a dedicated Analytics API, gets back tabular result sets, and renders them into whichever chart the user chose. One engine, infinite reports.
4. Covers **OPD and IPD today**, and is structured so HMS modules (pharmacy depth, lab/pathology, OT, wards, inventory, HR/payroll) plug into the same engine later without rework.
5. Uses **no AI in v1**, but is "semi-automatic": smart defaults, recommended chart types, auto-suggested filters, and rule-based highlights. The data model and API are designed so a natural-language / AI layer can be added on top later with no schema change.

The end state: the doctor never leaves React, gets answers faster, and the product — not a separate PHP app — owns the analytics surface.

---

## 2. Goals, non-goals & guiding principles

### 2.1 Goals
- **G1 — Native:** Kill the SSO link-out. Analytics lives at a React route and looks like the rest of the EMR (antd 5 + theme tokens).
- **G2 — Feature parity, then beyond:** Reproduce every report that matters today (see Section 5) before adding new power.
- **G3 — Configurable by the user:** Default views for everyone + per-user custom views with their own filters and chart choices.
- **G4 — One engine, many reports:** A single semantic/query layer powers all dashboards. Adding a metric should not mean writing a new page.
- **G5 — Role-aware:** What you can see and measure depends on your role and your hospital scope.
- **G6 — HMS-ready & AI-ready:** New data domains and (later) AI sit on the same contract.

### 2.2 Non-goals (v1)
- **No AI / no natural-language querying** in v1. (Architected for, not built.)
- **No write-back** — analytics is read-only. It never mutates clinical or billing data.
- **No custom SQL by end users.** Users compose queries through a guided builder, not raw SQL (safety + multi-tenancy).
- **Not a replacement for operational lists** (e.g., today's appointment queue) — those stay in their modules. Analytics is for aggregate insight.
- **No real-time streaming** in v1. Near-real-time (minutes-fresh) is enough; see Section 9.

### 2.3 Guiding principles
- **Default first, configure second.** 80% of users should get value with zero configuration; the builder is for the 20% power users.
- **The query is data.** A saved view is just a JSON query + a chart spec. Everything serializes.
- **Separate "what" from "how."** *What to measure* (semantic layer) is decoupled from *how to show it* (chart layer). Same data, any chart.
- **Never trust the client for scope.** Hospital/role filters are enforced server-side, always.
- **Aggregate at the edge, not in the browser.** The DB/API does the math; the client renders.
- **Designed for explanation.** Every metric has a tooltip explaining what it means and why it matters (clinicians are not analysts).

---

## 3. Why analytics matters for a hospital (the "why")

This section is the justification layer — for each thing we show, *why* a hospital needs it. Healthcare analytics splits cleanly into four domains. We use these four as the top-level navigation of the whole module.

### 3.1 Operational analytics — "Is the hospital running efficiently?"
Hospitals are capacity businesses. Empty beds and idle slots are lost revenue; overbooked clinics burn out staff and anger patients.

| Metric | Why it matters |
|---|---|
| Appointments booked / completed / cancelled / no-show | Cancellations and no-shows are direct revenue leakage and a sign of scheduling or reminder problems. |
| New vs follow-up vs urgent mix | Follow-ups indicate continuity of care & retention; a collapsing follow-up rate is an early churn signal. |
| Slot utilization / doctor productivity | Identifies under-used doctors/sessions and over-loaded ones; drives staffing and availability decisions. |
| **Bed Occupancy Rate (BOR)** | The single most important IPD efficiency metric. Too low = wasted capacity; too high (>85–90%) = no surge buffer, patient-safety risk. |
| **Average Length of Stay (ALOS)** | Rising ALOS signals discharge bottlenecks or complications; falling ALOS frees beds and lifts throughput. |
| **Average Daily Census (ADC)** | Demand planning — staffing, consumables, catering, nursing ratios. |
| Ward-wise occupancy & discharge mix | Spots which wards are bottlenecks; discharge-by-status (recovered / referred / LAMA / death) is a quality & compliance signal. |

### 3.2 Financial analytics — "Are we getting paid, and where does the money come from?"
A hospital can be busy and still bleed cash if collection lags billing.

| Metric | Why it matters |
|---|---|
| Revenue (OPD + IPD), gross vs net of credit notes | The topline; credit notes reveal billing errors / disputes. |
| Collections vs refunds | *Collection* is cash actually received — the number that pays salaries. Refunds flag service issues or over-billing. |
| **Collection efficiency** (collected ÷ billed) | The health of revenue cycle. A widening gap = AR piling up. |
| Daily collection (cash memo / receipt / advance / refund) | Day-close reconciliation; fraud/leakage detection at the counter. |
| Revenue by department / service / doctor / payer | Shows which services and which doctors actually drive profit; informs pricing & investment. |
| Mode of payment mix (cash / card / UPI / insurance / credit) | Cash-flow timing and reconciliation; rising credit/insurance share lengthens the cash cycle. |
| Incentive / referral payouts | Controls a major cost line and keeps referral economics honest. |
| 3C report (Clinical–Commercial–Compliance) | Audit & statutory compliance — regulators and owners both need it. |

### 3.3 Clinical analytics — "What are we treating, and how?"
This is where an EMR has a unique advantage over a pure billing system — it sees the *clinical* picture.

| Metric | Why it matters |
|---|---|
| Diagnosis mix / top conditions | Disease-burden view: drives specialist hiring, equipment, drug stocking, public-health reporting. |
| Top prescribed salts / molecules / brands | Formulary management, pharmacy stocking, and rational-prescribing audits. |
| Generic vs branded ratio | Cost-of-care and policy compliance (many systems mandate generics). |
| Consultations: unique vs repeat patients, follow-up adherence | Care continuity and outcome proxy — are patients coming back as advised? |
| Pathology/lab volume (OPD vs IPD) | Diagnostic intensity, lab capacity planning, revenue cross-sell. |

### 3.4 Patient & growth analytics — "Where do patients come from, and do they stay?"

| Metric | Why it matters |
|---|---|
| New vs returning patients | Growth vs retention balance. |
| Referral source (refer-by-patient / refer-by-doctor / refer-by-others) | Which channels actually bring patients — directs marketing & referral incentives. |
| Patient demographics (age / gender / geography) | Service-line planning and outreach. |
| Patient retention / repeat-visit rate | Long-term value; cheaper to retain than acquire. |

**The thesis:** A doctor-owner opening this module should, within 10 seconds, know — *Am I busy? Am I getting paid? What am I treating? Is my practice growing?* Those four questions map exactly to the four domains above, and they become the four pillars of the default dashboard.

---

## 4. Users, personas & jobs-to-be-done

The legacy system gates each report by numeric role IDs (387–395, 26, 22, 23, plus `ut_id`/owner flags). We translate those into clean personas. Each persona gets a tailored **default dashboard**.

| Persona | Maps to (legacy) | Top jobs-to-be-done | Default dashboard focus |
|---|---|---|---|
| **Doctor / Owner-Doctor** | `ownerDoctor=1`, `ut_id 1/2`, roles 387/388 | "How busy am I, how am I growing, what am I prescribing, how much did I earn?" | My appointments, my consultations, my Rx patterns, my revenue/incentive, follow-up rate. |
| **Associate / Junior Doctor** | non-owner doctor | "My own consultation & follow-up performance." | Personal clinical view only (no hospital financials). |
| **Billing / Accounts** | roles 389–395, 23 | "Daily collection, revenue, AR, payment-mode mix, 3C compliance, incentives." | Financial command center: collections, revenue, daily close, 3C. |
| **Hospital Admin / Management** | module 3 (IPD), super_admin | "Whole-hospital health: occupancy, revenue, throughput across departments & sites." | Executive overview across OPD+IPD, multi-site rollups, BOR/ALOS/ADC. |
| **Reception / Front-desk** | reception roles | "Appointment volume, cancellations, no-shows today/this week." | Lightweight operational view. |
| **Pharmacy / Lab in-charge** | module 15 (pharmacy), pathology | "Inventory movement, sale/purchase, test volume." | Pharmacy & pathology operational view. |

**Multi-hospital note:** the EMR is multi-tenant (a business `hospital_business_id` can own multiple `hm_id` sites). Personas that span sites (admin, billing) need an **"All hospitals" rollup + per-site drill-down**; single-site users are scoped to their `hm_id`.

> **User-research track (recommended, not blocking):** Before locking the default dashboards, run 5–6 contextual interviews — 2 doctor-owners, 1 associate, 1 billing lead, 1 hospital admin, 1 receptionist. Validate the "top 5 questions" per persona and which 6–8 widgets belong on each default canvas. The architecture below does not depend on the outcome (default views are config, not code), so build can start in parallel.

---

## 5. Current state — what the PHP analytics does today

A precise inventory matters because **parity is the bar for v1**. Everything below is what we must reproduce, then improve. (Source: `tatvacareclinic-master/data_analytics/`.)

### 5.1 The report catalog (today)
| Area | Reports | Filters available | Charts |
|---|---|---|---|
| **Appointments** | `appointments_analytics.php` | hospital, last 7/15/30/90/365 days | line (total vs cancelled), donut (new/follow-up/urgent) |
| **OPD billing** | `opd_billing_analytics.php` | bill counter, day range | bar (collection vs refund, revenue vs credit note) |
| **IPD billing** | `ipd_billing_analytics.php` | bill counter, day range | bar (same shape) |
| **Daily collection** | `daily_collection.php` | OPD/IPD, date | totals (cash memo / receipt / advance / refund) + table |
| **Collection reports** | modal in `data_analytics_reports.php` | dept, counter, date range, bill type, issued-by, payment mode | tables (general / detailed / day-wise) |
| **3C report** | `3c_reprt_table.php` | account, dept, date range, bill type | detail table, CSV |
| **Incentives** | modal + templates | user, dept, date range | detailed / overall tables, PDF |
| **Inpatient summary** | `inpatient_summary.php` | hospital | line (BOR/ALOS/ADC), donut (ward), bar (discharge) |
| **Inpatient/Patient/Other referrals** | `inpatient_analytics.php`, `patients_analytics.php`, `other_analytics.php` | date range | master + detail tables |
| **Clinic — consultations** | `data_clinic_consultations.php` | hospital, doctor, month/year | line + bar (consults, unique/repeat patients, follow-ups) |
| **Clinic — diagnosis** | `data_clinic_diagnosis.php` | hospital, doctor, month/year | diagnosis breakdown |
| **Clinic — Rx** | `data_clinic_rx_analytics.php` | hospital, doctor, month/year | bar/stacked (top salts, companies, generics) |
| **Pharmacy & pathology** | `others_analytics.php` | hospital, day range | stacked bar (PI/PR/SI/SR), line (path OPD vs IPD) |

### 5.2 How it's built (and why that's the problem)
- **Charting:** ApexCharts loaded from CDN, instantiated with PHP-echoed arrays embedded directly in `<script>`. Chart config is copy-pasted per page.
- **Filtering:** every filter is a URL query param that reloads the whole page (`?counter=…&type=1`). No client state, no instant feedback.
- **Data:** each report calls bespoke functions (`get_appointment_chart_data`, `get_collection_chart_data_opd`, `get_bor_data_chart_analytics`, …) that hand-roll SQL with `WHERE hm_id = ? AND date BETWEEN ? AND ?` and `GROUP BY DATE(...)`. **Every report is its own query function.**
- **Tables queried (the real data surface we must serve):** appointments, OPD/IPD billing masters (retail sale, receipt, advance, refund, credit note), inpatient admissions/discharges/beds/wards, prescriptions (salt/company/generic), diagnosis, consultations, pharmacy transactions, pathology orders, referral masters, incentive master, plus dimension tables (hospital, user, bill counter, payment option, department).
- **Exports:** per-report PHP CSV/print templates.
- **Auth:** PHP session + `in_array("<roleId>", $AarruserRole)` checks scattered per page.

### 5.3 The core limitations we are fixing
1. **Zero configurability** — users cannot create a view, change a chart, or save a filter set. Bookmarking a URL is the only "save."
2. **N pages = N queries = N maintenance points.** Adding a metric means a new PHP page.
3. **Inconsistent UX** — each page reinvents layout, filters, and chart styling.
4. **Outside the product** — context switch, separate auth, separate look.
5. **Not composable** — you cannot put "OPD revenue" and "bed occupancy" on one screen.

> **Key insight that drives the new design:** Underneath ~18 different pages there are really only a handful of *primitives* — a **measure** (count, sum, avg of something), a set of **dimensions** to group by (date, doctor, department, ward, payment mode…), some **filters**, and a chosen **chart**. If we model those primitives once, all 18 reports — and any future report — become *configurations*, not code.

---

## 6. Target capabilities — the two-mode model

The whole product is organized around **two modes that share one engine**:

### 6.1 Mode A — Default (curated) dashboards
- Ship a set of **role-based default dashboards** (Section 4). Each is a pre-built collection of widgets (KPI cards + charts + tables).
- Defaults are **seeded as saved-view JSON**, not hardcoded React — so product can tune them without a release, and they're the same artifact a user's custom view produces.
- A user can **"Customize"** a default → it forks into their personal copy they can edit.

### 6.2 Mode B — Builder (self-serve) dashboards
The configurable heart. A user:
1. **Adds a widget** → picks a **measure** (e.g., "Collection amount", "Appointment count", "Bed occupancy").
2. **Groups by a dimension** (date/day/week/month, doctor, department, ward, payment mode, case type, diagnosis…).
3. **Applies filters** (date range, hospital, doctor, bill type, status…).
4. **Picks a visualization** (KPI / line / bar / stacked bar / pie-donut / table / heatmap later).
5. The app builds a **structured query**, sends it to the Analytics API, gets a result set, renders it.
6. **Saves** the widget into a named dashboard; arranges widgets on a drag-and-drop grid; **shares** a dashboard (optional, role-permitting).

### 6.3 Shared capabilities (both modes)
- **Global filter bar** per dashboard (date range + hospital) that cascades to all widgets, with per-widget overrides.
- **Drill-down**: click a bar/slice → see the underlying detail table → export.
- **Compare periods** (this month vs last, YoY).
- **Export** any widget (CSV/Excel) or whole dashboard (PDF).
- **Scheduled email** of a dashboard (Phase 3).

This two-mode model is exactly what the user asked for: *"a default view for all… can be configured by the doctors also where they can set their own filters… we pass a query to the backend… visualize in pie / bar / whatever chart the user chooses."*

---

## 7. System architecture (end-to-end)

```
┌──────────────────────────────────────────────────────────────────────┐
│  React EMR (TP_Master_L1)  — new /analytics route                      │
│                                                                        │
│  Analytics Workspace                                                    │
│   ├─ Dashboard Canvas (widget grid, drag/drop)                         │
│   ├─ Widget Builder (measure ▸ dimension ▸ filter ▸ chart)             │
│   ├─ Global Filter Bar (date range, hospital)                          │
│   ├─ Chart Renderers (chart.js / react-chartjs-2)  + antd Table/Cards  │
│   └─ Redux: analyticsSlice (views, filters, results cache)             │
│                         │  axiosService (Bearer JWT, customBaseUrl)     │
└─────────────────────────┼──────────────────────────────────────────────┘
                          │  HTTPS  POST /api/v1/analytics/query  (JSON query contract)
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Analytics API  (new microservice — Node/NestJS, same stack family)    │
│   1. AuthN/Z       — validate JWT, resolve user → role + hospital scope │
│   2. Query parser  — validate structured query vs the SEMANTIC MODEL    │
│   3. Scope injector— force hospital_id / doctor_id WHERE clauses        │
│   4. SQL compiler  — semantic query → parameterized SQL                 │
│   5. Cache         — Redis (query-hash keyed, short TTL)                │
│   6. Saved-views   — CRUD for dashboards/widgets (per user)            │
│   7. Exporter      — CSV/Excel/PDF generation                          │
└─────────────────────────┬──────────────────────────────────────────────┘
                          │  read-only SQL
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Analytics Data Store                                                    │
│   • Phase 1: READ REPLICA of the existing EMR DB                        │
│   • Phase 2: + materialized views / summary tables (pre-aggregated)     │
│   • Phase 3: + reporting schema / star model (facts + dimensions)      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.1 Why a dedicated Analytics API (not reuse PHP, not query from React)
- **Not from React directly:** the browser must never hold DB credentials or build SQL; multi-tenant scope and PII would be unenforceable.
- **Not the PHP app:** the goal is to *stop* depending on it. Reusing its per-report functions reimports the "N pages = N queries" problem.
- **A new service** gives us: one query contract, server-enforced scope, caching, and a clean home for the semantic model. It fits the existing pattern — the React app already talks to several Node microservices via `axiosService` with `customBaseUrl` + Bearer JWT, so we add `analytics_api_url` to `EnvironmentConfig.js` and follow the established `ApiXxx.js` service convention.

### 7.2 Why a read replica / separate store
Analytics runs heavy `GROUP BY` aggregations. Running those against the **live OLTP database** that serves consultations and billing would slow the clinical app. A **read replica** (Phase 1) isolates analytical load; **materialized/summary tables** (Phase 2+) make dashboards instant. Detail in Section 9.

---

## 8. The configurable analytics engine — the semantic layer & query contract

This is the most important section. Get this right and every report becomes config.

### 8.1 The semantic model (server-side registry)
We define, **once, on the server**, a registry of:

- **Datasets / subject areas** — `appointments`, `opd_billing`, `ipd_billing`, `collections`, `inpatient`, `prescriptions`, `diagnoses`, `consultations`, `pharmacy`, `pathology`, `referrals`, `incentives`.
- **Measures** — named aggregations with an allowed agg + the underlying column, e.g.
  - `appointments.count` (COUNT)
  - `collections.amount` (SUM of received amount)
  - `billing.revenue_net` (SUM gross − credit notes)
  - `inpatient.bor` (computed: patient-days ÷ bed-days × 100)
  - `prescriptions.count` (COUNT), `consultations.unique_patients` (COUNT DISTINCT)
- **Dimensions** — named groupable fields with a type, e.g.
  - `date` (with grain: day / week / month / quarter / year)
  - `doctor`, `department`, `hospital`, `ward`, `bill_counter`, `payment_mode`, `case_type` (new/follow-up/urgent), `diagnosis`, `salt`, `company`, `referral_source`, `discharge_status`, `gender`, `age_band`.
- **Filters** — every dimension is filterable; plus required scope filters (hospital, role).
- **Joins & grain** — encoded in the registry so the user never sees a join. They pick "Collection amount by payment mode for hospital X last 30 days" and the compiler knows the tables.

The registry is the **contract between UI and DB**. The UI builder only ever offers measures/dimensions/filters that exist in the registry → no invalid queries, no SQL injection, no leaking of un-modeled tables.

### 8.2 The query contract (what the client sends)
A single endpoint: `POST /api/v1/analytics/query`. The body is a structured, JSON query — *not* SQL:

```jsonc
{
  "dataset": "collections",
  "measures": ["collections.amount", "collections.refund"],
  "dimensions": [
    { "field": "date", "grain": "day" },
    { "field": "payment_mode" }
  ],
  "filters": [
    { "field": "date", "op": "between", "value": ["2026-05-01", "2026-05-31"] },
    { "field": "department", "op": "in", "value": ["OPD"] }
    // hospital scope is injected server-side, NOT trusted from client
  ],
  "sort": [{ "field": "date", "dir": "asc" }],
  "limit": 1000
}
```

Response is shape-agnostic tabular data the client can throw at any chart:

```jsonc
{
  "columns": [
    { "key": "date", "label": "Date", "type": "date" },
    { "key": "payment_mode", "label": "Payment mode", "type": "string" },
    { "key": "collections.amount", "label": "Collection", "type": "currency" },
    { "key": "collections.refund", "label": "Refund", "type": "currency" }
  ],
  "rows": [ /* array of arrays or objects */ ],
  "meta": { "cached": true, "generatedAt": "…", "rowCount": 62 }
}
```

**Why this shape wins:** the same response renders as a line chart (date on X, amount on Y), a stacked bar (date × payment_mode), a pie (one date, payment_mode split), or a table — purely a *client-side* chart choice. **"What" is decoupled from "how."**

### 8.3 A saved view = query + chart spec
A widget the user builds and saves is just:

```jsonc
{
  "id": "w_123",
  "title": "OPD collection by payment mode",
  "query": { /* the query contract above */ },
  "viz": {
    "type": "stackedBar",          // kpi | line | bar | stackedBar | pie | donut | table | area
    "x": "date",
    "series": "payment_mode",
    "y": ["collections.amount"],
    "options": { "currency": "INR", "stacked": true }
  },
  "layout": { "x": 0, "y": 0, "w": 6, "h": 4 }   // grid position
}
```

A **dashboard** is `{ id, name, ownerId, scope, filterBar, widgets: [Widget] }`. **Default dashboards are the exact same JSON, seeded by product.** This single abstraction is why the engine is generic.

### 8.4 Mapping today's 18 reports onto the engine (proof it generalizes)
| Legacy report | Dataset | Measures | Dimensions | Default viz |
|---|---|---|---|---|
| Appointments analytics | appointments | count, cancelled_count | date(day), case_type | line + donut |
| OPD/IPD billing | billing | revenue_net, collection, refund, credit_note | date(day), bill_counter | bar |
| Daily collection | collections | cash_memo, receipt, advance, refund | date(day), payment_mode | kpi + table |
| Inpatient summary | inpatient | bor, alos, adc | date(month), ward | line + donut |
| Ward / discharge | inpatient | count | ward, discharge_status | donut / bar |
| Rx analytics | prescriptions | count | salt, company, generic_category, date(month) | bar / stacked |
| Diagnosis | diagnoses | count | diagnosis, date(month) | bar |
| Consultations | consultations | count, unique_patients, repeat_patients, followups | date(week) | line + bar |
| Pharmacy | pharmacy | purchase_inv, purchase_ret, sale_inv, sale_ret | date(day) | stacked bar |
| Pathology | pathology | count | date(day), department(OPD/IPD) | line |
| Referrals | referrals | referred_count | referral_source, date | table / bar |
| Incentives | incentives | incentive_amount | user, department | table |
| 3C report | billing | amount | patient, dept, bill_type, account | table + CSV |

Every single one collapses to *(dataset, measures, dimensions, filters, viz)*. **Nothing is special-cased.**

---

## 9. Data architecture (why we don't query OLTP directly)

### 9.1 The phased data strategy
- **Phase 1 — Read replica (fastest to ship):** point the Analytics API at a **read-only replica** of the existing EMR MySQL DB. The semantic model maps directly onto existing tables. Pros: parity quickly, no ETL. Cons: complex joins on normalized OLTP tables; some queries slow on big ranges → mitigate with caching + sensible default ranges (e.g., 30 days).
- **Phase 2 — Summary / materialized tables:** create pre-aggregated rollups for the hot paths (daily collections by hospital/counter/payment-mode; daily appointments by status/case-type; monthly BOR/ALOS/ADC by ward; monthly Rx by salt). Refreshed by a scheduled job (cron, every N minutes / nightly). Dashboards read summaries → sub-second.
- **Phase 3 — Reporting star schema (HMS scale):** a dedicated reporting schema with **fact tables** (fact_billing, fact_appointment, fact_admission, fact_prescription, fact_lab) and shared **dimension tables** (dim_date, dim_doctor, dim_department, dim_hospital, dim_patient, dim_ward, dim_payment_mode). This is the clean long-term home and the ideal substrate for AI later.

### 9.2 Freshness
- v1 target: **near-real-time, minutes-fresh** is sufficient for management analytics. Replica lag (seconds) + summary refresh (minutes) is fine.
- Day-close financial reports (daily collection) read live/replica for accuracy at counter close.
- No streaming/real-time in v1.

### 9.3 Caching
- Redis keyed by **hash(structured query + resolved scope)**. Short TTL (e.g., 5–15 min) for dashboards; longer for historical/immutable ranges. Cache is the main lever that makes the read-replica approach viable in Phase 1.

### 9.4 Why this matters
Doing this wrong (React → raw DB, or aggregations on the live OLTP) would either expose PII/multi-tenant data or degrade the clinical app under reporting load. The replica + summary + cache stack keeps analytics fast *and* isolated.

---

## 10. Information architecture — the metric & dimension catalog

The module's top-level navigation mirrors Section 3's four domains, plus Builder & Saved:

```
Analytics
├── Overview        (role-based default dashboard — the landing canvas)
├── Operational     (appointments, throughput, IPD occupancy: BOR/ALOS/ADC, wards)
├── Financial       (revenue, collections, daily close, payment mix, 3C, incentives)
├── Clinical        (diagnosis mix, Rx patterns, consultations, lab volume)
├── Growth          (new vs repeat, referrals, demographics, retention)
├── My Dashboards   (user-created saved views)  ← Builder lives here
└── Reports/Exports (tabular detail + scheduled exports)
```

The full measure/dimension dictionary lives in **Appendix (Section 19)** — it's the authoritative list engineering implements into the semantic registry, derived 1:1 from the tables the PHP reports already query.

---

## 11. UI / UX architecture

### 11.1 Layout anatomy (the Analytics Workspace)
```
┌───────────────────────────────────────────────────────────────────┐
│  [Analytics]  Overview ▸ Operational ▸ Financial ▸ Clinical ▸ …    │  ← section tabs
├───────────────────────────────────────────────────────────────────┤
│  📅 Date range ▾   🏥 Hospital ▾   ⟳ Refresh   [+ Add widget] [Save]│  ← Global filter bar
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ KPI card │ │ KPI card │ │ KPI card │ │ KPI card │   ← KPI row    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌────────────────────────┐ ┌────────────────────────┐             │
│  │  Line chart (widget)   │ │  Donut chart (widget)  │  ← grid      │
│  │   ⋮ menu: edit/export  │ │                        │             │
│  └────────────────────────┘ └────────────────────────┘             │
│  ┌──────────────────────────────────────────────────┐             │
│  │  Data table (widget)  — sortable, drill-down       │             │
│  └──────────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────┘
```

### 11.2 The Widget Builder (the configurability UI)
A right-side **drawer** (antd `Drawer`) or modal with a guided, top-to-bottom flow — deliberately *not* a SQL editor:

```
1. Measure(s)     → searchable dropdown grouped by domain
                    ("Collection amount", "Appointment count", "Bed occupancy")
2. Group by       → dimension picker + date grain (day/week/month) selector
   (Break down by)
3. Filters        → add filter rows (field, operator, value) — chips
4. Visualize as   → chart-type gallery (KPI · Line · Bar · Stacked · Pie/Donut · Table)
                    with smart "Recommended" badge (rule-based, see §14)
5. Live preview   → the widget renders as you configure (debounced query calls)
6. [ Save to dashboard ]
```

Design intent: a doctor with **zero analytics training** can build "my follow-up appointments by month, as a line chart" in under a minute, because they pick from human-labeled lists, never schema.

### 11.3 Visualization → data fit (guidance baked into the UI)
| Chart | Best for | Rule the UI applies |
|---|---|---|
| **KPI card** | a single number (+ trend vs prev period) | measure, no/one dimension |
| **Line / Area** | trend over time | x = date dimension |
| **Bar (vertical)** | compare categories | one categorical dimension |
| **Stacked bar** | part-to-whole over time/category | date/category × a series dimension |
| **Pie / Donut** | composition at a point in time | one dimension, ≤ ~6 slices |
| **Table** | detail / many columns / export | any; default fallback |
| **Heatmap** (later) | two dimensions × intensity | day-of-week × hour, etc. |

The builder **recommends** a chart based on the shape of what the user picked (e.g., "you grouped by date → Line recommended"; "one dimension, few categories → Pie ok"). This is the "semi-automatic" assist (Section 14) — rules, not AI.

### 11.4 Design system & components (reuse what exists)
- **antd 5** is the dominant system → use `Card`, `Table`, `DatePicker.RangePicker`, `Select`, `Drawer`, `Segmented`, `Statistic`, `Skeleton`, `Empty`.
- **Charts:** `chart.js` + `react-chartjs-2` (already dependencies) → one thin `<AnalyticsChart type=… data=… options=…>` wrapper that maps the query response + viz spec to chart.js config. (We standardize on chart.js since it's already in the app; do **not** reintroduce ApexCharts.)
- **Theme tokens** from `src/assets/scss/variables.scss` — primary `#4b4ad5`, secondary `#a461d8`, etc. — feed the chart color palette so charts match the EMR brand.
- **Grid / drag-drop:** `@dnd-kit` (already a dependency) for widget rearrangement.
- **States:** every widget has explicit **loading (skeleton)**, **empty**, and **error** states — the legacy app has none of these.
- **Responsive:** widgets reflow to single column on mobile; filter bar collapses into a sheet.

### 11.5 Interaction patterns
- **Global filter cascades** to all widgets; a widget can **pin** its own override.
- **Drill-down:** click a chart element → opens the underlying detail table (a query with the clicked value added as a filter) → export.
- **Compare periods:** a toggle that adds a previous-period series.
- **Empty default:** new users land on their role's default dashboard, never a blank screen.

---

## 12. Frontend implementation plan (fits existing React conventions)

Grounded in the actual TP_Master_L1 conventions discovered in the codebase.

### 12.1 Routing & entry point
- Add a protected route in `src/App.js` inside `<PrivateRoute>`: `<Route path="analytics/*" element={<AnalyticsWorkspace />} />` (nested routes for sections).
- In `src/common/SidebarDoctor.js`, change the `data_analytics` item from the SSO `check_SSO("data_analytics")` / `window.open(...&module=data_analytics)` flow to `navigate("/analytics")`. **Keep the SSO path behind a feature flag** (GrowthBook is already installed) for safe rollout / fallback.

### 12.2 Folder structure (mirrors `appointmentAgent` / `apolloConsultations`)
```
src/pages/analytics/
├── AnalyticsWorkspace.js          // shell: tabs + global filter bar + <Outlet/>
├── AnalyticsWorkspace.scss
├── service.js                     // module API wrappers
├── AnalyticsHelper.js             // query→chart mapping, formatters
├── registry.client.js            // labels/grouping for measures & dims (mirrors server)
└── components/
    ├── GlobalFilterBar.js
    ├── DashboardCanvas.js          // dnd-kit grid of widgets
    ├── Widget.js                   // renders one saved view (chart/table/kpi)
    ├── WidgetBuilderDrawer.js      // the configurability UI (§11.2)
    ├── ChartRenderer/
    │   ├── AnalyticsChart.js       // chart.js wrapper (line/bar/pie/…)
    │   └── KpiCard.js
    ├── DataTableWidget.js
    ├── FilterRow.js
    └── ExportMenu.js
```

### 12.3 State & data layer
- New slice `src/redux/analyticsSlice.js` (register in `src/redux/store.js`): holds `dashboards`, `activeDashboardId`, `globalFilters`, and a `resultsCache` keyed by query-hash. Async thunks `runQuery`, `fetchDashboards`, `saveDashboard`.
- New API service `src/api/services/ApiAnalytics.js` following the existing `ApiAppointments.js` pattern:
  ```js
  ApiAnalytics.runQuery   = (q)        => api.post('/api/v1/analytics/query', q, baseUrl)
  ApiAnalytics.listViews  = ()         => api.get('/api/v1/analytics/dashboards', baseUrl)
  ApiAnalytics.saveView   = (d)        => api.post('/api/v1/analytics/dashboards', d, baseUrl)
  ApiAnalytics.export     = (q, fmt)   => api.post(`/api/v1/analytics/export?fmt=${fmt}`, q, baseUrl)
  ```
- `baseUrl = { customBaseUrl: config.analytics_api_url }` — add `analytics_api_url` to `src/EnvironmentConfig.js` (dev/qa/prod) and surface via `src/config.js`. Auth is automatic — `axiosService` already attaches the Bearer JWT.

### 12.4 Charts
- One `AnalyticsChart` component registers the chart.js controllers once and maps `{columns, rows}` + `viz` → chart.js `data`/`options`. KPI cards use antd `Statistic`. Tables use antd `Table` with the response `columns`.

### 12.5 Build order (frontend)
1. Route + sidebar wiring behind flag → lands on a static placeholder.
2. `AnalyticsChart` wrapper + render a hardcoded query result.
3. Global filter bar + `runQuery` thunk + results cache.
4. Default dashboard rendering from seeded JSON.
5. Widget Builder drawer → save → personal dashboards.
6. Drill-down, export, compare-periods.

---

## 13. Security, roles, multi-tenancy & PII

- **AuthN:** reuse the existing JWT (Bearer). The Analytics API validates it and resolves `user_id`, `hospital_business_id`, `hm_id`, role flags, owner flag.
- **AuthZ (what you can measure):** map legacy role IDs → capability flags in the semantic registry. Each **dataset/measure** declares the roles allowed (e.g., financial datasets require billing roles 389–395; clinical require 387/388; IPD requires module 3). The builder only offers what the user is permitted; the API re-checks on every query (never trust the client).
- **Multi-tenant scope (non-negotiable):** the API **injects** `hospital_business_id` (and `hm_id` when single-site) into every query's WHERE clause from the token — the client cannot widen its own scope. "All hospitals" is only offered to multi-site personas.
- **Row-level for doctors:** an associate doctor sees only their own clinical rows (`doctor_id = self`); owners/admins see the practice.
- **PII minimization:** aggregate endpoints return no patient identifiers. Detail/drill-down and 3C-style reports that *do* include patient data require explicit permission and are audit-logged.
- **Audit:** log who ran which query/export over PII, for compliance (healthcare data).
- **Read-only:** the API has no write path to clinical/billing data; saved-views write only to its own dashboards store.

---

## 14. "Semi-automatic" without AI — and the path to AI later

The user wants "max usage, semi-automatic, zero AI for now." We deliver assistance through **deterministic rules**, not models:

1. **Smart defaults** — role-based default dashboards mean most users never configure anything.
2. **Recommended chart type** — rule: grouped-by-date → line; one categorical with ≤6 values → pie/donut; two dimensions → stacked bar; many columns → table. Shown as a "Recommended" badge.
3. **Auto-suggested filters/dimensions** — when a user picks a measure, the builder surfaces the dimensions most commonly paired with it (from the registry's defaults), e.g., pick "Collection amount" → suggests grouping by payment mode / date / counter.
4. **Auto date-grain** — picking a long range auto-switches day→week→month so charts stay readable.
5. **Rule-based highlights / thresholds** — color a KPI red if BOR > 90% or collection-efficiency < target; flag a spike vs previous period (simple statistical delta, not ML).
6. **Templates** — "Start from a template" gallery (the legacy reports as one-click starting points users can then tweak).

**AI-readiness (future, no rework):** because every view is already a structured JSON query against a named semantic model, a later AI layer only has to translate natural language → that same query JSON ("show me OPD collections by payment mode last month as a pie"). The contract, scope enforcement, and renderers all stay identical. Likewise the Phase-3 star schema is the ideal substrate for forecasting/anomaly detection. **No part of v1 needs to be undone to add AI.**

---

## 15. Exports, scheduling & reporting

- **Per-widget export:** CSV/Excel via the existing `xlsx` dependency; the same query runs server-side with a higher row limit.
- **Dashboard export:** PDF (the app already has `jspdf`/`html2pdf`/`react-to-print`) for board/management packs.
- **Detail/tabular reports** (3C, collection detail, incentive) render as antd tables with server-side pagination + export — full parity with legacy CSVs.
- **Scheduled email** (Phase 3): a cron in the Analytics API renders a dashboard to PDF and emails it (daily collection to billing, weekly exec pack to owner). This is a net-new capability the PHP app lacks.

---

## 16. Performance & scale

- **Default ranges bounded** (e.g., 30 days) to keep first paint fast; longer ranges hit summaries.
- **Per-widget lazy loading** — widgets fetch independently; a slow widget never blocks the canvas.
- **Query cache** (Redis) + **client results cache** (Redux, keyed by query-hash) avoid refetching when filters don't change.
- **Pagination/virtualization** for large tables.
- **Summary tables (Phase 2)** turn the heaviest dashboards sub-second.
- **Cost guardrails:** the API rejects unbounded queries (no date filter, no limit) and caps `limit`.

---

## 17. Phased roadmap

| Phase | Theme | Scope | Outcome |
|---|---|---|---|
| **0 — Foundations** | Plumbing | New Analytics API skeleton, read replica, semantic registry (core datasets: appointments, collections, billing), JWT auth + scope injection, `analytics_api_url` config, route + sidebar flag | Engine alive; one real query renders in React. |
| **1 — Parity defaults** | Default dashboards | Role-based default dashboards covering the legacy reports (appointments, OPD/IPD billing & collections, daily close, inpatient BOR/ALOS/ADC, Rx, diagnosis, pharmacy, pathology, referrals, incentives, 3C). chart.js renderers, global filter bar, exports. | Doctors stop using the PHP page; SSO link-out removed for enabled tenants. |
| **2 — Builder** | Configurability | Widget Builder drawer, saved personal dashboards, drag-drop grid, drill-down, compare-periods, recommended charts, summary tables for hot paths. | Self-serve analytics; users build their own views. |
| **3 — HMS + scale** | Expansion | Star schema/reporting DB, more datasets (OT, wards depth, inventory, HR), scheduled email, sharing, cross-site rollups. | HMS-grade analytics. |
| **4 — AI (future)** | Intelligence | NL→query, anomaly detection, forecasting on the existing contract. | Conversational analytics, no rework. |

---

## 18. Open decisions / questions for the team

1. **DB engine & replica:** confirm the EMR DB (MySQL?) and whether a read replica can be provisioned now (gates Phase 0).
2. **Analytics API stack:** Node/NestJS to match existing microservices? Confirm owner team.
3. **Default dashboard content per role:** validate via the user-research track (Section 4) — which 6–8 widgets per persona.
4. **Saved-views storage:** in the EMR DB (new `analytics_dashboards` table) or the Analytics service's own store?
5. **Role mapping:** confirm the legacy role-ID → capability mapping with whoever owns the permission matrix.
6. **Sharing model:** can users share dashboards across a hospital, or personal-only in v1?
7. **Tenant rollout:** which hospitals pilot first; feature-flag (GrowthBook) cohort.
8. **Branding of charts:** sign off the chart color palette derived from theme tokens.

---

## 19. Appendix — metric dictionary & glossary

### 19.1 Glossary
- **BOR (Bed Occupancy Rate):** occupied bed-days ÷ available bed-days × 100. Efficiency of bed use.
- **ALOS (Average Length of Stay):** total inpatient days ÷ number of discharges.
- **ADC (Average Daily Census):** total inpatient days ÷ days in period. Average patients in-house per day.
- **Collection vs Revenue:** *Revenue* = amount billed (net of credit notes); *Collection* = cash actually received. The gap = receivables.
- **Collection efficiency:** collection ÷ revenue. Revenue-cycle health.
- **Credit note:** a reversal/adjustment of a bill — high volume signals billing issues.
- **Case type:** new / follow-up / urgent — appointment classification.
- **3C:** Clinical–Commercial–Compliance report for audit/statutory needs.
- **OLTP:** the live transactional database serving the EMR app.
- **Semantic layer:** the server-side registry of measures/dimensions that the UI builds queries against.
- **Measure / Dimension:** *measure* = a number you aggregate (count, sum, avg); *dimension* = a field you slice/group by (date, doctor, ward…).

### 19.2 Measure & dimension catalog (seed for the semantic registry)
Derived directly from the tables the legacy reports already query.

| Dataset | Measures | Dimensions |
|---|---|---|
| appointments | count, completed, cancelled, no_show | date, doctor, hospital, case_type, status |
| collections | amount, refund, cash_memo, receipt, advance | date, hospital, bill_counter, payment_mode, department |
| billing | revenue_gross, revenue_net, credit_note | date, hospital, department, doctor, service_category, bill_counter |
| inpatient | admissions, discharges, bor, alos, adc, bed_days | date(month), hospital, ward, discharge_status |
| prescriptions | count, generic_count, branded_count | date, doctor, salt, company, generic_category |
| diagnoses | count | date, doctor, diagnosis |
| consultations | count, unique_patients, repeat_patients, followups | date(week/month), doctor, hospital |
| pharmacy | purchase_inv, purchase_ret, sale_inv, sale_ret | date, hospital |
| pathology | count | date, department(OPD/IPD), hospital |
| referrals | referred_count | referral_source(patient/doctor/other), date |
| incentives | incentive_amount | user, department, date |
| patients (growth) | new_patients, returning_patients | date, gender, age_band, geography |

---

*End of v1.0. This document is intentionally implementation-grounded: every capability maps to something that already exists in the legacy PHP analytics (for parity) or the React app's current stack (for delivery). The next step is sign-off on Section 18's open decisions, after which Phase 0 can begin.*
