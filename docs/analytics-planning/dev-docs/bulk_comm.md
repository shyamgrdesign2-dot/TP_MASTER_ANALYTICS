# Campaigns

# Campaigns (Grow > Campaigns)

What happened with your bulk-message campaigns: how many ran, who they reached, whether messages landed, and what they cost in credits. This page reads the production bulk-messages service directly from the frontend: it does not use the analytics service.

## KPI band
- **Credit Balance**: messaging credits left on the account. Source: `userCredit` API (`userCredit` field). Why: campaigns stop when credits run out.
- **Campaigns**: campaigns run in the period (drafts excluded). Source: count of rows from the `userCampaign` API. Why: activity volume.
- **Patients Reached**: sum of `total_patient` across campaigns. Why: audience size.
- **Messages Delivered**: sum of `success`. Why: what actually landed, not what was attempted.
- **Credits Used**: sum of `total_credit`, rounded to a whole number. Why: spend for the period.

## Charts and table
- **Delivery: delivered vs failed** (donut): total `success` vs `failed` across the period's campaigns. A large failed slice usually means stale phone numbers.
- **Patients reached by campaign (top 8)** (bar): the campaigns with the biggest audiences.
- **Campaigns** (table): one row per campaign: Campaign, Date, Patients, Sent, Delivered, Failed, Credits, Status. Downloadable as CSV/Excel.

## Caveats
- The Date range filter applies (passed as `start_date`/`end_date`); the **Doctor filter does not**: campaigns belong to the account, not a doctor.
- Status semantics (sent vs delivered vs failed) come from the messaging provider via the bulk-messages service; analytics displays them as returned.
- Planned but not built (needs richer data than the campaign list returns): delivery rate trend, best send time, per-template performance.
