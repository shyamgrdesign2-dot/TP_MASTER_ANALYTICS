# Gynec & Obstetric analytics — how to fetch the data

Reverse-engineered from the EMR's Gynec History screen
(`src/components/MedicalHistoryBox.js` → `src/api/services/ApiGynec.js`).
This is the integration contract: what the data looks like, where it lives, and
the one missing piece needed to drive analytics.

## Where the data lives (the key finding)

Menstrual gynec history is **NOT in the `tatva_clinic` replica** that every
other analytics builder reads. It is owned by a separate microservice:

```
gynec_api_url     = https://pm-medicalhistory-{env}.tatvacare.in/api/v1/gynec-history
obstetric_api_url = https://pm-medicalhistory-{env}.tatvacare.in/api/v1/obstetric-history
```

The EMR talks to it with three calls (`ApiGynec.js`):

| Verb | Path | Purpose |
|---|---|---|
| GET | `/gynec/{patientId}/{userId}` | fetch ONE patient's record (point lookup) |
| POST | `/gynec` | create |
| PATCH | `/gynec/{patientId}/{userId}` | update (overwrites the flat record) |

`userId` defaults to the logged-in doctor's `user_id` from the JWT.

## The document shape

The save payload (`handleSaveClick`) shows the stored shape is **longitudinal** —
a `timeline` array, one entry per consult:

```jsonc
{
  "patientId": "<patient_unique_id>",
  "timeline": [
    {
      "lmp": "2025-12-09",                       // last menstrual period (date)
      "ageAtMenarche": 13,                       // number (years)
      "ageAtMenopause": 49,                       // number (years), when applicable
      "intervalOfCycle": 28,                      // number (days)
      "durationOfMenstrualFlow": 5,               // number (days)
      "numberOfPadsPerDay": 3,                    // number
      "cycle": "Regular",                         // Regular | Irregular
      "flow": "Moderate",                         // Heavy | Moderate | Scanty
      "pain": "Mild",                             // None | Mild | Moderate | Severe
      "occurrenceOfPain": "During menses",        // Before/During/After menses | Not related to menses
      "clots": true,                              // boolean
      "reproductiveLifeStages": "Perimenopause",  // Menopause | Perimenopause | Lactational amenorrhea
      "typeOfMenopause": "Normal",                // Normal | Surgical | Chemotherapy - induced | Primary ovarian sufficiency | Other
      "note": "…",                                // free text
      "createdAt": "<iso>",
      "createdBy": "<doctor user_id>"
    }
  ],
  "createdAt": "<iso>",
  "createdBy": "<doctor user_id>"
}
```

Value vocabularies are fixed in `src/utils/gynec_constants.js` (CYCLE_KEY_LIST,
FLOW_LIST, PAIN_LIST, REPRODUCTIVE_LIFE_STAGES_LIST, etc.) — so every analytics
mix has a known, zero-fillable domain.

## Why analytics can't read it today (three blockers)

1. **No bulk/list endpoint.** The service exposes only a per-patient GET. There
   is no "list all gynec records for hospital X in date range Y". Iterating the
   point lookup over a whole patient cohort is N HTTP calls — not viable for a
   dashboard.
2. **The analytics service has no HTTP client.** `pm-analytics-service` is a
   pure read-replica reader (mysql2 only); it has no plumbing to call an
   external microservice, and firing the doctor's session token at it from the
   browser is both wrong and blocked.
3. **No tenant id in the payload.** The gynec document carries `patientId` and
   `createdBy` but **no `hm_business_id`** — so even with the data, tenant
   attribution must be recovered by joining `patientId` back to
   `tbl_patient_master` in the replica.

## What unblocks it (pick one — recommend A)

- **A. Bulk export endpoint on pm-medicalhistory** (smallest, cleanest):
  `GET /gynec-history/export?businessId=&from=&to=` returning the flattened
  timeline rows. The analytics service reads it on a schedule (or the page
  proxies it). This is the same shape the obstetric service would need.
- **B. Read replica of the pm-medicalhistory datastore** — analytics gets a
  read connection the way it has one to `tatva_clinic`; builders query it
  directly and join patient→tenant in the replica.
- **C. Nightly sync job** copies the flattened timeline into a small
  `tatva_clinic` table keyed by `patient_unique_id`; analytics reads it like any
  other table (best for the existing builder pattern).

## The builder is ready for the feed

`builders/gynec.ts` was removed (it had been querying obstetric tables by
mistake). When any feed above lands, the gynec page is a drop-in: the metric
definitions, value domains, and tooltips are already specified in
[METRICS-CARE.md](METRICS-CARE.md#gynec-menstrual--honest-placeholder). Planned
blocks, all from the keys above:

- **~Avg age at menarche** (`ageAtMenarche`, whole number, outlier flags <9/>16)
- **Cycle mix** (`cycle`: Regular / Irregular / Not recorded)
- **Flow mix** (`flow`: Heavy / Moderate / Scanty / Not recorded)
- **Pain mix** (`pain`: None / Mild / Moderate / Severe / Not recorded), optionally × `occurrenceOfPain`
- **Reproductive life-stage mix** (`reproductiveLifeStages` + `typeOfMenopause`)
- **~Avg cycle interval** (`intervalOfCycle`) and **~avg flow duration** (`durationOfMenstrualFlow`)
- **Patients with gynec history** (distinct `patientId`; denominator = female patients in `tbl_patient_master`)

Until then the Gynec (Menstrual) page stays an honest "data feed pending"
placeholder rather than an empty or fabricated dashboard.

## Obstetric — same service, same story

The modern Obstetric screen writes to `obstetric_api_url` on the same
microservice (same per-patient pattern, no bulk feed). The analytics
`clinical/obstetric` page therefore covers only the **legacy** obstetric tables
still present in `tatva_clinic` (frozen ~mid-2024), with a banner saying so. It
lights up with current data once the same feed (A/B/C) is added for the
obstetric collection.
