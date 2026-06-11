# Custom Modules (Care)

## What this page is

Custom Modules tracks the reusable RxPad blocks doctors build themselves (diet plans, bed-rest instructions, specialty tables) and, critically, whether those modules get **shared and reused across doctors**: the signal that a clinic is building its own clinical content library.

> **Status: SAMPLE DATA (microservice-blocked).** The module registry lives in the **dynamic-modules microservice** (`custom_module_api_url`, called via `ApiCustomModule.js`), not in the `tatva_clinic` analytics replica. The only in-DB trace is an opaque per-doctor template blob, which cannot yield reuse-by-another-doctor or most-used counts. Per product direction there are no "coming soon" pages: the page renders deterministic illustrative numbers, every response carries `meta.live: false` and a `meta.note` banner, and it switches to live data automatically once the bulk feed lands.

## Key metrics (illustrative until the feed lands)

- **Custom modules**: total reusable modules built by this hospital's doctors (matches the count the Rx screen shows, e.g. 15/15). Why: size of the clinic's own content library.
- **Created this period**: new modules built in the selected date range. Why: is the library still growing.
- **Creating doctors**: doctors who have built at least one module. Why: is creation concentrated in one power user or spread.
- **Reuse rate (%)**: share of module uses where the user is NOT the module's creator. Why: the cross-doctor sharing signal, the whole point of custom modules.

## Charts and tables

- **Most used modules** (bar): which modules get picked the most across all doctors.
- **Modules created by doctor** (bar): per-doctor creation counts.
- **Created vs reused** (donut): uses by the creator vs reuses by another doctor.
- **Module register** (table, downloadable): every module with creator, column count, created date, times used, and how many other doctors reused it.

## Caveats

- Every number on this page is sample data today; the banner says so explicitly. Do not quote these figures.
- The page contract (KPI keys, block keys) is final: swapping in the real feed only replaces the row sources.
