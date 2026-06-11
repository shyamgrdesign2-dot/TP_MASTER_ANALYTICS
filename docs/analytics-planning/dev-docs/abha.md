# ABHA / ABDM (Grow)

## What this page is

ABHA (Ayushman Bharat Health Account, the national health ID) adoption for the patients this clinic actually saw in the period: how many have an ABHA linked, verified, consent-flagged, plus care-context linkage and the enrolment trend. Built strictly on what the `tatva_clinic` replica stores; everything the ABDM microservices keep only transiently is labelled as a proxy or stated as a gap, never faked.

## Key metrics

- **Total ABHA patients**: patients seen in the period with an ABHA address linked (`pm_abha_address` non-empty), out of all patients seen. Why: the adoption headline.
- **ABHA verified**: linked patients whose ABHA is verified (`pm_abha_verify = 1`). PROXY: the KYC vs non-KYC enrolment channel is not stored in this database; verification state is the nearest available signal, and the card says so.
- **Linked, unverified**: linked minus verified. Why: the verification backlog.
- **Consent-flagged patients**: patients carrying the coarse consent flag (`pm_abha_consent = 1`). PROXY: request-level consent success/failure (and its KYC split) is not persisted here.
- **Care contexts linked**: rows in the HIP link master with a real linking token. Coarse count only: no KYC split of care contexts exists in this database.
- **Linkage rate (%)**: linked divided by patients who visited in the period; renders "—" with an explanation when no one visited (never a fake 0%).

## Charts and tables

- **ABHA linkage** (donut): fixed 3-state domain, always zero-filled: Verified / Linked (unverified) / Not linked.
- **ABHA enrolments over time** (line): the only reliably dated ABHA signal (hospital-side enrolment records).
- **Patient register** (table, up to 5000 rows): UHID, name, gender, ABHA address, status (Verified / Linked (unverified) / Not linked), linked patients first.

## Honest gaps (the owner's KYC asks)

Three requested cards CANNOT be built from this database because the data lives only transiently in the ABDM microservices (`ApiAbha.js`):

1. **KYC vs non-KYC enrolment channel** (Aadhaar-KYC vs non-KYC ABHA creation).
2. **Consent success/failure at request level** (with/without KYC).
3. **KYC split of care contexts.**

The page shows the stored patient-level flags as clearly relabelled proxies, and `meta.note` states the gap verbatim.

## Caveats

- The three patient flags carry ~50 corrupted huge-integer rows tenant-wide; every read guards `IN (0,1)`.
- The care-context count and the enrolment trend are not filtered by the page date range (link rows lack a usable in-period date; the trend shows full history by bucket).
