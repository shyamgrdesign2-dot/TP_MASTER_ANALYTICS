# Follow-ups (Grow)

## What this page is

The follow-up loop: how often doctors advise a return visit, and whether patients actually come back. This is the practice's retention engine and the source of the recall worklist (due follow-ups that were missed). Lives under Grow → Follow-ups; the Overview page carries its adherence headline.

## Definitions (the three states)

- **Advised**: a consultation that set a valid follow-up date (`tbl_case_manager.tcm_followup_date >= '2000-01-01'`; the floor guards empty/zero dates).
- **Due**: the advised date is in the past (`< CURDATE()`).
- **Kept**: the patient actually returned: ANY appointment for that patient between the advised date and 45 days after it. This appointment join is the single highest-value computation on the page.

## Key metrics

- **Follow-ups advised**: consults in the period that set a follow-up date. Why: is return advice being given at all.
- **Advice rate (%)**: advised divided by all consultations in the period. Why: doctor habit, not patient behaviour.
- **Kept**: due follow-ups where the patient returned within the 45-day window. Why: the loop actually closing.
- **Adherence rate (%)**: kept divided by due. Why: the page's headline, also surfaced on Overview.
- **Missed (recall)**: due but not returned. Why: this IS the call list.
- **Avg interval (days)**: mean advised gap from visit date to follow-up date. Why: practice norm for return windows.

## Charts and tables

- **Follow-up adherence** (donut): fixed 3-state domain Kept / Missed / Upcoming, always all three rows, zero when empty.
- **Follow-ups over time** (line): advised vs kept per period bucket.
- **By doctor** (table): advised and kept per doctor (top 15), the adherence comparison across the team.
- **Patient register** (table, downloadable, up to 5000 rows): UHID, name, mobile, visit date, follow-up due date, status (Kept / Missed / Upcoming), sorted by due date. Filter to Missed for the recall worklist.

## Caveats

- "Kept" counts ANY return appointment in the 45-day window, not specifically a visit linked to that advice: it is a behavioural proxy, deliberately generous.
- The period filter applies to the CONSULT date (when the advice was given), not the due date; recently advised follow-ups show as Upcoming.
- Adherence is 0 (not an error) when nothing is due yet in a fresh window.
