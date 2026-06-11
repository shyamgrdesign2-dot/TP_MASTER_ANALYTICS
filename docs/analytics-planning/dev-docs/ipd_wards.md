# IPD Wards & Beds

## What this page is
Bed management: the revenue ceiling of an inpatient unit. Capacity, what is occupied/blocked, patient moves, and two predictive bands that turn the census into a planning tool.

## Key metrics
- **Beds total / occupied / available / blocked** (a bed is a ward-room row of type bed; occupancy is derived from active admissions' room assignment).
- **Occupancy %**, **Room shifts** (ward/department moves this period), **~Bed turnover** (discharges per bed).

## Charts and tables
- Ward and department throughput: admissions and completed discharges per ward and per department (specialty); avg LOS by department; transfers in and out per ward (the ward transfer load).
- Beds by ward (occupied/available/blocked); bed occupancy over time; avg LOS by ward; transfers register (every ward/department/doctor move with old and new values).
- **Predictive band**: expected discharges next 7 days (patients in the queue plus patients past their ward's median stay) and projected occupancy (census minus expected discharges plus the trailing admission rate). Heuristics, clearly labelled.

## Caveats
- Bed-level move history is complete only when transfers go through the transfer screen; the log reliably captures ward-level moves.
