# Analytics Dashboard — Planning & Reference

Reference docs for the **native Analytics module** that replaces the legacy PHP
`data_analytics` SSO link-out with a configurable, role-aware analytics
experience inside the React EMR (this repo). Authored by Shyam (Product/Design).

These are working reference documents for the `Analytics_Dashboard` branch — not
final specs. We brainstorm and build against them.

## Documents

| File | What it is |
|---|---|
| [Analytics_Dashboard_PRD_v1.md](Analytics_Dashboard_PRD_v1.md) | **The build PRD — start here.** Grounded in the *actual React app surfaces* (billing dashboard, All Patients, doctor/prescription data, IPD link-out). Says what we can show, what types of analytics, how it scales, how it stays configurable for v1, and the IPD entry-point plan. Maps every metric to a real field/API. |
| [Legacy_Parity_Inventory.md](Legacy_Parity_Inventory.md) | **Phase-1 parity spec** — every legacy PHP analytics report (`data_analytics/`) catalogued: filters, charts, metrics/formulas, SQL source, role gating, mapped to a React data-source status (✅ now / 🟡 partial / 🔴 needs endpoint). Plus the "new functionalities on top." The authoritative rebuild list. |
| [Analytics_API_Spec.md](Analytics_API_Spec.md) | **The Analytics microservice contract** (decided: Node/NestJS + read replica). Endpoints (generic `/query` + one per legacy report), auth/scope, the universal `{columns,rows,meta}` envelope, authz, and the frontend integration plan. What backend builds; what the frontend flips loaders onto. |
| [Analytics_Endpoint_Contracts.md](Analytics_Endpoint_Contracts.md) | **Implementation-grade per-endpoint contracts** for every "Soon" dashboard (clinical triple-panel, Voice Rx, Symptom Collector, Consultation, IPD, financial gaps). Exact request params + response blocks tied 1:1 to the React widgets + source SQL tables. The backend's build sheet; each endpoint = a one-line frontend flip. |
| [Analytics_Architecture_and_Design.md](Analytics_Architecture_and_Design.md) | The deeper architecture + UI design doc (v1.0), grounded in the legacy PHP + DB. Vision, personas, the two-mode model (Default + Builder), the semantic layer / query contract, data architecture, security, phased roadmap. Read after the PRD for engine detail. |
| [Analytics_Buildability_and_Scope.md](Analytics_Buildability_and_Scope.md) | Reality-check against the real DB (391 MySQL tables, snapshot 2026-05-17). Metric-by-metric buildability matrix (Tier 1/2/3), the 4 real data constraints, and a data-tiered scope recommendation. Overrides the PRD where data gaps exist. |
| [Analytics_KPI_Benchmarks_Research.md](Analytics_KPI_Benchmarks_Research.md) | Cited evidence layer — KPI formulas, benchmarks (HFMA/MGMA/etc.), India ABDM/DPDP compliance notes, and an honest list of research gaps + refuted claims. |
| [profiling_queries_PB1-PB5.sql](profiling_queries_PB1-PB5.sql) | Read-only profiling queries (PB-1…PB-5) to run on the read replica before finalizing spec cards: appointment vocab, tenant map, discharge-date source, bed census, money semantics. |

## Key takeaways (the 30-second version)
- **One engine, many reports:** every legacy report collapses to *(dataset, measures, dimensions, filters, viz)*. Build the primitives once.
- **Two modes share one engine:** role-based **Default** dashboards (seeded as saved-view JSON) + a self-serve **Builder**.
- **Zero AI in v1**, but AI-ready: a saved view is already a structured JSON query against a named semantic model.
- **Data is ~70% clean today:** all Financial + most Appointments/Clinical-mix ship first; IPD LOS/occupancy and vitals are gated on small, known data tasks.
- **Reality checks before building:** run PB-1 (status vocab), PB-2 (tenant map), PB-3 (discharge date), PB-5 (money semantics).

## Not included here
The original `_src/` mirror (1.1 GB — legacy PHP app + React master copy) was
**not** committed. The React source it referenced is essentially this repo; the
legacy PHP analytics lives in the `tatvacareclinic-master` codebase.
