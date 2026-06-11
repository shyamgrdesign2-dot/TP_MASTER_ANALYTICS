# Medical History

## What this page is
Prevalence view of the structured medical-history registry: which conditions, allergies, family history items, lifestyle factors and past surgeries the clinic's patients carry.

The one rule that defines this page: **history is a registry, not an event stream**. Prevalence is computed from each patient's LATEST saved history record over ALL TIME. The selected date range applies ONLY to the captures-over-time trend.

## Counting rules
- A history item counts only when the doctor ticked it (`enable='Y'`). Unticked items (`enable='N'`) are documented denials ("asked, patient said no") and are excluded from every count.
- Items bucket strictly by section: 1 Lifestyle, 2 Medical condition, 3 Family history, 4 Allergies, 5 Surgical.
- Items group by normalised title (case/space-insensitive), displaying the most frequent casing. Never by internal tag id: the same title gets different ids per clinic.
- A sixth segregation, **Additional history**, counts patients whose record carries free-text remarks outside the tag taxonomy (presence only, content is not analysed).

## Key metrics
- **Patients with history**: distinct patients with at least one confirmed item in any section on their latest record. Why: the registry's true coverage.
- **Top condition / Top allergy / Top family history / Top lifestyle factor / Top past surgery**: the item confirmed for the most distinct patients in each section. Why: the clinic's clinical profile at a glance.

## Charts and tables
- Five distribution bars (**Top medical conditions / allergies / family history / lifestyle factors / past surgeries**): top 10 items each, by distinct patients.
- **Additional history notes** (donut): patients with vs without free-text remarks.
- **History captures over time** (line): history entries saved per day/week/month in the selected period, with distinct patients. The ONLY date-windowed block.
- **History register** (table): all five sections in one ranked table (Section, Item, Patients, Last recorded), top 150.

## Caveats
- The Doctor filter does not apply: the history table records no doctor.
- Records that fail JSON parsing are skipped and counted in the page note.
- Not buildable: the unanswered "-" state (never persisted), remarks content analytics, surgical timelines, onset trends.
