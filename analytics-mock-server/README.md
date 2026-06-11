# Analytics Mock Server

A **zero-dependency, contract-conformant stub** of the dedicated Analytics
microservice (Node/NestJS, not yet built). It returns data in the exact
**dashboard-block** shape defined in
[`docs/analytics-planning/Analytics_Endpoint_Contracts.md`](../docs/analytics-planning/Analytics_Endpoint_Contracts.md),
so the React app can be flipped onto a real HTTP service and the backend-gated
dashboards (Clinical, Voice Rx, Symptom Collector) light up **end-to-end**
before the real backend exists.

It is the **executable spec** — the real NestJS service must match these shapes.
Data is synthetic and clearly non-clinical; this is a dev/integration tool only.

## Run

```bash
npm run analytics:mock        # → http://localhost:4000
```

Then, in the browser console on `/analytics`:

```js
localStorage.setItem('tp_analytics_api_url', 'http://localhost:4000');
localStorage.setItem('tp_analytics_api_on', '1');
location.reload();
```

Now Diagnosis, Drug/Rx, Symptoms, Lab Tests, Procedures, Vitals, Medical
History, Surgical History, Voice Rx and Symptom Collector render live from the
mock service (their "Soon" pills drop). To turn it off:

```js
localStorage.removeItem('tp_analytics_api_on'); location.reload();
```

## Endpoints
All under `/api/v1/analytics/`:
`clinical/diagnosis · clinical/symptoms · clinical/drug · clinical/lab-test ·
clinical/procedure · clinical/medical-history · clinical/surgical-history ·
engagement/voice-rx · engagement/symptom-collector`

## How the frontend consumes it
`ApiAnalytics.report(path)` → `GET /api/v1/analytics/<path>` → the dashboard
block → `service.blocksToWidgets()` maps each block to a widget generically.
Any contract-conformant endpoint renders with no bespoke frontend code.
