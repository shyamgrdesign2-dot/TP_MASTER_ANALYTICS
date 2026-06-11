# IPD Overview

## What this page is
The hospital scoreboard for the inpatient unit: how full are we, what moved this period, anything alarming.

## Key metrics
- **Current census**: patients in hospital right now (admitted, not discharged). The headline.
- **Admitted / Discharged**: admissions and completed discharges in the period.
- **In discharge queue**: patients sent for discharge approval but not yet discharged (the 'ready to discharge' state). Why: the discharge bottleneck at a glance.
- **~Avg length of stay**: mean days from admission to discharge for stays completed in the period.
- **Bed occupancy**: census divided by active beds. The capacity headline.

## Charts
- Admissions vs discharges over time (flow balance), inpatient census over time, ward occupancy (occupied vs available), discharge-type mix.

## Caveats
- Source is the legacy replica; hospitals on the modern pm-ipd microservice need the export feed (the page banner says so).
- Legacy data has no discharge-date column: the discharge moment uses the ready-to-discharge log, then the discharge-summary date, then last-modified (approximation marked).
