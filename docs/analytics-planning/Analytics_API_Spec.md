# Analytics API — Service Contract (v1)

**Decision (2026-06-04):** a **dedicated Node/NestJS Analytics microservice** backed by a **read replica** of the EMR DB will serve all analytics. It exposes the legacy `data_analytics/` reports 1:1 (see [Legacy_Parity_Inventory.md](Legacy_Parity_Inventory.md)) and is the unlock for every 🔴 report.

This doc is the **contract between the React app and that service** — endpoints, auth/scope, request/response shapes — so backend can build it and the frontend can integrate without guesswork.

---

## 1. Architecture & non-negotiables

```
React EMR ──HTTPS+JWT──► Analytics API (Node/NestJS) ──read-only SQL──► Read replica (+ nightly rollups)
```

- **Read replica only.** Never aggregate on the OLTP primary (PRD §9, buildability §5). Analytics user is read-only.
- **Scope is injected server-side from the JWT** — `hm_business_id` (+ `hm_id`/doctor for row-level). The client **cannot** widen scope. Mirrors the existing token model (`result.hospital_business_id`, `result.clinic_id`, `result.doctor_unique_id`).
- **Nightly rollups** for the 5 giant tables (appointments, medicine_report, etc.) — default dashboards read `fact_*_daily`, not raw (buildability §2.1).
- **Caching** (Redis, keyed by `hash(query + resolved scope)`, short TTL).
- **Auth** = the same Bearer JWT the app already sends; `axiosService` attaches it automatically.

---

## 2. Two-layer API surface

### 2.1 The generic query endpoint (the engine — PRD §8)
`POST /api/v1/analytics/query`

```jsonc
// request
{
  "dataset": "collections",
  "measures": ["collections.amount", "collections.refund"],
  "dimensions": [{ "field": "date", "grain": "day" }, { "field": "payment_mode" }],
  "filters": [{ "field": "date", "op": "between", "value": ["2026-05-01","2026-05-31"] }],
  "careSetting": "opd",          // opd | ipd | both  (server maps to bill_type / in_pid)
  "sort": [{ "field": "date", "dir": "asc" }],
  "limit": 1000
}
```
```jsonc
// response — the universal envelope every widget consumes
{
  "columns": [
    { "key": "date", "label": "Date", "type": "date" },
    { "key": "collections.amount", "label": "Collection", "type": "currency" }
  ],
  "rows": [ { "date": "2026-05-01", "collections.amount": 42000 } ],
  "meta": { "cached": true, "generatedAt": "…", "rowCount": 31, "careSetting": "opd" }
}
```
This is the long-term target — the React `service.js` already normalizes to exactly `{columns, rows}`, so the client barely changes.

### 2.2 Named report endpoints (Phase-1 shortcut)
While the semantic registry is built out, expose **one endpoint per legacy report**, each returning the **same `{columns, rows, meta}` envelope**. This lets the frontend light up parity reports incrementally. All accept a common query string: `?careSetting=opd|ipd|both&startDate=&endDate=&hospitalId=(optional)&doctorIds=(optional)&grain=day|week|month`.

| Endpoint | Replaces legacy | Returns (rows) |
|---|---|---|
| `GET /analytics/financial/collection-trend` | `get_collection_chart_data_*` | date, collection, refund |
| `GET /analytics/financial/revenue-trend` | `get_collection_revenue_chart_data_*` | date, revenue, credit_note |
| `GET /analytics/financial/payment-mode-mix` | billing summary | payment_mode, amount |
| `GET /analytics/financial/daily-collection` | `daily_collection.php` | type, billId, issuedBy, patient, mop, amount |
| `GET /analytics/financial/collection-report` | `collection_*_report` | document-level rows + filters (billType[], issuedBy[], mode[]) |
| `GET /analytics/financial/3c-report` | `get_*_3creport_*` | service-level rows (account, dept, billType) |
| `GET /analytics/financial/incentives` | incentive reports | user, service, servicePrice, incentiveAmount (+overall totals) |
| `GET /analytics/operational/appointments-trend` | `get_appointment_chart_data` | date, total, cancelled |
| `GET /analytics/operational/case-type-mix` | `get_case_type_chart_data` | caseType, count |
| `GET /analytics/operational/pharmacy` | `get_pharmacy_summary_graph` | date, PI, PR, SI, SR |
| `GET /analytics/operational/pathology` | `get_pathology_chart_data` | date, opd, ipd |
| `GET /analytics/clinical/consultations` | `data_clinic_consultations` | week, consults, unique, repeat, plannedFU, doneFU |
| `GET /analytics/clinical/diagnosis` | `data_clinic_diagnosis` | diagnosis, count (+ investigations, age, gender variants) |
| `GET /analytics/clinical/rx` | `data_clinic_rx_analytics` | brand/company/generic, count, dose |
| `GET /analytics/ipd/occupancy` | `get_bor/alos/adc_*` | month, bor, alos, adc |
| `GET /analytics/ipd/ward-summary` | `get_ward_summary_*` | ward, admitted |
| `GET /analytics/ipd/discharge-summary` | `get_dis_summary_*` | dischargeType, count |

Each row's exact source SQL + formula is in the parity inventory — implement those verbatim against the replica.

### 2.3 Saved views (Builder — PRD §6, Phase 2)
`GET/POST/PUT/DELETE /api/v1/analytics/dashboards` — CRUD for `{ id, name, ownerId, scope, filterBar, widgets:[{query, viz, layout}] }`.

### 2.4 Export
`POST /api/v1/analytics/export?fmt=csv|xlsx|pdf` — same query, higher row cap, server-streamed file. (Client already does per-widget CSV/Excel locally via `xlsx`; this is for full/PDF + large exports.)

---

## 3. Authz (role → capability)
Map legacy role IDs → capability flags, enforced server-side on every call (PRD §13):
- Financial datasets → billing roles (389–395, 23). 3C → 23. Exports → 369.
- Clinical → ut_id 1/2 (admin/jr doctor); associates see only their own `doctor_id`.
- IPD → module 3.
The builder only offers permitted measures; the API re-checks (never trust the client).

---

## 4. Frontend integration (this repo)
When the service is up:
1. Add `analytics_api_url` to `src/EnvironmentConfig.js` (all envs) + surface in `src/config.js`.
2. Create `src/api/services/ApiAnalytics.js` (mirrors `ApiAppointments.js`): `runQuery(q)`, named report getters, `listDashboards`, `saveDashboard`, `export`. `baseUrl = { customBaseUrl: config.analytics_api_url }` — JWT auto-attached.
3. Flip `src/pages/analytics/service.js` behind a flag: today it calls billing/appointment APIs directly + aggregates client-side; switch each loader to the matching `/analytics/*` endpoint. Because both already return `{columns, rows}`, **the widgets and UI don't change** — only the data source.
4. Retire the client-side aggregation in `analyticsHelpers.js` as each report moves server-side (server does the math — PRD principle "aggregate at the edge, not the browser").

---

## 5. Build order for the service
1. **P0:** skeleton + replica + JWT scope injection + the 3 ✅/🟡 financial + appointment endpoints (so the frontend swaps off direct billing calls). Run profiling PB-1/2/3/5 first.
2. **P1:** collection-report / 3C / incentives / daily-collection (financial parity complete).
3. **P2:** clinical (consultations / diagnosis / rx) — high value, data is rich.
4. **P3:** IPD (occupancy/ward/discharge) — needs PB-3 discharge-date + nightly census; pharmacy/pathology.
5. **P4:** generic `/query` + semantic registry + saved dashboards (Builder).

---

*This contract turns the parity inventory into a buildable service. Frontend is already shaped for it (`{columns, rows}` envelope, OPD/IPD/Both, per-widget export). Next: backend team owns the service repo; frontend scaffolds `ApiAnalytics` + `analytics_api_url` and flips loaders endpoint-by-endpoint behind a flag.*
