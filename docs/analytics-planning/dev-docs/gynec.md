# Gynec (Menstrual)

## What this page is
Menstrual gynec history analytics: cycle regularity, flow, pain, reproductive life stage, and the menarche/cycle-interval averages. Clinically, irregular-cycle share is the screening signal for PCOD and thyroid workups.

## Why it shows SAMPLE data today
The gynec record is NOT in the analytics database. The EMR's Gynec History screen saves to a separate microservice (`pm-medicalhistory`), which exposes only a per-patient lookup: there is no "all gynec records for hospital X in range Y" call. Per product direction there are no "coming soon" pages, so the page renders deterministic, clearly-labelled sample data with a banner; it switches to live data automatically once a bulk feed lands. Nothing on this page is real today.

## The metrics (as designed, mapped to real fields)
- **Patients with gynec history**: distinct `patientId` with a record; denominator for coverage = female patients in the patient master.
- **~Avg age at menarche** (`ageAtMenarche`): mean recorded age at first menstruation; outliers under 9 or over 16 flagged.
- **~Avg cycle interval** (`intervalOfCycle`, days) and **~avg flow duration** (`durationOfMenstrualFlow`, days).
- **Irregular cycles %**: share of records with `cycle = Irregular`.
- **Cycle mix** (`cycle`: Regular / Irregular / Not recorded), **Flow mix** (`flow`: Heavy / Moderate / Scanty / Not recorded), **Pain mix** (`pain`: None / Mild / Moderate / Severe / Not recorded), **Reproductive life stages** (`reproductiveLifeStages`: Menopause / Perimenopause / Lactational amenorrhea, with `typeOfMenopause` detail).
- **Gynec history register**: per-patient summary (LMP, cycle, flow, pain, stage).
All value vocabularies are fixed in the EMR (`gynec_constants.js`), so every mix has a known, zero-fillable domain.

## Caveats
- Until the feed lands, every number is illustrative; the response carries `meta.live: false` and an explicit sample-data note the UI shows as a banner.
- Tenant attribution must be recovered by joining `patientId` to the patient master: the gynec document carries no hospital id.
