# TatvaCare EMR — Analytics Dashboard PRD (v1)

**Author:** Shyam (Product / Design)
**Date:** 2026-06-04
**Branch:** `Analytics_Dashboard`
**Status:** Draft for build
**Companion docs:** [Architecture & Design](Analytics_Architecture_and_Design.md) · [Buildability & Scope](Analytics_Buildability_and_Scope.md) · [KPI Benchmarks](Analytics_KPI_Benchmarks_Research.md) · [Profiling SQL](profiling_queries_PB1-PB5.sql)

> **What makes this doc different:** the companion architecture doc is grounded in the *legacy PHP* analytics + the DB dictionary. **This PRD is grounded in what the React EMR (this repo) actually renders today** — the billing dashboard, the All Patients page, doctor/prescription data, and the IPD link-out. Every metric below maps to a field or API that already exists in the running app. Where the two disagree, the buildability doc wins on *can-we-query-it*; this doc wins on *what-the-product-shows*.

---

## 1. What we are building (one paragraph)

A native **Analytics** surface inside the React EMR that replaces the legacy PHP `data_analytics` SSO link-out. It opens to a **role-based default dashboard** (zero setup) and lets users **build their own views** by picking a metric, a way to slice it, filters, and a chart. Everything is driven by **one query engine** so adding a report is a *configuration*, not a new page. v1 ships **no AI** but is architected so AI slots in later with no rework. IPD — today an external app — gets a **native home page** in React with its own **Analytics** section.

---

## 2. The surfaces we already have (grounded inventory)

This is the raw material. Every analytic in §4 is built from these.

### 2.1 Billing dashboard — `/billing-dashboard`
*Source: `src/pages/opdBilling/`*

| What exists today | Detail |
|---|---|
| **Tabs** | OPD Billing · IPD Billing · Advance Deposit |
| **Table columns** | Bill No & Date · Patient details · Billed · Paid · Due · Refund · Actions |
| **KPI cards (already shown)** | Total Paid Bill Amount · Paid Fully · Due · Refunded (count + amount each) |
| **Advance cards** | Total Advance Received · Refunded · Debited |
| **Filters** | search · date range · `status[]` (FullyPaid/Due/CarriedForward/Refunded) · `doctorIds[]` |
| **APIs** | `/api/v1/billing/bill/dashboard` (OPD), `/api/v1/billing/ipd-bill/dashboard` (IPD), `/api/v1/billing/advancedDeposit/dashboard`, `/api/v1/billing/bill/itemized-bill-data` |
| **Charts today** | **None** — antd tables + static KPI cards only |

➡️ **The gap analytics fills:** the dashboard shows *current state* (a filtered list + totals). It has **no trends, no breakdowns, no comparisons** — no "collection over time", "revenue by doctor", "payment-mode mix", "due ageing". That is exactly the analytics layer.

### 2.2 All Patients — `/all_patients`
*Source: `src/pages/allPatients.js/` (desktop), `src/pages/mobile/AllPatients/` (mobile)*

| What exists today | Detail |
|---|---|
| **Table columns** | Patient details (name · gender · age) · Contact · Patient ID · Category · Last Visit |
| **Filters** | search (name/ID/mobile) · date presets (Till date / Today / 7d / 30d / custom) |
| **Stats** | "Showing X of Y patients" · Excel export (admin + paid) |
| **API** | `GET /api/v1/patient/listDashboard` |
| **Fields available** | `pm_gender`, `ageYears`/`ageMonths`, `category`, `lastVisitDate`, city/state/pin (in export) |

➡️ **The gap analytics fills:** patient *growth* (new vs returning), demographics (age/gender/geography), retention/repeat-visit — none of which the list view answers.

### 2.3 Doctor & prescription data (the consultation)
*Source: `src/components/*Box.js`, `src/pages/Prescription.js`, `PrescriptionNew.jsx`; saved via `/api/v1/casemanager/addCaseManager`*

The richest data we own. Per consultation, doctors capture **structured** fields:

| Box | Structured fields captured | Analytics it unlocks |
|---|---|---|
| **Diagnosis** | `tds_name`, **`icd_code`**, status (Confirmed/Suspected/Ruled-out), since | Diagnosis mix, top conditions, ICD-coded disease burden |
| **Medications** | brand (`tmm_medicine_name`), **molecule (`tmm_generic`)**, **company (`tmm_company`)**, dose, frequency, duration | Top molecules/brands, **generic-vs-branded ratio**, formulary patterns |
| **Vitals** | temp, BP, RR, SpO2, height, weight, **BMI**, BSA, RBS, FIB4 | Vitals trends (⚠️ see §9 reconciliation) |
| **Symptoms** | name, severity, duration | Chief-complaint mix |
| **Investigations** | test name, note | Lab/test ordering volume |
| **Advice / Surgery / Med-history** | structured rows | Procedure & history patterns |
| **Doctor profile** | `um_id`, `um_name`, `dp_id`, **`dp_name` (specialty)** | Slice every metric by doctor / specialty |

➡️ **The gap analytics fills:** this is the EMR's unique edge over a billing-only system — *what* doctors treat and prescribe. None of it is surfaced as insight today.

### 2.4 IPD — external today
*Source: `src/api/services/ApiIpd.js` (only `checkPatientAdmitted`), `src/redux/ipdSlice.js`, SSO redirect in `src/common/SidebarDoctor.js`*

IPD runs as a **separate app** (`config.ipd_portal_url`, API `config.ipd_api_url`). React only checks if a patient is admitted and SSO-redirects out. **No admissions, wards, beds, discharge, or ADT exist in this repo.** IPD analytics (BOR/ALOS/ADC, ward occupancy, discharge mix) therefore needs a **data bridge** (the IPD API or the analytics backend reading the IPD DB) — see §6.

### 2.5 Navigation & routing (where it all lives)
- **Routes:** `src/App.js` — protected routes inside `<Route element={<PrivateRoute/>}>`, lazy-loaded. Adding `/analytics` and `/ipd` is a 1-line pattern each.
- **Sidebar:** `src/common/SidebarDoctor.js` — items are **dynamic from `profile.module_data`**. Current order: Appointment · Ask Tatva · [All Patients · OPD Billing · Pharmacy · IPD · Dr Follow-up · **Data Analytics**] · Apollo Consultations · Messages. The **Data Analytics** item currently SSO-redirects to PHP — **this is the item we repoint.**
- **Installed libs (v1 needs no new charting dep):** `chart.js@4.4.3`, `react-chartjs-2@5.2.0`, `antd@5.16.4`, `@dnd-kit/*`, `xlsx`, `jspdf`, `html2pdf`, `html2canvas`.

---

## 3. Users & their default dashboards

Same personas as the architecture doc, but each default dashboard is now wired to the **real metrics in §4**.

| Persona | Lands on (default dashboard) |
|---|---|
| **Doctor / Owner-doctor** | My footfall · my revenue & dues · my top diagnoses · my Rx patterns (generic ratio) · follow-up rate |
| **Associate doctor** | Personal clinical view only (own consults, own Rx) — no hospital financials |
| **Billing / Accounts** | Collection over time · revenue vs due vs refund · payment-mode mix · due-ageing · advance balance |
| **Hospital admin** | Whole-hospital: revenue + footfall + occupancy (incl. IPD) across doctors/depts/sites |
| **Reception** | Appointment volume · cancellations · no-shows (today/this week) |

Defaults are **seeded JSON** (not hardcoded React), so product tunes them without a release.

---

## 4. What we can show — the metric catalog (v1, grounded)

Tiering follows the buildability doc: ✅ build now · ⚠️ needs one profiling/data step · 🔴 deferred.

### 4.1 Financial (highest ROI — all ✅)
Built on the billing APIs we already call.

| Metric | Built from | Default chart |
|---|---|---|
| Collection over time (Paid amount by day/week/month) | billing dashboard data | Line |
| Revenue vs Due vs Refund | KPI keys `totalPaidAmount`/`dueAmount`/`refundedAmount` | Stacked bar + KPI cards |
| Payment-mode mix | itemized-bill `MOP` / payment_option | Donut |
| Collection efficiency (Paid ÷ Billed) | billed vs paid totals | KPI tile + trend |
| Due ageing | `dueAmount` over time | Bar |
| Advance balance movement | advance Received/Refunded/Debited | Stacked bar |
| Revenue by doctor / department | `doctorIds`, `dp_id` | Bar |
| OPD vs IPD revenue split | OPD vs IPD billing endpoints | Stacked bar |

### 4.2 Operational — appointments (mostly ✅, ⚠️ on status)
| Metric | Built from | Tier |
|---|---|---|
| Appointment volume / footfall (trend) | `tbl_appointment_master` / appointment APIs | ✅ |
| New vs follow-up vs urgent mix | `pam_case_type` | ⚠️ needs PB-1 vocab |
| Cancellation / no-show rate | `pam_status` | ⚠️ needs PB-1 vocab |
| Slot utilization / by-doctor load | appointments × doctor | ✅ |

### 4.3 Clinical (the differentiator — ✅)
Built on `casemanager` consultation data.

| Metric | Built from | Default chart |
|---|---|---|
| Diagnosis mix / top conditions | `icd_code`, `tds_name` | Bar |
| Top molecules / brands | `tmm_generic`, `tmm_medicine_name` | Bar |
| Generic-vs-branded ratio | `tmm_generic` vs brand | Donut + trend |
| Top companies | `tmm_company` | Bar |
| Investigation/lab ordering volume | InvestigationBox rows | Line |
| Consultations: unique vs repeat, follow-up adherence | casemanager + appointments | Line + bar |

### 4.4 Patient & growth (⚠️ tenant-key, else ✅)
| Metric | Built from | Tier |
|---|---|---|
| New vs returning patients | `pm_created_date`, `lastVisitDate` | ⚠️ scope via `hm_id` map (PB-2) |
| Demographics (age band / gender / geography) | `pm_gender`, `ageYears`, city/state | ✅ |
| Retention / repeat-visit rate | visit history | ✅ |

### 4.5 IPD (🔴 in v1 → P3, needs data bridge)
BOR (point-in-time) · admissions count · case-mix · IPD revenue are reachable; **ALOS / bed-day occupancy / turnover** are gated on PB-3 (discharge date) + a nightly census snapshot. See §6 + buildability doc §4.1.

---

## 5. Types of analytics & charts (v1 chart kit)

All on `chart.js` (already installed). The builder **recommends** a chart from the shape of the data (rule-based, not AI).

| Chart | Best for | Rule the UI applies |
|---|---|---|
| **KPI card** (antd `Statistic`) | one number + trend vs prev period | a measure, 0–1 dimension |
| **Line / Area** | trend over time | x = date dimension |
| **Bar** | compare categories | one categorical dimension |
| **Stacked bar** | part-to-whole over time/category | date/category × a series |
| **Donut / Pie** | composition at a point | one dimension, ≤ ~6 slices |
| **Table** (antd `Table`) | detail / export / fallback | any |
| Heatmap (later) | two dims × intensity | day × hour |

Cross-cutting capabilities: **global filter bar** (date range + hospital/doctor) cascading to all widgets · **drill-down** (click a bar → detail table → export) · **compare periods** (this vs last) · **export** (CSV/Excel via `xlsx`, dashboard PDF via `jspdf`/`html2pdf`).

---

## 6. IPD entry point & IPD analytics (the specific ask)

**Goal:** IPD gets a native **home page** in React, and an **Analytics** section beneath the patient listing area shows IPD analytics.

**Proposed structure:**
1. **Sidebar:** keep the existing **IPD** item, but add a native **`/ipd` home route** (entry point) instead of (or alongside) the SSO redirect, behind a feature flag. Add an **Analytics** entry **below All Patients** in the nav (this is the repointed `data_analytics` item → `/analytics`).
2. **IPD Home (`/ipd`):** a native landing page — current in-patients (we already have `checkPatientAdmitted`; extend via `ipd_api_url`), quick counts (admitted now, beds free), and a prominent **"IPD Analytics"** entry.
3. **IPD Analytics:** lives as a **domain inside the main Analytics workspace** (`/analytics` → IPD section) *and* is linked from IPD Home — same engine, same widgets. v1 ships the clean IPD metrics (admissions, point-in-time occupancy, case-mix, IPD revenue); ALOS/bed-day occupancy follow once the data bridge + census snapshot land.

**Data bridge decision (open):** IPD analytics data comes from either (a) the **IPD API** (`ipd_api_url`) exposing aggregate endpoints, or (b) the **analytics backend reading the IPD DB** directly (replica). (b) fits the "one engine" model better; (a) is faster if the IPD team owns it. → Decision needed (§10).

---

## 7. The configurable engine (how v1 stays configurable)

The heart, kept deliberately lean for v1.

- **One endpoint, one contract.** The client sends a structured JSON query — *not* SQL: `{ dataset, measures[], dimensions[{field,grain}], filters[], sort, limit }`. The server validates it against a **semantic registry** (the only place measures/dimensions/joins/scope are defined), compiles to parameterized SQL, and returns shape-agnostic tabular data `{ columns, rows, meta }`.
- **A saved view = query + chart spec + layout.** A widget is just `{ query, viz, layout }`. A dashboard is a list of widgets. **Default dashboards are the same JSON, seeded by product** — so a default and a user-built view are the same artifact.
- **"What" is decoupled from "how."** The same response renders as line / bar / donut / table purely by the client's chart choice.
- **Scope is injected server-side, always.** `hm_business_id` (and `hm_id`/doctor for row-level) comes from the JWT, never the client. (Validated against Cube's RLS pattern — KPI doc §2.)

### v1 configurability scope (realistic)
- **Default dashboards** per role — ship first, cover the §4 metrics.
- **Lightweight builder** — a right-side drawer: pick **metric → group-by → filter → chart → save to "My Dashboard"**. Human-labeled lists, never schema. (Full drag-drop grid + sharing = Phase 2.)
- **Global filter bar** + per-widget override.
- This is the user's brief — *"a default view for all… configurable by doctors who set their own filters… we pass a query to the backend… visualize in whatever chart the user chooses."*

---

## 8. How it scales

**Product scale (add a report without code):**
- New metric = new registry entry. New report = new saved-view JSON. **N reports ≠ N pages.** This is the core lever; today's PHP is N pages = N hand-rolled queries.
- New domain (IPD, pharmacy depth, lab, OT, HR) = new datasets on the same contract. HMS plugs in without rework.

**Data scale (keep it fast & safe):**
- **Read replica**, read-only — analytics aggregation never touches the clinical primary (the buildability doc confirms `tbl_appointment_master` alone is ~7 GB).
- **Nightly rollup tables** (`fact_appointments_daily`, `fact_billing_daily`, `fact_prescriptions_daily`) for the 5 giant tables (10–16 M rows) — default dashboards read rollups, not raw.
- **Caching** (Redis, query-hash keyed, short TTL) + client results cache (Redux).
- **Bounded queries** — default date ranges, capped `limit`, require an indexed predicate (hot columns are already indexed).

**Engineering scale (later, no rework):**
- Phase 3 **star schema** (facts + dims) is the clean long-term home and the substrate for AI.
- **AI-ready:** because every view is already a structured JSON query against a named semantic model, an NL→query layer slots on top with no schema change.

---

## 9. Reconciliation & data caveats (must resolve before locking specs)

1. **Vitals discrepancy.** React `VitalsBox` exposes structured `height/weight/bmi`, but the DB dictionary (buildability §4.2) found vitals stored as **free-text varchars with no height/weight**. → Confirm where structured vitals actually persist before promising BMI/BP analytics. Likely **still defer** clinical-quality vitals to post-v1.
2. **Appointment status/case-type are free-text** → run **PB-1** before defining no-show / new / follow-up.
3. **Patient table is keyed by `hm_id`, not `hm_business_id`** → **PB-2** tenant map before patient-growth metrics.
4. **Money semantics** (gross/net, refund linkage) → **PB-5** with Finance so "revenue" vs "collection" are defined once.
5. **IPD discharge date** lives in the ADT log (`tbl_atd_logs`), not the admissions table → **PB-3** before ALOS/turnover.
6. **Denial/clean-claim KPIs** (KPI doc) assume a TPA/claims workflow we have **not** located — confirm before promising them.

---

## 10. v1 scope & phasing

| Phase | Ships | Gated on |
|---|---|---|
| **P0 — Foundations** | Analytics API skeleton + read replica + semantic registry (billing, appointments, collections); `/analytics` route + sidebar repoint behind flag; `analytics_api_url` in `EnvironmentConfig.js`; chart.js `AnalyticsChart` wrapper | PB-1, PB-2, PB-3, PB-5 profiling |
| **P1 — Financial + Volume (highest ROI)** | Default dashboards: collection trends, revenue/due/refund, payment-mode mix, collection efficiency, advance movement, footfall, by-doctor/dept; exports | finish PB-1 |
| **P2 — Builder + Clinical-mix** | Lightweight widget builder + "My Dashboard"; diagnosis mix, top molecules, generic-vs-branded, patient demographics & new-vs-returning | — |
| **P3 — IPD depth** | `/ipd` home + IPD analytics: admissions, point-in-time occupancy, case-mix, IPD revenue; ALOS/bed-day occupancy after PB-3 + census snapshot | IPD data bridge + PB-3 |
| **P4 — AI (future)** | NL→query, anomaly/forecast on the same contract | — |

---

## 11. Frontend plan (fits this repo's conventions)

- **Route:** add `<Route path="/analytics/*" element={<AnalyticsWorkspace/>}/>` (and `/ipd`) inside the `PrivateRoute` wrapper in `src/App.js`, lazy-loaded like the rest.
- **Sidebar:** repoint the `data_analytics` module item from the SSO `window.open(...&module=data_analytics)` to `navigate("/analytics")`; keep SSO behind a GrowthBook flag for fallback. Position **Analytics below All Patients**.
- **Folder:** `src/pages/analytics/` — `AnalyticsWorkspace.js` (shell: tabs + global filter bar + `<Outlet/>`), `components/{GlobalFilterBar, DashboardCanvas, Widget, WidgetBuilderDrawer, ChartRenderer/AnalyticsChart, ChartRenderer/KpiCard, DataTableWidget, ExportMenu}`, `service.js`, `registry.client.js`.
- **State:** `src/redux/analyticsSlice.js` (register in `store.js`) — `dashboards`, `activeDashboardId`, `globalFilters`, `resultsCache` (query-hash keyed); thunks `runQuery`, `fetchDashboards`, `saveDashboard`.
- **API:** `src/api/services/ApiAnalytics.js` mirroring existing `ApiXxx.js` — `runQuery`, `listViews`, `saveView`, `export`; `baseUrl = { customBaseUrl: config.analytics_api_url }` (axios already attaches the Bearer JWT).
- **Charts:** one `AnalyticsChart` maps `{columns, rows}` + `viz` → chart.js config; KPI = antd `Statistic`; tables = antd `Table` with response `columns`. **Do not reintroduce ApexCharts** — chart.js is already in.
- **Build order:** route+sidebar flag → `AnalyticsChart` on a hardcoded result → filter bar + `runQuery` → default dashboard from seeded JSON → builder drawer + My Dashboard → drill-down/export/compare.

---

## 12. Open decisions

1. ~~**Analytics API stack & owner**~~ — **DECIDED (2026-06-04): dedicated Node/NestJS Analytics microservice + read replica** (expose legacy queries 1:1). Contract spec: [Analytics_API_Spec.md](Analytics_API_Spec.md). Still open: owning team + repo.
2. **IPD data bridge** — IPD API aggregate endpoints vs analytics backend reading the IPD DB replica (§6).
3. **Read replica provisioning** — confirm DB engine (MySQL) + that a replica can be stood up now.
4. **Saved-views storage** — new `analytics_dashboards` table in EMR DB vs the analytics service's own store.
5. **Role → capability mapping** — confirm legacy role-ID → measure-permission matrix.
6. **Default dashboard content** — validate the per-persona widget set (optional 5–6 user interviews; non-blocking since defaults are config).
7. **Vitals structured-storage** — resolve the §9.1 discrepancy.
8. **Tenant rollout** — which clinics pilot first (GrowthBook cohort).

---

*v1 PRD. Everything above maps to a field, API, or library that exists in this repo today (for delivery) or a legacy report we must reach parity with (for scope). Next step: sign off §12 decisions + run the PB profiling pack, then P0 begins.*
