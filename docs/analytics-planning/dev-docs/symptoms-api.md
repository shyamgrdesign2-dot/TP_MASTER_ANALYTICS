# Symptoms: backend API spec

## Endpoint

`GET /api/v1/analytics/clinical/symptoms`

- Auth: Bearer JWT. Scope (hm_business_id, um_id) decoded server-side from the token (src/common/scope.ts), never from the client.
- Params: `startDate=YYYY-MM-DD`, `endDate=YYYY-MM-DD` (inclusive, expanded to 23:59:59), `grain=day|week|month` (DEFAULT month, unlike the other clinical builders), `doctorIds` (repeatable, normalized to array at the controller).
- Builder: pm-analytics-service/src/analytics/builders/symptoms.ts.

## Source and method

- Single fetch: `tbl_case_manager cm LEFT JOIN tbl_patient_master p ON patient_unique_id`, `WHERE cm.tcm_del = 0 AND cm.hm_business_id = :biz AND cm.tcm_history_box_type = 1 AND cm.tcm_history_box <> '' AND cm.tcm_datetime BETWEEN :s AND :e [AND cm.um_id IN (...)]`, `ORDER BY tcm_datetime DESC LIMIT 20000` (FETCH_LIMIT; most-recent-first so truncation keeps recent data; truncation appends to meta.note).
- `tcm_history_box` is BLOB-ish: select via `CONVERT(... USING utf8mb4)`, then parse in TS with regex `/<b>([^<]*)<\/b>- since ([^,]*), severity -<b>([^<]*)<\/b>, ([^;]*);/g`. Non-matching (legacy free-text) boxes produce zero entries.
- Severity fold: high/severe to Severe, medium/moderate to Moderate, low/mild to Mild, else Not recorded. Name key: `LOWER` + whitespace collapse; display name: most frequent original casing.

## Response blocks (dashboard-block shape)

- `kpis`: `topSymptom` (name), `symptomEntries`, `distinctSymptoms`, `patientsWithSymptom` (distinct patient_unique_id). No `hero` (the KPI carries it).
- `severityMix`: `[k, count]`, fixed order Mild, Moderate, Severe, Not recorded, zero-filled.
- `topSymptoms`: `[k, count]`, top 15 by mentions.
- `symptomTrend`: `[k, entries, patients]`; bucket key matches MySQL `%Y-%m-%d` / `%x-W%v` / `%Y-%m`; zero-filled across the data's calendar span (500-bucket guard, falls back to raw keys).
- `register`: `[patientName, date, symptom, severity, since, note]`, first 200 parsed entries (newest first).
- `meta`: `{ live: true, rowCount, note }`.

FE wiring: nav leaf `symptoms` maps to `clinical/symptoms` in DASHBOARD_ENDPOINTS (src/pages/analytics/shell/analyticsNav.jsx); blocks render via BLOCK titles/kinds in src/pages/analytics/service.js (topSymptoms bar, symptomTrend line, severityMix donut, register table).
