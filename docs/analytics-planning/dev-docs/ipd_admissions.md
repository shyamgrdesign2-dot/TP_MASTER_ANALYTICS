# IPD Admissions & Discharges

## What this page is
Inpatient throughput: who admits, where patients go, how long they stay, and how they leave. DAMA share and death share are quality flags; queue time exposes discharge bottlenecks.

## Key metrics
- **Admissions / Discharges** in the period; **Readmissions** (flagged re-admits); **MLC cases** (medico-legal).
- **~Avg LOS** and **Longest current stay**.
- **Discharge queue size** and **~Time in queue**: from the ready-to-discharge moment to actual discharge. Why: this is the asked-for normal-to-queue conversion time, the single best discharge-process metric.

## Charts and tables
- Admissions over time; by department; by ward; by admitting doctor; patient-category mix (Insurance/TPA vs Self-pay, derived from the insurance fields because the category id is unused); discharge-type mix; LOS distribution (fixed buckets 0-1, 2-3, 4-7, 8-14, 15+ days, zero-filled).
- Registers: every admission, discharged patients, the live discharge queue, per-stay LOS.
