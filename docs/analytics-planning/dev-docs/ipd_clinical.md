# IPD Clinical Activity

## What this page is
In-stay documentation and OT activity, modeled on the actual IPD documentation flow. Each artifact has its own cadence and its own metric: Admission Assessment happens ONCE per admission (so we show coverage), Progress Notes are filled by nurses multiple times every stay day (so we show per-day cadence), Consultant Notes are doctors' entries through the stay (per-day cadence), OT Notes exist per operation (coverage per OT event), the Discharge Summary closes the stay (completion).

## Key metrics
- **Assessment coverage**: % of admissions with an admission assessment. The once-per-admission artifact.
- **~Progress notes / day**: nurse progress notes per patient-day. The ward documentation pulse.
- **~Consultant notes / day**: doctor notes per patient-day.
- **OT note coverage**: % of OT events with an OT note (surgery details, team, operative notes).
- **~Nurse note interval**: average hours between consecutive nurse progress notes within a stay. The interval exposes the gaps an average per-day count hides.
- **Lab results**: lab values plus radiology reports recorded in the period.
- **Cross referrals**: shows a dash. The two-view referral workflow (one doctor refers, the receiving doctor answers with consultant notes) lives only in the pm-ipd microservice; Medical Records uploads live in pm-patient-docs. Both feeds are specified in MASTER-API.md.

## Charts and tables
- **Documentation funnel**: of all admissions, how many carry an assessment, progress notes, consultant notes, a discharge summary. Gaps show exactly where documentation breaks down (the what-went-wrong view).
- **Notes by stay day**: notes recorded on day 1, 2 ... 8+ of the stay. A fading tail means later days get documented less.
- Clinical documentation by type (product language: assessments, progress notes, consultant notes, vitals, medications, investigations, lab values, radiology).
- Top admission vs discharge diagnoses; OT procedures by doctor; anaesthesia mix; discharge summary completion; OT register.
