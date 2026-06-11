# Custom Modules (Care): backend API spec

## Endpoint (live today, returns sample data)

- `GET /api/v1/analytics/operational/custom-modules`
- Auth: `Authorization: Bearer <JWT>`; tenant scope (`result.hospital_business_id`) decoded server-side, never trusted from the client.
- Params accepted: `startDate`, `endDate`, `grain=day|week|month`, `doctorIds` (currently ignored by the mock builder).
- Builder: `pm-analytics-service/src/analytics/builders/operational.ts` `case 'custom-modules'` delegates to `buildCustomModulesMockDashboard` in `builders/mock.ts`.
- FE wiring: leaf `custom_modules` in `src/pages/analytics/shell/analyticsNav.jsx` (`DASHBOARD_ENDPOINTS.custom_modules = "operational/custom-modules"`); block titles/viz in `src/pages/analytics/service.js` (`moduleMostUsed` bar, `moduleByCreator` bar, `moduleCreatedVsReused` donut, `moduleRegister` table).

## Response contract (stable; real feed must fill the same shape)

- `kpis[]`: `totalModules`, `createdPeriod`, `creatingDoctors`, `reuseRate` (unit `%`).
- `moduleMostUsed`: `{ k: module, count: timesUsed }`.
- `moduleByCreator`: `{ k: doctor, count: modulesCreated }`.
- `moduleCreatedVsReused`: fixed 2-row domain `{ k: 'Used by the creator' | 'Reused by another doctor', count }`.
- `moduleRegister`: `{ module, creator, columns, created, uses, reusedBy }`.
- `meta`: `{ live: false, rowCount, note: SAMPLE-DATA banner }`. Flip `live: true` and drop the note when real.

## MISSING FEED: dynamic-modules bulk export (required to go live)

The dynamic-modules service must expose a hospital-keyed bulk export (or sync into the replica), same pattern as the gynec feed (see `docs/analytics-planning/GYNEC-OBSTETRIC-INTEGRATION.md`):

1. **Modules registry**: `GET .../modules/export?hospitalBusinessId=&since=` returning per module: `module_id`, `hospital_business_id`, `creator_doctor_id` (um_id or doctor_unique_id, state which), `name`, `column_count`, `created_at`, `deleted` flag.
2. **Usage / reuse log with `origin_id`**: per use event: `module_id`, **`origin_id`** (the source module a copy was cloned from: the reuse marker), `used_by_doctor_id`, `hospital_business_id`, `used_at`. Reuse rate = events where `used_by_doctor_id != creator_doctor_id` (resolved via `origin_id`) divided by all use events.

Without the `origin_id` reuse log, only creation counts are computable; reuse rate, most-used and created-vs-reused all stay blocked.
