# Growth Chart: backend API spec

## Endpoint
- `GET /api/v1/analytics/clinical/growth-chart` (dispatches to `buildGrowthChartDashboard` in `pm-analytics-service/src/analytics/builders/growth.ts`).
- Params: `startDate`, `endDate` (window on `tcbc_created_date`), `doctorIds` (filters `cm.um_id`). Tenant scope from JWT (`hm_business_id = :biz`).

## Source
- `tbl_casemanager_b_composition` (cm): `tcbc_del=0`; fields `height`, `weight`, `bmi`, `ofc`, `tcbc_source`.
- INNER JOIN `tbl_patient_master` p on `patient_unique_id` (needed for DOB; the join plus the age predicate enforce the pediatric scope).
- Pediatric predicate: `TIMESTAMPDIFF(YEAR, p.pm_dob, cm.tcbc_created_date) BETWEEN 0 AND 17` (NULL/zero DOB makes the age NULL, which fails BETWEEN and drops the row).
- Banding: height CAST DECIMAL, implausible = <=0 or >200 cm; weight implausible = <=0 or >120 kg; BMI shown in the register only when `bmi > 0 AND bmi < 100`; OFC counted when `> 0`.
- All queries via safeQ (failure returns [], page never 500s).

## Response blocks
- `kpis` (no hero): `measurements` (COUNT(*)), `patients` (COUNT DISTINCT patient_unique_id, labelled Children measured), `growthScreenUsage` (SUM(tcbc_source='GROWTH_CHART')).
- `heightDistribution` {k,count}: 8 fixed rows (6 bands + Implausible value + Not recorded), zero-filled.
- `weightDistribution` {k,count}: 8 fixed rows, same treatment.
- `ofcCapture` {k,count}: OFC recorded vs Not recorded (= measurements - ofcRecorded).
- `repeatMeasured` {k,count}: Measured 2+ times vs Measured once (GROUP BY patient).
- `patients` (register): date, patientUHID, patientName, gender, age (at measurement), height, weight, bmi, ofc; ORDER BY tcbc_created_date DESC LIMIT 5000.
- `meta` {live:true, rowCount, note}: note states the pediatric scope, the DOB exclusion and the implausible-value bucketing.

## FE wiring
- `DASHBOARD_ENDPOINTS.growth_chart = "clinical/growth-chart"`; heightDistribution/weightDistribution bar, ofcCapture/repeatMeasured donut; titles in BLOCK_TITLES (service.js).

## Needed for the planned percentile metrics
- WHO/IAP growth reference tables (LMS parameters by age in months and sex) loaded server-side; then height-for-age / weight-for-age z-scores and stunting/wasting prevalence become computable from the same rows. No external service feed required, only the reference dataset.
