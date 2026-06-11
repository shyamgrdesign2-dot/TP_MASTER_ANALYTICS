# Obstetrics

## What this page is
Obstetric history analytics: recorded pregnancy, abortion and ectopic events, delivery modes, gestation at delivery, the expected-delivery pipeline and ANC schedule status. Gynec (menstrual) history is a separate page; per product rule the two are never mixed.

## The legacy gate (read this first)
The analytics database only holds the LEGACY obstetric tables, frozen around mid-2024. The modern obstetric screen saves to the gynec microservice (`pm-medicalhistory`), which has no bulk feed yet. The page says so in an explicit banner: clinics with legacy rows see them labelled as legacy; clinics with none see the pending note, never fake zeros. It lights up with current data once the obstetric feed lands (same contract as gynec).

Also: G/P/L/A/E counters are NOT persisted in this database. The page counts recorded EVENTS instead and labels them as such.

## Key metrics
- **Patients with obstetric record**: distinct patients with at least one history row. Why: reach of obstetric documentation.
- **Obstetric records**: total entries (pregnancies, abortions, ectopics).
- **Pregnancy / delivery events**, **Abortion events**, **Ectopic events**: event-type counts from the record's box type. The abortion count is the nearest available proxy for the A counter.
- **Marked currently pregnant**: legacy pregnancy rows flagged pregnant. Frozen data: treat as historical.

## Charts and tables
- **Obstetric outcomes** (donut): events by type (Pregnancy/delivery, Abortion, Ectopic, plus Other only when present).
- **Delivery mode mix** (donut): recorded deliveries by mode, top 10, 'Not recorded' kept visible.
- **Gestation at delivery** (bar): weeks parsed from free text, banded under 28, 28-36 (preterm), 37-42 (term), over 42, Not recorded.
- **Expected deliveries by month** (line): EDD pipeline from the legacy pregnancy rows. Newest EDDs end in 2024, so this reads as a historical pipeline.
- **ANC schedule status** (donut): antenatal scheduler items by status (legacy scheduler, not date-windowed).
- **Obstetric register** (table): latest 200 events with patient, age, event, delivery mode, weeks, baby gender and outcome.
