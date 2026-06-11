# Campaigns: backend API spec

## Backend notes: Campaigns

**No pm-analytics-service endpoint exists or is needed today.** The page is FE-orchestrated against the bulk-messages service (`config.bulk_messages` base URL, Bearer JWT attached by `axiosService`). Loader: `bulkCommWidgets()` in `src/pages/analytics/service.js` (leaf `bulk_comm` via `PAGE_MAP`).

### Calls used
- `GET {bulk_messages}/api/v1/communication/userCredit` -> `{ userCredit }` (credit balance KPI).
- `POST {bulk_messages}/api/v1/campaign/userCampaign` body `{ draft: 0, start_date, end_date }` -> array-like object `{0:{...},1:{...}}` of campaigns. Fields consumed per campaign: `campaign_name`, `campaign_date`, `total_patient`, `campaign_sent`, `success`, `failed`, `total_credit`, `campaign_status`.
- Client mappers: KPI sums + `campaignsTable()` (`src/pages/analytics/analyticsHelpers.js`) -> `{columns, rows}`; both APIs failing renders an honest empty widget.
- Full client list (create/edit/delete, templates, payment) in `src/api/services/ApiBulkMessages.js`.

### Needed-but-missing feed (only if server-side campaign analytics is wanted)
- **Per-message delivery log export** on the bulk-messages service: `GET /api/v1/campaign/messages/export?businessId=&from=&to=` returning one row per message `{ campaign_id, patient_id, channel, sent_at, delivered_at|null, status, credits }`. Unblocks: delivery-rate trend, best send time (delivery by hour/weekday), per-template performance. Until then the page stays campaign-grain only.
- If the page should move behind the analytics service later, mirror the universal envelope: `GET /api/v1/analytics/engagement/campaigns?startDate&endDate` returning a dashboard-block (`kpis` + `deliveryMix` + `campaignsRegister`), and the FE keys must be registered in `BLOCK_TITLES` / `BLOCK_ORDER` (see Architecture overview).
