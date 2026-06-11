# Architecture overview

# Architecture overview

The master picture of how the analytics module hangs together. For doctors and admins: where the numbers come from; for engineers: the contracts everything obeys.

## System diagram (in words)
- **Frontend**: a native React (CRA) analytics module at `src/pages/analytics` inside the doctor portal, replacing the legacy PHP `data_analytics` link-out. A sidebar (Overview, Appointments, Billing, Patients, Care group, Pharmacy, Grow group, Reports) drives a single workspace shell with shared Date / Doctor filters.
- **Backend**: `pm-analytics-service`, a NestJS service that reads the `tatva_clinic` MySQL **read replica only** (SELECT-only DB user, no writes ever). Listed at `/api/v1/analytics`.
- **Production APIs**: Billing and Appointments pages additionally read the same production APIs the EMR screens use (billing dashboard, advance-deposit dashboard, appointment list), so their figures reconcile exactly with what staff see elsewhere. Campaigns reads the bulk-messages service.
- **Microservice-blocked domains** (honest placeholders until a feed lands): Gynec menstrual history and current Obstetrics (pm-medicalhistory service), OPD Procedures (pm-patient-docs), Custom RxPad modules (dynamic-modules service), ABHA KYC channel and request-level consent (ABDM service), per-patient Symptoms for the Overview card (symptoms service), plus VoiceRx / symptom-collector engagement (write-only logs today).

## House rules (every page obeys these)
- **Zero-fill**: fixed domains always render every bucket, zero included (all 24 hours, all 7 weekdays, all genders, all blood groups). A quiet category shows flat, never disappears.
- **Not recorded buckets**: missing data is shown explicitly as its own grey bucket, never silently dropped.
- **No em dashes** in any copy; colons, commas, parentheses instead.
- **~ approximations**: averages and forecasts are whole numbers prefixed with ~ ("~₹ 1.2L", "~12 min").
- **Whole-number counts** everywhere; Indian-format compact numbers (k / L / Cr).
- **Projection gating**: forecast cards (projected billed, etc.) compute only for a current rolling window of 7 to 92 days ending roughly today; otherwise the card stays with a dash and explains why.
- **Role-default landing**: a doctor login opens every page pre-scoped to themselves (Reset returns to that default); owner/admin logins open clinic-wide.
- **Semantic status colors**: labels with fixed meaning get fixed colors everywhere: completed green, cancelled red, scheduled amber, residual buckets (Other, Unknown, Not recorded) grey; everything else cycles a categorical palette.
- **Honesty**: truncated registers say so in a note; empty states are real ("No data for this period"), never fabricated sample data.
