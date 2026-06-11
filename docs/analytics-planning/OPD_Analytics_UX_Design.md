<!-- Generated 2026-06-09 via multi-agent review/UX workflow. OPD-only. Companion to OPD_Analytics_Spec.md. -->

# OPD Analytics — UX & Design Specification

**Product:** TatvaCare Doctor EMR · Analytics module
**Surface:** `src/pages/analytics` (native React, replacing legacy PHP `data_analytics`)
**Data source:** `tatva_clinic` (READ-ONLY) via the Analytics API; live-API fallbacks for a subset of OPD pages
**Status:** Draft for design + eng review · **Date:** 2026-06-09
**Owner:** Analytics Dashboard workstream

---

## 1. Purpose & relationship to the catalog spec

This document is the **UX and visual contract** for the OPD slice of the TatvaCare analytics module. It defines *how the OPD pages look, lay out, behave, and degrade* — it does not redefine *what* metrics exist.

The **catalog spec** (the server-side semantic registry mirrored client-side in `analyticsCatalog.js`) is the source of truth for measures, dimensions, filters, operators, grains, and viz recommendations. This document maps onto it as follows:

- **Every number rendered traces to a catalog measure.** A KPI, a trend series, a ranked-bar value, or a register column must correspond to a `measure` / `dimension` defined in the catalog (e.g. `collections.amount`, `appointments.count`, `consultations.unique_patients`). The UX never invents a metric the catalog cannot serve.
- **`live: true` vs `live: false` drives presentation honesty.** Datasets the existing billing/appointment APIs can serve today (`collections`, `appointments`) render as fully live OPD pages; datasets that require the Analytics API (`consultations`, `diagnosis`, `prescriptions`) render either through the API when it is on, or fall back to the honest placeholder pattern (§2) rather than fabricated data.
- **The catalog also feeds the customization layer.** The Widget Builder (§5) only offers measures/dimensions/filters that exist in the catalog, so every user-built OPD widget produces a valid, sanctioned query. `recommendViz()` from the catalog supplies the default chart type.

In short: the **catalog answers "what can be asked"; this spec answers "how the OPD analyst sees and acts on the answer."**

---

## 2. Design language

The OPD analytics surface is rebuilt on **shadcn/ui + Tailwind** (with the project-mandatory **`tw-` class prefix**) and **Recharts**, hosted inside the existing **TatvaCare / antd app chrome** (TP sidebar, header, fonts). The visual system reconciles three layers: shadcn primitives for cards/tables/badges/inputs, Recharts for all data viz, and TP/antd for navigation and the period control.

**Tokens.** Colour, radius, and spacing derive from the shadcn theme variables in `ui/theme.css` and the TP bridge tokens in `shell/tpTokens.scss` (`--tp-*`). Components consume semantic Tailwind utilities (`tw-text-foreground`, `tw-text-muted-foreground`, `tw-bg-muted`, `tw-text-success`, `tw-text-destructive`) rather than raw hex, so the OPD pages inherit TP theming and stay theme-swappable. The antd-driven controls (e.g. the period picker) bridge through `--tp-*` variables (`--tp-slate-400`, etc.).

**The KPI trend-tag pattern** (`KpiCard.jsx`) is the signature OPD primitive: a shadcn `Card` showing *title → big tabular-nums value (optional prefix/suffix) → one-line description → a single pill-shaped trend tag*. The tag is the **only** trend signal (no duplicate bar/sparkline) — a tinted rounded pill with a diagonal arrow (`TrendUp` / `TrendDown` / `TrendFlat`), the absolute delta as `±N%`, and a comparison label ("vs previous period"). One indicator, never two.

**Semantic colour with inversion.** Direction colour is meaning, not arithmetic sign: up = `tw-text-success` on `tw-bg-success/12`, down = `tw-text-destructive` on `tw-bg-destructive/12`, flat = muted. For metrics where lower is better (refunds, cancellations, avg wait time), the colour mapping **inverts** so "good" is always green and "bad" is always red regardless of whether the underlying number rose or fell. Chart series use the same semantic palette.

**Indian number formatting.** All values render with `toLocaleString("en-IN")` (lakh/crore grouping), currency prefixed with ₹, dates as `DD MMM YYYY`. This is consistent across KPIs, tables, tooltips, and exports.

**Honest no-data / sandbox badges.** The surface never fakes data. Three honesty states are first-class:
- **No comparison baseline** → the trend tag is replaced with *"No data for this period."*
- **Source not in `tatva_clinic` / not yet wired** → the spec-driven `PlaceholderPage` lists the planned widgets and what the page *needs* (per `PLACEHOLDER_SPEC`), rather than rendering sample rows.
- **Low-coverage / sandbox data** → an explicit caveat badge on the affected widget. These caveats are mandatory for the known data-quality limits in §7-adjacent notes: **~17% appointment-source coverage** (acquisition-source widgets), **ABHA ~99% sandbox/test** today, **pending-digitization & symptom-collector live in microservices** (absent from the DB, so shown as placeholders), and **avg-wait-time timestamps unconfirmed** (flagged as provisional).

---

## 3. Global IA, navigation & persona default dashboards

**IA overview.** Navigation is organised around the two businesses a hospital runs, rendered in the TP App-Shell rail (`analyticsNav.jsx`): a whole-practice **Overview** leads, then **OPD** and **Inpatient · IPD** clusters (each: Overview · Appointments/Admissions · Billing · Patients), then clinic-wide roll-ups (**Billing & Revenue**, **All Patients**), shared **Care** (clinical domains), **Consultations**, **Pharmacy & Lab**, **Grow**, and **Reports**. This spec scopes the **OPD cluster** plus the OPD-relevant Care/supporting pages. Nav leaves resolve to a built page, an Analytics-API dashboard endpoint, or the honest placeholder — so the full product tree is always present and navigable.

**Care-aware overviews.** OPD Overview, IPD Overview, OPD/IPD Billing, and OPD/IPD Patients share endpoints scoped by a `careSetting` param (`opd` / `ipd`) — the same dashboard contract, money and cohorts scoped to the care setting.

**Three persona default dashboards** (the landing a user sees, tuned to their job):
1. **Doctor / Clinician** — their own OPD throughput and clinical mix: appointments seen, case-type split, follow-up adherence, top diagnoses/Rx for their panel.
2. **Front-desk / Operations** — flow and money-in: today's footfall, queue/wait, appointment status mix, OPD collections and payment-mode mix, daily-collection register.
3. **Owner / Administrator** — whole-practice OPD health: revenue trend, new-vs-repeat patients, doctor-wise throughput, and the clinic roll-ups, with drill-down into any OPD page.

Each persona's default is a **saved-view preset** (§5); users can re-pin, reorder, or switch away from it at any time.

---

## 4. The OPD page template

Every OPD page follows one vertical template, top to bottom, so analysts learn the surface once:

1. **Filter bar** — sticky page-top row: the `DateRangeControl` period picker (presets Today / 7d / 15d / 30d / 90d / 1y plus custom range, label collapses to the preset name when matched), plus page-scoped filters (doctor, hospital, case type, status, payment mode) drawn from the catalog, and the Export action.
2. **Hero KPIs** — a responsive row of `KpiCard` trend-tag tiles (§2) carrying the page's headline measures with period-over-period deltas.
3. **Trend** — a primary time-series (Recharts line/area via `AnalyticsChart`) at the page grain, the "is it moving?" view.
4. **Ranked bars** — a "top N" horizontal/vertical bar breakdown by the page's key dimension (top doctors, payment modes, diagnoses, drugs), the "what's driving it?" view.
5. **Register** — the backing `AnalyticsTable`: the row-level records behind the aggregates, sortable, paginated, and exportable.

Pages may omit the ranked-bar or trend block where a measure has no meaningful dimension or series, but never reorder the template.

---

## 5. Customization model (summary)

OPD analytics is configurable without leaving guardrails:

- **Saved views** — a named snapshot of a page's filters, period, pinned widgets, and layout; the three persona dashboards (§3) ship as default saved views.
- **Pinning** — promote any widget (a KPI, chart, or built query) onto a dashboard, reorder, and resize.
- **Filters** — page-scoped and view-scoped, always sourced from the catalog (operators per `OPERATORS`, grains per `GRAINS`).
- **Widget Builder** (`QueryBuilderDrawer`) — pick a catalog dataset → measures + dimensions + filters → grain → viz (with `recommendViz()` assist), producing a valid, sanctioned query every time; the builder only exposes catalog-defined fields.
- **Thresholds** — per-KPI targets/alert bands that colour the trend tag against a goal (not just period-over-period), respecting the semantic-inversion rule (§2).

Full mechanics are in the IA / Customization part (§7).

---

## 6. Accessibility & responsive principles

- **Contrast & semantic state** — trend/state colour always meets WCAG AA against its tinted background, and is never the *sole* signal: direction is reinforced by the arrow glyph and the signed delta text, so red/green-blind users still read direction.
- **Keyboard & focus** — all controls (period picker, filters, builder drawer, table sort/pagination, export) are reachable and operable by keyboard with visible focus rings inherited from the shadcn theme.
- **Screen readers** — KPI cards expose value + delta + comparison as readable text; charts carry accessible names and a table fallback (the register) for any visual series.
- **Numbers & units** — `tabular-nums`, en-IN grouping, and explicit ₹/%/unit affixes keep figures scannable and unambiguous.
- **Responsive** — the §4 template reflows: hero KPI rows wrap to a grid, charts go full-width, and registers switch to horizontal scroll / condensed columns on narrow viewports; the TP rail collapses per the App Shell behaviour.

---

## 7. Index of the page-layout parts that follow

The four detailed UX parts are appended verbatim after this front-matter:

1. **IA, Persona Modes & Customization Model** — the full navigation model, the three persona dashboard modes, and the complete saved-views / pinning / filters / Widget Builder / thresholds mechanics summarized in §5.
2. **Page Layouts — OPD Overview, Appointments, OPD Billing** — block-by-block layouts (filter bar → hero KPIs → trend → ranked bars → register) for the three core OPD pages, including their care-setting scoping and data caveats.
3. **Page Layouts — All Patients, Prescriptions/RxPAD, + Supporting-domain pattern** — the patient-cohort and prescription pages plus the reusable pattern for supporting Care domains (diagnosis, labs, etc.), including placeholder treatment for sources not yet in `tatva_clinic`.
4. **Component, Interaction, Accessibility & Motion Guidelines** — the detailed spec for `KpiCard`, `AnalyticsChart`, `AnalyticsTable`, `DateRangeControl`, badges, and the interaction/motion rules that operationalize §2 and §6.


---

# Page & Component Specifications

## IA, Persona Modes & Customization Model

> **Scope of this section.** This is the navigation/IA, role-adaptation, and customization contract for the OPD analytics surface. It builds *directly* on what is already shipped in `src/pages/analytics`: `AnalyticsWorkspace.jsx` (sidebar + filter bar + `?view=` URL state + `customWidgets` per-leaf), `shell/analyticsNav.jsx` (`ANALYTICS_NAV` / `PAGE_MAP` / `DASHBOARD_ENDPOINTS`), `Widget.jsx` (the `{kind:'kpis'|'chart'|'table'|'empty'}` descriptor), `KpiCard.jsx` (value + single tinted delta tag), `AnalyticsChart.jsx` (`line|area|bar|stackedBar|pie|donut`), `AnalyticsTable.jsx` (filter+sort+paginate+CSV), `DateRangeControl.jsx` (`RANGE_PRESETS`), `QueryBuilderDrawer.jsx` (`DATASETS`/`OPERATORS`/`GRAINS`/`VIZ_TYPES`), and `ExportButton.jsx`. Every new behavior below is described as an extension of these, not a rewrite. Where a metric is feasibility-gated (§9 of the spec), the UI shows a **badge/placeholder, never a fabricated number** — implemented via the existing `Widget` `empty` kind, `Badge variant="warning"`, and `meta.note`.

---

### 1. OPD Information Architecture

#### 1.1 Nav tree (the shipped tree, OPD slice)

The sidebar (`AnalyticsSidebar` driven by `ANALYTICS_NAV`) already encodes the L1-section / L2-leaf model. The OPD surface is the `opd` cluster plus the clinic-wide roll-ups it shares. The IA the spec §5 calls for maps onto leaves like this:

```
OPD Overview  (digest landing — first screen, view=opd_overview)
│
├─ APPOINTMENTS
│   ├─ Appointments (rich funnel)        view=footfall / appointments
│   ├─ Follow-ups                        view=followups
│   └─ Consultation Channel (video/tele) view=consult_video
│   └─ Booking & AI Agents               view=booking_channels   [NEW leaf, 17% badge]
│
├─ BILLING & REVENUE
│   ├─ OPD Billing / Payments            view=opd_billing
│   ├─ Daily Collection                  view=daily_collection
│   ├─ Today (live)                      view=realtime
│   └─ 3C Report                         view=report_3c
│
├─ ALL PATIENTS
│   ├─ Patients (demographics)           view=opd_patients
│   ├─ Retention & Value (RFM/LTV)       view=retention          [NEW leaf]
│   └─ ABHA / ABDM                       view=abha
│
└─ PRESCRIPTIONS / RxPAD
    ├─ Prescriptions (Drug/Rx)           view=rx
    ├─ Prescribing Quality               view=clinical_quality
    ├─ Diagnoses                         view=diagnosis
    ├─ Lab Tests                         view=lab_tests
    ├─ Vitals                            view=vitals
    ├─ Symptoms (template-level)         view=symptoms           [template badge]
    ├─ Medical History                   view=medical_history
    ├─ Procedures (billed-service proxy) view=procedures         [proxy badge]
    ├─ Vaccination                       view=vaccination        [feature-flagged]
    ├─ Gynec & Obstetrics                view=gynec              [feature-flagged]
    ├─ Certificates                      view=certificates       [NEW leaf, low-vol]
    └─ Pending Digitization              view=pending_digi       [microservice badge]
```

**Nav rules (build-ready):**
- **Three nav states per leaf**, already supported by `AnalyticsSidebar`'s `builtIds` prop. Render a per-leaf status pill from a single map `LEAF_STATUS[leafId] ∈ {built, designed, gated}`:
  - `built` → no pill (data renders).
  - `designed` → the existing `Tag "Designed"` (placeholder page renders `planned` list).
  - `gated` → a `Badge variant="warning"` with a tooltip naming the blocker (e.g. "Booking source: ~17% coverage", "Symptoms: template-level only", "Pending digitization: lives in SnapRx").
- **Feature-flag gating** (spec §5, OQ #10): Vaccination, Gynec & Obstetrics are hidden unless `business.features[leaf] === true`. Implement as a `visibleFor(leaf, businessFlags)` predicate filtering `section.items` before render. They never aggregate into the Overview hero.
- **`clinical/procedure`** is relabelled "Procedures (billed-service proxy)" in OPD and suppressed from IPD contamination — it is a billed-service proxy, badged as such.
- **URL is the source of truth.** `?view=<leafId>` already persists active leaf across refresh (`AnalyticsWorkspace`). Extend this query string to carry the full filter state (§3.4) so a view is fully shareable.

#### 1.2 The Overview digest (the `opd_overview` landing)

Maps to `DASHBOARD_ENDPOINTS.opd_overview = { endpoint:"operational/overview", params:{careSetting:"opd"} }`. It is a **10-second triage**, not an analysis surface. Layout, in the existing `analytics-grid analytics-canvas` (12-col CSS grid; `Widget kind:"kpis"` already spans `col-span-full`):

```
┌─ filter bar (pinned) ──────────────────────────────────────────────────────┐
│ Doctor ▾   Clinic ▾   Period ▾(Last 30d)   [Visit type ▾]   ⟳ Refresh  Reset │
├──────────────────────────────────────────────────────────────────────────────┤
│ HERO STRIP — 4 KpiCard  (kind:"kpis", grid sm:2 / xl:4)                       │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐                             │
│ │ Total    ││Completion││ Collected││  ABHA    │   each: value + tinted       │
│ │ Appts    ││  rate    ││ ₹ +leak  ││ linkage  │   delta tag (vs prev period)│
│ └──────────┘└──────────┘└──────────┘└──────────┘                             │
│ SECONDARY STRIP — 4 KpiCard (smaller)                                         │
│ New patients · Follow-up advised % · Tele share · Generic Rx %               │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ ONE TREND (span:full)         │  CONSULT-MODE MIX (100% stacked bar)          │
│ Appts vs Cancelled · 12 mo    │  in-clinic / walk-in / video / tele           │
│ AnalyticsChart type="line"    │  AnalyticsChart type="stackedBar"             │
├───────────┬───────────┬───────┴────────┬──────────────────────────────────────┤
│ Top-5     │ Top-5     │ Top-5          │  ABHA link-rate gauge                 │
│ Diagnoses │ Drugs     │ Investigations │  (linked ÷ seen; KYC sub-segment)     │
│ ranked    │ ranked    │ ranked bars    │  [Most-visited specialty: gated badge]│
│ bars+Δ    │ bars+Δ    │ +Δ per row     │  [Top symptoms: template badge]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ LEAKAGE COUNTER (big-number callout) — Finished-but-unbilled: N visits ≈ ₹X   │
│ [VERIFY badge until pam_id join confirmed]  → click drills to register        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Hero cards** use `KpiCard` exactly as shipped: `title / value / prefix(₹) / delta / deltaLabel="vs previous 30 days"`. Semantic inversion is a card prop, not new color logic: pass an already-signed `delta` and an `invert` flag so Cancellation / Outstanding / Overdue render **red-up** (extend `KpiCard` `DIR` selection: `effectiveDir = invert ? flip(dir) : dir`).
- **Top-5 lists** are `AnalyticsChart type="bar"` rendered horizontally (swap `XAxis`/`YAxis` via a `layout="vertical"` prop add to `AnalyticsChart`), each row carrying a MoM delta tag. **No pies** (spec design principle 5; R6 pitfall).
- **Consult-mode** is the one place a single 100% stacked bar is mandated — never a pie.
- **Top symptoms / Most-visited specialty** render as `Widget kind:"empty"` with `note` ("Template-level only" / "Needs verified doctor→specialty map") until the source clears — they occupy the slot honestly rather than disappearing.

---

### 2. Persona Modes & Role Adaptation

The whole suite is **one set of pages**; the persona changes *scope, defaults, framing, and which leaves are reachable* — never the page structure. Scope is enforced **server-side from the JWT** (`hm_business_id` + role claim). The frontend reads the same claim to set defaults and disable controls it must not allow.

#### 2.1 The role claim → client config

Resolve once at workspace mount (extend `AnalyticsWorkspace`):

```
const role = decoded.role  // 'doctor' | 'specialty_admin' | 'ops_admin'
const persona = PERSONA[role]  // see table below
```

| | **P1 Doctor** | **P2 Specialty/HoD Admin** | **P3 Ops Admin / Owner** |
|---|---|---|---|
| **Default scope** | `doctor = self` (locked) | `doctor = all` within own specialty; specialty locked | `doctor = all`, `specialty = all`, all hospitals |
| **Doctor filter** | hidden / disabled (self only) | enabled, **list pre-filtered to own specialty** | enabled, full list |
| **Specialty filter** | hidden | locked to own specialty (shown read-only) | enabled multi-select |
| **Hospital filter** | own clinics only | own clinics | all clinics |
| **Default landing** | `opd_overview` scoped to self | `opd_overview` scoped to specialty | `opd_overview` clinic-wide |
| **Default saved view** | "My Practice" | "My Department" | "Clinic Health" |
| **Reachable nav** | full OPD tree, all data self-scoped | full OPD tree, specialty-scoped | full tree, unrestricted |
| **Framing of doctor metrics** | "**You** vs specialty median" self-benchmark | "doctor vs peer-median spread" coaching | leaderboard, but still median-anchored |
| **Leakage tiles** | own lost earnings | which doctor leaks | clinic ₹ recovery register |

**Behavioral framing rule (spec §2):** doctor-level metrics are *always* variance vs the **specialty-peer median**, never raw league tables. Implement as a shared `<PeerDeltaTag value median />` rendered beside the metric (reuses `KpiCard`'s tinted-tag styling). For P1 it reads "you vs dept median"; for P2/P3 the leaderboard rows carry the same delta as a secondary metric beside the volume bar (R3 pattern — already the convention for `AnalyticsTable` leaderboards).

#### 2.2 Per-persona DEFAULT dashboards

Same `opd_overview` layout, different **default filter state + default ordering of which drilldowns are surfaced first** (a `personaDefaults[role]` object consumed by `AnalyticsWorkspace` initial state):

- **P1 "My Practice":** scope=self, period=Last 30d. Hero = My Appointments · My Completion · My Collected/Leakage · My ABHA. The two highest-priority drilldowns auto-pinned below the hero: **Overdue follow-up worklist** (today's recall list) and **My finished-but-unbilled** register. Top-5 drugs/diagnoses are *mine*. No doctor-comparison block.
- **P2 "My Department":** scope=own specialty, period=Last 30d. Hero = Dept Appointments · Dept Completion · Dept Collection · Dept ABHA. First drilldown = **doctor-vs-doctor leaderboard** (volume bar + secondary quality metric: completion / follow-up adherence / ABHA% / generic%). Capacity heatmap (hour×DOW) and "widest doctor spread" callout pinned.
- **P3 "Clinic Health":** scope=all, period=Last 30d. Hero = Clinic Appointments · Completion · **Collected ₹ + Outstanding/Leakage** · ABHA. First drilldown = the **leakage register stack** (finished-but-unbilled, dues>90d, refunds/credit-notes) + **most-visited specialty** + consult-mode shift. The cross-sell map (top investigations → lab tie-up, top drugs → pharmacy attach) is pinned high.

These are **defaults, not locks** — every persona can re-pin/save (§4). The difference is what they see *first*.

---

### 3. Global Filters & Cross-Filtering

#### 3.1 The filter bar (extend the shipped `analytics-filterbar`)

The pinned filter bar already lives below the header in `AnalyticsWorkspace`. The shipped fields are Doctor · Clinic/Hospital · Period, plus patient-only quick filters (Gender · Patient type · ABHA · Blood group). The spec calls for the global set: **date · specialty · doctor · visit type · gender · hospital**. Add **Specialty** and **Visit type** as first-class global controls (the patient-only quick filters stay scoped to patient leaves):

| Filter | Control | Component | Values | Notes |
|---|---|---|---|---|
| **Date** | preset dropdown + custom range | `DateRangeControl` (shipped) | Today · 7d · 15d · 30d · 90d · 1y · Custom | drives `grain` auto-switch (day ≤92d, else month) — already implemented |
| **Specialty / Dept** | single (P2 locked) / multi (P3) | antd `Select` | from `dp_id`/`um_master.speciality` | **gated:** if doctor→specialty map unverified, disable with tooltip (spec OQ #7) |
| **Doctor** | searchable select | antd `Select showSearch` (shipped) | scoped per persona | P1 hidden; P2 pre-filtered to specialty |
| **Visit type** | single select | antd `Select` | All · New · Follow-up · Walk-in · Video/Tele | from `pam_type` / `pam_appointment_type` / `pam_status_type_appointment` |
| **Gender** | single select (patient leaves) | shipped | All · M · F · M+F · M+O | already wired to server `gender` param |
| **Hospital/Clinic** | single select | shipped | own/all per persona | wired to `hospitalId` |

All filters serialize into the existing `pageFilters` object (`AnalyticsWorkspace`) and travel to every loader; the server re-applies scope from the JWT regardless. **Reset all** button (shipped) clears to persona defaults, not to global "all".

#### 3.2 What is fixed vs configurable (filters)

- **Fixed (server-enforced, non-overridable):** `hm_business_id`, persona scope (P1=self, P2=specialty). The doctor/specialty *select widgets* are disabled, not just hidden, so a crafted URL can't widen scope — the server ignores it anyway.
- **Configurable:** every date/specialty(within scope)/doctor(within scope)/visit-type/gender/hospital choice. Defaults come from `personaDefaults`; user overrides persist into the active saved view.

#### 3.3 Cross-filtering (drill / click-to-filter)

This is the highest-value interaction and is *not yet shipped* — it's an additive layer on `AnalyticsChart` and `AnalyticsTable`:

- **Click a chart element → apply it as a global filter.** Clicking a bar in "Top diagnoses", a slice of consult-mode, a doctor row in the leaderboard, or a segment of the status funnel sets the corresponding global filter and re-queries the whole page. Implement via Recharts `onClick` handlers in `AnalyticsChart` that emit `{dim, value}` up to `AnalyticsWorkspace`, which merges into `pageFilters`. Show the active cross-filter as a removable antd `Tag` chip in the filter bar ("Diagnosis: Hypertension ✕").
- **Drilldown to register.** Every headline KPI and big-number callout links to its **row-level register** (spec lists 6 for Appointments). Clicking opens the register as a full-span `Widget kind:"table"` (`AnalyticsTable`) *below* the canvas, pre-filtered to the clicked context, with the `ExportButton` patient-level CSV/XLSX (shipped — exports the full loaded patient rows, not just chart aggregates).
- **Funnel leak → register.** Status funnel segments (Cancelled, No-show proxy, Finished-but-unbilled, Pending-digi) each drill to their named register (overdue follow-up worklist, finished-but-unbilled, stale-queue, not-ABHA-linked).
- **Cross-domain hops.** A diagnosis row offers a "→ see lab cross-sell" / "→ see drug attach" action (the spec's compounding insight). Implement as a row action that navigates `setLeaf('lab_tests')` carrying the diagnosis as a cross-filter chip.
- **Scope guard:** cross-filters can only *narrow* within the persona's allowed scope; they never widen it.

#### 3.4 Filter state in the URL

Extend the shipped `?view=` to a full query string: `?view=opd_overview&from=2026-05-10&to=2026-06-09&doctor=123&specialty=cardio&visit=followup`. This makes any filtered/cross-filtered state shareable and bookmarkable, and is the substrate for saved views (§4.1).

---

### 4. Customization Model

The shipped scaffolding already proves the pattern: `customWidgets[leaf]` (per-leaf user widgets with a remove button), the `QueryBuilderDrawer` (+Add Widget), `ExportButton`, and `?view=` URL state. The customization model formalizes these into four capabilities. **Everything customizable is per-user and persisted server-side keyed by `(userId, leafId)`; nothing customizable changes another user's view or the data scope.**

#### 4.1 Saved Views

- **What:** a named snapshot of `{leaf, filters, pinned card order, custom widgets, thresholds}`. Each persona ships with one default ("My Practice" / "My Department" / "Clinic Health"); users create more ("Diabetes panel", "Front-desk recall", "Month-end leakage").
- **UI:** a Views dropdown in the topbar beside the title (antd `Select` + "Save current as…" + "Set as default"). Active view name reflects in the title.
- **Persistence:** serialize the same shape the URL carries (§3.4) plus the pin/threshold layer; POST to a `user_analytics_views` store. Falls back to URL-only state if persistence is unavailable (graceful — `?view=` already survives refresh).
- **Fixed:** scope filters (persona) cannot be saved as a wider scope; a saved view re-validates against the current role on load.

#### 4.2 Pinnable / rearrangeable cards

- **What:** pin a chart/table/KPI to the top of any page; drag to reorder within the canvas. Built on the existing `Widget` descriptor list — add `pinned: bool` and `order: int` to each descriptor.
- **UI:** a pin icon + a drag handle in the `Widget` `CardHeader` (where `ExportButton` already sits). Reorder via a lightweight DnD (e.g. dnd-kit) operating on the `widgets` array; persist `order` into the active saved view.
- **Fixed vs configurable:** the **hero KPI strip and the page's one mandated trend are fixed in position** (they define the page's identity and the 10-second read); only the secondary cards, leaderboards, registers, and custom widgets are rearrangeable. This prevents users from burying the leakage counter.

#### 4.3 Self-serve Query Builder (the shipped `QueryBuilderDrawer`)

The drawer is already built end-to-end (dataset → measures → group-by → filters → viz → preview → "Add to dashboard"), backed by the semantic `DATASETS` catalog (collections, appointments, consultations, diagnosis, prescriptions) with `live` flags, `OPERATORS`, `GRAINS`, `VIZ_TYPES`, and `recommendViz` auto-suggest. Formalize it as the customization escape hatch:

- **Governed surface:** the builder only exposes measures/dimensions/filters that exist in the catalog (and therefore have a valid server query) — users cannot author a query against data we don't have. `live:false` datasets carry a "Needs API" tag (shipped) and, where applicable, a feasibility badge.
- **Output:** a `custom` `Widget` descriptor added to `customWidgets[leaf]`, rendered under a "Your widgets" divider (shipped), each removable.
- **Promotion:** a custom widget can be pinned (§4.2) and saved into a view (§4.1) — so the builder + pinning + saved views compose into a personal dashboard without engineering.
- **Honest defaults:** the builder respects the same feasibility tags; the catalog must not offer a measure that resolves to fabricated data (e.g. occupation/marital/area, true OPD procedures, ABHA stage) — these are simply absent from `DATASETS`.

#### 4.4 Thresholds & Targets

- **What:** per-metric target lines and alert thresholds (e.g. collection-rate target 95%, cancellation alert >8%, ABHA linkage goal 60%, days-to-follow-up SLA).
- **UI:** a "Set target" action in the `KpiCard` / chart overflow menu → a small popover (target value + direction good/bad). Stored per `(userId, metricId)` in the saved view.
- **Render:** target as a Recharts `ReferenceLine` on the relevant trend; on KPIs, a second micro-tag "vs target" beside the "vs previous period" tag (reuse the tinted-tag component, colored by whether target is met — semantic, inverted for red-up metrics).
- **Configurable vs fixed:** target *values* are user/admin-configurable; the **good/bad direction (semantic inversion) is fixed in code** per metric (cancellation/outstanding/overdue/polypharmacy/backlog are always red-up) so a user can't accidentally mark a rising leak as "good".

#### 4.5 Export

- **Always available, fixed behavior:** every `Widget` (chart/table/register) carries the shipped `ExportButton` → CSV / XLSX. It prefers **patient-level rows** (the full records behind the chart) over chart aggregates when present — keep this as the default. Registers export the full filtered row set; charts export their series. Free-text/sparse/derived exports carry the `meta.note` as a footer row so the caveat travels with the data.
- **Reports hub** (`reports_hub` / `ReportModal`) remains the place for the canned 3C / daily-collection / incentive exports.

#### 4.6 Customization — configurable vs fixed (summary)

| Capability | Configurable | Fixed (and why) |
|---|---|---|
| Filters | date, specialty/doctor (within scope), visit type, gender, hospital | `hm_business_id` + persona scope (server-enforced; prevents data leak) |
| Layout | secondary cards, leaderboards, registers, custom widgets (pin/reorder) | hero KPI strip + the one mandated trend (define the 10-sec read; can't bury leakage) |
| Cards | add via query builder, pin, save | the catalog of available measures (governed to real data only — no fabricated metrics) |
| Thresholds | target values | semantic good/bad direction per metric (red-up leaks stay red-up) |
| Views | create/name/set-default per user | re-validated against role on load (a saved view can't widen scope) |
| Export | which widget, CSV vs XLSX | patient-level-preferred behavior + mandatory `meta.note` footer on caveated data |

---

### 5. States, Responsiveness, Visualization Conventions

#### 5.1 States (per `Widget`, reusing shipped patterns)

| State | Trigger | Rendering |
|---|---|---|
| **Loading** | `useAnalyticsPage.loading` | antd `Skeleton active` in the canvas (shipped); per-widget shimmer for cross-filter re-query so the page doesn't blank. |
| **Empty (no rows, valid query)** | `rows.length === 0` | `AnalyticsChart` returns `null`; `Widget` shows "No data for this period" (KPI) / centered note (chart) — shipped. |
| **No-data / blocked (feasibility)** | metric is `gated`/`X` | `Widget kind:"empty"` with `InfoCircle` + `note` + `planned[]` list (shipped). Never a zero number. |
| **Sandbox / unreliable** | ABHA (~99% sandbox today), 17% booking coverage, template symptoms, wait-time unconfirmed | `Badge variant="warning"` in the card header ("Sandbox", "~17% coverage", "Template-level", "Timestamps unconfirmed") + `meta.note` footer. The metric still renders but is honestly qualified. |
| **Error** | loader throws | antd `Alert type="error"` at canvas top (shipped); widgets that did load stay visible. |
| **Designed (not built)** | leaf not in `PAGE_MAP`/`DASHBOARD_ENDPOINTS` | `PlaceholderPage` with `planned`/`needs` (shipped) + "Designed" tag in title. |

#### 5.2 Responsive breakpoints (Tailwind `tw-` prefix, matching shipped grid)

- **`< sm` (mobile):** single column; KPI strip `grid-cols-1`; sidebar collapses to the shipped hamburger + backdrop drawer; filter bar wraps and the secondary patient filters move into an "All filters" sheet; charts full-width at reduced height (~200px); registers become horizontally scrollable (`AnalyticsTable` already paginates).
- **`sm` (≥640):** KPI `sm:grid-cols-2` (shipped); two-up charts where `span!=="full"`.
- **`lg` (≥1024):** sidebar persistent; charts honor `span:"half"` 2-up.
- **`xl` (≥1280):** KPI hero `xl:grid-cols-4` for the 4-card hero (extend the shipped `xl:grid-cols-3` for KPI rows that hold 4); full 12-col canvas.

#### 5.3 Chart-type per metric (locked conventions — spec design principle 5; component support confirmed in `AnalyticsChart`)

| Metric family | Chart | Component call |
|---|---|---|
| Single KPI + delta | KPI tile | `KpiCard` (value + tinted delta tag) |
| Trend over time (1–2 series) | line | `AnalyticsChart type="line"` |
| Trend, volume emphasis | area | `type="area"` |
| Top-N rank (diagnoses/drugs/tests/doctors) | **horizontal bar** + secondary quality metric | `type="bar"` (add `layout="vertical"`) |
| Status funnel | horizontal stacked bar w/ leak callouts | `type="stackedBar"` |
| Consult-mode / new-vs-follow-up / channel mix | **100% stacked bar** (never pie) | `type="stackedBar"` |
| Composition ≤5 slices only | donut | `type="donut"` |
| ABHA linkage / completeness | progress gauge | small gauge (add) + KYC sub-segment |
| Peak hour × DOW | heatmap matrix | add `type="heatmap"` to `AnalyticsChart` |
| Follow-up adherence | funnel + dual-axis combo (advised bars + adherence-% line) | combo (add) |
| Wait-time distribution | box-plot / distribution (P50/P90) | add; **render only when timestamps profiled**, else `empty` |
| Revenue/appt by doctor | ranked bars; leakage = big-number callout | `type="bar"` + callout |
| Row-level detail | sortable/paginated/filterable table | `AnalyticsTable` + `ExportButton` |

**Forbidden (spec + R6 pitfalls):** pies for >5 slices, treemaps for many categories, color-only good/bad (always pair color with sign/arrow icon — `KpiCard` already does), unlabeled dual axes, and any IPD visual (LOS/occupancy/readmission/mortality) on OPD pages.

---

### 6. Honest-data guardrails (binding on every screen above)

- **Don't design UI for data we don't have.** Occupation/marital/area, true OPD clinical procedures, lab abnormal-results, ABHA link-velocity/stage, VoiceRx/SmartSync product-mode, symptom-collector funnel, expense/margin → **absent from nav data slots and from the query-builder catalog**; where a leaf must exist for completeness it shows the `designed`/`gated` placeholder.
- **Badge, don't fabricate.** ABHA (~99% sandbox today) → "Sandbox" badge; booking source (~17%) → "~17% coverage" badge with denominator shown; symptoms → "Template-level"; wait-time → renders only after `tbl_patient_visit_logs` profiling, else `empty`; finished-but-unbilled leakage → "VERIFY join" badge until `pam_id` persistence confirmed (spec OQ #1).
- **`meta.note` is mandatory** for any free-text/sparse/derived/cross-service metric and must appear both in the widget footer and in its export.

**Files an engineer builds from (absolute):** `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/AnalyticsWorkspace.jsx` (filter bar, `?view=` state, `customWidgets`, persona defaults to add), `.../shell/analyticsNav.jsx` (`ANALYTICS_NAV`/`PAGE_MAP`/`DASHBOARD_ENDPOINTS` — add new leaves + `LEAF_STATUS`), `.../shell/AnalyticsSidebar.jsx` (`builtIds`/status pills), `.../components/Widget.jsx` (add `pinned`/`order`/cross-filter emit), `.../components/KpiCard.jsx` (add `invert` + "vs target" tag), `.../components/AnalyticsChart.jsx` (add `layout="vertical"`, `heatmap`, combo, `onClick` cross-filter), `.../components/AnalyticsTable.jsx` + `ExportButton.jsx` (registers, unchanged), `.../components/DateRangeControl.jsx` (`RANGE_PRESETS`, unchanged), `.../components/QueryBuilderDrawer.jsx` + `.../analyticsCatalog.js` (governed query builder), `.../ui/badge.jsx` (`warning` variant for sandbox/coverage badges). Spec source: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/docs/analytics-planning/OPD_Analytics_Spec.md` (§2 personas, §5 IA, §8 KPI matrix, §9 feasibility, Overview-digest and Appointments sections).

---

## Page Layouts — OPD Overview, Appointments, OPD Billing

> **Scope of this section.** Three OPD pages, built directly on the shipped analytics component system (`src/pages/analytics`). Every layout reuses the standard page shape from §4.3 of the front-matter: **pinned filter bar → KPI hero strip → one trend → ranked bars / leaderboards → detail register**. Nothing in these layouts is designed for data tagged **P / S / X** in the §9 feasibility matrix without an explicit feasibility/sandbox badge and a degraded fallback. A frontend engineer should be able to build each page as a `widgets[]` array consumed by the existing `<Widget>` renderer plus a small number of new widget *kinds* defined at the end of this section.

---

### 0. Shared foundations (apply to all three pages)

**0.1 Component contract.** Pages are composed as an ordered `widgets[]` array, rendered by `AnalyticsWorkspace` → `Widget.jsx`. Existing widget kinds: `kinds = kpis | chart | table | empty`. We add four new kinds below (`funnel`, `leaderboard`, `gauge`, `bignum`) — all thin shadcn `Card` wrappers, no new chart library. Each widget descriptor:

```
{ id, kind, title, span:"full"|undefined, sample?:bool, feasibility?:"reliable"|"profiling"|"service"|"sandbox",
  note?, // meta.note string — mandatory for any free-text/sparse/derived/coverage-limited metric
  chartType?, data?:{columns,rows}, viz?:{x,y[]}, columns?, rows?, patientData?, // (existing)
  kpis?:[ { title, value, prefix, suffix, description, delta, deltaLabel } ], // KpiCard props (already shipped)
  drilldown?: { leaf, register, prefill } // NEW: where a click on this widget routes (see 0.5)
}
```

**0.2 Grid & responsive.** The body is the shipped `.analytics-grid` (`grid-template-columns: 1fr 1fr; gap:16px`), `span:"full"` → `gridColumn:"1 / -1"`. KPI rows use `Widget`'s internal `tw-grid-cols-1 sm:tw-grid-cols-2 xl:tw-grid-cols-3`. Confirmed breakpoints from `AnalyticsWorkspace.scss`:

| Width | Grid | KPI strip | Filter bar |
|---|---|---|---|
| ≥1100px (desktop) | 2 columns | 3–4 across (xl:3) | single row, inline |
| 720–1100px (tablet) | 1 column (charts full-bleed) | 2 across (sm:2) | wraps to 2 rows |
| ≤768px (mobile) | 1 column | 1 across | stacks; sidebar → hamburger drawer (`mobileNavOpen`); filter bar horizontally scrolls; registers switch to the **stacked-row card** variant (§0.6) |

Charts pass `height` (default 280; hero trend 320; heatmap 360). On mobile, charts keep `tw-w-full`; donuts/gauges keep `tw-aspect-square` and shrink with the column.

**0.3 Filter bar (pinned, existing `.analytics-filterbar`).** Order, left→right: **Doctor → Clinic/Hospital → Period (`DateRangeControl`)**, then page-specific filters, then `Reset all`, spacer, `Refresh`. Persona scoping is server-side (JWT `hm_business_id` + role) and reflected in the UI:
- **P1** — Doctor select is locked to self (rendered disabled, value = own name); no "All doctors".
- **P2** — Doctor select pre-filtered to own specialty; a **Specialty** chip shows the locked department.
- **P3** — all selects open; gains a **Specialty/Department** select (between Doctor and Hospital) once the doctor→specialty map is verified (§9 VERIFY); until then that select is hidden, not faked.
- `Period` uses the shipped presets (`Today / 7d / 15d / 30d / 90d / 1y` + custom). `grain` auto-derives: day if window ≤92d, else month (existing logic) — drives every trend's bucketing.

**0.4 Comparison baseline.** Every `KpiCard` carries `delta` + `deltaLabel="vs previous period"` against the equal prior window (`comparisonWindow`/`pctDelta`, already wired). **Semantic inversion is set per-card, not globally:** good-rising metrics (completion, collection, ABHA, adherence, capture) → `delta>0` renders green via the shipped `DIR.up`; bad-rising metrics (cancellation, no-show, outstanding, refunds, overdue follow-ups, discount leakage) must pass a **pre-inverted delta sign** so the existing `delta>0 → green` logic shows red. Implementation note for eng: KpiCard has no `invert` prop today — either add `invert?:bool` to KpiCard (preferred, one-line: flip `dir` when `invert`) or negate `delta` upstream in the builder. The arrow icon must always reflect the *real* direction of change, so prefer adding the `invert` prop.

**0.5 Interactions — drilldown, cross-filter, row→register.**
- **KPI → register.** Clicking a hero KPI (or its `→` affordance on hover) routes to the page's detail register tab with that metric's filter pre-applied (`drilldown:{leaf, register, prefill}`), e.g. *Outstanding ₹* → Billing register filtered `balance>0` sorted desc. Use `setSearchParams` (the existing `?view=` addressable-dashboard pattern) extended with `?register=…&prefill=…`.
- **Ranked bar / leaderboard row → cross-filter.** Clicking a bar (e.g. a doctor, a diagnosis, a service) sets a **cross-filter chip** in the filter bar (`doctorId`, or a transient `dim=value`) and re-queries the whole page scoped to it; the chip is dismissible and shows in the bar next to Reset. This is the R2/R4 "drill through" behavior the references hint at — but explicit and reversible, never a hidden right-click.
- **Register row → entity.** A row in the appointment/dues/leakage register links the patient cell to the existing patient drawer/EMR record (UHID) and the doctor cell to that doctor's scoped view.
- **Trend brush → period.** Selecting a span on the hero trend updates `Period` (optional, P1 — wire after MVP).

**0.6 States — one spec, applied everywhere.**
- **Loading.** Page-level: the shipped antd `Skeleton` block (2× `paragraph rows:6`) while `loading`. Per-widget refresh (cross-filter / period change): keep the card mounted, overlay a `tw-animate-pulse` shimmer on the card body and disable its export button — never collapse the grid (prevents layout jump).
- **Empty (query ran, zero rows).** `kind:"empty"` card (shipped) — amber `InfoCircle`, centered `note`, optional `planned[]` bullets. Copy pattern: *"No finished appointments in this period."* Registers show the shipped `AnalyticsTable` "No matching rows" body inside the bordered frame (header/filter stay).
- **No-data honesty (metric not backed by reliable data).** Render the card but replace the value with a muted placeholder and a **feasibility badge** + `note`. Never a fabricated number. Badge variants map to §9 tags:
  - `feasibility:"profiling"` → `<Badge variant="warning">Needs profiling</Badge>` + note (e.g. wait-time, leakage join, discount value).
  - `feasibility:"service"` → `<Badge variant="secondary">Live source pending</Badge>` (e.g. pending-digitization via SnapRx, advance discrete flows).
  - `feasibility:"sandbox"` → `<Badge variant="warning">Sandbox / test data</Badge>` — **mandatory on every ABHA tile** (ABHA is ~99% sandbox today): show the computed share but caption *"ABHA data is largely sandbox/test today; treat as directional."*
  - Coverage-limited (booking source ~17%) → value shown with a `description` like *"17% of appointments carry a source"* and `Badge variant="outline">17% coverage`.
- **Error (request failed).** Page-level antd `Alert type="error"` (shipped) above the grid; cards that did load stay. A `Retry` action re-fires `refreshNonce`.
- **Sample (API off / flag fallback).** When `analytics-use-api` is off, faithful sample pages render with the shipped `<Badge variant="warning">Sample</Badge>` in every card header (existing `widget.sample` path).

**0.7 Customization hooks.** Every page keeps the shipped **Add Widget** drawer (`QueryBuilderDrawer`) — user-added widgets render under a "Your widgets" divider and are removable. Per-card `ExportButton` (CSV, dual-sheet when `patientData` present) stays in every chart/table/leaderboard header. Hero KPIs are reorderable only via config, not user DnD (out of scope for MVP).

---

### 1. OPD Overview (digest landing) — `leaf:"overview"`

The 10-second "is my OPD healthy, where do I look next?" Not an analysis surface — every tile drives a next click into a pillar. Backed entirely by RELIABLE builders for P0; everything else badged.

**1.1 Layout**

```
┌─ FILTER BAR ───────────────────────────────────────────────────────────────┐
│ Doctor▾  Clinic/Hospital▾  Period▾                       Reset all   ⟳ Refresh│
└──────────────────────────────────────────────────────────────────────────────┘

HERO STRIP  (kind:kpis — primary row, xl:4 across)
┌────────────┐┌────────────┐┌────────────┐┌────────────┐
│Total Appts ││Completion %││Collected ₹ ││ABHA linkage││
│  1,275     ││   88.2%    ││  ₹6.4L     ││   42%      │
│vs prev +6% ││ +2.1pp ↗  ││ +4% ↗      ││ sandbox⚠   │
└────────────┘└────────────┘└────────────┘└────────────┘

SECONDARY STRIP (kind:kpis — xl:4 across, smaller emphasis)
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│New pts   ││Follow-up ││Tele share││Generic Rx│
│  329     ││ advised  ││  9.7%    ││   58%    │
│New:Ret   ││  31%     ││          ││          │
└──────────┘└──────────┘└──────────┘└──────────┘

LEAKAGE COUNTER (kind:bignum, span:full, feasibility:"profiling")
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠ Needs profiling   Finished-but-unbilled this period                          │
│  47 visits  ·  ~₹38,600 estimated lost fees      [ View leakage register → ]    │
│  Estimate; depends on the appointment↔billing join — confirm pam_id persistence │
└──────────────────────────────────────────────────────────────────────────────┘

ONE TREND (kind:chart, type:line, span:full, height:320)
┌──────────────────────────────────────────────────────────────────────────────┐
│ Appointments vs Cancelled — last 12 months              [⤓ export]              │
│  (dual-series line: total = chart-1 indigo, cancelled = chart-5 pink)           │
└──────────────────────────────────────────────────────────────────────────────┘

REVENUE MAP — three ranked lists side by side (2-col grid; 3rd wraps)
┌───────── Top diagnoses (30d) ─────────┐┌──── Top investigations (lab cross-sell) ┐
│ Hypertension     ▆▆▆▆▆▆ 24  ↗+3      ││ CBC            ▆▆▆▆▆▆ 30   (free-text⚠) │
│ Type 2 Diabetes  ▆▆▆▆▆ 19   ↘-1      ││ Lipid Profile  ▆▆▆▆ 22                   │
│ …                                    ││ …                                       │
└───────────────────────────────────────┘└──────────────────────────────────────────┘
┌───────── Top drugs (pharmacy attach) ─┐┌──── Consult-mode mix (100% stacked bar)─┐
│ Crocin           ▆▆▆▆▆▆ 42            ││ ███ in-clinic ██ walk-in █ video ▏tele  │
│ …                                    ││  (single horizontal 100% bar, 4 segs)    │
└───────────────────────────────────────┘└──────────────────────────────────────────┘

ABHA GAUGE (kind:gauge, feasibility:"sandbox")    MOST-VISITED SPECIALTY (kind:leaderboard, VERIFY)
┌─────────────────────────┐┌─────────────────────────────────────────┐
│ ABHA link-rate          ││ Most-visited specialty       (verify map) │
│   ◔ 42% linked          ││ Cardiology   ▆▆▆▆▆▆ 412                   │
│   28% KYC-verified      ││ …  — hidden until doctor→specialty map ok │
│   Sandbox/test data ⚠   │└─────────────────────────────────────────┘
└─────────────────────────┘
```

**1.2 Cards, anatomy, chart type, feasibility**

| Block | Card anatomy (title · value · trend-tag · comparison) | Chart/widget | Feasibility & note |
|---|---|---|---|
| Total Appointments | "Total Appointments" · count · `↗ % vs prev` · vs prior window | KpiCard | RELIABLE |
| Completion rate | "Completion rate" · % · green-up delta (pp) | KpiCard | RELIABLE |
| Cancellation rate | "Cancellation rate" · % · **red-up** (`invert`) | KpiCard | RELIABLE |
| Collected ₹ | "Collected" · `prefix:₹` value (k/L/Cr fmt) · green-up | KpiCard | RELIABLE |
| Outstanding / leakage ₹ | "Outstanding" · ₹ · **red-up** | KpiCard | RELIABLE |
| New patients + New:Returning | "New patients" · count · `description:"New : Returning 1 : 2.9"` | KpiCard | RELIABLE (prefer clean `pam_type`; until mapped, derive — note it) |
| Follow-up advised rate | "Follow-up advised" · % | KpiCard | RELIABLE (`tcm_followup_date`) |
| Tele/video share | "Tele/video share" · % | KpiCard | RELIABLE |
| Generic Rx % | "Generic Rx" · % · green-up | KpiCard | RELIABLE |
| ABHA linkage | "ABHA linkage" · % · `Badge sandbox` | KpiCard + badge | RELIABLE math, **sandbox-flagged** |
| Finished-but-unbilled | bignum: count + ₹ + register CTA | **bignum (new)** | **profiling** — join unverified; show estimate, never a hard number |
| Appointments vs Cancelled | header + `→` to Appointments | chart `type:"line"`, `viz:{x:"month", y:["total","cancelled"]}` | RELIABLE |
| Top diagnoses / drugs / investigations | each a ranked list w/ count bar + MoM delta tag per row | **leaderboard (new)**, `metric:count`, `delta` per row | diagnoses/drugs RELIABLE; investigations **free-text-messy** note |
| Consult-mode mix | single 100% stacked horizontal bar, 4 segments | chart `type:"stackedBar"` horizontal, or **leaderboard** as 100%-bar | RELIABLE (no VoiceRx/SmartSync labels — NOT-IN-DB) |
| ABHA gauge | linked ÷ seen ring + KYC sub-segment | **gauge (new)** | sandbox-flagged |
| Most-visited specialty | ranked bars | leaderboard | **VERIFY** — render only if doctor→specialty map confirmed; else omit (do not stub) |
| ~~Top symptoms~~ | — | — | **NOT-IN-DB** — omit from landing; if a stakeholder insists, render a single `empty` card noting "template-level only, per-patient symptoms live in a microservice." Default: not shown. |

**1.3 Interactions.** KPI → pillar: Total Appts/Completion/Cancellation → Appointments; Collected/Outstanding → OPD Billing; Generic Rx → Prescriptions; ABHA → ABHA page. Leakage bignum CTA → Billing zero-bill register. Each ranked-list row → cross-filters the target pillar (click a diagnosis → Diagnoses page scoped to it; click a drug → Drug page). The hero trend is read-only on the landing (drill via the strip). Doctor-variance micro-deltas (P1 "your X vs dept median") render as a small caption under Generic Rx and Follow-up cards for P1 only.

**1.4 States.** Loading: skeleton. Leakage bignum always carries the profiling badge. ABHA always carries sandbox. Most-visited specialty is the one block that may be entirely absent (feasibility gate), not an empty card. Sample mode badges every header.

---

### 2. Appointments — `leaf:"appointments"`

The transaction spine. Layout reads top-down as the **status funnel → timing → follow-up loop → channel → peak → per-doctor leaderboard → revenue/leakage → ABHA → registers**, but the page only *renders* the P0/P1 blocks; P-tagged groups are badged, X-tagged are omitted.

**2.1 Layout**

```
┌─ FILTER BAR ──────────────────────────────────────────────────────────────────┐
│ Doctor▾  Specialty▾(P3)  Clinic▾  Period▾   [+ Visit-type▾] [+ Channel▾]  Reset ⟳│
└──────────────────────────────────────────────────────────────────────────────────┘

HERO STRIP (kind:kpis, xl:4 + xl:4)
[Total appts] [Completion %] [Cancellation % red] [No-show % red ⚠profiling]
[Finished]    [Queue/Sched]  [Revenue/finished ₹] [ABHA-linked share ⚠sandbox]

STATUS FUNNEL (kind:funnel, span:full)            ← the first thing every persona reads
┌──────────────────────────────────────────────────────────────────────────────┐
│ Total 1,275 ─► Queue 312 ─► Finished 921 ─► (Cancelled 42 · No-show 18⚠ ·       │
│                                              Draft 9⚠ · Pending-digi —⚠service) │
│  horizontal funnel/stacked bar; leaks (cancel/no-show/draft/pending) as red tags│
└──────────────────────────────────────────────────────────────────────────────┘

TREND (kind:chart, type:line, span:full)   Appointments vs Cancelled over period

PEAK MAP + FOLLOW-UP LOOP  (2-col)
┌──── Hour × DOW heatmap (kind:chart heatmap) ──┐┌── Follow-up adherence (kind:funnel)──┐
│  matrix, color = volume                       ││ Advised 220 ─► Kept 138 ─► Missed 82 │
│  height 360                                   ││ adherence 63%  (Kept ⚠profiling)     │
└────────────────────────────────────────────────┘└────────────────────────────────────────┘

CHANNEL MIX + CASE TYPE  (2-col)
┌── Walk-in vs Booked · Video vs In-person ─────┐┌── Booking source mix (⚠17% coverage)──┐
│   100% stacked bars                            ││ KEA ▆▆ · Agent ▆ · Portal ▏ · App ▏    │
│                                                ││ outline badge "17% coverage"           │
└────────────────────────────────────────────────┘└────────────────────────────────────────┘

PER-DOCTOR LEADERBOARD (kind:leaderboard, span:full)   ← P2 home
┌──────────────────────────────────────────────────────────────────────────────┐
│ Doctor          Appts(volume bar)         Follow-up adherence %  Cancel %       │
│ Dr A Hart       ▆▆▆▆▆▆▆▆ 218              72% ●●●●○             4%   ↘ vs median │
│ Dr R Pratana    ▆▆▆▆▆▆▆ 210               68% ●●●○○             6%               │
│  (primary volume bar + secondary quality metric beside it — R3 pattern)         │
│  variance vs specialty-peer median shown as a small +/- tag, NOT a raw rank     │
└──────────────────────────────────────────────────────────────────────────────┘

WAIT TIME (kind:chart distribution, span:full, feasibility:"profiling")
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠ Needs profiling   Avg wait time queue→seen — timestamps unconfirmed          │
│  Renders a faint sample distribution behind the badge OR an empty card with     │
│  note "Wait-time source (tbl_patient_visit_logs) is unwired; the 'seen' status  │
│  code is unconfirmed." DEFAULT: empty card, no fake numbers.                     │
└──────────────────────────────────────────────────────────────────────────────┘

REGISTERS (tabbed table block, span:full)
[Appointment register] [Overdue follow-ups] [Finished-but-unbilled⚠] [Stale-Queue/no-show⚠] [Not-ABHA-linked⚠sandbox]
```

**2.2 Cards, anatomy, chart type, feasibility** (grouped by spec KPI group)

| Spec group | Block | Anatomy | Chart/widget | Feasibility |
|---|---|---|---|---|
| G1 Funnel | Status funnel | stage labels + counts; leaks as red callout tags | **funnel (new)** — horizontal segmented bar | RELIABLE for 0/3/4; codes 1/2/6/7 fold to "Other"; **Draft** profiling (needs `is_draft` mapped); **Pending-digi** `service` (SnapRx) |
| G1 | Total / Finished / Queue / Completion / Cancellation / No-show | KpiCards; cancel & no-show **red-up** | KpiCard | RELIABLE except no-show **profiling** (status0+past-date proxy) |
| G2 Wait time | Avg / median / P90 wait | distribution (mean + P90 markers) | chart `type:"bar"` histogram OR empty | **profiling-gated** — default empty card with honest note; never headline a fake |
| G3 Follow-up loop | Advised→Kept→Missed + adherence % | funnel + a dual-axis combo (advised bars + adherence-% line) over time | **funnel (new)** + chart | Advised/advice-rate/overdue RELIABLE; **Kept/adherence profiling** (open loop, must-build match) |
| G4 Channel | Walk-in vs Booked; Video vs In-person; Case-type mix | 100% stacked bars; case-type donut (≤5 slices ok) | chart `type:"stackedBar"` + `type:"donut"` | RELIABLE |
| G4 | Booking source mix | ranked bars + coverage badge | leaderboard | **`17% coverage`** outline badge mandatory; `tas_source` |
| G5 Peak | Hour×DOW | heatmap matrix | **chart `type:"heatmap"` (new viz, see 6.5)** | RELIABLE (hour/DOW live); matrix = small extension |
| G5 | Booking lead-time; Same-day share | KpiCard + small histogram | KpiCard | **profiling** (`pam_created_date` not mapped) |
| G5 | Slot utilization | KpiCard with "approximate" caption | KpiCard | **profiling/service** — no capacity table; denominator external; label "approximate" |
| G6 Per-doctor | Doctor leaderboard | volume bar + adherence% + cancel% secondary; **variance-vs-median tag** | **leaderboard (new)** | RELIABLE volume; adherence column inherits G3 profiling |
| G6 | Per-specialty load | ranked bars | leaderboard | RELIABLE if `dp_id`/specialty label confirmed; else hide |
| G7 Revenue/leakage | Revenue per finished visit; Billing capture rate; Finished-but-unbilled | KpiCards + bignum + register | KpiCard + bignum | revenue/capture RELIABLE; **finished-but-unbilled profiling** (join key) |
| G8 ABHA | Linked / verified / not-linked share; by-doctor | KpiCard + leaderboard, **sandbox badge** | KpiCard + leaderboard | RELIABLE math, **sandbox**; link-velocity/stage **omitted** (SPARSE 8–70 rows, NOT-IN-DB-here) |

**2.3 Registers (tabbed `AnalyticsTable`, span:full).** Tabs map to spec's six registers; each is the shipped sortable/filterable/paginated table with CSV export and a `note`:
1. **Appointment register** — date · time · patient (UHID + name + ABHA icon) · doctor · specialty · case-type · channel · status badge · billed? · ABHA status. Default register; every KPI/funnel-stage click prefilters it.
2. **Overdue follow-up worklist** — patient · advised date · days overdue (red) · advising doctor · contact → this is P1's recall call-list. Sort default: days-overdue desc.
3. **Finished-but-unbilled** — `profiling` badge above table; finished appt · doctor · date · patient · est. fee.
4. **Stale-Queue / no-show** — `profiling`; status-0 past-dated rows.
5. **Not-ABHA-linked** — `sandbox`; panel patients without ABHA → linkage drive.

**2.4 Interactions.** Funnel stage click → cross-filters the page to that status and prefilters the appointment register. Leaderboard doctor click → page re-queries scoped to that `um_id` (chip in filter bar). Adherence funnel "Missed" click → Overdue follow-up register. ABHA "not-linked" → Not-ABHA-linked register. Register patient cell → EMR patient record. Visit-type & Channel are *additive* filter selects appended to the bar on this page only.

**2.5 States.** Wait time defaults to an **empty card with an honest note** (do not synthesize). No-show, finished-but-unbilled, Kept-adherence carry `profiling` badges. ABHA blocks carry `sandbox`. Booking source carries `17% coverage`. Pending-digitization funnel segment renders as a `service`-badged "—" until the SnapRx feed lands (or a daily snapshot is materialized).

---

### 3. OPD Billing & Revenue — `leaf:"opd_billing"`

The money engine. Layout: **money hero → collection/refund trend → coverage & leakage (the headline block) → payment-mode + dues ageing → revenue-by-doctor leaderboard → 3C reconciliation → cross-sell attach → audit → registers.** Most P0/P1 is RELIABLE (live `financial.ts`); discount, edit-audit, advance discrete flows, leakage join, attach-rate are badged.

**3.1 Layout**

```
┌─ FILTER BAR ──────────────────────────────────────────────────────────────────┐
│ Doctor▾  Specialty▾(P3)  Clinic▾  Period▾  [+ Payment-mode▾] [+ Bill-state▾] ⟳   │
└──────────────────────────────────────────────────────────────────────────────────┘

MONEY HERO (kind:kpis, xl:4)
[Total billed ₹] [Collected ₹ green] [Outstanding ₹ red] [Collection rate %]
SECONDARY (xl:4)
[Invoices] [Avg bill ₹] [Refunds ₹ red] [Advances held ₹]

TREND (2-col)
┌── Collection vs Refund (dual line) ───────────┐┌── Revenue vs Credit-note (bar+line)──┐
│  collected = chart-3 teal, refund = chart-5    ││  revenue bars + credit-note line     │
└────────────────────────────────────────────────┘└────────────────────────────────────────┘

COVERAGE & ZERO-BILL LEAKAGE (kind:bignum + gauge pair, span:full, feasibility:"profiling")
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠ Needs profiling  Billing coverage   ◔ 91% (921 finished | 838 billed)         │
│ Zero-bill finished visits: 83  ·  ~₹61,200 estimated lost fees                  │
│ [ View zero-bill register → ]   Depends on appointment↔billing pam_id join      │
└──────────────────────────────────────────────────────────────────────────────┘

PAYMENT MODE + DUES AGEING (2-col)
┌── Payment-mode mix (donut ≤6) ────────────────┐┌── Dues ageing (stacked horizontal bar)┐
│  cash/UPI/card/cheque/advance/other            ││ 0-30 ▆▆ · 31-60 ▆ · 61-90 ▏ · 90+ ▆ red│
│  caption: split-payment collapsed (fidelity)   ││  live duesAging                       │
└────────────────────────────────────────────────┘└────────────────────────────────────────┘

REVENUE BY DOCTOR (kind:leaderboard, span:full)   ← R3 pattern: volume + quality
┌──────────────────────────────────────────────────────────────────────────────┐
│ Doctor       Revenue ₹ (bar)        Collection rate %    Avg bill ₹             │
│ Dr A Hart    ▆▆▆▆▆▆▆▆ ₹2.1L         94% ●●●●○            ₹980                   │
│  (high-billing / low-collecting doctor stands out — dues problem on their panel)│
└──────────────────────────────────────────────────────────────────────────────┘

3C RECONCILIATION (kind:table, span:full)   Invoice − Credit Note + Cash Memo = 3C net
CROSS-SELL ATTACH (2-col, feasibility:"profiling")
┌── Lab attach funnel ──────────────────────────┐┌── Pharmacy attach funnel ────────────┐
│ Tests ordered 1,000 ─► Billed in-house 200     ││ Rx lines 1,420 ─► Filled in-house 410 │
│ attach 20% (⚠ fuzzy free-text join)            ││ attach 29% (⚠ order→fill join unverif)│
└────────────────────────────────────────────────┘└────────────────────────────────────────┘

REGISTERS (tabbed table block, span:full)
[Patient dues] [3C service] [Daily collection] [Recent txns] [Incentives] [Zero-bill⚠] [Edit/cancel audit⚠]
```

**3.2 Cards, anatomy, chart type, feasibility** (by spec KPI group)

| Spec group | Block | Anatomy | Chart/widget | Feasibility |
|---|---|---|---|---|
| G1 Headline | Billed / Collected / Outstanding / Collection rate / Invoices / Avg bill / Advances held | KpiCards; Collected green-up, Outstanding & Refunds **red-up** | KpiCard | **RELIABLE** (live `financial.ts summary/realtime`) |
| G2 Advances | Advance held | KpiCard | KpiCard | RELIABLE (net negative balance) |
| G2 | Advance collected/debited/refunded | — | — | **profiling/service** — no discrete column; omit or single `service`-badged card noting V2 ledger dependency |
| G3 Refunds/CN | Refund ₹ / count / rate; Credit-note ₹ | KpiCards red-up | KpiCard + trend line | totals **RELIABLE**; refund-**type** profiling/sparse (~36 rows → "directional") |
| G4 Discounts | Discount value / % / by-doctor | — | — | **profiling** — no discount column mapped; default **omit**; if requested, single empty card with note "rollup stores net total only; needs service-line reconstruction" |
| G5 Audit | Edited bills · Cancelled bills · by-user | KpiCards + register | KpiCard + table | Cancellation count **RELIABLE**; edit who/when **profiling** (audit cols unmapped) |
| G6 Payment mode | Mode mix value · cash/digital share · today | donut (≤6) | chart `type:"donut"` | **RELIABLE**; caption split-payment fidelity loss |
| G7 3C | Invoice / Credit-note / Cash-memo / 3C net | reconciliation table (the three streams netted), NOT a chart | **table** | **RELIABLE** (live `3c-report`, 5000-row register) |
| G8 Revenue by dr/dept | Revenue by doctor + collection rate secondary; incentive | **leaderboard (new)** | leaderboard | by-doctor + incentive **RELIABLE**; by-**specialty** profiling (map); **expense/margin NOT-IN-DB → never render R1/R4 revenue-vs-expense combos** |
| G9 Unit econ | Avg bill/invoice · bill-per-patient | KpiCard | KpiCard | billing-only **RELIABLE**; avg-bill-per-**visit** profiling (appt join) |
| G10 Coverage/leakage | Coverage rate · zero-bill count/₹ · under-billed | **gauge + bignum (new)** + register | gauge + bignum | **profiling** — highest-ROI block, blocked only on join verification; show estimate |
| G11 Most-sold | Top services by volume/revenue; avg price | ranked bars | leaderboard | **RELIABLE** (trivial add from 3C union) |
| G12 Cross-sell | Top investigations/diagnoses/drugs; lab & pharmacy attach rate; upside ₹ | top-N ranked bars + attach **funnels** | leaderboard + **funnel (new)** | top-N **RELIABLE** (investigations free-text-messy); **attach-rate profiling** (order→fill join fuzzy) |

**3.3 Registers (tabbed `AnalyticsTable`, span:full).** Five live + two badged:
1. **Patient dues** (live) — patient · UHID · mobile · outstanding → the collections call-list (default sort outstanding desc).
2. **3C service** (live, 5000 rows) — patientId · patient · billId · item · type (Invoice/Credit Note/Cash Memo) · date · amount.
3. **Daily collection ledger** (live) — date · invoices · billed · collected · outstanding · refund.
4. **Recent transactions** (live, 50 rows) — bill no · date · patient · amount · balance.
5. **Incentive register** (live) — user · patient · bill · service · price · incentive.
6. **Zero-bill finished-appointment** (`profiling`) — patient · doctor · visit date · status · "no bill" flag.
7. **Edited/cancelled-bill audit** (`profiling`) — bill no · original vs modified amount · modify_by · modify_date · cancel_by.

**3.4 Interactions.** Outstanding KPI → Patient dues register. Coverage bignum CTA → Zero-bill register. Refunds KPI → (refund rows, single-bucket note). Revenue-by-doctor bar → cross-filter page to that doctor (and his dues/incentive). Dues ageing band click → Patient dues register filtered to that age bucket. Most-sold service bar → cross-filter to that service line. 3C table row → 3C service register / bill detail. Payment-mode select & Bill-state select are additive filters on this page.

**3.5 States.** Discount group and advance-discrete-flows **default to omitted** (no fabricated tiles). Edit-audit, zero-bill leakage, avg-bill-per-visit, by-specialty, attach-rates all carry `profiling` badges. Payment-mode donut shows the split-payment fidelity caption. **No expense/profit visuals** anywhere — explicitly out of scope (NOT-IN-DB). Sample mode badges all headers.

---

### 4. New widget kinds (build spec for `Widget.jsx`)

All four are shadcn `Card` wrappers; no new dependency. Each gets `feasibility?` → renders the badge from §0.6, and `note` → muted caption at card foot.

**4.1 `funnel`** — `{ stages:[{label, value, tone:"neutral"|"good"|"leak"}], leaks?:[{label,value}] }`. Horizontal segmented bar: stage widths proportional to value; `leak`-toned stages use `tw-bg-destructive/15 tw-text-destructive`, good uses `success`, neutral uses `chart-1`. Stage labels above, counts inside. Used for status funnel + follow-up adherence + cross-sell attach. Clicking a segment fires `onSegmentClick(stage)` → cross-filter/register.

**4.2 `leaderboard`** — `{ rows:[{ label, value, secondary:{label,value,format}, delta? }], metricLabel, secondaryLabel }`. Ranked horizontal bars (primary `value` as `chart-1` bar, width = value/max), with the **secondary quality metric printed beside the bar** (R3 pattern) — a number or a 4-dot rating. Optional `delta`/variance-vs-median tag at row end. Row click → `onRowClick(row)`. This is the single most-reused new component (top-N lists, doctor/specialty leaderboards, most-sold services).

**4.3 `gauge`** — `{ value:0..1, label, sub?:{label,value} }`. A radial/ring progress (single arc) or a horizontal progress bar fallback; center shows `%`. Used for ABHA link-rate (with KYC sub-segment) and billing coverage. Color: `chart-1` fill on `muted` track; sandbox/profiling badge top-right.

**4.4 `bignum`** — `{ value, prefix, suffix, secondary?, cta?:{label, drilldown} }`. A large emphasized number (leakage count) + a secondary line (₹ estimate) + a primary-ghost CTA button routing via `drilldown`. Always pairs with a `feasibility` badge for the leakage/estimate blocks.

**Reference-pattern fidelity & pitfalls honored:** ranked bars over pies everywhere (pies/donut only ≤5–6 slices, R6 over-use avoided); leaderboards always carry a secondary quality metric (R3); KPI = value + colored delta + "vs prev period" (R2); paired big-number for coverage (R4/R5); **no IPD contamination** (no LOS/occupancy/readmission/mortality on any OPD page); **no Revenue-vs-Expense-vs-Profit combos** (R1/R4) since expense is NOT-IN-DB; no unlabeled dual axes (the follow-up advised-bars + adherence-%-line combo gets two explicit axis labels). Color is always paired with sign/icon, never color-only (accessibility, §4.4).

---

**Relevant files referenced (all absolute):**
- Spec: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/docs/analytics-planning/OPD_Analytics_Spec.md` (front-matter §1-12 + OPD Overview L280-383, Appointments L384-680, OPD Billing L681-951)
- Components to reuse/extend: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/components/{KpiCard,AnalyticsChart,AnalyticsTable,DateRangeControl,Widget,ExportButton,TrendIcon}.jsx`
- Page shell + grid/breakpoints: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/AnalyticsWorkspace.jsx` and `AnalyticsWorkspace.scss` (`.analytics-grid` 2-col, `@media` 1100/768/520px)
- UI primitives + tokens: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/ui/{card,badge,chart,table,button,input}.jsx` and `ui/theme.css` (chart-1..8 color tokens; `--success`/`--destructive`)
- References: `/tmp/opd-refs/*.png` (R2 KPI+vs-prev, R3 doctor leaderboard w/ secondary metric, R4/R5 paired big-number, R6 pie-overuse pitfall)

**Eng follow-up needed (load-bearing, not blockers):** KpiCard has no `invert` prop today — add `invert?:bool` (flip `dir` when true) to render red-up for cancellation/outstanding/refunds/overdue without lying about the arrow direction. Widget.jsx needs the four new kinds (`funnel`/`leaderboard`/`gauge`/`bignum`) and a `feasibility` badge switch reading the §0.6 map. AnalyticsChart needs a `heatmap` type for the Appointments hour×DOW matrix.

---

## Page Layouts — All Patients, Prescriptions/RxPAD, + Supporting-domain pattern

> **Status:** UX/Design build spec. Builds on the shipped analytics chrome at `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics`. Every layout below is expressed in the **existing widget contract** so a frontend engineer wires it without inventing new primitives. Honest-data caveats from §9 of `OPD_Analytics_Spec.md` are enforced as UI states (`meta.note`, `Sample`/`Sandbox`/`Coverage` badges, `empty` widgets), never as fabricated numbers.

### 0. Component contract (the grammar every layout below uses)

These are the *only* building blocks. A page = an ordered array of **widget descriptors** rendered by `Widget.jsx` into `.analytics-grid`. Do not introduce new chart libs or card shells.

| Descriptor | `kind` | Renders | Key props |
|---|---|---|---|
| KPI hero strip | `kpis` | row of `KpiCard` (spans full grid; `1 / sm:2 / xl:3` cols) | `kpis:[{title,value,prefix,suffix,description,delta,deltaLabel,accent}]` |
| Trend / bars / pie | `chart` | `AnalyticsChart` inside `Card` w/ header + `ExportButton` | `chartType: line\|area\|bar\|stackedBar\|pie\|donut`, `data:{columns,rows}`, `viz:{x,y[]}`, `span`, `note`, `sample` |
| Register / leaderboard | `table` | `AnalyticsTable` (filter + click-sort + 10/pg + CSV) | `columns:[{key,label,type}]`, `rows`, `note`, `span` |
| No-data / blocked | `empty` | centered `InfoCircle` + note + planned bullets | `note`, `planned[]`, `span` |

**Fixed rules (inherited, do not re-derive):**
- **KPI card** = title · big `tabular-nums` value · optional description · **one** trend tag (`↗`/`↘`/`→`, `tw-text-success`/`tw-text-destructive`/`tw-text-muted`, tinted pill) + `deltaLabel`. No baseline delta ⇒ auto-renders **"No data for this period."** Never add a second delta or a sparkline (removed in commit `4b603dc`).
- **Semantic color w/ inversion:** good-up = green, **bad-up = red** (cancellations, single-visit %, polypharmacy, overdue, leakage ₹, free-text %, refunds). Pass a *sign-inverted* `delta` to the card for bad-up metrics so the tag color reads correctly, OR set `accent`. Color is always paired with the arrow icon (accessibility).
- **Ranked bars over pies.** Pie/donut only for ≤5 slices (gender, generic-vs-branded). Anything top-N ⇒ horizontal `bar`. Consult-mode / linkage-state ⇒ `stackedBar`, never a pie.
- **Indian number format** is built into `AnalyticsChart` ticks/tooltips (`k`/`L`/`Cr`) and `AnalyticsTable` (`type:"currency"` → `inr()`).
- **Free-text / sparse / sandbox / derived** metric ⇒ mandatory `note` (renders under the chart/table) AND a header `Badge`. `sample:true` ⇒ amber **Sample** badge.
- `span:"full"` makes a chart/table span the full grid width (`grid-column: 1 / -1`). Default is one grid cell.

**Page grid (from `AnalyticsWorkspace.scss` / `Widget.jsx`):** `.analytics-grid` is the responsive canvas. KPI strip is always `col-span-full`. Chart/table cards default to one cell; trends, registers, and stacked bars take `span:"full"`.

**Page chrome (shared, do not rebuild per page):** pinned **filter bar** (Doctor · Clinic/Hospital · Period via `DateRangeControl` presets · plus patient quick-filters on patient leaves: Gender · Patient type · ABHA · Blood group) → header (breadcrumb `sectionLabel` + `label` + Add-Widget) → body. The filter bar is sticky; scrolling moves only `.analytics-body`.

---

### 1. Page Layout — **All Patients** (Panel · Demographics · Retention · Value)

**Persona framing:** P1 auto-scoped to own `um_id`; P2 to specialty; P3 unrestricted. The page is a *portfolio* view: panel health → who's leaving → who's worth keeping → who to recall.

**Sub-tab strategy.** The pillar has 9 KPI groups — too many for one scroll. Split into **3 nav leaves under "ALL PATIENTS"** (matches §5 IA), each a distinct page object:
1. **Patients (Overview + Demographics)** — Groups 1, 7, 9 (panel size, age/gender, ABHA-share).
2. **Retention & Value** — Groups 3, 4, 5, 6 (return/churn, cohorts, RFM, LTV).
3. **Leakage & Engagement** — Group 8 + Group 2 channel (unbilled, lapsed-high-value, no-return, serial-cancellers, acquisition).

The patient quick-filters (Gender/Patient-type/ABHA/Blood) already wire to all three via `extraFilters` → server params; keep them on all three leaves.

#### 1a. Patients (Overview + Demographics) — wireframe

```
┌ FILTERBAR: Doctor ▾ · Clinic ▾ · Period ▾ · Gender ▾ · Patient type ▾ · ABHA ▾ · Blood ▾ · [Reset] ········· [⟳ Refresh] ┐
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ KPI STRIP (kind:kpis — xl:3 cols)                                                                     │
│ ┌ Active panel (90d) ┐ ┌ Total panel ┐ ┌ New patients ┐ ┌ New:Returning ┐ ┌ Single-visit % ┐ ┌ ABHA-linked % ┐ │
│ │ 4,812  ↗ 6.1%      │ │ 18,440      │ │ 612  ↗ 9%   │ │ 0.78  → 0%   │ │ 41%  ↘ 2% (good)│ │ 12% ⚠sandbox  │ │
│ └────────────────────┘ └─────────────┘ └─────────────┘ └──────────────┘ └────────────────┘ └───────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ chart span:full — Acquisition trend (line: new patients / period; stacked-area if channel toggled)    │
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ chart — Age-band mix (bar, <18..>60)      │ chart — Gender mix (donut, ≤5 slices)                    │
├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ chart — Top-12 cities (bar)  note:"2% known"│ chart — ABHA linkage state (stackedBar: verified/linked/not)│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Patient panel register (name·gender·age·mobile·city·registered·visits·recency·tier·LTV·ABHA)│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Chart-type per metric:**
| Metric | `chartType` / kind | viz | Notes |
|---|---|---|---|
| Active / Total / New / New:Returning / Single-visit % / ABHA% | `kpis` | — | Single-visit% is **bad-up → invert delta** so a fall reads green. |
| Acquisition trend | `chart` `line` | `x:period, y:[newPatients]` | Toggle to `area` stacked-by-channel only when channel data present; else suppress toggle. |
| Age-band mix | `chart` `bar` | `x:band, y:[patients]` | Standard bands `<18·18-30·30-45·45-60·>60`. |
| Gender mix | `chart` `donut` | `x:gender, y:[count]` | ≤3 slices, donut allowed. |
| City mix | `chart` `bar` | `x:city, y:[patients]` | `note: "City known for 2% of panel — directional only."` |
| ABHA linkage state | `chart` `stackedBar` | `x:"Panel", y:[verified,linked,notLinked]` | See sandbox state §4. |
| Panel register | `table` | cols incl. `LTV type:currency`, ABHA-status pill text | 5,000-row cap; CSV via `ExportButton`. |

**Demographics honesty (§9):** Render **only** age, gender, city, state, contactability. Do **not** build occupation / marital / area tiles (26–118 of 53k rows). Instead, add one KPI card **"Registration completeness"** (`% panel with city+mobile`) as a data-quality nudge, `accent`-styled, with `description:"Drives front-desk capture; occupation/area not captured."`

#### 1b. Retention & Value — wireframe

```
│ KPI STRIP: Return-within-90 ↗ · Repeat-visit rate · Churn/lapsed % (bad-up,red) · Median days-between · Champions count · Revenue from top-10% (Pareto) │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ chart span:full — Cohort retention heatmap (acquisition month × months-since)  [see note]             │
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ chart — Repeat-visit cohort depth (bar 1/2/3/4+) │ chart — Time-between-visits (bar histogram + median tag)│
├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ chart — RFM value-tier mix (bar, Champions/Loyal/At-Risk/Lapsed/New) │ chart — LTV distribution (bar histogram, p50/p90/p99 marker)│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ chart span:full — Revenue concentration / Pareto (bar=patients decile + line=cumulative % rev → use combo)│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Most-valuable-patients register (top-N by LTV: visits·avg bill·pharmacy ₹·lab ₹·last·recall)│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table — Retention-by-doctor leaderboard (volume bar + return-90% secondary)  [P2/P3 only]             │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Cohort retention** is the one viz not natively in `AnalyticsChart`. **Build option A (ship-now):** render as a **`table`** where each cell is a colored `% retained` (CSS bg-tint scale, green high → muted low) — reuses `AnalyticsTable`, no new chart. **Option B (later):** add a `heatmap` type to `AnalyticsChart`. Spec ships Option A; flag Option B as a customization hook. `note: "Cohort = month of first visit; cell = % of that cohort active in month-N."`
- **Pareto** needs a dual-encode (bars + cumulative line). `AnalyticsChart` `bar`/`line` don't compose today → spec a **small `comboChart` extension** (bars + a Recharts `<Line>` on the same axis) OR ship interim as a single `area` of cumulative-% with `note`. Mark as a P0-with-1-component-extension.
- **RFM tiers** = ranked `bar` (5 tiers), **never pie** (per R6 pitfall, even though ≤5 — tiers carry order semantics). At-Risk + Lapsed bars get a red `accent`.
- **LTV histogram** = `bar`; overlay p50/p90/p99 as reference labels in `note` (Recharts ReferenceLine optional later).
- **Doctor leaderboards** (retention-by-doctor) use the **R3 dual-metric table pattern**: a `table` with columns `Doctor · Panel size · Return-90% · LTV/patient`, sortable; the volume column doubles as the visual bar. Frame as **variance vs specialty-peer median** (§2 behavioral rule) — add a `Δ vs peer` column, not a raw rank. P1 sees own row + anonymized peer band; hide named competitors for P1.

#### 1c. Leakage & Engagement — wireframe

```
│ KPI STRIP: Active-but-unbilled visits (bad-up,red) · Lapsed high-value ₹-at-risk (red) · Advised-no-return count (red) · Serial-canceller % (red) · Reactivated patients ↗ │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Recall / lapsed-high-value register (overdue, sorted by ₹-at-risk; one-click call list)│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Active-but-unbilled register (finished visit·doctor·date·no-bill flag) — recovery worklist│
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ table — Advised-follow-up-no-return       │ table — Serial-canceller register (patient·count·last·doctor)│
├──────────────────────────────────────────┴─────────────────────────────────────────────────────────┤
│ chart span:full — Acquisition channel mix (bar)  note:"Source known for 17% of bookings — directional" + Coverage badge│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

This leaf is **register-dominant by design** — its whole value is actionable row-level worklists, not aggregates. Each register is a `table` with CSV export; the recall register's first column is the patient + mobile so it *is* the call list.

#### Interaction / drilldown / cross-filter (All Patients)

- **Filter bar = global cross-filter.** Doctor/Clinic/Period/Gender/type/ABHA/Blood already flow to every widget + every register via `pageFilters`. No per-widget filter UI.
- **Register search/sort** is local (`AnalyticsTable`): free-text filter across all columns, click-to-sort, 10/page. No server round-trip on sort.
- **Drilldown (spec'd, lightweight):** clicking an RFM-tier bar or an age band sets the corresponding quick-filter (e.g. tier=At-Risk) and re-queries — implement by lifting bar `onClick` → set filter state (same mechanism as the gender quick-filter). Champions/At-Risk tiers cross-link to the recall register pre-filtered.
- **Cross-page links:** "ABHA-linked %" card and the linkage stacked-bar deep-link to the ABDM leaf (`?view=abha`). Most-valuable register rows link to the patient's billing history (out of analytics scope — open in EMR).
- **`grain` auto-buckets** (day ≤92d, month beyond) — already handled; trends never get unreadable at 1y.

#### States (All Patients)

| State | Trigger | UI |
|---|---|---|
| Loading | `loading && isBuilt` | antd `Skeleton active` ×2 in `.analytics-grid` (existing). |
| Empty (no patients in window) | rows = 0 across all groups | `empty` widget, `note:"No patients seen in this period for the selected filters."` + planned bullets. |
| No-data (column genuinely sparse) | occupation/area/marital | **Do not render the tile.** If a stakeholder insists, `empty` widget: `"Occupation/area not captured (≤0.2% of records). Surfaced as a data-quality gap, not a chart."` |
| Partial-coverage | channel (17%), city (2%), blood (0.4%) | Chart renders + **`Coverage` badge** (use `Badge variant="warning"`) in header + `note:"Known for X% — directional."` |
| Sandbox | ABHA share (≈99% test today) | See §4 — `Badge` "Sandbox" + muted overlay; number shown but de-emphasized. |
| Error | `error && isBuilt` | antd `Alert type="error"` above grid (existing). |

#### Responsive (All Patients)

- **≥1280px (xl):** KPI strip 3-up; charts 2-up; registers + trends full-width.
- **640–1279px (sm–lg):** KPI strip 2-up; charts stack 1-up (drop the 2-col chart rows to single column); registers full-width with horizontal scroll inside the table border.
- **<640px:** KPI strip 1-up; sidebar collapses to hamburger (`mobileNavOpen`); filter bar wraps (`.analytics-filterbar` is flex-wrap); `AnalyticsTable` keeps `whitespace-nowrap` cells and scrolls horizontally — never reflow currency columns.

#### Customization hooks (All Patients)

- **Add Widget** (`QueryBuilderDrawer`) lets P3 pin a custom register (e.g. "patients with LTV>₹50k and no visit in 120d") into the per-leaf `customWidgets` canvas below a divider.
- Save-view via `?view=` URL param (already addressable + refresh-surviving).

---

### 2. Page Layout — **Prescriptions / RxPAD** (Internals · Consult-mode · Behavioral)

**Persona framing:** P1 own Rx self-audit; P2 doctor-to-doctor coaching (the flagship value); P3 cross-sell + procurement + compliance.

**Sub-tab strategy — 2 leaves under "PRESCRIPTIONS / RxPAD":**
1. **Prescriptions (Composition & Mix)** — Groups 1, 2, 3 (volume, completeness, generic/drug mix) + Group 4 consult-mode + Group 7 cross-sell.
2. **Prescribing Behavior (Doctor-to-Doctor)** — Group 6 scorecard, leaderboards, peer-band scatter.

(Group 5 Custom-Modules is **not a leaf** — config-only; surface as a single `empty`/note tile inside leaf 1 if asked, else omit.)

#### 2a. Prescriptions (Composition & Mix) — wireframe

```
│ KPI STRIP (xl:3): Total Rx ↗ · Rx-bearing rate of finished visits · Drug lines · Avg meds/Rx (bad-up if rising) · Generic-captured % ↗ · Follow-up advised % │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ chart span:full — Rx volume trend (line, weekly/monthly, prev-period delta on the KPI)                │
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ chart — Component fill-rate (horizontal bar: meds·dx·investig·advice·exam·MH·follow-up) [see note]    │
│   note:"Advice/exam/MH are structured-capture coverage, not behavior — storage-path artifact."        │
├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ chart — Generic vs Branded (donut, 2 slices)│ chart — Polypharmacy distribution (bar histogram 1/2/3-4/5-7/8+)│
├──────────────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ chart — Top drugs (bar)                   │ chart — Top manufacturers (bar)  [procurement leverage]   │
├──────────────────────────────────────────┴─────────────────────────────────────────────────────────┤
│ chart span:full — Consult-mode mix (stackedBar over time: in-clinic / video / tele / walk-in)         │
│   + empty/note tile: "VoiceRx / SmartSync product-mode not in analytics DB — needs engagement service."│
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ KPI pair — Pharmacy attach % (+₹ leakage est.)│ KPI pair — Lab attach % (+₹ leakage est.)  [₹ = directional note]│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Prescription line register (date·UHID·patient·doctor·brand·generic·manufacturer·dose·type)│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Chart-type per metric:**
| Metric | kind/type | viz | Honesty UI |
|---|---|---|---|
| Total Rx / Rx-bearing rate / drug lines / avg meds / generic% / follow-up% | `kpis` | — | **Avg meds/Rx is bad-up → invert delta**; generic% labeled **"generic captured"** not "prescribed". |
| Rx volume trend | `chart` `line` | `x:period, y:[rx]` | — |
| Component fill-rate | `chart` `bar` (horizontal) | `x:component, y:[pctOfRx]` | **Mandatory `note`** (storage-artifact caveat from §G2). meds/dx bars solid; advice/exam/MH bars get a muted/`accent` treatment to signal lower confidence. |
| Generic vs branded | `chart` `donut` | `x:label, y:[count]` | 2 slices only. |
| Polypharmacy | `chart` `bar` | `x:bucket, y:[consults]` | 8+ bucket red `accent`. |
| Top drugs / generics / manufacturers | `chart` `bar` | `x:name, y:[lines]` | default top-15. |
| Consult-mode mix | `chart` `stackedBar` | `x:period, y:[inClinic,video,tele,walkIn]` | derived from appt join (verified). |
| Product-mode (VoiceRx/SmartSync) | `empty` | — | `note:"Not in tatva_clinic — sourced from digitization/voice microservices (engagement endpoint NotImplemented)."` Do **not** render a fake bar. |
| Pharmacy/Lab attach | `kpis` (paired) | — | attach **%** shown solid; **₹ leakage** shown with `note:"Estimate — patient+date heuristic match, no order→bill FK; ₹ needs price source."` + Coverage badge. |
| Rx line register | `table` | — | 5,000-row cap, CSV. |

#### 2b. Prescribing Behavior (Doctor-to-Doctor) — wireframe

```
│ KPI STRIP: Doctors profiled · Median meds/visit (peer) · Median generic% (peer) · Over-prescriber outliers (red) · Never-follow-up outliers (red) │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Doctor behavioral scorecard (R3 pattern)                                            │
│   Doctor · Rx vol · Meds/visit · Dx/visit · Tests/visit · Generic% · Follow-up% · Completeness idx · Δvs-peer-percentile│
├──────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ chart — Meds/visit vs Generic% scatter    │ chart — Completeness-index leaderboard (bar, vs peer line)│
│   (intensity vs rationality, peer-band)   │                                                          │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ table span:full — Polypharmacy register (consults ≥8 lines: date·doctor·patient·drug list) — clinical review│
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ empty/note — Antibiotic / drug-class rate: "Needs ATC dictionary (one-time profiling of 1,021 molecules)."│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Scorecard** is the centerpiece `table`: one row/doctor, `HAVING ≥5 Rx`. Every behavioral column is expressed as **deviation from specialty-peer median** (normalize before ranking — GP ≠ surgeon). Outlier cells get a red text/`accent`; the volume column doubles as the visual bar (R3).
- **P1 view** = own row highlighted + anonymized peer band (others rendered as "Peer median / p25 / p75" rows, names hidden). **P2 view** = named department doctors. **P3 view** = all, grouped by specialty. Drive this off the role claim, not a toggle.
- **Scatter** (meds/visit × generic%) needs a Recharts `<Scatter>` — **not** in `AnalyticsChart` today. Spec it as a **`scatter` type extension** (P1, small add) with a shaded peer-band rectangle; interim fallback = the scorecard table conveys the same signal, so scatter is a *nice-to-have* not a blocker.

#### Interaction / drilldown / cross-filter (RxPAD)

- **Global filter bar** scopes all widgets (Doctor/Clinic/Period). Add **drug-axis & visit-type** as in-widget controls only where needed (e.g. a "brand / molecule / manufacturer" segmented toggle above the Top-drugs bar) — implement as a local `useState` that re-keys the `viz.y`, not a server filter.
- **Drilldown:** click a doctor row in the scorecard → cross-filter the whole page to that `um_id` (set Doctor filter) so leaf 1 charts recompute for that doctor — closes the "who's the outlier → what exactly are they prescribing" loop. Click a polypharmacy bar bucket → opens the polypharmacy register pre-filtered to that bucket.
- **Cross-page:** Pharmacy/Lab attach cards deep-link to Billing (cross-sell) and Lab leaves; component fill-rate links to ABDM (completeness = digitization readiness).

#### States (RxPAD)

| State | UI |
|---|---|
| Loading / Empty / Error | Same shared pattern (Skeleton / `empty` / `Alert`). |
| **Storage-artifact** (advice/exam/MH fill-rates) | Render the bar **but** mute those series + mandatory `note` + header `Badge variant="warning"` "Capture-coverage". Never publish as "Dr X never gives advice." |
| **Free-text** (investigation %, tests/visit) | `note:"tcm_investigation is free-text CSV (~8% of consults) — directional."` |
| **Estimate** (₹ leakage, attach %) | `note` + Coverage badge; show count/% solid, ₹ de-emphasized. |
| **Not-in-DB** (product-mode, custom-module usage, OPD procedures-per-Rx) | `empty` widget with the microservice/instrumentation reason + `planned[]`. Never a fabricated tile. |
| `HAVING <5 Rx` doctors | Excluded from scorecard; footnote `note:"Doctors with <5 Rx in window omitted for statistical stability."` |

#### Responsive (RxPAD)

Identical breakpoint rules to All Patients. Specifics: the **scorecard table** is wide — on <1024px it keeps the first 3 columns visible and horizontal-scrolls the behavioral columns (sticky first column via `whitespace-nowrap` + overflow container, already the table's behavior). The scatter collapses to the scorecard on <640px (hide scatter widget, keep table).

#### Customization hooks (RxPAD)

- Top-N selector (10/15/25) on ranked bars via local state.
- Add-Widget supports pinning a custom drug/manufacturer query.
- Brand/molecule/manufacturer toggle on the top-drug widget.

---

### 3. Reusable template — **Supporting-domain page** (Diagnoses · Symptoms · Lab · Procedures · Medical History · Vitals · Vaccination · Obstetric/Gynec · Certificates · Pending Digitization)

These lighter domains must look and behave **identically** so the suite reads as one product. The template is a single page-object factory; per-domain you only fill four slots. **An engineer should be able to stamp a new clinical leaf in under a day by filling this template.**

#### 3.1 Canonical anatomy (every supporting page, top → bottom)

```
┌ [optional] HONESTY BANNER (full-width Alert/note) — only when the domain's headline data is degraded/template/sandbox ┐
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ KPI HERO STRIP — exactly 4–5 KpiCards (kind:kpis). Never more. Pick the 5 from the domain's KPI table that name a decision.│
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PRIMARY RANKED BAR (chart, span:full) — the "top-N entities" spine of the domain (top conditions/tests/drugs/services/symptoms)│
├────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ BREAKDOWN A (chart) — by age band (bar) or severity (stackedBar) │ BREAKDOWN B (chart) — by gender (donut) or by-dept (bar) │
├────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┤
│ TREND (chart line, span:full) — volume / rate over time (grain auto-bucketed)                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DOCTOR LEADERBOARD (table, span:full, R3 dual-metric) — volume bar + a secondary QUALITY metric; Δ vs peer median   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [domain-specific] CROSS-SELL / LEAKAGE / RECALL TABLE (table, span:full) — the revenue artifact (see slot map below) │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The four slots you fill per domain:**
1. **5 KPIs** — from the domain's KPI table; each must name a decision (drop the rest into blocks).
2. **Primary entity** for the ranked bar (the "top N X").
3. **Secondary quality metric** for the doctor leaderboard (the R3 pair).
4. **Revenue artifact** — exactly one of: cross-sell table / leakage register / recall worklist.

#### 3.2 Per-domain instantiation (slot map)

| Domain | 5 KPIs (hero) | Primary ranked bar | Leaderboard 2nd metric | Revenue artifact | Headline state caveat |
|---|---|---|---|---|---|
| **Diagnoses** | Patients diagnosed · Top dx · Distinct conditions · ICD-coded % (good-up) · Dx/consult | Top-25 conditions (bar) | ICD-coded % per doctor | **Dx→lab & dx→drug cross-sell** (2 tables) | Free-text labels; `meta.note`. Coding-discipline outliers = coaching. |
| **Symptoms** | Top symptom · Distinct · Severity-completeness % · Severe share (red) · Template coverage % | Top symptoms (bar) | Severity-coding completeness | (Tier-P only — blocked) | **Honesty banner mandatory:** "Template-config, not patient prevalence — per-patient needs symptoms microservice." Most numbers = Tier-T. |
| **Investigations & Lab** | Test order rate · Investig/consult · In-house path ₹ · Lab capture % · Distinct tests | Top tests (bar) + ₹-captured paired column | Tests/consult (intensity) | **Advised-vs-billed leakage table** | Free-text CSV; capture = estimate. **No** abnormal-rate / TAT tiles (NOT-IN-DB). |
| **Procedures (OPD)** | Top billed service · Service revenue · Distinct services · **Consult-only leakage** (red) · Rev/finished-visit | Top billed services (bar, ₹+qty paired) | Procedure-lines per 100 finished visits | **Procedure-billing leakage register** | **Relabel page "Top Billed Services & Procedure-Billing Leakage."** Persistent disclaimer banner. Never feed from IPD `tbl_inpatient_doctor_procedure`. |
| **Medical History** | Patients w/ history · Allergy prevalence % · Top allergen · Top condition · Multimorbidity share | Top conditions/allergens (bar) | (skip — no doctor attribution on the table) | Chronic-cohort → follow-up retention | Free-text + sparse JSON; normalize note. Comorbidity-pairs = deferred. |
| **Vitals** | (BP/SpO2/RBS coverage + distribution KPIs) | Distribution bars (BP/SpO2/RBS bands) | per-doctor capture % | (none — clinical-quality only) | Parsed from blob; `note`. |
| **Vaccination** | Doses · Patients · **Overdue (red)** · Upcoming-30d · On-time adherence % | Top vaccines (bar) | On-time adherence % per doctor | **Recall worklist** (patient·vaccine·due·days-overdue) + dose-number drop-off funnel | Specialty module, feature-flagged. Dose/route free-text. **No** inventory/batch tiles. Adherence/overdue **gated on wiring `tbl_vaccine_duedate`** → until then `empty`. |
| **Obstetric & Gynec** | Obstetric patients · Active pregnancies · Approaching-EDD-30d · ANC adherence % · Overdue ANC (red) | Antenatal cohort **register is the hero** (not a bar) | ANC-adherence % per doctor | **Antenatal register** + scheduled-vs-billed ANC leakage | Test-clinic volumes → per-business + OB/Gyn gate; **honest empty at low N**; true counts never rates-without-denominator. |
| **Certificates** | Certificates issued · Patients certified · Top type · Template-backed % · **Un-billed certs (red)** | Top cert types (bar) | Certs per 100 finished visits | **Un-billed certificate register** (Verify join) | Low-volume, unbuilt table; flag. |
| **Pending Digitization** | Backlog count · Backlog rate (red) · (TAT = blocked) | Backlog by doctor/desk (bar) | Backlog per finished visit | Backlog worklist | **Microservice (SnapRx) live-call only** — backlog/rate buildable, **turnaround NOT** → `empty` for TAT. Show source = live call note. |

#### 3.3 Template states (apply uniformly)

The supporting domains carry the *most* degraded data — states are the heart of the template.

```
DECISION TREE (per widget, evaluate top-down):
  data genuinely absent in DB (procedures-clinical, abnormal-results, TAT,
       symptom-prevalence, inventory)         → kind:"empty"  + reason + planned[] + (microservice/capture note)
  data is sandbox/test-only (ABHA today)       → render number, Badge "Sandbox", muted overlay, note (see §4)
  data is template/config-only (symptoms Tier-T) → render + full-width HONESTY BANNER + Badge "Template data"
  data is free-text-messy (investigations,
       diagnoses labels, services, dose)        → render + note + Badge "Free-text" (variant=warning)
  data is partial-coverage (channel 17%,
       city 2%, blood 0.4%)                      → render + note "Known for X%" + Badge "Coverage"
  data is derived/heuristic-join (attach ₹,
       capture %, dx↔drug)                       → render solid count/%, de-emphasize ₹, note "Estimate"
  data is feature-not-wired-yet (vaccine duedate,
       gynec pregnancy/ANC tables)              → kind:"empty" + planned[] "Wire <table> to unlock"
  rows = 0 in window                            → kind:"empty" "No <domain> recorded in this period."
  loading                                        → Skeleton (shared)
  request error                                  → Alert (shared)
```

- **Honesty banner** (Symptoms, Procedures) = a full-width `empty`-style card pinned **above** the KPI strip, amber `InfoCircle`, one sentence + the microservice/capture path. It is the first thing the user reads so no number is misread as epidemiology/clinical-procedure.
- **Badges** map to existing `Badge` variants: `warning` (Sample/Template/Free-text/Coverage), `secondary` (derived), a new muted "Sandbox" style (see §4). Always paired with a `note`.

#### 3.4 Template interactions (uniform)

- Global filter bar scopes everything (Doctor/Clinic/Period). Clinical leaves additionally honor age-band/gender where the server supports it.
- Ranked-bar **click → cross-filter**: clicking a condition/test/drug bar filters the trend + leaderboard + cross-sell table to that entity (lift `onClick` → local `selectedEntity` state → re-key queries). The cross-sell table for Diagnoses uses this to show "this condition → its top tests/drugs."
- Doctor leaderboard **row click → set Doctor filter** (drilldown to that doctor's view), with the same P1-anonymized / P2-named / P3-grouped role gating as RxPAD.
- Every `table` ships CSV via `ExportButton`; registers double as worklists.
- `?view=<leaf>` addressable; Add-Widget canvas available on every leaf.

#### 3.5 Template responsive

Same three breakpoints. The template's 2-col breakdown row (A|B) collapses to 1-col at <1024px; the leaderboard and all registers are always full-width with internal horizontal scroll; KPI strip 3→2→1 up. The honesty banner is always full-width and never collapses.

---

### 4. Sandbox / ABDM-test data state (cross-cutting — applies to ABHA cards on All Patients, RxPAD compliance, and the ABDM leaf)

§ caveat: **ABHA is ~99% sandbox/test today.** Design must show the *capability* without implying real adoption.

- **Pattern:** render the real computed linkage/KYC numbers (they're queryable from `pm_abha_address`/`pm_abha_verify`) **but** wrap the widget in a **"Sandbox" treatment**: header `Badge` labeled **Sandbox** (use `Badge variant="secondary"` with a dashed border util, or add a `sandbox` badge variant: `tw-border-dashed tw-border-border tw-text-muted-foreground tw-bg-muted`), a subtle diagonal-hatch or 60%-opacity overlay on the chart area, and a mandatory `note:"Linkage reflects ABDM sandbox/test data (~99% non-production today). Shown to validate the metric; not yet a production adoption figure."`
- **Trend** is the only honest "velocity" proxy — render it; **never** render time-to-link / stage / linked-by (NOT-IN-DB) — those are `empty` widgets with the ABHA-service instrumentation reason.
- Delta on ABHA cards is **green-up** (rising linkage good) but the sandbox overlay signals "directional." When sandbox flips to production, the only change is dropping the badge/overlay — no layout change.

---

### 5. Build checklist (hand-off summary)

1. **Reuse, don't rebuild:** `KpiCard`, `AnalyticsChart`, `AnalyticsTable`, `Widget`, `ExportButton`, `Badge`, `DateRangeControl`, the filter bar + `.analytics-grid` shell. Every page is a `widgets[]` array consumed by `Widget.jsx`.
2. **Three small component extensions, all P1 (none block P0):** (a) `comboChart` (bars + line) for Pareto; (b) `heatmap` type (or ship cohort as colored `table`); (c) `scatter` type for the RxPAD peer-band — each falls back to an already-shippable table/bar.
3. **Add nav leaves** in `analyticsNav.jsx` (`PAGE_MAP`/`DASHBOARD_ENDPOINTS`): `patients`, `retention_value`, `patient_leakage`, `prescriptions`, `prescribing_behavior` + the supporting leaves; gate Obstetric/Gynec & Vaccination per-business and exclude from the owner hero.
4. **Enforce states from the §3.3 decision tree** on *every* widget — this is the spec's honesty contract. No widget renders a number whose data tag is `X`/`S` without an `empty`/banner/badge.
5. **Role-scope** P1/P2/P3 from the JWT claim (own `um_id` / specialty / unrestricted) — leaderboards are *variance vs peer median*, P1 sees anonymized peers, never raw league tables.

**Key files referenced (all absolute):**
- Components (the contract): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/components/{KpiCard,AnalyticsChart,AnalyticsTable,Widget,ExportButton,DateRangeControl}.jsx`
- UI primitives + badge variants: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/ui/{badge,card,chart,table}.jsx`
- Page shell / grid / filter bar / role state: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/AnalyticsWorkspace.jsx` + `AnalyticsWorkspace.scss`
- Nav / endpoint map to extend: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/shell/analyticsNav.jsx`
- Source spec sections this layout implements: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/docs/analytics-planning/OPD_Analytics_Spec.md` (§5 IA, §8 KPI matrix, §9 feasibility; "All Patients" L952–1202, "Prescriptions / RxPAD" L1204–1470, and the supporting-domain sections L1472–2280).

---

## Component, Interaction, Accessibility & Motion Guidelines

> This is the cross-cutting UI contract for the OPD analytics suite. It governs every domain page (Appointments, Billing, Patients, Rx, ABDM, etc.) so a frontend engineer can build any new leaf without re-deciding layout, chart-type, color, state, or motion. It is grounded on the shipped components at `src/pages/analytics` (`KpiCard`, `AnalyticsChart`, `AnalyticsTable`, `DateRangeControl`, `Widget`, `ui/*`) and respects the §9 feasibility line — we render feasibility/sandbox badges and honest placeholders, never fabricated numbers.

### 0. Foundations & tokens (the single source of truth)

All analytics UI lives under the `.tp-analytics` root, with the chart canvas inside `.analytics-canvas` (Inter font; TP chrome around it keeps its own font). Tailwind preflight is globally off; the `.tp-analytics`/`.tp-analytics-portal` scope re-applies border-box + zero-width borders. **All utility classes carry the `tw-` prefix** — never emit an unprefixed Tailwind class (it will collide with Bootstrap/antd in the EMR).

Design tokens (from `ui/theme.css`, do not hardcode hex in components):

| Token | HSL var | Use |
|---|---|---|
| `--primary` indigo `#4b4ad5` | `--chart-1` | primary series, links, focus ring |
| `--secondary` violet `#a461d8` | `--chart-2` | secondary series |
| `--success` green `#1f9d76` | — | good deltas, collection, completion, ABHA-up |
| `--destructive` red | — | bad deltas, cancellation, dues, refunds |
| `--chart-3..8` | teal/amber/pink/cyan/periwinkle/orange | additional categorical series |
| `--muted-foreground` slate-500 | — | labels, captions, "vs previous period" |
| `--border` slate-200 | — | card border, dashed grid, table rules |
| `--radius` `0.6rem` | — | card/control corner radius |

**Number formatting is non-negotiable and already centralized:**
- KPI values: `Number.toLocaleString("en-IN")` (lakh/crore grouping → `1,23,456`) via `KpiCard`'s `fmtValue`.
- Currency: `inr()` from `analyticsConfig` → `₹1,23,456` (zero decimals).
- Chart ticks/tooltips: compact `fmtNum` → `k / L / Cr` (e.g. `2.4Cr`, `1.5L`, `3.2k`). Never show raw `2400000` on an axis.
- Percentages: 1 decimal max; deltas show `Math.abs(delta)%` with a directional arrow supplying the sign.

---

### 1. The standard page shape (every domain leaf)

This is the §4.3 page skeleton, already realized in `AnalyticsWorkspace`. Every leaf composes top-to-bottom in `.analytics-grid` (12-col responsive grid; widgets default half-width, `span:"full"` for trends/tables/heatmaps):

```
┌─ TP sidebar ─┬─ analytics-main ──────────────────────────────────────────────┐
│ Overview     │ ┌ topbar ──────────────────────────────────────────────────┐ │
│ APPOINTMENTS │ │ ☰  Appointments ▸ Follow-ups        [ + Add Widget ]      │ │
│  Appointments│ └───────────────────────────────────────────────────────────┘ │
│  Footfall    │ ┌ filter bar (pinned) ─────────────────────────────────────┐ │
│  Follow-ups  │ │ Doctor▾  Clinic▾  Period▾  [Gender▾ Type▾ ABHA▾]  Reset ⟳ │ │
│ BILLING      │ └───────────────────────────────────────────────────────────┘ │
│  ...         │  KPI HERO STRIP   [card][card][card][card]  ← tw-grid 4-up     │
│ PATIENTS     │  ONE TREND        [────── full-span line/area ──────────]      │
│ Rx / RxPAD   │  RANKED / LEADER  [ ranked bars ][ leaderboard + 2nd metric ]  │
│  ...         │  DETAIL REGISTER  [─ AnalyticsTable: sort/filter/page/export ─]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

**Composition rule:** hero strip first (the 10-second answer), then exactly **one** trend (the "are we growing?" chart), then ranked bars / leaderboards (the "who/what" map), then the row-level register (the "act on it" list). Do not stack two trends; do not lead with a table. This mirrors R1/R2/R4 and the shipped overview.

**Filter bar** is pinned below the topbar (not in the header). Controls in fixed order: **Doctor → Clinic/Hospital → Period** (`DateRangeControl`), then page-specific quick-filters (Patients adds Gender / Patient-type / ABHA / Blood-group), then **Reset all**, a spacer, and **Refresh ⟳**. Every filter is a server-side param (`startDate/endDate/doctorIds[]/hospitalId/grain` + page extras) — filters scope both the on-screen widgets and the exported register identically. `grain` auto-switches: `day` for ≤92-day windows, `month` beyond (keeps a 1-year trend readable). Persona scoping is server-injected from JWT, not a client filter: P1's Doctor select is locked to self; P2's is scoped to specialty; P3 sees all.

---

### 2. KPI card variants (the diagonal trend-tag system)

`KpiCard` is the atomic decision tile. Anatomy (shipped):

```
┌──────────────────────────────────┐
│ Cancellation rate          (title, 13px semibold, muted)
│ 8.4%                        (value, 26px bold, tabular-nums, en-IN)
│ Of all booked appointments  (description, 11.5px muted — optional)
│ [↘ 5.4%]  vs previous period   ← ONE trend tag: tinted pill + diagonal arrow
└──────────────────────────────────┘
```

Single trend tag only — no sparkline, no bar, no duplicate indicator (removed in commit `4b603dcd`). The pill is a tinted rounded-full chip: arrow + `|delta|%`. Diagonal arrows come from `TrendIcon` (`TrendUp` rises to a corner arrowhead, `TrendDown` falls, `TrendFlat` is a dash). The `prefix`/`suffix` slots carry `₹` or `%`/`/day` at 18px.

**Variants (props-driven, one component):**

| Variant | Props | Renders |
|---|---|---|
| **Standard** | `value`, `delta`, `deltaLabel` | value + auto-colored delta tag |
| **Currency** | `prefix="₹"`, value pre-formatted via `inr()` | ₹ hero number |
| **Rate/percent** | `suffix="%"` | percent hero |
| **Leakage callout** | `value` (count), `description="₹4,82,000 uncaptured"` | the recoverable-rupee big-number; pair count + ₹ in description |
| **No-baseline** | omit `delta` | renders `"No data for this period"` instead of a fabricated 0% |
| **Gated/feasibility** | wrap in `Widget`'s `sample`/badge | value hidden behind a `Sample`/`Profiling`/`Sandbox` badge (see §6) |

**Semantic color with inversion (the §4.4 rule) — the engineer must pass the correct delta sign convention per metric:**

| Direction means | Metrics (good-up) | Metrics (bad-up → INVERT) |
|---|---|---|
| Rising = good (green ↗) | Collected, completion, ABHA linkage, generic %, follow-up adherence, return rate, RFM high-tier | — |
| Rising = bad (red ↗) | — | Cancellation, no-show, outstanding/dues, refunds, credit-notes, overdue follow-ups, polypharmacy, single-visit %, digitization backlog |

`KpiCard` colors purely by the **sign of `delta`**: positive→green-up, negative→red-down. For **inverted metrics the builder must flip the sign of `delta`** so a rising-bad number produces a red tag (a 5% rise in refunds is passed as `delta: -5`-equivalent semantically, or — preferred — add an `invert` prop so the builder passes the raw delta and the card flips color+icon). **Color is never the only signal:** the arrow direction and the `+/−` sign carry the same meaning for color-blind users (WCAG — see §8). Hero KPI strip is 4 cards (the marquee decisions); a secondary strip of 4 lighter KPIs is allowed below it (Overview pattern: New patients / Follow-up rate / Tele share / Generic %).

---

### 3. Chart styling & chart-type-per-metric

`AnalyticsChart` is the only chart renderer. It takes `{columns, rows}` + a `viz:{x, y:[...]}` spec + a `type`, decoupling data from viz. Supported: `line | area | bar | stackedBar | pie | donut`. Series colors cycle `--chart-1..8`. Grids are **dashed horizontal-only** (`CartesianGrid vertical={false} strokeDasharray="3 3"`), axes are line-less with 11px ticks, Y-axis uses the compact Indian `fmtNum`, tooltips use shadcn `ChartTooltipContent` (line indicator for line/area, dot for bar/pie). Legend only renders when >1 series.

**Chart-type-per-metric (binding — derived from the spec's per-domain "Recommended viz" tables):**

| Metric family | Chart `type` + viz | Notes |
|---|---|---|
| Trend (appts vs cancelled, collection vs refund, Rx volume) | `line`, dual-series | the one full-span trend; semantic series color |
| Revenue vs credit-note over time | `bar` + overlaid line (combo) | bars = revenue, line = credit-note |
| Cumulative/area growth (acquisition, collection area) | `area` | gradient fill 0.35→0.04 (shipped) |
| Status funnel (Queue→Finished) | `stackedBar` horizontal (100%) | leaks (Cancelled/No-show/Draft/Pending-digi) as labeled segments |
| Consult-mode mix (in-clinic/video/tele/walk-in) | `stackedBar` 100% | **never a pie** (R6 pitfall) |
| Payment-mode mix | `donut` | **only ≤6 slices**; else ranked bars |
| New vs Returning | `donut` (2–3 slices) | |
| Top-N (diagnoses, drugs, investigations, services, RFM tiers) | `bar` horizontal ranked | **ranked bars over pies**, always |
| Doctor/specialty leaderboard | ranked `bar` + **secondary quality metric beside the volume bar** | R3 pattern; outlier flagged red (see §3a) |
| Dues ageing | `stackedBar` horizontal by age band | |
| Wait-time distribution | box-plot / histogram (extend lib) | mean + P90; **gated** on timestamp profiling |
| Polypharmacy / time-between-visits / LTV | histogram (`bar` over buckets) | median/p50-p90 marker |
| Pareto (revenue concentration) | combo: `bar` + cumulative `line` | |
| Cohort retention | triangle/cohort **heatmap** (extend lib) | acquisition-month × months-since |
| Peak hour × DOW | **heatmap matrix** (extend lib) | sequential single-hue ramp of `--chart-1` |
| ABHA linkage, billing coverage, attach rate | **gauge / paired big-number** | linked÷seen; KYC sub-segment |
| 3C reconciliation | **table**, not a chart | three netted streams |

**Avoid (reference pitfalls, §11):** pies >5 slices, treemaps for >5 categories, dual-axis without explicit axis labels, and any IPD viz (LOS/occupancy/readmission/mortality) on an OPD page.

**§3a — Leaderboard widget (new, R3 pattern).** The current `AnalyticsChart` ranked bar shows volume only. Add a `Leaderboard` widget: each row = label + a volume bar + a **second compact metric** to its right (collection-rate / ABHA% / follow-up-adherence / cancel%). The high-volume-low-quality outlier must be unmistakable — render the secondary metric in a red tinted pill when it crosses the peer-median threshold. Doctor rows are framed as **variance vs specialty-peer median** (a faint median tick on the bar track), never a raw rank — coaching, not surveillance.

---

### 4. Tables — the detail register (`AnalyticsTable`)

The act-on-it surface. Built-in (shipped): free-text filter (filters all columns), click-to-sort headers (numeric-aware comparator, asc/desc toggle, inactive headers show a faint chevron), 10-row pagination with prev/next, currency columns auto-render via `inr()`, null/empty render as `—`, all numeric cells `tabular-nums`, optional `note` footer. Wrapped in a `Card` with a header carrying the title, an optional `Sample` badge, and the **Export** button (CSV; exports the full filtered+sorted set and any companion `patientData`, not just the visible page).

**Register conventions:**
- Column order: identity (patient/doctor name + ID) → the metric that earned the row's place (₹ leaked, days overdue) → context (date, doctor, status) → an **action affordance** in the last column where one exists (e.g. "Link ABHA" nudge, "Recall" for overdue follow-ups — see §5).
- Sort defaults to the decision metric descending (most ₹ leaked first, most overdue first).
- Currency/days columns are right-aligned tabular; status uses a `Badge` (success/destructive/secondary) **with text**, not color-only.
- Every free-text/sparse/derived register carries a mandatory `note` (`meta.note`) stating the caveat ("source covers ~17% of bookings", "template-level, directional not statistical").
- Registers >~2k rows: keep client sort/filter but page server-side (pass `page`/`pageSize`); for export, stream the server query, never the client slice.

---

### 5. Interaction: drilldown & cross-filter model

The suite is one query engine over one table set, so widgets on a page **cross-link**. Three interaction tiers:

1. **Filter-bar cross-filter (page-global).** Changing Doctor / Clinic / Period / quick-filters re-queries every widget on the page + the export. This is the primary cross-filter — server-side, addressable via `?view=` and survives refresh (shipped). No client-side brushing of charts (data lives server-side; brushing would lie about totals).

2. **Drilldown (chart/KPI → register or sub-page).**
   - **KPI hero → register:** clicking a leakage/dues/overdue KPI scrolls to (or opens) its row-level register on the same page, pre-filtered to that metric. Clicking the appointments-funnel "Cancelled" segment filters the register to cancelled rows.
   - **Ranked bar / leaderboard row → drill:** clicking a doctor in the leaderboard sets the Doctor filter to that `um_id` and re-queries the page (the canonical "drill into this doctor"). Clicking a Top-N diagnosis/drug opens the cross-sell table (dx→lab, Rx→pharmacy) for that item.
   - **Register row → entity:** clicking a patient/appointment row deep-links into the EMR record (existing route), opening in a new context so analytics state is preserved.
   - Drilldown is **additive and reversible**: a breadcrumb/active-filter chip row shows applied drill filters; "Reset all" clears them.

3. **Hover (read-only).** Tooltips on every chart point (Indian-formatted), and an info-circle on any widget whose metric carries a caveat — hover/focus reveals the `meta.note` and feasibility tag. No data is mutated on hover.

**Cross-domain links (the playbook §7) are explicit affordances**, not hidden: a "View lab cross-sell →" link under Top Investigations, a "Recall list →" link from the follow-up-adherence card to the overdue register, a "Who's leaking? →" from the clinic leakage tile to the per-doctor breakdown.

---

### 6. States: loading / empty / no-data / error / sandbox / feasibility

Every widget must resolve to exactly one state. This is where the honest-data discipline lives.

| State | Trigger | Render |
|---|---|---|
| **Loading** | request in flight | antd `Skeleton active` rows in the grid (shipped) — never a spinner over stale data; skeletons match the eventual layout (card-shaped for KPIs, block for charts) |
| **Populated** | rows present | the widget |
| **Empty (valid query, zero rows)** | e.g. no appointments in window | inside the card: muted centered "No appointments in this period." + a hint to widen the date range. KPI shows `"No data for this period"` (no fake 0% delta) |
| **No-data / blocked metric** | metric is feasibility `X` (not in DB) | `Widget kind:"empty"` — amber InfoCircle + the honest `note` + a bulleted `planned[]` list of what will fill it once data exists. **Never a zero or a placeholder chart.** |
| **Profiling-gated** (`P`) | queryable but unmapped/derived (wait-time, lead-time, discount %) | render the widget but with a `Profiling` badge in the card header + `note` stating "pending column-map / timestamp profiling — directional" |
| **Microservice-gated** (`S`) | needs engagement/symptoms/SnapRx (VoiceRx adoption, symptom funnel, pending-digitization) | `Designed`-style placeholder with a `Needs service` badge; describe the dependency, no numbers |
| **Sandbox / sample** | ABHA today is ~99% sandbox/test; sample fallback when `analytics-use-api` flag is off | `Badge variant="warning"` "Sandbox" (ABHA) / "Sample" (flag-off) in the card header; the existing `sample` prop drives this. Sandbox data is visually dimmed (reduced opacity) so it's never mistaken for production |
| **Error** | request failed (and the leaf is built) | antd `Alert type="error"` above the grid ("Couldn't load analytics" + message) + a Refresh affordance; previously-loaded widgets stay rather than blanking |

**Feasibility badge taxonomy (header chips, map straight to §9 / §8 legend):** `Sandbox` (amber, ABHA test data), `Profiling` (amber, P-tag), `Needs service` (slate, S-tag), `Sample` (amber, flag-off), `~17% coverage` (slate, booking-source). Badges are text + color (accessible). The rule: **if the data isn't real, the UI says so on the widget — we never design UI for data we don't have.**

---

### 7. Density, spacing & responsive breakpoints

- **Card padding** 20px (`tw-p-5`); KPI internal rhythm: title → 8px → value → 6px → description → 12px → trend tag (shipped). Grid gap `tw-gap-3.5` (14px) for KPI strip, ~16–20px between widget rows.
- **Type scale:** KPI value 26px/bold, KPI title 13px/semibold-muted, card title 14px (`tw-text-sm`), captions/notes 11–11.5px muted, axis ticks 11px. Tabular-nums on every number.
- **Default density** is "comfortable." Offer a future **Compact** toggle (reduces card padding to `tw-p-4`, KPI value to 22px, table rows to 32px) as a customization hook (§9) for P3 power users on dense multi-specialty dashboards.

**Breakpoints (Tailwind, `tw-` prefixed — KPI strip uses `tw-grid-cols-1 sm:tw-grid-cols-2 xl:tw-grid-cols-3`, extend to 4-up at `2xl`):**

| Width | KPI strip | Widget grid | Filter bar | Nav |
|---|---|---|---|---|
| `<640` (mobile) | 1-up | 1 col, all full-span | wraps; period as bottom sheet | sidebar → hamburger drawer + backdrop (shipped) |
| `640–1024` (sm/tablet) | 2-up | 1–2 col | wraps to 2 rows | collapsible |
| `1024–1280` (lg) | 3-up | 2 col | single row | pinned |
| `≥1280` (xl/2xl) | 4-up | 2–3 col; trend/table full-span | single row | pinned |

Charts use a fixed `height` (default 280) with `width:100%` and Recharts responsive container; circular charts are square (`aspect-square`). Heatmaps/leaderboards go full-span below `lg`. Tables horizontally scroll (`overflow-x`) on mobile rather than dropping columns.

---

### 8. Accessibility (WCAG 2.1 AA — hard requirements)

- **Contrast:** all token pairs meet ≥4.5:1 for text (slate-900 on white, muted slate-500 on white passes for ≥12px). Delta-tag text (`--success`/`--destructive`) on its 12%-tinted background passes AA; verify any new tinted pill. Chart series colors are distinguishable but **never the sole carrier of meaning**.
- **Color + icon + sign, always.** Good/bad is encoded three ways: color (green/red), arrow direction (diagonal up/down), and numeric sign. Status badges carry text labels. Leaderboard outliers get a red pill *and* a flag glyph. This directly fixes the R-set pitfall of color-only good/bad encoding.
- **Keyboard:** filter selects, period dropdown, sort headers (already `<button>`), pagination, export, and every drilldown affordance are focusable and operable via Enter/Space. Tab order follows reading order (filter bar → hero → trend → register). Focus ring uses `--ring` (indigo), 2px, never removed.
- **Screen reader:** KPI cards expose an aria-label combining title + value + delta direction in words ("Cancellation rate, 8.4 percent, down 5.4 percent versus previous period"). Charts have an `aria-label` summary and a visually-hidden data table fallback (Recharts `<title>`/`<desc>`). The diagonal trend SVGs need `role="img"` + `aria-label="up/down/flat"`. Sort state announces via `aria-sort`.
- **Targets:** interactive controls ≥32px (icon buttons are `tw-size-7`/28px on desktop — bump to ≥40px on touch/mobile). Pagination/refresh/export meet this on touch.
- **Motion:** honor `prefers-reduced-motion` (§10).

---

### 9. Customization hooks

- **Add Widget** (shipped `QueryBuilderDrawer`): users compose a custom widget on any page; it renders below a "Your widgets" divider and is individually removable (trash affordance). Custom widgets honor the same filter bar and export.
- **Period presets** (`DateRangeControl`): Today / 7d / 15d / 30d / 90d / 1y + custom range; trigger shows the preset name when matched, explicit dates otherwise. Extensible by editing `RANGE_PRESETS`.
- **Comparison window** is implicit ("vs previous period" = the immediately-preceding equal-length window). Hook: allow an override to "vs same period last year" in the period control for seasonal P3 views — the KPI `deltaLabel` already takes the baseline string.
- **Density toggle** (§7), **Compact**, persisted in `localStorage` like the `tp_analytics_api_on` flag.
- **Per-business feature flags:** specialty-thin modules (Obstetric/Gynec, Vaccination) are nav-gated per business and excluded from owner-hero aggregates; `analytics-use-api` (GrowthBook) routes to live vs sample. New leaves are wired by registering an endpoint in `DASHBOARD_ENDPOINTS`/`PAGE_MAP` in `analyticsNav.jsx` — no component changes needed.
- **Export** is per-widget CSV today; the hook for an "Export page" / scheduled-report extension lives in `analyticsExport.js`.

---

### 10. Motion

Restrained, fast, purposeful — analytics is a reading surface, not a showcase.

- **Card hover:** shadow-only lift (`tw-transition-shadow hover:tw-shadow-md`, shipped) — no scale/translate.
- **Chart entry:** Recharts default series animation, **capped at 400ms ease-out**, runs once on mount/data-change; disable per-frame re-animation on filter tweaks to avoid flicker (`isAnimationActive` gated to first paint).
- **Number transitions:** KPI value count-up is optional and ≤300ms; skip it if it delays the read — never animate currency by digit roll.
- **State changes:** loading→populated cross-fades the skeleton out (150ms); error Alert slides in at the top (200ms).
- **Drilldown/filter:** filtered re-query shows skeletons in place (no layout jump); the active-filter chip row animates in at 150ms.
- **Drawer/dropdown** (Add Widget, period panel): standard antd/Radix slide+fade, ≤250ms.
- **`prefers-reduced-motion: reduce`:** disable all chart animation (`isAnimationActive={false}`), count-ups, and cross-fades — render final state instantly. This is mandatory.

Timing tokens: micro 150ms, standard 200–250ms, chart 400ms; easing `ease-out` for entrances, `ease-in-out` for state swaps. Nothing in the analytics canvas animates longer than 400ms.

---

**Relevant files (all absolute):**
- Components: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/components/{KpiCard,TrendIcon,AnalyticsChart,AnalyticsTable,DateRangeControl,Widget,ExportButton}.jsx`
- UI primitives + tokens: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/ui/{theme.css,card.jsx,badge.jsx,chart.jsx,table.jsx}`
- Page shell / filter bar / grid / states: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/AnalyticsWorkspace.jsx` and `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/shell/analyticsNav.jsx`
- Formatters / flags / availability: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/analyticsConfig.js`

**New components to build (do not exist yet):** `Leaderboard` widget (volume bar + secondary quality metric + peer-median tick, §3a); heatmap matrix (peak hour×DOW, cohort retention); gauge / paired big-number (ABHA linkage, billing coverage, attach rate); box-plot/histogram (wait-time, polypharmacy, LTV) — all as new `type`s on `AnalyticsChart` or sibling widgets honoring the same `{columns, rows}` + `viz` contract and the feasibility-state rules in §6.