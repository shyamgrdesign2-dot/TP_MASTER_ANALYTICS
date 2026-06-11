<!-- Generated 2026-06-09 via multi-agent workflow (21 agents). Grounded against live tatva_clinic replica + EMR capture flows. OPD-only; IPD deferred. -->

# TatvaCare OPD Analytics Suite — Specification Front-Matter

> **Scope:** Outpatient (OPD) only. IPD is explicitly deferred. Every analytic in this suite is grounded against the live read-only `tatva_clinic` replica and the shipped builders in `pm-analytics-service`, with feasibility flags verified on 2026-06-09. The per-domain catalog (Overview digest + the 16 domain drafts) is appended verbatim after this front-matter; this document frames *why the suite exists, who it serves, how it is engineered, and in what order it ships.*

---

## 1. Title & Purpose

**TatvaCare OPD Analytics Suite — Decision-Grade Outpatient Intelligence.**

This suite converts the exhaust of every OPD encounter — the appointment booked, the consultation written, the bill raised, the ABHA linked — into a small set of decisions that grow revenue, retain patients, lift productivity and clinical quality, and prove compliance. It is **not** a chart gallery. Every card is built to answer one question for one named persona and trigger one next action.

The design constraint that shapes everything below: **the analytics DB is a read-only mirror that materializes only a subset of what the EMR captures.** Several high-value signals (wait-time timestamps, booking channel, consult product-mode, edit-audit columns, ABHA link-stage, pending-digitization) are captured at point-of-care but live in microservices or unmapped columns. This spec is ruthlessly honest about that line — it ships what is real now, names what needs profiling, and flags what is genuinely not in the database, so the suite never fabricates a number it cannot defend.

IPD is deferred deliberately: the OPD surface (appointments, billing, patients, prescriptions and their clinical children) is where the data is densest, the personas clearest, and the revenue/retention levers most direct. The architecture (`careSetting=opd|ipd|all`) is built to extend to IPD later without rework.

---

## 2. Personas

Three personas. Every analytic in this suite names which it serves and the decision it drives. Scope is enforced server-side from the JWT (`hm_business_id`) and a role claim.

| Persona | Scope | Owns | The decisions they make in this suite |
|---|---|---|---|
| **P1 — Practicing Doctor** | Own panel (`um_id` = self) | Own clinical patterns, productivity, follow-up adherence, prescribing behavior, own revenue/leakage | "Is my book full and converting? Are my follow-ups coming back (my recall list)? Am I prescribing rationally and completely? Which of my finished visits never got billed? What's my ABHA-linked share?" — drives self-correction, personal recall calls, documentation discipline. |
| **P2 — Specialty / Department Admin (HoD)** | Own specialty/department | Per-specialty oversight, doctor-vs-doctor comparison, departmental capacity & compliance | "Which of my doctors converts a slot into a billed visit, retains patients, codes ICD, advises follow-up, links ABHA — and who is the outlier? Where is my department under/over-capacity?" — drives coaching, panel rebalancing, hiring justification, protocol/formulary standardization. |
| **P3 — Operational Admin / Owner** | Clinic-wide, multi-specialty | Clinic performance, P&L, throughput, retention, leakage, cross-sell, compliance | "Did we collect what we billed? Where is revenue leaking (unbilled finished visits, dues, discounts, refunds)? Which diagnoses/tests/drugs should we bring in-house? Is tele-share and ABHA linkage growing? Which channel and which patients are worth the spend?" — drives leakage recovery, cross-sell tie-ups, capacity & staffing, compliance enforcement, acquisition allocation. |

A behavioral rule runs through the whole suite: **doctor-level metrics are framed as variance against the specialty-peer median, not as raw league tables** — a coaching trigger for P2, a self-benchmark for P1, never surveillance.

---

## 3. Executive Thesis

This suite earns its keep on six levers, each tied to a persona and a rupee or a risk.

- **Grows revenue.** The single highest-ROI block is **finished-but-unbilled leakage** — completed consultations with no matching bill, surfaced as a register P3 (clinic), P2 (which doctor), and P1 (own lost earnings) can act on. Alongside it: **cross-sell capture** — top diagnoses and investigations are a lab tie-up map, top drugs a pharmacy attach map, and the *gap* between what is ordered/prescribed and what is filled in-house is quantified, recoverable revenue. *So-what:* P3 gets the in-house-lab/pharmacy business case in rupees; P2/P1 see the leak on their own panel.

- **Lifts retention.** Retention is the cheapest revenue in OPD — a returning patient is recurring fee + Rx + lab attach at zero acquisition cost. The suite closes the **follow-up adherence loop** (advised → kept → overdue recall list), builds **RFM/LTV value tiers** and a **lapsed-high-value recall register**, and exposes **single-visit (one-and-done) leakage**. *So-what:* P1 gets a daily recall list, P2 sees which doctors retain, P3 runs the panel as a value-tiered portfolio.

- **Raises productivity & clinical quality.** Per-doctor consults/day, completeness scores, generic-capture rate, polypharmacy, and (gated on timestamp profiling) wait-time become coaching surfaces. *So-what:* P2 finds the over-prescriber and the under-documenter; P1 self-audits; P3 sizes capacity.

- **Improves compliance (ABHA / digitization).** ABHA linkage and KYC-verified rate, documentation completeness, and the pending-digitization backlog are first-class — the one KPI family **absent from every reference dashboard** and tied to ABDM incentives. *So-what:* P3 reports compliance and unlocks incentives; P2 finds the lagging desk; P1 gets a per-row "link ABHA" nudge.

- **Exposes leakage end-to-end.** Unbilled finished visits, dues ageing, discount/refund/credit-note erosion, edit/cancel audit, cancellations/no-shows, undigitized finished visits, prescribed-but-not-filled, ordered-but-not-billed. *So-what:* every leak is a register with a name and a rupee figure attached.

**The compounding insight:** these are not separate dashboards — they are one query engine reading one set of tables, so a diagnosis links to its lab cross-sell links to its billing leakage links to its follow-up retention loop. The whole is worth more than the sum.

---

## 4. Design Principles

Drawn from the six reference dashboards (R1–R6) and our shadcn/TP component system, hardened by what the live data will and won't support.

1. **One engine, many reports.** A single builder pattern against `tatva_clinic` emits a consistent envelope — result-set `{columns, rows, meta}` or dashboard-block `{hero, kpis, <blocks>, patients, meta}`. Server injects `hm_business_id`; common params `startDate/endDate/doctorIds[]/hospitalId/grain/careSetting`. Adding a report is adding a builder, not a service.

2. **Every card answers a decision.** If a tile doesn't name a persona and drive a next click, it doesn't ship. No "interesting" charts.

3. **The standard page shape:** pinned **filter bar** (date · specialty · doctor · visit type · gender) → **KPI hero strip** (4–5 cards) → **one trend** → **ranked bars / leaderboards** → **detail register** (row-level, CSV export). This mirrors R1/R2/R4 and our shipped pages.

4. **KPI card = value + colored delta tag + explicit "vs previous period" baseline** (R2's strongest pattern, already shipped). **Semantic color with inversion:** green-up for good (collection, completion, ABHA), **red-up for bad** (cancellation, no-show, outstanding, refunds, overdue follow-ups, polypharmacy, backlog). Pair color with sign/icon for accessibility.

5. **Ranked bars over pies** (R6 pitfall) — pies only for ≤5 slices; consult-mode as a 100% stacked bar, never a pie. **Top-N leaderboards carry a secondary quality metric beside the volume bar** (R3): volume + collection-rate, volume + ABHA %, volume + follow-up adherence — so the high-volume-low-quality outlier is unmistakable.

6. **Honest no-data.** Free-text/CSV fields carry a `meta.note`; sparse/template-only data is labelled as such ("template-level," "% known," "directional, not statistical"); blocked metrics render an explicit placeholder, never fabricated numbers. **No IPD contamination** — no LOS, occupancy, mortality, admission/readmission in OPD pages.

7. **Period-over-period everywhere** (`comparisonWindow`/`pctDelta`) and **standardized age bands** (`<18·18-30·30-45·45-60·>60`).

---

## 5. OPD Information Architecture

A single **OPD Overview digest** landing, then section pages grouped by pillar. Each domain in the appended catalog maps to exactly one nav leaf.

```
OPD Overview (digest landing)
│
├── APPOINTMENTS ───────────── Appointments (rich) · Footfall · Follow-ups · Consultation Channel (video/tele) · AI Agents (booking + symptom collector)
├── BILLING & REVENUE ──────── OPD Billing/Payments · Collection & Revenue trends · Payment-mode mix · 3C Report · Incentives · Daily collection
├── ALL PATIENTS ───────────── Patients (demographics) · Retention/Value (RFM/LTV/cohorts) · ABHA / ABDM
└── PRESCRIPTIONS / RxPAD ──── Drug/Rx · Prescribing Quality · Diagnoses · Lab Tests · Vitals · Medical History · Symptoms · Procedures(billed-service proxy) · Vaccination · Obstetric & Gynec · Certificates · Pending Digitization
```

**Nav scoping:** P1 auto-scoped to own `um_id`; P2 to own specialty; P3 unrestricted. Specialty-thin modules (Obstetric & Gynec, Vaccination) are feature-flagged per business and never aggregated to the owner hero. The legacy `clinical/procedure` leaf is relabelled IPD-only / suppressed in OPD nav.

**What the Overview digest shows** (the 10-second "is my OPD healthy, where do I look next?"):
- **Headline KPI strip:** Total Appointments · Completion rate · Cancellation rate (red-up) · New patients · New:Returning · Collected ₹ · Outstanding/leakage ₹ (red-up) · Prescriptions · Generic Rx % · Follow-up advised rate · **Tele/video share** · **ABHA linkage rate** — each with vs-prior delta.
- **Top-5 lists (the revenue map):** Top diagnoses · Top investigations (lab cross-sell) · Top drugs (pharmacy attach) · Most-visited specialty *(VERIFY: needs doctor→specialty map)* · Top symptoms *(flagged template-only)*.
- **Consult-mode mix** as a single 100% stacked bar (in-clinic / walk-in / video / tele).
- **ABHA link-rate gauge** (linked ÷ seen, with KYC-verified sub-segment).
- **One trend:** Appointments vs Cancelled over 12 months.
- **Leakage counter:** finished-but-unbilled (P1 leakage tile — verify join).

---

## 6. The Four Pillars, Deep

**Appointments (incl. follow-ups + ABHA layer).** The transaction spine — every rupee, Rx, follow-up and ABHA link originates here. *Marquee metrics:* the status funnel (Queue→Finished, with cancellation, no-show proxy, draft and pending-digitization as named leaks), completion & cancellation rate, **wait-time** (queue→seen, gated on profiling `tbl_patient_visit_logs`), the **follow-up adherence loop** (advised→kept→overdue), per-doctor/specialty load & comparison, peak hour×DOW heatmaps, booking lead-time, **revenue-per-appointment & finished-but-unbilled leakage**, and the **ABHA linked/verified share**. *Decisions:* P3 reads the funnel top-down for the biggest leak and capacity; P2 compares doctors and rebalances; P1 manages own throughput and works the overdue-follow-up recall list.

**OPD Billing & Revenue.** The money engine. *Marquee metrics:* billed / collected / outstanding / collection-rate / avg-bill (live), advances held, refunds & credit-notes (leakage out the back door), discount leakage (profiling-gated), edited/cancelled-bill audit (governance), payment-mode mix (cash-risk & reconciliation), the **3C three-stream reconciliation**, revenue by doctor/specialty + incentives, **billing coverage & zero-bill leakage** (the headline recoverable-rupee block), and the **lab+pharmacy cross-sell attach** rates. *Decisions:* P3 owns the P&L, leakage recovery and cross-sell business case; P2 owns department contribution and discount/under-billing coaching; P1 sees own revenue, incentive, and own uncaptured visits.

**All Patients (panel, demographics, retention & value).** The only compounding asset. *Marquee metrics:* active/total panel & new:returning, acquisition trend & channel (channel 17%-covered, flagged), the **retention/return-cadence/churn** heart (return-within-90, follow-up return rate, time-between-visits, lapsed recall), **acquisition cohorts & survival curves**, **RFM value tiers & Pareto**, **LTV & most-valuable-patient register**, demographics (age/gender reliable; occupation/marital/area effectively empty — flagged), engagement extremes + the **billing-leakage register**, and **ABHA-linked share**. *Decisions:* P1 protects loyal patients and recalls lapsed; P2 compares retention doctor-to-doctor; P3 runs the value-tiered portfolio and allocates acquisition spend by cohort LTV.

**Prescriptions / RxPAD (incl. consult-mode + behavioral).** The highest-signal artifact — clinical quality, productivity, and the largest revenue lever in one. *Marquee metrics:* Rx volume & reach, **component fill-rate / completeness** (meds & diagnosis reliable; advice/exam/MH are inline-blob presence-flags, flagged as storage-artifact not behavior), **generic-captured vs branded & drug/manufacturer mix** (procurement leverage), **consult-mode** (in-clinic/video/tele/walk-in derived from the appointment join; VoiceRx/SmartSync product-mode is NOT-IN-DB, needs the engagement microservice), the **behavioral doctor-to-doctor scorecard** (meds/visit, generic %, follow-up %, completeness index vs peer median), and **Rx→pharmacy & Rx→lab attach/leakage**. *Decisions:* P1 self-audits rational, complete prescribing; P2 finds the over-prescriber and never-generic outlier; P3 quantifies cross-sell capture and procurement leverage.

---

## 7. Revenue & Retention Playbook

The cross-domain map — each row is a connection between pillars, the rupee/retention lever it unlocks, and the persona who acts.

| Signal (from → to) | Lever | Outcome | Acting persona |
|---|---|---|---|
| Top diagnoses + top investigations → in-house lab | Lab tie-up / capture | Ordered-but-billed-elsewhere = recoverable diagnostic ₹ | P3 |
| Top drugs / manufacturers → in-house pharmacy | Pharmacy attach + procurement terms | Prescribed-but-filled-elsewhere = recoverable ₹; volume → distributor leverage | P3 |
| Finished appts (status 3) **⋈ no bill** | Leakage recovery | Free consultations re-captured (highest-ROI block) | P3 clinic · P2 doctor · P1 own |
| Dues>90d, refunds, discounts, credit-notes, edit/cancel | Leakage plugging + governance | Recovered cash + fraud/error control | P3 |
| Advised follow-ups **⋈ not returned** | Churn recall | Cheapest repeat revenue; overdue = today's call list | P1 · P2 |
| RFM/LTV tiers + lapsed-high-value | Value-targeted retention | Recall spend aimed at ₹-at-risk, not volume | P3 · P1 |
| Single-visit / one-and-done share | Acquisition-leak detection | Stop funding acquisition that churns | P3 |
| Acquisition channel × cohort LTV/retention | Spend allocation | Fund channels that bring *returning* patients | P3 |
| VoiceRx / SmartSync adoption | Productivity wedge | Documentation-time saved (needs engagement microservice) | P2 · P1 |
| ABHA linkage + KYC-verified | Compliance / trust / ABDM incentive | Incentive eligibility + portable-record stickiness | P3 · P2 |
| Pending-digitization backlog | Compliance + downstream cross-sell | Undigitized = invisible to every clinical/cross-sell loop | P3 · P2 |
| Vaccination overdue/due schedule | Visit recall | Quantified pipeline of recallable visits | P1 · P3 |

---

## 8. Consolidated KPI Quick-Reference

Feasibility legend: **N**=Buildable now · **P**=Needs profiling/column-map · **S**=Needs other microservice · **X**=Not in DB.

| Domain | KPI | Persona | Lens | Feas. | Priority |
|---|---|---|---|---|---|
| Overview | Headline strip (appts, completion, cancel, collected/outstanding, ABHA, tele, generic %) | P3 | Productivity/Revenue/Compliance | N | P0 |
| Overview | Top diagnoses / drugs / investigations | P3/P2 | Revenue/Cross-sell | N | P0 |
| Overview | Most-visited specialty | P3 | Capacity | P | P1 |
| Overview | Under-billed leakage tile | P3 | Leakage | P | P1 |
| Appointments | Status funnel (Queue/Finished/Cancelled) + completion/cancel rate | All | Capacity/Leakage | N | P0 |
| Appointments | No-show proxy (status 0 + past date) | P3/P2 | Leakage | P | P0 |
| Appointments | Wait time (queue→seen) | P3/P2 | Patient-experience | P | P0(gated) |
| Appointments | Follow-up adherence loop (advised→kept→overdue) | P1/P2 | Retention | P | P0 |
| Appointments | Per-doctor/specialty load & comparison | P2 | Productivity/Behavioral | N | P0 |
| Appointments | Peak hour×DOW, lead-time, utilization | P3 | Capacity | N / P | P0 |
| Appointments | Revenue/appt + finished-but-unbilled | P3/P2/P1 | Revenue/Leakage | N / P | P0 |
| Appointments | Booking source mix | P3 | Growth | N(17%) | P1 |
| Appointments | ABHA linked/verified share | P3/P2 | Compliance | N | P1 |
| Billing | Billed/Collected/Outstanding/Collection-rate/Avg-bill | All | Revenue/Leakage | N | P0 |
| Billing | Billing coverage & zero-bill leakage | P3/P2/P1 | Leakage | P | P0 |
| Billing | 3C reconciliation | P3 | Compliance | N | P0 |
| Billing | Refunds & credit-notes (totals) | P3/P2 | Leakage | N | P1 |
| Billing | Refund-type taxonomy | P3 | Leakage | P/X | P2 |
| Billing | Payment-mode mix | P3 | Compliance/Risk | N | P1 |
| Billing | Revenue by doctor / incentives | P2/P1 | Revenue | N | P1 |
| Billing | Revenue by specialty | P2/P3 | Revenue | P | P1 |
| Billing | Discount value/% & leakage | P3/P2 | Leakage/Behavioral | P | P2 |
| Billing | Edited/cancelled-bill audit | P3 | Compliance | P | P1 |
| Billing | Most-sold services | P3 | Revenue | N | P1 |
| Billing | Advances (discrete flows) | P3 | Cash-liability | P/S | P2 |
| Billing | Lab/pharmacy attach rate | P3 | Cross-sell | P/S | P1 |
| Patients | Panel size / active / new:returning / single-visit | P1/P3 | Retention/Growth | N | P0 |
| Patients | Retention / return-within-N / churn / time-between-visits | All | Retention | N | P0 |
| Patients | Acquisition cohorts & survival curves | P3/P1 | Retention/Growth | N / P | P1 |
| Patients | RFM tiers & Pareto | P3 | Revenue/Retention | N | P0 |
| Patients | LTV & most-valuable register | P3/P2 | Revenue | N | P0 |
| Patients | Acquisition channel | P3 | Growth | N(17%) | P1 |
| Patients | Demographics (age/gender) | P3/P2 | Growth | N | P0 |
| Patients | Occupation / marital / area | P3 | Growth | X | — |
| Patients | Engagement extremes + active-but-unbilled | All | Leakage | N | P0 |
| Patients | ABHA-linked share | P3/P1 | Compliance | N | P1 |
| Rx/Drug | Rx volume & reach, drug/manufacturer mix, generic-captured % | All | Quality/Procurement | N | P0 |
| Rx/Drug | Component fill-rate / completeness | All | Quality/Compliance | N(meds,dx)/P | P0 |
| Rx/Drug | Polypharmacy | P2/P1 | Quality | N | P0 |
| Rx/Drug | Behavioral doctor-to-doctor scorecard | P2 | Behavioral | N | P1 |
| Rx/Drug | Antibiotic / drug-class rate | P2 | Quality | P | P2 |
| Rx/Drug | Consult-mode (in-clinic/video/tele/walk-in) | P3/P2 | Capacity | N | P1 |
| Rx/Drug | VoiceRx/SmartSync product-mode adoption | P3 | Adoption | S | P3 |
| Rx/Drug | Rx→pharmacy / Rx→lab attach & leakage | P3/P1 | Revenue/Leakage | N(rate)/P(₹) | P0 |
| Diagnosis | Top-N conditions, ICD-coded rate, dx/consult, capture rate | All | Quality/Compliance | N / P | P0/P1 |
| Diagnosis | Dx→lab & dx→drug cross-sell tables | P3 | Cross-sell | P | P1 |
| Diagnosis | By department/specialty; ICD-chapter | P2 | Quality | P | P2 |
| Lab | Top investigations, order rate, tests/consult | All | Quality | N(free-text) | P1 |
| Lab | In-house path revenue + advised-vs-billed leakage | P3 | Revenue/Leakage | N/P | P1 |
| Lab | Abnormal results / rate / turnaround | P3/P2 | Quality | X | blocked |
| Vitals | BP/SpO2/RBS distributions | P1/P2 | Quality | N(parsed) | P1 |
| Med History | Allergy prevalence + top allergens | P1 | Quality | N(unbuilt) | P1 |
| Med History | Top conditions / comorbidity load / multimorbidity | All | Quality/Revenue | N(sparse) | P2 |
| Med History | Comorbidity pairs, lifestyle | P3 | Quality | P/X | P3 |
| Symptoms | Template-level top symptoms / severity | P2 | Quality | N(template) | P2 |
| Symptoms | Per-patient prevalence + symptom→workup conversion | All | Cross-sell | S | blocked |
| Procedures | Top billed services + procedure-billing leakage (proxy) | P3/P2 | Revenue/Leakage | N(messy) | P2 |
| Procedures | True clinical OPD procedures (suggested/performed) | All | Productivity | X | blocked |
| Vaccination | Doses/coverage, overdue/due recall, on-time adherence | P1/P2/P3 | Retention/Compliance | N/P(unwired) | P1 |
| Vaccination | Inventory / batch recall | P3 | Revenue | X | de-scoped |
| Obstetric/Gynec | Active pregnancies, EDD pipeline, ANC adherence + leakage | P1/P2/P3 | Retention/Revenue | P(unwired,sparse) | P2(gated) |
| ABHA | Linkage rate (patient & appt), KYC, 3-state funnel, by-doctor, trend | P3/P2/P1 | Compliance/Growth | N | P1 |
| ABHA | Time-to-link / link-stage / linked-by | P3 | Compliance | S/X | P3 |
| AI Agents | Booking-source mix, agent share, conversion, new-vs-follow-up | P3 | Capacity/Revenue | N(17%) | P1 |
| AI Agents | Symptom-collector funnel (assigned→submitted) | P3/P1 | Productivity | S | P3 |
| Digitization | Pending-digitization backlog & rate | P3/P2/P1 | Compliance/Leakage | S | P1(blocked) |
| Digitization | Turnaround / P90 / aged buckets | P3 | Compliance | S/X | blocked |
| Certificates | Issued count, type-mix, by-doctor, template-backed %, un-billed leakage | P3/P2/P1 | Revenue/Compliance | N(unbuilt,low-vol) | P2 |

---

## 9. Feasibility Matrix

The explicit data-line that governs the whole spec. Items called out per the brief are bolded.

**Buildable now (RELIABLE, in column map, builder exists or trivial extension):**
Appointment status funnel (0/3/4) · completion/cancellation rate · video & walk-in mix · case-type mix · peak hour/DOW · per-doctor/specialty volume · billed/collected/outstanding/collection-rate/avg-bill · 3C three-stream reconciliation · payment-mode mix · revenue by doctor + incentives · most-sold services · patient panel/demographics(age/gender)/new-vs-returning · engagement extremes · top diagnoses/drugs/investigations(free-text) · generic-captured % · polypharmacy · ABHA linked/verified share · vaccination dose counts · certificates issued (table exists, unbuilt).

**Needs profiling (queryable but unmapped, or derived, or free-text needing cleanup):**
**Wait-time timestamps** (`tbl_patient_visit_logs`, 41,905 rows, unwired — Δ between status transitions; confirm "seen" code) · consult duration (`consultation_start_datetime`) · **booking lead-time** (`pam_created_date` not in map) · slot/`pam_appointment_duration` (not in map) · **`pam_type` New/Old** (clean, unused, not in map) · follow-up **"kept"** loop (advised→return reconstruction) · no-show proxy (status 0 + past date) · **finished-but-unbilled join** (confirm `pam_id` persists to billing) · avg-bill-per-visit (appt↔billing join) · **discount value/%** (rollup stores net only; reconstruct from service-lines) · **edited/cancelled-bill audit** (`tobo_modify_by/_date`, `tobo_invoice_cancel_by` exist, unmapped) · **refund-type** (only `tbrm_status` 0/1) · **advances discrete flows** · revenue-by-specialty (doctor→specialty map) · most-visited specialty (same) · `is_draft` (not in map) · dx↔consult / cross-sell joins (no `tcm_id` FK on diagnosis — patient+date) · lab advised-vs-billed (free-text matching) · antibiotic/drug-class (needs ATC dictionary) · vaccination due/adherence (`tbl_vaccine_duedate` unwired) · obstetric pregnancy/ANC tables (unwired, sparse) · certificate title cleanup + un-billed join.

**Needs other microservice:**
**Pending-digitization** (SnapRx `/digitization/undigitizedAppointments`; status synced upstream but not in replica) · **consult product-mode** (VoiceRx/SmartSync/SnapRx adoption — `rx_digitization`/`digitization`/`engagement` services; `engagementDashboard` throws NotImplemented) · **symptom-collector funnel** (agents microservice) · **per-patient symptoms** (symptoms microservice) · **ABHA time-to-link & stage** (link-timestamp tables 8–70 rows, near-empty; stage events in ABHA service) · advance deposit/wallet ledger (V2 billing service).

**Not in DB (no backing data — do not build):**
**Occupation / marital / area** (26–118 of 53k rows) · **certificates as the *backlog-with-turnaround*** has no digitized-at timestamp · structured per-patient examination/advice register · lifestyle as a confirmed field · **OPD clinical procedures** (`tbl_inpatient_doctor_procedure` is IPD test data; `tbl_casemanager_surgery` does not exist live) · lab abnormal results / reference ranges / turnaround · vaccine inventory/batch recall · expense/margin (no cost table — no Revenue-vs-Expense combos) · ICD-coded gynec morbidity · linked-by actor on ABHA · draft/pending-digitization as a `pam_status` code.

---

## 10. Prioritized Roadmap

**Phase 1 — P0, buildable now (ship first, highest leverage on existing RELIABLE builders):**
- OPD Overview digest (headline strip + top-5 lists + consult-mode bar + ABHA gauge + appts-vs-cancelled trend).
- Appointments status funnel, completion/cancellation, per-doctor/specialty comparison, peak heatmaps.
- Billing headline (billed/collected/outstanding/collection-rate/avg-bill), **3C reconciliation**, payment-mode mix, revenue-by-doctor + incentives.
- Patients: panel/active/new:returning, demographics (age/gender), engagement extremes, **RFM tiers & LTV most-valuable register** (new `retention.ts`/`patient-value.ts` builder over existing CTE + billing join).
- Rx: volume, drug/manufacturer mix, generic-captured %, polypharmacy, component fill-rate (meds+dx), **Rx→pharmacy/lab attach rate**.
- Diagnosis top-N + ICD-coded rate; ABHA linked/verified share.

**Phase 2 — P1 (high value; small profiling/wiring step):**
- **Finished-but-unbilled leakage** block (verify appt↔billing `pam_id` — single fact that upgrades the whole leakage story from fuzzy to exact) across Appointments/Billing/Patients/Rx.
- **Follow-up adherence "kept" loop**; **wait-time** (profile `tbl_patient_visit_logs`); booking lead-time & `pam_type` (extend column map).
- Booking-source / acquisition channel & **AI-agent booking analytics** (wire `tbl_appointment_source`, 17% — with coverage caveat).
- Edited/cancelled-bill audit; most-sold services; revenue-by-specialty (doctor→specialty map); refunds detail.
- Acquisition cohorts & survival; dx→lab/dx→drug cross-sell tables; lab in-house revenue + advised-vs-billed leakage; vitals; **allergy prevalence (unbuilt, 26k rows — quick win)**; vaccination due/overdue recall (wire `tbl_vaccine_duedate`); behavioral Rx doctor-scorecard; ABHA 3-state funnel + trend + by-doctor.
- **Pending-digitization backlog + rate** (live count via SnapRx call joined to finished-visit denominator; turnaround marked pending instrumentation).

**Phase 3 — P2 / data-blocked (defer, flag honestly, raise as data-capture requirements):**
- Discount analysis & advances discrete flows (profiling/persistence); antibiotic/drug-class (ATC dictionary); ICD-chapter & comorbidity-pairs; medical-history conditions (sparse); symptoms template-level (labelled).
- Procedures billed-service proxy + leakage (relabelled, not "Procedures"); Obstetric/Gynec module (wire pregnancy/ANC tables, per-business gated); certificates leaderboard + un-billed leakage.
- **Blocked on microservice/instrumentation:** consult product-mode (VoiceRx/SmartSync) & symptom-collector funnel (build `engagement/*`); per-patient symptoms (symptoms-service read); ABHA time-to-link/stage; digitization turnaround; lab abnormal-results/turnaround. **Never built:** expense/margin, occupation/marital/area, vaccine inventory, true OPD clinical procedures.

---

## 11. Review Lenses

- **CEO / Product value.** Does each pillar move a number the owner cares about — revenue captured, patients retained, compliance proven? The thesis (§3) and playbook (§7) must trace every build to ₹ or retention or risk. Watch for vanity tiles that survive into Phase 1.
- **Architecture & feasibility.** One engine, one envelope, server-injected scope. The §9 matrix is the contract — nothing ships above its honest tag. The two highest-leverage architectural unlocks are (a) confirming the **appt↔billing `pam_id`** join and (b) extending the **db-check column map** for `pam_created_date`/`pam_type`/`pam_app_end_time`/`is_draft`/audit columns. Cross-service reads (engagement, symptoms, ABHA-stage) are explicit roadmap items, not hidden dependencies.
- **DevEx.** *Contract:* every builder emits `{columns, rows, meta}` or `{hero, kpis, blocks, patients, meta}`; `meta.note` is mandatory for any free-text/sparse/derived metric. *Gates:* `db-check.js` column-map check + a smoke test per endpoint before wiring the nav leaf in `analyticsNav.jsx` (`DASHBOARD_ENDPOINTS`/`PAGE_MAP`); GrowthBook `analytics-use-api` flag falls back to faithful sample pages. *How to add an OPD report:* write a builder under `src/analytics/builders/`, register the case in `analytics.controller.ts`/`analytics.service.ts`, add columns to the map if new, wire the leaf + endpoint in `analyticsNav.jsx`, ship behind the flag.
- **Research / benchmark gaps.** References (R1–R6) are mockups with illustrative data — benchmarks are not validated targets. They have **no ABHA, no wait-time/no-show, no walk-in/tele mix, no follow-up-adherence loop** — our four India/OPD-specific lead opportunities. Avoid their pitfalls: IPD contamination, pie/treemap overuse, dense equal-weight grids, unlabeled dual axes, color-only good/bad encoding.

---

## 12. Open Questions / Decisions for the Owner

1. **Appointment↔billing join key** — does the V2 billing microservice persist `pam_id` into `tbl_opd_billing_overview`? This single fact upgrades the entire finished-but-unbilled leakage block from fuzzy patient+date matching to exact. **Highest-priority verification.**
2. **Follow-up truth** — count "advised" off `tcm_followup_date` (consultation) and "kept" off a subsequent appointment? Confirm the tolerance window and reconcile against the appointment-level `toct` case-type.
3. **No-show definition** — accept the `status=0 + past-date` proxy, or request a true no-show status from product? Validate it isn't polluted by data-entry lag before making it a headline.
4. **Cross-service investment** — do we build the `engagement/*` read connection (unblocks VoiceRx/SmartSync adoption — the TatvaCare wedge — and the symptom-collector funnel) and the symptoms-microservice read (unblocks real per-patient prevalence)? These are the biggest deferred capabilities.
5. **Pending-digitization** — materialize a daily undigitized snapshot (with digitized-at timestamp) into the analytics replica for trendable backlog + turnaround, or rely on a live SnapRx call (backlog/rate only, no turnaround)?
6. **ABHA stage feed** — accept boolean linked/verified now and defer link-velocity/stage until an ABHA-service feed exists?
7. **Doctor→specialty mapping** — confirm the specialty column on `tbl_user_master` (`speciality`) is populated and authoritative; it gates every by-department rollup (revenue, diagnosis, lab, most-visited specialty).
8. **Point-of-capture data requests** to lift from "not in DB" to buildable: refund-reason field, true no-show status, certificate billing SKU, structured lifestyle capture, and persisted booking-source on *all* bookings (currently 17%).
9. **Column-map extension** — approve adding `pam_created_date`, `pam_type`, `pam_app_end_time`, `pam_appointment_duration`, `is_draft`, and the billing audit columns to `db-check.js` (all confirmed present, currently unmapped).
10. **Specialty-thin module gating** — confirm Obstetric/Gynec and Vaccination ship feature-flagged per business and are excluded from owner-hero aggregates, and that `clinical/procedure` is relabelled IPD-only in OPD nav.


---

# OPD Analytics — Domain Catalog

_The 4 deep pillars (Appointments incl. follow-ups + ABHA layer · OPD Billing · All Patients · Prescriptions/RxPAD incl. consult-mode + behavioral) followed by supporting domains. Each carries persona/action/lens reasoning and explicit data-feasibility tags._

## OPD Overview (Digest Landing)

The first screen every persona lands on. It is not a dashboard to *analyze* — it is a 10-second answer to "is my OPD healthy today, and where do I look next?" Every tile is either a **headline KPI rolled up from a pillar** (Appointments, Clinical, Financial, Compliance) or a **top-5 ranked list that doubles as a revenue/cross-sell map**. Each element must earn its place by driving a *next click*, not by being interesting.

### Why it matters & to whom

| Persona | What the landing must answer in 10 seconds | Decision it drives |
|---|---|---|
| **P1 Practicing Doctor** (own panel) | "Is my volume / completion / follow-up holding vs last period? What am I prescribing and ordering most?" | Where to drill — own follow-up leakage, own prescribing pattern, own revenue. |
| **P2 Specialty/Dept Admin (HoD)** | "Which specialty is busiest, where is documentation/ABHA slipping, what are the dominant conditions in my department?" | Capacity rebalancing, doctor coaching, departmental compliance push. |
| **P3 Operational Admin / Owner** (multi-specialty) | "Clinic-wide throughput, money collected vs billed, tele-mix, ABHA compliance, and the top diagnoses/investigations/drugs I can monetize." | Cross-sell tie-ups (lab/pharmacy), leakage recovery, compliance enforcement, marketing the busiest specialty. |

**Lens coverage:** Productivity (appointments, completion), Clinical-quality (follow-up, top conditions), Revenue + Leakage (collected vs billed, top investigations/drugs), Capacity (most-visited specialty, tele-mix), Compliance (ABHA, documentation), Retention (new vs returning).

### KPIs — headline strip (rolled up from pillars)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Total Appointments | All booked visits in period (any status) | `COUNT(pam_id) WHERE pam_del=0` | count |
| Completion rate | Finished ÷ total (excl. still-scheduled) | `status=3 ÷ (status IN 3,4)` | % (green-up) |
| Cancellation rate | Cancelled ÷ total | `status=4 ÷ total` | % (**red-up**) |
| New patients | First-ever visit in clinic this period | `COUNT(DISTINCT pid) NOT IN prior` | count |
| New : Returning mix | First-visit vs revisit split | `pam_type='New' vs 'Old'` | ratio |
| Collected (₹) | OPD cash actually in | `Σ(grand_total − GREATEST(balance,0))` | ₹ (green-up) |
| Outstanding / leakage (₹) | Billed but uncollected | `Σ GREATEST(balance,0)` | ₹ (**red-up**) |
| Prescriptions issued | Rx lines in period | `COUNT tbl_medicine_report` | count |
| Generic Rx % | Generic share of Rx | `generic ÷ all Rx` | % (green-up) |
| Follow-up advised rate | Visits with a follow-up date set | `COUNT(tcm_followup_date set) ÷ consults` | % |
| Tele/video share | Video+teleconsult ÷ all appts | `pam_status_type_appointment IN(1,2) ÷ total` | % |
| ABHA linkage rate | Patients with ABHA address ÷ seen | `pm_abha_address<>'' ÷ patients seen` | % |

Each card carries **value + colored delta vs previous period** (R2 pattern), with semantic inversion: cancellation, outstanding, and overdue follow-ups go **red when rising**.

### Top-5 lists (the digest's revenue map) — each earns its place

| List | Why it's on the landing | Persona + decision |
|---|---|---|
| **Top diagnoses (30d)** | The clinical "what's coming through the door"; anchors marketing, stocking, and lab/protocol tie-ups | P2/P3 — seasonal demand, condition-led packages |
| **Top symptoms (30d)** | Pre-diagnosis demand signal | P1/P2 — *see GAP below: not real per-patient yet* |
| **Most-visited specialty** | Capacity + marketing focal point | P3 — staffing, ad spend, slot expansion |
| **Top investigations** | Direct **lab cross-sell**: ordered tests = revenue you may be sending elsewhere | P3 — in-house lab tie-up / leakage recovery |
| **Top drugs** | Direct **pharmacy attach**: high-frequency molecules = stock + margin | P3 — pharmacy formulary, supplier negotiation |
| Consult-mode mix (in-clinic / walk-in / video / tele) | Channel shift = capacity & monetization signal | P3 — tele-slot expansion, walk-in staffing |
| ABHA link-rate gauge | India compliance differentiator; ABDM incentives | P2/P3 — digitization enforcement |

### Breakdowns
- All headline KPIs filterable by **date range, specialty/department, doctor, visit type** (P1 auto-scoped to own `um_id`; P2 to own specialty; P3 unrestricted).
- Top-5 lists carry a **mini month-over-month delta** per row (rising/falling diagnosis or drug).
- Consult-mode as a single **100% stacked bar** (in-clinic / walk-in / video / tele) — not a pie.

### Recommended viz
- **Hero strip:** 4 cards — Total Appointments · Completion rate · Collected (₹) + leakage · ABHA linkage. Secondary strip: New patients, Follow-up rate, Tele share, Generic Rx %.
- **Top-5 lists:** ranked horizontal bars with count + delta tag (avoid pies; references R6 over-use them).
- **One trend:** a single dual-series line — **Appointments (total) vs Cancelled** over 12 months (the `appointments-trend` block) — the one "are we growing?" chart on the landing.
- **Consult-mode:** 100% stacked bar.
- **ABHA:** small progress gauge (linked ÷ seen) with KYC-verified sub-segment.

### Data sources & feasibility

| Element | Table(s) | Tag |
|---|---|---|
| Headline appt/completion/cancel KPIs | `tbl_appointment_master` (status 0/3/4) | **RELIABLE** (codes 1/2/6/7 fold to "Other") |
| New vs returning | `pam_type` New/Old — or appt-count derivation | **RELIABLE** (clean `pam_type` currently unused — see GAP) |
| Collected / billed / outstanding | `tbl_opd_billing_overview` (`tobo_invoice_grand_total`, `tobo_balance`) | **RELIABLE** |
| Prescriptions / Generic % / Top drugs | `tbl_medicine_report` ⋈ `tbl_medicine_master` | **RELIABLE** (drug.ts: `ORDER BY total DESC LIMIT`) |
| Top diagnoses | `tbl_casemanager_diagnosis` (`diagnosis`,`icd_code`) | **RELIABLE** (diagnosis.ts top-50 → slice 5) |
| Top investigations | `tbl_case_manager.tcm_investigation` (CSV) | **FREE-TEXT-MESSY** (lab.ts splits in JS; typos/placeholders surface) |
| Follow-up advised | `tbl_case_manager.tcm_followup_date` | **RELIABLE** |
| Tele/consult-mode mix | `tbl_appointment_master.pam_status_type_appointment` (video) + `pam_appointment_type='Walk'` | **RELIABLE** |
| ABHA link / verify rate | `tbl_patient_master.pm_abha_address`, `pm_abha_verify` (scoped via appts) | **RELIABLE** (boolean only) |
| Trend (appts vs cancelled) | `tbl_appointment_master` monthly | **RELIABLE** |
| **Most-visited specialty** | `tbl_appointment_master.um_id` ⋈ `tbl_user_master` (doctor → specialty) | **VERIFY** — needs a doctor→specialty column on user_master; confirm in `db-check.js` before promising |
| **Top symptoms (30d)** | — | **NOT-IN-DB** — per-patient symptoms live in a separate microservice; `tcm_*` has no symptom field. `tbl_micro_oneclick_consultation.tmoc_symptoms` is **template config only** |

### Revenue / retention / cross-sell angle (make it explicit)
- **Lab tie-up:** Top investigations is a direct leakage map — every frequently-ordered test ordered *out-of-house* is recoverable margin. Pair the list with "% ordered in-house" once a lab-order linkage exists.
- **Pharmacy attach:** Top drugs → formulary stocking + supplier negotiation; high-frequency molecules are guaranteed turnover.
- **Under-billed finished appts (leakage):** cross-reference **finished appointments (status 3) with NO billing row** — surface as a leakage counter on the landing. This is the single highest-ROI tile for P3 (revenue you already earned but never invoiced). *Feasible:* `tbl_appointment_master status=3` LEFT JOIN `tbl_opd_billing_overview` on `appointmentId/pam_id` → null = leakage. **VERIFY** join key.
- **Retention:** New:Returning ratio is the leading retention indicator; a falling returning share warns of churn before revenue drops.
- **Compliance → ABDM incentive:** ABHA linkage rate ties to government digitization incentives; rising rate is both compliance and a billable.

### Behavioral angle (doctor-to-doctor variation)
- Generic Rx % and Follow-up advised rate are **most actionable as variance signals**, not clinic averages. Even on the landing, expose a subtle "your X vs department median" delta for P1, and a one-line "widest doctor spread" callout for P2 — this converts a flat number into a coaching trigger. Backed by `byDoctor` blocks already in drug.ts / followups / consultation-channel builders (`GROUP BY doctor ... LIMIT 15`).

### Sample questions the landing answers
- P1: "Is my completion and follow-up rate up or down vs last month, and what are my top 5 drugs?"
- P2: "Which specialty is busiest, what are its dominant diagnoses, and where is ABHA lagging?"
- P3: "How much did we collect vs bill, what's leaking, and which investigations/drugs should we bring in-house?"
- P3: "Is tele-consult share growing enough to justify more video slots?"

### GAPS to surface (honest)
1. **Top symptoms is not real** — only template symptoms exist in `tatva_clinic`; per-patient prevalence needs the symptoms microservice DB connection. Show as "template-level" with a `meta.note`, or defer the tile.
2. **Most-visited specialty** depends on an unverified doctor→specialty mapping (`tbl_user_master`); confirm before shipping.
3. **Under-billed leakage tile** is high-value but needs the appt↔billing join key verified — the V2 billing FE writes through a separate microservice, so confirm finished-appt rows land in `tbl_opd_billing_overview`.
4. **ABHA is boolean-only** (linked/verified); no link velocity/timestamp on the landing — `pm_abha_verify` is a flag, not a stage.
5. **Consult product modes (VoiceRx/SmartSync)** are NOT-IN-DB as labels — landing consult-mode mix can only be in-clinic/walk-in/video/tele from the appointment row, not product wedge.

### Priority
**P0 (ship first):** Headline strip (appointments, completion, cancellation, collected/outstanding, ABHA, tele share, generic Rx) + Top diagnoses + Top drugs + Top investigations + consult-mode mix + appointments-vs-cancelled trend — all backed by existing RELIABLE builders.
**P1:** Under-billed leakage tile (verify join), New:Returning via clean `pam_type`, doctor-variance deltas.
**P2 (blocked on data):** Top symptoms (microservice), most-visited specialty (verify mapping), ABHA link velocity.

---

## Appointments (incl. Follow-ups & ABHA layer)

> **OPD scope only.** Anchored on `tbl_appointment_master` (44 cols, ~26,836 rows; business-date `pam_app_date`+`pam_app_time`, scope `hm_business_id`, soft-delete `pam_del=0`, doctor `um_id`). Follow-ups join through `tbl_case_manager.tcm_followup_date` and the `toct_id`→`tbl_opd_case_type.toct_type` case-type. ABHA joins through `tbl_patient_master`. Every metric below names a status truth verified against the live DB: `pam_status` is a **VARCHAR with 7 live codes** (3=Finished 19,952; 0=Queue/Scheduled 5,236; 4=Cancelled 921; plus unmapped 2=301, 7=152, 6=150, 1=124). **Draft and Pending-digitization are NOT appointment statuses** — Draft lives on `tbl_case_manager.is_draft`; Pending-digitization is a derived set from the SnapRx service, not a `tatva_clinic` column.

---

### Why this matters & to whom

Appointments are the **transaction spine of the OPD** — every rupee of consultation revenue, every prescription, every follow-up loop, and every ABHA link originates from a row here. This pillar answers the single question all three personas ask in different words: *"Is the schedule full, is it converting to finished consultations, and where is volume leaking?"*

- **P1 Practicing Doctor (own panel):** "Am I running on time, is my book full, and are my follow-ups actually coming back?" They use this to manage their own throughput (consults/day), spot a thinning panel early, and protect follow-up revenue that is theirs to lose.
- **P2 Specialty/Department Admin (HoD):** "Which of my doctors converts a booked slot into a finished, billed visit — and who has empty slots or a high cancel/no-show rate?" They use doctor-vs-doctor comparison to rebalance load, justify a new hire, and coach the laggards.
- **P3 Operational Admin / Owner (multi-specialty):** "Is clinic capacity utilized, where is the funnel leaking (cancellations, no-shows, undigitized finished visits), and are we ABHA/digitization compliant?" They use this for capacity planning, leakage recovery, and ABDM compliance reporting.

### Revenue & retention angle (concrete)

- **Finished-but-unbilled leakage:** a `pam_status=3` (Finished) appointment with **no matching `tbl_opd_billing_overview` row** (join on `appointmentId`/`pam_id`, `tobo_delete=0`) is a consultation delivered for free. This is the single highest-yield leakage report in the pillar — directly recoverable rupees.
- **Cancellation & no-show leakage:** cancelled (status 4) and stale-Queue (status 0, slot date past) appointments are unrealized chair-time. A 5% reduction in a multi-specialty clinic's no-shows is measurable revenue.
- **Follow-up adherence = retention revenue:** every *advised* follow-up (`tcm_followup_date` set) that never converts to a kept appointment is a lost return visit — the cheapest revenue a clinic can earn. Overdue follow-ups are a worklist, not just a metric.
- **Pending-digitization leakage:** finished visits flagged undigitized by SnapRx are clinical work done but not converted into a structured, billable, ABDM-shareable record — a compliance and downstream-cross-sell loss.
- **Capacity → revenue:** slot utilization and consults/day per doctor convert directly into "how many more rupees could this chair earn."

---

### KPI Group 1 — Volume & Status Funnel (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Total appointments | All non-deleted appts in window | `COUNT(*) WHERE pam_del=0 AND pam_app_date BETWEEN ?` | count |
| Queue / Scheduled | Awaiting/upcoming | `COUNT(pam_status='0')` | count |
| Finished | Consult completed | `COUNT(pam_status='3')` | count |
| Cancelled | `COUNT(pam_status='4')` | count |
| Other/unmapped status | Codes 1,2,6,7 (currently bucketed "Other") | `COUNT(pam_status IN('1','2','6','7'))` | count |
| Draft Rx | Consultations saved unfinalized | `COUNT(tbl_case_manager.is_draft=1)` (join by `pam_id`) | count |
| Pending-digitization | Finished appts flagged undigitized by SnapRx | `COUNT(status=3 AND pam_id ∈ SnapRx undigitized set)` | count |
| Completion rate | Finished ÷ total | `status3 / total` | % |
| Cancellation rate | Cancelled ÷ total | `status4 / total` | % (red-up) |
| No-show rate (proxy) | Past-dated, never finished/cancelled | `COUNT(status='0' AND pam_app_date < CURDATE()) / total` | % (red-up) |
| Queue→Finished conversion | Funnel yield | `status3 / (status0+status3+status4)` | % |
| Digitization conversion | Finished that became digitized | `1 − (pending_digitization / status3)` | % (Compliance) |

**Persona / Action / Lens:** P3 owner reads the funnel top-down to find the biggest leak; P2 reads completion/cancel rate per department to coach; P1 watches their own Queue depth and Draft backlog. **Lens: Capacity / Leakage / Compliance.**

**Feasibility:**
- Total / Queue / Finished / Cancelled / completion / cancellation / Queue→Finished conversion — **[Buildable now]** `tbl_appointment_master.pam_status` (extend existing `operational/overview`, `operational/appointments`, `operational/footfall`).
- **Label codes 1/2/6/7** — **[Needs profiling]** builders bucket these as "Other"; the EMR constants map (`src/utils/constants.js` tab values 6=Draft-Rx, 7=Clinic-Queue/Chikitsalay) suggests 6/7 are meaningful — verify against live status semantics before labelling.
- No-show proxy — **[Needs profiling]** there is no distinct no-show flag; `status='0' AND pam_app_date<CURDATE()` is the only signal. Validate it isn't polluted by data-entry lag before exposing as a headline.
- Draft count — **[Buildable now, cross-row]** `tbl_case_manager.is_draft` exists (written by `addCaseManager` with `is_draft:1`); column not in `db-check.js` map → **add to map first**.
- Pending-digitization — **[Needs other service]** the undigitized set comes from SnapRx (`/api/v1/digitization/undigitizedAppointments/list` on `snap_rx_api_url`); NOT a `tatva_clinic` column. Either materialize a daily snapshot table or call SnapRx at query time.

---

### KPI Group 2 — Average Wait Time & Throughput Timing (P0, gated on timestamps)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Avg wait time (queue-in→consult-start) | Time from arrival/queue to being seen | `AVG(Δ tpvl_created_date: status0→status3 per pam_id)` | minutes |
| Median / P90 wait time | Distribution tail (the patient-experience killer) | percentile of the same Δ | minutes |
| Avg consult duration | Consult-start → end | `AVG(pam_app_end_time − consultation_start_datetime)` | minutes |
| On-time rate | Seen within X min of slot | `COUNT(wait ≤ X) / seen` | % |
| Wait time by doctor | Per-doctor queue discipline | wait grouped by `um_id` | minutes |
| Wait time by hour | When the clinic backs up | wait grouped by `HOUR(pam_app_time)` | minutes |

**Persona / Action / Lens:** P3/P2 own this — it is the #1 patient-experience operational metric and absent from all 6 reference dashboards (a lead opportunity). P1 sees their own running-late pattern. **Lens: Capacity / Patient-experience.**

**Feasibility:**
- **Wait time IS computable but DERIVED** — **[Needs profiling]** `tbl_patient_visit_logs` (41,905 rows; cols `pam_id`, `status`, `tpvl_created_date`) holds **one row per status transition**, mirroring appointment codes (3=20,339, 0=19,754…). Wait = Δ between consecutive `tpvl_created_date` per `pam_id`. **No builder touches this table.** Required step: confirm *which status code = "seen by doctor"* via the EMR constants map, then build a new `operational/wait-time` report. There is no single queue-in / seen column — it must be reconstructed.
- Consult duration — **[Needs profiling]** `tbl_case_manager_ip_logs.consultation_start_datetime` exists (no builder uses it) and `pam_app_end_time` is on the appointment row but **not in the column map** → add to map and verify fill rate before relying on it.
- All wait/duration KPIs are **NOT buildable until the two unwired timestamp sources are profiled and labelled.** Until then, surface a `meta.note` honest-degradation flag.

---

### KPI Group 3 — First-Visit vs Follow-up & Follow-up Adherence Loop (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| New vs Follow-up mix | First-visit vs return visit | `pam_type='New'` vs `'Old'` (or case-type `toct_type` LIKE 'Follow%') | % split |
| Follow-up visit share | Visits that are follow-ups | follow-up case-type ÷ all visits | % |
| Follow-ups advised | Consults that set a next-visit date | `COUNT(tcm_followup_date >= '2000-01-01')` | count |
| Follow-up advice rate | Advised ÷ finished consults | `advised / status3` | % |
| Follow-up KEPT | Advised follow-ups that returned | advised pts with a later appt on/near `tcm_followup_date` | count |
| Follow-up adherence rate | Kept ÷ advised | `kept / advised` | % (green-up, Retention) |
| Follow-up MISSED / OVERDUE | Advised, date passed, no return | `COUNT(tcm_followup_date < CURDATE() AND not kept)` | count (red-up) |
| Avg days-to-follow-up | Advised interval | `AVG(tcm_followup_date − tcm_datetime)` | days |
| Follow-up adherence by doctor | Whose patients come back | adherence grouped by `um_id` | % |

**Persona / Action / Lens:** P1 owns adherence (their retention revenue) — overdue list = today's recall calls. P2 compares which doctors retain patients. P3 reads aggregate adherence as a leading retention indicator. **Lens: Retention / Revenue / Clinical-quality.**

**Feasibility:**
- Advised / advice-rate / overdue / days-to-followup — **[Buildable now]** live `operational/followups` already does advised + overdue + trend + by-doctor off `tcm_followup_date` (guard `>= '2000-01-01'`; 2,229 rows set).
- **KEPT / adherence rate is the gap** — **[Needs profiling]** the loop is *open*: advised lives on `tbl_case_manager`, the return lives on a later `tbl_appointment_master` row. "Kept" must be reconstructed by matching `patient_unique_id` + `um_id` to a finished appointment on/after `tcm_followup_date` (within a tolerance window). No builder closes this loop today — this is the **highest-value new build** in the pillar.
- New vs Follow-up — **[Needs profiling]** `pam_type` ('Old'=21,362 / 'New'=5,214) is a clean signal sitting **unused** (builders derive returning via appointment-count `HAVING>1`); plus dirty `1/2/3` values and not in the column map → add to map, clean tail, then prefer it. Follow-up-as-case-type via `toct_type` is **[Buildable now]**.
- **Reconciliation note:** follow-up exists in two places — appointment case-type (`toct`) and consultation (`tcm_followup_date`). Spec must pick one as the counted truth (recommend `tcm_followup_date` for "advised," appointment match for "kept").

---

### KPI Group 4 — Visit / Case-Type Mix & Booking Channel (P1)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Case-type mix | Distribution across case types | `COUNT GROUP BY toct_type` | % donut |
| Walk-in vs Booked | Unscheduled vs scheduled | `pam_appointment_type='Walk'` (6,095) vs `'Appointment'` (20,669) | % |
| Video/Tele vs In-person | Channel of delivery | `pam_status_type_appointment IN(1,2)` (1=814, 2=430) | % |
| Booking source mix | KEA / agent / portal / app / create-screen | `tas_source` GROUP BY | % |
| Source → completion rate | Which channels actually show up | per-source `status3 / total` | % (Leakage) |

**Persona / Action / Lens:** P3 reads booking-source mix to judge channel ROI and where to push (e.g. patient-app adoption); P2 reads case-type mix to plan specialty staffing; P1 sees walk-in vs booked load. **Lens: Capacity / Leakage / Growth.**

**Feasibility:**
- Case-type, walk-in/booked, video/tele — **[Buildable now]** all live (`operational/case-type-mix`, footfall type-split, `operational/consultation-channel`).
- **Booking source — [Buildable now but partial]** `tbl_appointment_source` (4,608 rows; `tas_source`: CREATE_APPOINTMENT_SCREEN 2,079, KEA 1,432, APPOINTMENT_AGENT 680, CHIKITSALY-PORTAL 268, VISIT-PATIENT-APP 149) joins via `pam_id` and is **completely unused by any builder.** Covers only ~17% of appts (recent rows) → always show coverage % and flag the gap. The FE captures NO explicit channel field, so this table is the only source.
- Receptionist/scheduled-by-agent attribution beyond these tags — **[Not in DB]** (FE `?receptionist` is a URL param, not persisted).

---

### KPI Group 5 — Peak, Lead-Time & Slot/Throughput Utilization (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Hour-of-day heatmap | Volume by appointment hour | `COUNT GROUP BY HOUR(pam_app_time)` | count grid |
| Day-of-week pattern | Busiest day | `COUNT GROUP BY DAYOFWEEK(pam_app_date)` | count |
| Month/seasonal trend | Volume over months | `COUNT GROUP BY MONTH` | count |
| Hour × DOW heat matrix | Combined peak map | cross-tab of the above | count grid |
| Booking lead time | Booked-to-visit gap | `AVG(pam_app_date − DATE(pam_created_date))` | days |
| Same-day / walk-in share | Lead time = 0 | `COUNT(lead=0)/total` | % |
| Consults/day per doctor | Productivity | `status3 / active_doctor_days` per `um_id` | count |
| Slot utilization | Booked ÷ capacity | `booked_minutes / available_slot_minutes` | % (Capacity) |
| Throughput (appts/active hour) | Density of the book | finished ÷ open clinic hours | count/hr |

**Persona / Action / Lens:** P3 uses heatmaps + utilization for staffing and to find dead slots (leakage as empty chairs); P2 sizes per-doctor capacity; P1 sees their own busiest hours. Lead time tells P3 how far ahead the book fills (demand strength). **Lens: Capacity / Leakage / Productivity.**

**Feasibility:**
- Hour / DOW / month / trend — **[Buildable now]** live in `footfall.ts` (`HOUR(pam_app_time)`, `DAYOFWEEK(pam_app_date)`, busiest-day/hour KPIs). Hour×DOW matrix is a small extension.
- Consults/day per doctor — **[Buildable now]** `COUNT(status3) GROUP BY um_id` joined to `tbl_user_master` for name.
- **Booking lead time — [Needs profiling]** `pam_created_date` is documented 100%-populated (booking-to-visit IS queryable) but is **not in `db-check.js`** → add to column map, then build. High-value, currently unbuilt.
- **Slot/throughput utilization — [Needs profiling / partly Not-in-DB]** there is **no capacity/availability table in `tatva_clinic`** — slot lists come from the live visit-API (`/appointment/listSlots`) and slot *status* is not persisted. Utilization denominator (available slot-minutes) must be approximated from doctor working-hours config or sourced from the visit-API. Numerator (`pam_appointment_duration`, on the row but not in map) is available. **Honest tag: utilization is a Needs-profiling build with an external/derived denominator, not a clean DB metric.**

---

### KPI Group 6 — Per-Doctor & Per-Specialty Load & Comparison (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Appointments per doctor | Volume by provider | `COUNT GROUP BY um_id` | count |
| Finished per doctor | Productivity | `status3 GROUP BY um_id` | count |
| Cancel/no-show rate per doctor | Quality of the book | per-doctor status4 + stale-0 ÷ total | % (red-up) |
| Avg consults/day per doctor | Sustained throughput | finished ÷ working days | count |
| Per-specialty load | Department volume | `COUNT GROUP BY dp_id` (specialty) | count |
| Doctor leaderboard (volume + adherence) | Rank with secondary quality metric | volume bar + follow-up adherence % | rank |
| Doctor utilization spread | Load imbalance across a dept | stddev / range of per-doctor volume | count |

**Persona / Action / Lens:** **P2's home group** — doctor-vs-doctor comparison to rebalance load, justify hires, and coach. P3 reads per-specialty to find under/over-capacity departments. P1 sees only their own row (self-benchmark vs dept median). **Lens: Productivity / Capacity / Behavioral.**

**Feasibility:**
- Per-doctor volume/finished/cancel — **[Buildable now]** `um_id` on every appointment; footfall already exposes `topBookers`/`topCancellers`. Join `tbl_user_master` for names.
- Per-specialty — **[Buildable now]** `dp_id` present on the appointment (in the secondary `db-check` map). Verify a specialty/department lookup table for labels.
- Leaderboard with adherence secondary metric — **[Needs profiling]** depends on Group 3's "kept" loop.
- **Behavioral angle:** doctor-to-doctor variation in cancel rate, days-to-followup, walk-in mix, and adherence is the actionable coaching signal — surface dept median + each doctor's deviation, not just raw counts.

---

### KPI Group 7 — Revenue per Appointment & Billing Linkage (P0 — Leakage)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Revenue per appointment | Avg billed per appt | `Σ tobo_invoice_grand_total / COUNT(appts)` | ₹ |
| Revenue per finished visit | Avg per delivered consult | `Σ grand_total / status3` | ₹ |
| Billing capture rate | Finished appts that got billed | `billed_finished / status3` | % (green-up) |
| **Finished-but-unbilled count/₹** | **Leakage** | finished appts with NO `tbl_opd_billing_overview` match | count + ₹ est. |
| Outstanding per appointment | Unpaid balance per visit | `Σ GREATEST(tobo_balance,0) / appts` | ₹ |
| Revenue per doctor / specialty | Provider/dept yield | grand_total grouped by `um_id` / `dp_id` | ₹ |
| Revenue by channel | Walk-in vs booked vs tele yield | grand_total × channel split | ₹ |

**Persona / Action / Lens:** P3 owns leakage recovery (finished-but-unbilled = recoverable rupees); P2 ranks doctor/dept yield; P1 sees own revenue and own leakage. **Lens: Revenue / Leakage.**

**Feasibility:**
- Revenue per appt/visit, per-doctor/specialty, outstanding — **[Buildable now]** `tbl_opd_billing_overview` (`tobo_invoice_grand_total`, `tobo_balance`, `tobo_invoice_date`, `tobo_delete=0`, `tobo_invoice_cancel=0`); `financial/summary` already computes billed/collected/outstanding.
- **Finished-but-unbilled leakage — [Needs profiling]** requires a reliable join key between the appointment and the bill. FE sends `appointmentId` (`pam_id`) on `createBill`, but whether the V2 billing microservice persists `pam_id` into `tbl_opd_billing_overview` (vs patient+date matching) **must be confirmed against the billing service** — flagged FE↔analytics mismatch. Build with `LEFT JOIN ... WHERE bill IS NULL`; if no `pam_id` link exists, fall back to `patient_unique_id`+date proximity (lower precision).
- Channel/payment-split granularity richer in FE (multi-split `paymentModes[]`) than the single `tobo_mod_of_payment` column → channel-revenue is approximate.

---

### KPI Group 8 — ABHA Layer (P1 — Compliance, India differentiator)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| ABHA-linked appointment share | Appts where patient has ABHA | appts where `pm_abha_address<>''` ÷ all appts | % |
| ABHA-verified share | KYC-verified among linked | `pm_abha_verify=1` ÷ linked | % |
| Not-linked appointment share | Compliance gap / worklist | appts where ABHA absent | % (red) |
| ABHA link velocity | New links over time | new `pm_abha_address` per period | count |
| Link stage vs booking | When ABHA links relative to booking | compare link timestamp to `pam_created_date` | days/stage |
| Care-context-linked share | Visits pushed to ABDM (M2) | appts with `abha_token` / `tbl_case_manager.abha_context_link` set | % |
| ABHA share by doctor / dept | Who drives linkage | linked ÷ total by `um_id`/`dp_id` | % |

**Persona / Action / Lens:** P3 owns ABDM compliance reporting and sets a linkage target; P2 sees which department lags; P1 gets a per-row "not linked → prompt to link" worklist on their panel. **Lens: Compliance / Growth.**

**Feasibility:**
- Linked / verified / not-linked share, by doctor/dept — **[Buildable now]** live `operational/abha` (`pm_abha_address` 2,757 populated; `pm_abha_verify=1` 2,658). Note `tbl_patient_master` is **global with no business column** — scope strictly via the appointment join (already handled).
- **Link STAGE & TIMESTAMP relative to booking — [Needs other service / Not-in-DB-here]** there is **NO link-timestamp column on `tbl_patient_master`** (only the boolean `pm_abha_verify`). Timestamps live in dedicated tables — `tbl_abha_hip_link_master.tahlm_created_date` (**8 rows**), `tbl_patient_abha_with_hospital` (70 rows, `tokenCreatedAt`) — i.e. **SPARSE single/double-digit volumes and unwired.** "At what stage ABHA links relative to booking" is therefore **not answerable at scale today**; the stage/consent granularity (M1 identity / M2 care-context / M3 consent) lives in the ABHA microservice store, not `tatva_clinic`. Honest recommendation: report linked/verified share now; treat link-velocity and stage-vs-booking as a roadmap item needing an ABHA-service feed.
- Care-context link — **[Needs profiling]** `tbl_appointment_master.abha_token` and `tbl_case_manager.abha_context_link`/`abha_visit_id` exist but fill rate unverified.

---

### Breakdowns / dimensions

Apply consistently across the pillar (pin a filter bar, R2/R4 pattern):
- **Time:** date range, grain (day/week/month), hour-of-day, day-of-week, season.
- **Provider:** doctor (`um_id`), specialty/department (`dp_id`).
- **Status:** the funnel (0/3/4 + unmapped + Draft + Pending-digi).
- **Visit:** case-type (`toct_type`), New vs Old (`pam_type`), follow-up vs first.
- **Channel:** walk-in vs booked (`pam_appointment_type`), video/tele (`pam_status_type_appointment`), booking source (`tas_source`).
- **Patient:** gender, age band (`<18·18-30·30-45·45-60·>60`), ABHA status, new vs returning.
- **Money:** billed / outstanding / unbilled.

### Drill-down registers (row-level + download)

Each headline KPI links to a register (existing pattern: 5,000-row register in `operational/appointments`):
1. **Appointment register** — date, time, patient (UHID + name + ABHA icon), doctor, specialty, case-type, channel, status, billed?, ABHA status. (Filterable by every dimension; CSV export.)
2. **Overdue follow-up worklist** — patient, advised date, days overdue, advising doctor, contact → recall-call list (drives P1/front-desk action).
3. **Finished-but-unbilled register** — finished appt, doctor, date, patient, est. fee → leakage recovery (P3).
4. **Pending-digitization register** — finished appts flagged undigitized by SnapRx → documentation worklist.
5. **Stale-Queue / no-show register** — status-0 past-dated appts → re-engagement.
6. **Not-ABHA-linked register** — patients on panel without ABHA → linkage drive.

### Recommended visualizations (metric → chart)

- Status funnel → **horizontal funnel / stacked bar** (Queue→Finished, with Cancelled + No-show + Draft + Pending-digi as leak callouts).
- Hero KPI strip → **value + colored delta tag + "vs previous period"** (semantic color; invert to red-up for cancel/no-show/overdue).
- Hour × DOW → **heatmap matrix**; month → line/area.
- New vs Follow-up, walk-in vs booked, channel mix → **stacked bars** (by doctor/dept) or donut (≤5 slices only — avoid pie overuse).
- Follow-up adherence → **funnel** (advised→kept→missed) + **dual-axis combo** (advised bars + adherence-% line over time).
- Doctor comparison → **Top-N leaderboard** with volume bar + adherence/cancel-% secondary metric beside it (R3 pattern).
- Wait time → **distribution / box-plot** (mean + P90), by hour.
- Revenue per appt → **ranked bars** by doctor/specialty; leakage → big-number callout (count + ₹).
- ABHA → **linkage-rate gauge** + by-doctor ranked bars + velocity line.
- *Avoid:* LOS/occupancy/readmission visuals (IPD contamination); treemaps for >5 categories.

### Behavioral analysis (doctor-to-doctor / cohort)

- **Cancellation/no-show variation** across doctors in the same specialty → identifies scheduling discipline or patient-comms gaps (coachable by P2).
- **Follow-up adherence spread** → which doctors retain patients; tie to revenue (a doctor with 20% lower adherence is leaking retention revenue the dept can quantify).
- **Days-to-follow-up variation** → clinical-style difference (one doctor recalls at 7 days, another at 30) — surface as a behavioral, not judgmental, comparison with dept median.
- **Walk-in vs booked mix** per doctor → reveals who absorbs unscheduled load.
- **ABHA-linkage rate** per doctor/front-desk → operational compliance behavior.

### Cross-domain / cross-sell connections

- **Appointments → Billing:** revenue-per-appointment and finished-but-unbilled (Group 7) — the core leakage tie.
- **Appointments → Drug/Pharmacy:** finished visits with a prescription (`tbl_medicine_report`) but no pharmacy attach → **pharmacy attach-rate** cross-sell opportunity.
- **Appointments → Lab:** finished visits ordering investigations (`tcm_investigation`) without an in-house lab bill → **lab tie-up / in-house-lab capture** opportunity.
- **Appointments → Follow-up → Retention:** adherence loop feeds the retention pillar; overdue list feeds bulk-communication/recall.
- **Appointments → ABHA → Digitization:** ABHA-linked + digitized finished visits are the ABDM-compliant, shareable-record cohort — a compliance + future-data-product asset.

### Gaps surfaced & recommended actions

1. **No-show is not a first-class flag** → action: validate the `status='0' AND past-date` proxy against data-entry lag; if noisy, request a true no-show status from product. **[Needs profiling]**
2. **Wait-time source unwired** (`tbl_patient_visit_logs`, 41,905 rows) → action: get the EMR status-constant map, confirm "seen" code, build `operational/wait-time`. Highest operational-experience win. **[Needs profiling]**
3. **Follow-up loop is open** (advised has no "kept") → action: build the advised→kept match (patient+doctor+date). Highest retention-revenue win. **[Needs profiling]**
4. **Booking source only ~17% coverage** (`tbl_appointment_source`) → action: surface with explicit coverage %; push product to populate source on all bookings. **[Buildable now, partial]**
5. **Lead time & slot duration columns not in the map** (`pam_created_date`, `pam_app_end_time`, `pam_appointment_duration`, `pam_type`) → action: extend `db-check.js` column map and clean dirty tails before use. **[Needs profiling]**
6. **No capacity/slot table in `tatva_clinic`** → action: source availability from visit-API working-hours config to compute true utilization; until then label utilization "approximate." **[Needs other service]**
7. **Finished-but-unbilled join key unconfirmed** (does V2 billing persist `pam_id`?) → action: confirm with billing service team. **[Needs profiling]**
8. **ABHA stage/timestamp SPARSE & unwired** (8–70 rows) → action: report linked/verified share now; defer stage-vs-booking until an ABHA-service feed exists. **[Needs other service]**
9. **Pending-digitization lives in SnapRx, not DB** → action: materialize a daily undigitized snapshot into the analytics store for trendability. **[Needs other service]**

### Sample questions this pillar answers

1. Of every 100 booked OPD slots last month, how many became finished, billed consultations — and where did the other ones leak (cancel / no-show / undigitized / unbilled)?
2. Which doctors in Cardiology see the most patients per day, and which have the highest cancellation rate?
3. What is our average patient wait time from queue-in to consult-start, and which hour of which weekday is worst?
4. Of all follow-ups advised last quarter, what % actually returned, and who is overdue today (recall list)?
5. How many finished consultations last month were never billed, and what's the recoverable rupee value?
6. What share of our appointments are video vs walk-in vs scheduled, and which booking channel (KEA / agent / patient-app) converts best?
7. How far in advance does our book fill (lead time), and how many same-day/walk-in slots are we absorbing?
8. What % of our patients are ABHA-linked at the point of an appointment, and which department lags on linkage?
9. What is revenue-per-finished-visit by doctor and by specialty, and who is the highest-yield provider?
10. Is Dr. X's panel thinning (declining new + returning volume) before it shows up in revenue?

### Priority

- **Group 1 Volume & Status Funnel — P0.** The spine; mostly buildable now; the funnel is the first thing every persona looks at and frames all leakage.
- **Group 2 Wait Time & Throughput Timing — P0 (gated).** Top patient-experience metric, absent from all references = differentiator; blocked only on profiling two unwired timestamp tables.
- **Group 3 Follow-up Adherence Loop — P0.** Highest retention-revenue lever; "advised" is live, "kept" is the must-build.
- **Group 5 Peak/Lead-time/Utilization — P0.** Direct capacity-planning decisions; heatmaps live, lead-time and utilization need a small profiling step.
- **Group 6 Per-Doctor/Specialty Comparison — P0.** P2's core decision surface; buildable now.
- **Group 7 Revenue per Appointment & Leakage — P0.** Direct recoverable rupees; mostly live, leakage join needs confirmation.
- **Group 4 Visit/Case-type & Channel Mix — P1.** Mostly live; booking-source partial.
- **Group 8 ABHA Layer — P1.** Compliance differentiator; share is live, stage/velocity deferred to an ABHA-service feed.

---

**Files referenced (absolute):** column map `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js`; OPD builders `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/operational.ts` (overview, appointments, followups, abha, case-type-mix, appointments-trend), `.../footfall.ts` (hour/DOW/peak, topBookers/topCancellers), `.../financial.ts` (summary/billing); FE flows `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/components/AppointmentData.js`, `.../src/pages/addAppointment/AddAppointment.js`, `.../src/utils/constants.js` (tab/status codes), `.../src/api/services/ApiAbha.js`; frontend endpoint map `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/shell/analyticsNav.jsx`.

**Unwired tables this pillar would activate:** `tbl_patient_visit_logs` (wait time), `tbl_appointment_source` (booking channel), `tbl_case_manager_ip_logs.consultation_start_datetime` (consult duration), `tbl_appointment_master.pam_created_date`/`pam_type`/`pam_appointment_duration` (lead time, new/old, slot duration) — all confirmed present but absent from current builders.

---

## OPD Billing & Revenue (incl. 3C, advances, refunds)

This pillar is the money engine of the OPD analytics suite. It answers the only question that keeps a clinic solvent: *of everything we did clinically, how much did we bill, how much did we actually collect, where is it leaking, and which clinical patterns can we convert into more revenue?* It is grounded entirely in the `tbl_opd_billing_*` rollups (read-only `tatva_clinic`) and the live `financial.ts` builder, with leakage and cross-sell tied back to appointments (`tbl_appointment_master`), consultations (`tbl_case_manager`), diagnoses (`tbl_casemanager_diagnosis`), lab orders (`tcm_investigation`) and drugs (`tbl_medicine_report`).

### Why this matters & to whom

- **P3 Operational Admin / Owner** — owns the P&L. Needs clinic-wide billed/collected/outstanding, collection rate, the AR ageing of dues, refund/credit-note leakage, discount leakage, payment-mode mix (cash-handling risk and reconciliation), 3C/counter reconciliation for cash audit, edited-bill audit for fraud/error control, revenue by department and doctor, and the cross-sell upside (lab + pharmacy attach). This is the persona the pillar is primarily engineered for.
- **P2 Specialty/Department Admin (HoD)** — owns a department's contribution margin. Needs revenue-per-doctor inside the specialty, doctor-to-doctor variation in avg bill, discounting behaviour, and under-billing/zero-bill leakage among the team's finished appointments — to coach outliers and defend the department's budget.
- **P1 Practicing Doctor** — owns their own panel's revenue. Needs their own billed/collected, avg bill per visit, their incentive payout, and a brutally honest view of their *own* leakage (finished consultations that never produced a bill, or were billed below the panel median). Framed as productivity and personal-earnings, not surveillance.

### Revenue & retention angle (concrete; leakage surfaced)

Five concrete leakage and growth surfaces, every one tied to a real table:

1. **Zero-bill finished appointments (LEAKAGE):** `tbl_appointment_master.pam_status='3'` rows with **no matching** `tbl_opd_billing_overview` row (by `patient_unique_id` + invoice-date ≈ visit-date, or `appointmentId`/`pam_id` if materialised). Every uncaptured finished visit is a consultation fee given away free.
2. **Under-billed finished appointments (LEAKAGE):** finished visits whose bill is materially below the doctor/specialty median bill — coaching + price-list-discipline opportunity.
3. **Discount leakage:** line-level + bill-level discounts erode realised price; `extraDiscount`/`lineItemDiscount` are captured in the V2 FE payload but the analytics rollup only exposes net grand-total, so discount *value/%* needs the service-line tables to be reconstructed (see Feasibility).
4. **AR / outstanding decay (RETENTION + cash):** `tobo_balance>0` aged into buckets — dues that rot past 90 days are effectively written off; chasing them is pure recovered cash.
5. **Cross-sell upside (REVENUE):** top diagnoses + top investigations point at a captive **lab** referral stream; top drugs point at a **pharmacy** attach stream — both quantifiable today from clinical tables and convertible into in-house revenue.

---

### KPI GROUPS

#### Group 1 — Headline billing & collection (the money hero)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Total billed | Gross invoice value raised (non-cancelled) | `SUM(tobo_invoice_grand_total)` WHERE `tobo_delete=0 AND tobo_invoice_cancel=0` | ₹ |
| Collected | Net cash realised against those invoices | `SUM(tobo_invoice_grand_total − GREATEST(tobo_balance,0))` | ₹ |
| Outstanding (dues) | True receivable still owed | `SUM(GREATEST(tobo_balance,0))` | ₹ |
| Collection rate | Collected share of billed | `Collected ÷ Billed × 100` | % |
| Invoices | Count of non-cancelled invoices | `COUNT(*)` | count |
| Avg bill value | Billed per invoice | `Billed ÷ Invoices` | ₹ |
| Advances held | Patient money received ahead of billing | `−SUM(LEAST(tobo_balance,0))` | ₹ |

**Persona / Action / Lens —** P3 (clinic) & P2 (department, via `doctor_unique_id` filter) & P1 (own panel). **Action:** monitor collection rate vs prior period; a falling rate with steady billing = a collections problem (chase dues), a falling billed with steady rate = a volume/pricing problem (capacity/leakage). **Lens:** Revenue + Leakage.
**Feasibility — Buildable now.** Live in `financial.ts` `summary`/`realtime` against `tbl_opd_billing_overview` (`tobo_invoice_grand_total`, `tobo_balance`, `tobo_invoice_cancel`, `tobo_delete`, `tobo_invoice_date`, `doctor_unique_id`). Period-over-period deltas already wired (`comparisonWindow`/`pctDelta`).

#### Group 2 — Advances (deposits / wallet)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Advance held (balance) | Net unspent patient deposits | `−SUM(LEAST(tobo_balance,0))` | ₹ |
| Advance collected | Deposits taken in period | FE `createAdvancedDeposit` (status "Deposit") | ₹ |
| Advance debited/adjusted | Advance consumed against bills | advance applied as `Advance Deposit` payment-mode | ₹ |
| Advance refunded | Advance returned to patient | refund rows linked to an advance | ₹ |

**Persona / Action / Lens —** P3. **Action:** advances held is a liability and a cash cushion; track collected-vs-debited-vs-refunded to ensure advances are being consumed (service delivered) not just parked or leaking back out. **Lens:** Revenue + cash-liability.
**Feasibility —** *Advance held* = **Buildable now** (derived negative balance, already surfaced as "Advances held"). *Collected / debited / refunded as discrete flows* = **Needs profiling / Needs other service.** There is **no dedicated advance-amount column** on `tbl_opd_billing_overview`; the explicit deposit/wallet ledger is written by the V2 billing microservice (`/api/v1/billing/advancedDeposit`, `walletBalance`) and the only in-DB advance linkage is `tbrm_advance_id`/`tbrm_advance_id_new` on the refund table — confirm whether a `tbl_*_advance` deposit ledger lands in `tatva_clinic` before promising the discrete advance breakdown.

#### Group 3 — Refunds & credit notes (leakage out the back door)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Refund amount | Total refunded to patients | `SUM(tbrm_total)` from `tbl_opd_billing_refund_master` | ₹ |
| Refund count | Number of refund events | `COUNT(*)` | count |
| Refund rate | Refunds as share of collected | `Refunds ÷ Collected × 100` | % |
| Refund by status/type | Split by `tbrm_status` (0/1) | `GROUP BY tbrm_status` | ₹/count |
| Refund given vs pending | `tbrm_given_amount` vs `tbrm_pending_amount` | sums | ₹ |
| Credit-note value | Value adjusted via credit notes | `SUM(tbcm_grand_total)` from `tbl_opd_billing_credit_master` | ₹ |
| Credit-note rebate type | Amount vs percentage rebate | `GROUP BY tbcm_rebate_type` ('amt'/'per') | ₹/count |

**Persona / Action / Lens —** P3 (clinic governance) & P2 (which doctor/department drives refunds). **Action:** a rising refund/credit-note rate is direct revenue reversal — investigate root cause (service not delivered, billing error, patient dispute) and tighten. **Lens:** Leakage + Compliance.
**Feasibility —** *Refund total, refund trend, credit-note total/trend* = **Buildable now** (live in `collection-trend` / `revenue-trend` / `summary`; `tbrm_total`+`tbrm_date`, `tbcm_grand_total`+`tbcm_invoice_date` are in the column map). *Refund TYPES* = **Needs profiling.** **Honest gap:** there is **no rich refund-reason taxonomy** — the only type-ish split is `tbrm_status` (0=31, 1=5 rows) and `bill_type='opd'`; the V2 FE captures **full-refund-only, no reason field**. `tbrm_given_amount`/`tbrm_pending_amount`/`tbrm_advance_id` and `tbcm_rebate_type`/`tbcm_notes` exist on the live tables but are **not in the analytics column map** — queryable after a profiling pass, low row counts (~36 refunds) mean treat as directional, not statistical.

#### Group 4 — Discounts (value / % / leakage)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Discount value | Total rupee discount given | `SUM(line_amount×qty) − SUM(ims_total)` reconstructed at service-line level | ₹ |
| Discount % | Discount as share of gross | `Discount ÷ Gross-before-discount × 100` | % |
| Discount leakage by doctor | Discount value attributed to `doctor_unique_id` | per-doctor sum | ₹/% |
| Bills with discount | Share of bills carrying any discount | `discounted ÷ total` | % |

**Persona / Action / Lens —** P3 & P2 (HoD coaches over-discounting doctors). **Action:** identify discount outliers — a doctor or front-desk giving systematically higher discounts is silent margin erosion; enforce a discount-approval ceiling. **Lens:** Leakage + Behavioral.
**Feasibility — Needs profiling.** **Honest gap:** the analytics rollup `tbl_opd_billing_overview` only stores net `tobo_invoice_grand_total` — **no discount column is mapped.** The V2 FE captures rich discount detail (`lineItemDiscount`, `extraDiscount`, `extraDiscountType` flat/%, per-line `discount`/`discountType`) but whether it materialises in `tatva_clinic` is unverified. Best in-DB path: reconstruct from `tbl_opd_billing_invoice_service` (`ims_total`, `ims_qty`, `im_ser_description`) against the catalogued list price — requires a profiling pass to confirm a list-price column exists. **No discount builder exists today** (`collection-report`/discount-analysis are `NotImplemented` stubs).

#### Group 5 — Edited & cancelled bills (audit / fraud control)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Edited bills count | Invoices modified after creation | `COUNT(*)` WHERE `tobo_modify_date > tobo_created_date` | count |
| Cancelled bills count | Invoices voided | `COUNT(*)` WHERE `tobo_invoice_cancel=1` | count |
| Cancelled value | Rupee value voided | `SUM(grand_total)` WHERE cancelled | ₹ |
| Edits/cancels by user | Attributed to actor | `GROUP BY tobo_modify_by` / `tobo_invoice_cancel_by` | count |

**Persona / Action / Lens —** P3 (owner / governance). **Action:** a cluster of post-creation edits or cancellations by one user is a fraud/error red flag — review and lock down edit permissions; reconcile edited amounts against cash. **Lens:** Compliance + Leakage.
**Feasibility — Needs profiling.** **Honest gap:** the audit columns **exist on the live `tbl_opd_billing_overview`** (`tobo_created_by/_date`, `tobo_modify_by/_date`, `tobo_delete_by`, `tobo_invoice_cancel_by`) but are **NOT in the db-check column map and no builder exposes an edit/audit report.** Cancellation count is buildable now (`tobo_invoice_cancel` is mapped); the who/when edit audit needs a profiling pass to confirm population. The V2 FE confirms an edit path (`/bill/edit-bill`, gated `EditBillDeployedDate=2025-12-23`) so edits are real and recent.

#### Group 6 — Payment-mode mix (reconciliation & risk)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Mode mix (value) | Revenue by payment mode | `SUM(grand_total) GROUP BY tobo_mod_of_payment` → `tbl_biiling_payment_option.title` | ₹ |
| Cash share | Cash as % of collected | `cash ÷ total` | % |
| Digital share (UPI+card) | Cashless as % of collected | `(upi+card) ÷ total` | % |
| Mode mix today | Same-day reconciliation view | `realtime` CURDATE union | ₹ |

**Persona / Action / Lens —** P3 (cash-handling risk, daily counter reconciliation) & front-desk. **Action:** high cash share = higher pilferage/reconciliation risk and a nudge to push UPI/QR; reconcile mode totals against counter cash daily. **Lens:** Compliance + cash-risk.
**Feasibility — Buildable now** (`payment-mode-mix` + `realtime` live). **Caveat:** the FE supports **multi-split payments** (`paymentModes[]` array of `{mode, amount}`) but the rollup stores a single `tobo_mod_of_payment` code per bill — split-payment granularity (a bill paid part-cash part-UPI) is **lost at the analytics layer**; flag as a known fidelity gap.

#### Group 7 — 3C / counter reconciliation (legacy-defined)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Invoice service total | Charged service lines | `SUM(ims_total)` from `tbl_opd_billing_invoice_service` | ₹ |
| Credit-note service total | Reversed service lines | `−SUM(tbcs_total)` from `tbl_opd_billing_credit_service` | ₹ |
| Cash-memo service total | OTC cash-memo lines | `SUM(tbrss_total)` from `tbl_bill_reatil_sale_service` (OPD: `in_pid` null/0) | ₹ |
| 3C net | Net counter position | Invoice − CreditNote + CashMemo | ₹ |

**Persona / Action / Lens —** P3 (owner) & accounts/audit. **Action:** the 3C three-stream view is the counter-reconciliation ledger — net it against collected and against physical cash to catch unrecorded discounts, missing memos, or counter shortfalls. **Lens:** Compliance + Leakage.
**Feasibility — Buildable now.** **Definition from legacy (per the brief):** there is **no explicit "3C counter" column**; 3C = the union of the three service-line streams — **Invoice** (`tbl_opd_billing_invoice_service`), **Credit Note** (`tbl_opd_billing_credit_service`), **Cash Memo** (`tbl_bill_reatil_sale_service`) — exactly as the live `3c-report` builds it (service-level rows, 5000-row register).

#### Group 8 — Revenue by department, doctor & specialty (contribution)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Revenue by doctor | Billed attributed to provider | `SUM(grand_total) GROUP BY doctor_unique_id` → `tbl_user_master.um_name` | ₹ |
| Revenue by department/specialty | Billed by specialty | doctor → specialty rollup | ₹ |
| Revenue per doctor | Avg billing per active provider | `dept revenue ÷ active doctors` | ₹ |
| Doctor incentive payout | Incentive earned on billed lines | `per`→`ims_total×%`, else `tbms_ins_total×ims_qty` | ₹ |
| Expense by department | Departmental cost | (see gap) | ₹ |

**Persona / Action / Lens —** P2 (doctor-vs-doctor inside specialty) & P3 (department contribution ranking) & P1 (own revenue + own incentive). **Action:** rank doctors by revenue *and* by collection rate (R3 leaderboard pattern — volume bar + quality metric); a high-billing low-collecting doctor flags a dues problem on their panel. **Lens:** Revenue + Productivity + Behavioral.
**Feasibility —** *Revenue by doctor & incentives* = **Buildable now** (live `byDoctor` block + `incentives` report; `doctor_unique_id`, `tbl_bill_main_service`, `tbl_incentive_master`). *Revenue by SPECIALTY* = **Needs profiling** (requires a doctor→specialty mapping; confirm a specialty column on `tbl_user_master`). **EXPENSE by department = Not in DB** — the references' Revenue/Expense/Profit combos (R1/R4) have **no cost/expense backing table in `tatva_clinic`**; do not promise expense or margin without an external finance source.

#### Group 9 — Unit economics (avg bill / revenue-per lenses)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Avg bill per invoice | Billed per bill | `Billed ÷ Invoices` | ₹ |
| Avg bill per visit | Billed per finished appointment | `Billed ÷ finished-appts (status 3)` | ₹ |
| Bill per patient | Billed per unique patient | `Billed ÷ COUNT(DISTINCT patient_unique_id)` | ₹ |
| Revenue per doctor | Billed per active provider | `Billed ÷ active doctors` | ₹ |
| Revenue per specialty | Billed per specialty | `Billed ÷ specialties` | ₹ |

**Persona / Action / Lens —** P3 & P2 & P1. **Action:** avg-bill-per-visit trending down at flat volume = price erosion or service-mix shift; bill-per-patient is the lifetime-value seed for retention investment. **Lens:** Revenue + Retention.
**Feasibility —** *Avg bill per invoice / bill-per-patient (billing-only)* = **Buildable now** (`patient_unique_id` on `tbl_opd_billing_overview`). *Avg bill per VISIT* = **Needs profiling** — requires joining billing to `tbl_appointment_master` finished visits; the join key (date-proximity vs a materialised `pam_id` on the bill) must be confirmed.

#### Group 10 — Billing-vs-appointment coverage & leakage (the headline leakage block)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Billing coverage rate | Finished visits that produced a bill | `billed-finished-appts ÷ finished-appts × 100` | % |
| Zero-bill finished appts | Finished visits with no bill | `COUNT` status=3 with no matching invoice | count / ₹ leaked |
| Under-billed finished appts | Bill below doctor/specialty median | `COUNT` bill < p50(doctor) | count / ₹ gap |
| Leakage value (est.) | Lost fee from uncaptured visits | `zero-bill count × avg consult fee` | ₹ |

**Persona / Action / Lens —** P3 (clinic leakage), P2 (which doctor leaks), P1 (own uncaptured visits, framed as lost earnings). **Action:** every zero-bill finished consultation is a free visit — surface the register, fix at front-desk (mandate bill-at-checkout). **Lens:** Leakage (the single highest-ROI block in this pillar).
**Feasibility — Needs profiling.** Both sides exist (`tbl_appointment_master.pam_status='3'` and `tbl_opd_billing_overview`) but **the join is unverified** — there is no confirmed `pam_id` foreign key on the billing rollup, so matching is by `patient_unique_id` + invoice-date≈visit-date (fuzzy, needs a profiling pass to validate precision). The FE `createBill` payload carries `appointmentId` (pam_id) — **confirm whether it persists to the analytics tables**; if it does, coverage becomes exact and **Buildable now**. No builder exists today.

#### Group 11 — Most-sold items / services (mix & pricing)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Top services by volume | Most-billed service lines | `COUNT GROUP BY im_ser_description` | count |
| Top services by revenue | Highest-grossing lines | `SUM(ims_total) GROUP BY im_ser_description` | ₹ |
| Avg price per service | Realised unit price | `SUM(ims_total) ÷ SUM(ims_qty)` | ₹ |

**Persona / Action / Lens —** P3 (service-mix & pricing strategy) & P2. **Action:** identify the revenue-concentration (top 5 services = X% of revenue) and price-discipline outliers; protect and promote high-margin services. **Lens:** Revenue.
**Feasibility — Buildable now.** `tbl_opd_billing_invoice_service` exposes `im_ser_description`, `ims_total`, `ims_qty` (all mapped; already read by `3c-report`/`incentives`). No standalone "most-sold" builder yet — trivial to add from the existing union.

#### Group 12 — Revenue cross-sell (clinical → lab & pharmacy attach)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Top investigations ordered | Most-ordered lab tests → in-house lab opportunity | split `tcm_investigation` CSV | count |
| Top diagnoses → lab map | Conditions that drive test orders | `tbl_casemanager_diagnosis.diagnosis` ⋈ orders | count |
| Lab attach rate | Visits ordering a test that was billed in-house | in-house lab bill ÷ test orders | % |
| Top drugs prescribed | Most-prescribed meds → pharmacy opportunity | `tbl_medicine_report` ⋈ `medicine_master` | count |
| Pharmacy attach rate | Prescribed drugs filled in-house pharmacy | retail-sale lines ÷ Rx lines | % |
| Cross-sell revenue upside (est.) | Un-captured lab+pharmacy value | orders × avg in-house price | ₹ |

**Persona / Action / Lens —** P3 (the growth play — convert clinical demand into captive lab + pharmacy revenue), P2 (department-level attach). **Action:** if doctors order 1,000 tests but only 200 are billed in-house, the other 800 walk to an outside lab — that's the in-house lab/pharmacy business case quantified. **Lens:** Revenue (cross-sell) + Leakage.
**Feasibility —** *Top investigations / diagnoses / drugs* = **Buildable now** (live `clinical/lab-test` from `tcm_investigation` CSV-split [FREE-TEXT-MESSY], `clinical/diagnosis` from `tbl_casemanager_diagnosis`, `clinical/drug` from `tbl_medicine_report`⋈`medicine_master`). *Attach RATE* = **Needs profiling / Needs other service** — requires linking clinical orders to **pharmacy** (`tbl_bill_retail_sale_master`/`tbl_bill_reatil_sale_service`, live in `operational/pharmacy`) and **pathology** (`tbl_path_*_billing_overview`, live in `operational/pathology`) revenue; the order→fill join key is unverified (no test-order-id linking `tcm_investigation` to a path bill). Investigations are messy free-text, so attach matching is fuzzy — directional, not exact.

---

### Breakdowns / dimensions

- **Time:** day / week / month (`grain` param; `tobo_invoice_date`), period-over-period delta vs prior equal window.
- **Provider:** doctor (`doctor_unique_id`→`um_name`), specialty/department (needs doctor→specialty map).
- **Care setting:** OPD-scoped (`careSetting='opd'` → OPD billing branch only); exclude IPD/path from this pillar.
- **Payment mode:** cash / UPI / card / cheque / advance-deposit / others (`tbl_biiling_payment_option`).
- **Bill state:** active / cancelled / refunded / credit-noted / has-dues.
- **Hospital:** `tobo_hm_id` (multi-branch owner).
- **Service / item:** `im_ser_description`.
- **Dues age band:** 0-30 / 31-60 / 61-90 / 90+ days (live in `duesAging`).

### Drill-down registers (row-level + download)

1. **Patient dues register** (live `patientDues`): patient, UHID, mobile, outstanding — the collections call-list. CSV export.
2. **3C service register** (live `3c-report`, 5000 rows): patientId, patient, billId, billing item, type (Invoice/Credit Note/Cash Memo), date, amount.
3. **Daily collection ledger** (live `summary`/`daily-collection`): date, invoices, billed, collected, outstanding, refund.
4. **Recent transactions** (live `realtime`, 50 rows): bill no, date, patient, amount, balance.
5. **Incentive register** (live `incentives`): user, patient, bill, service, service price, incentive amount.
6. **Zero-bill finished-appointment register** (proposed): patient, doctor, visit date, status, "no bill" flag — the leakage worklist. *Needs the appointment↔billing join validated.*
7. **Edited/cancelled-bill audit register** (proposed): bill no, original vs modified amount, modify_by, modify_date, cancel_by. *Needs audit-column profiling.*

### Recommended visualizations (metric → chart)

- Headline KPIs → **value + colored delta tag + "vs prev period" baseline** cards (R2 pattern; already shipped) — invert color so rising *refunds / outstanding / refund-rate* render **red**.
- Collection vs refund over time → **dual-line trend** (live `collectionTrend`).
- Revenue vs credit-note over time → **bar + line** (live `revenueTrend`).
- Payment-mode mix → **donut** (≤6 slices; live `paymentModeMix`).
- Dues ageing → **stacked horizontal bar** by age band (live `duesAging`).
- Revenue by doctor → **ranked horizontal bars + secondary collection-rate metric** (R3 leaderboard) — avoid pie.
- Most-sold services → **ranked bars** (avoid pie >5 slices, per reference pitfall).
- Billing coverage → **gauge / paired big-number** (Finished | Billed) (R4/R5 paired pattern).
- Cross-sell attach → **funnel** (orders → in-house billed) per lab & pharmacy.
- 3C reconciliation → **table** (the three streams netted), not a chart.

### Behavioral analysis (doctor-to-doctor / cohort variation)

- **Discount behaviour:** distribution of discount % by doctor — flag systematic over-discounters (margin erosion). *Needs discount profiling.*
- **Avg-bill variation:** box/spread of avg bill per visit by doctor within a specialty — P2 coaching tool; an outlier low-biller is either under-coding services or leaking.
- **Leakage variation:** zero-bill rate by doctor — which provider's finished visits most often go unbilled (front-desk vs doctor behaviour).
- **Collection variation:** collection rate by doctor's panel — who accumulates dues.
- **Edit/cancel concentration:** edits/cancellations per user — governance red-flag clustering.

### Cross-domain / cross-sell connections

- **→ Clinical (diagnosis/lab/drug):** top diagnoses & investigations feed the **lab** cross-sell; top drugs feed **pharmacy** attach. (Group 12.)
- **→ Operational (appointments):** finished appointments (status 3) are the denominator for **billing coverage / zero-bill leakage** (Group 10) and avg-bill-per-visit (Group 9).
- **→ Pharmacy dashboard** (`operational/pharmacy`, `tbl_bill_retail_sale_master`): the in-house-fill numerator for pharmacy attach.
- **→ Pathology dashboard** (`operational/pathology`, `tbl_path_*_billing_overview`): the in-house numerator for lab attach.
- **→ Patients:** bill-per-patient seeds **retention / LTV** segmentation.
- **→ Incentives:** revenue-by-doctor links to incentive payout, closing the productivity↔earnings loop.

### Gaps surfaced & recommended actions

1. **Discount value/% — Not mapped (Needs profiling).** Rollup stores net total only. **Action:** profile `tbl_opd_billing_invoice_service` for a list-price column and confirm whether V2 FE discount fields persist; build a discount-analysis endpoint (currently a `NotImplemented` stub).
2. **Edited-bill audit — exists but unmapped (Needs profiling).** `tobo_modify_by/_date`, `tobo_invoice_cancel_by` live on the table. **Action:** add to column map + build an audit register; high owner value, near-zero build cost.
3. **Refund TYPE taxonomy — SPARSE/absent.** Only `tbrm_status` 0/1; FE captures no refund reason. **Action:** request a refund-reason field be added at point-of-capture in V2 billing; until then report refunds as a single bucket and flag the limitation.
4. **Advance discrete flows — partial (Needs other service).** Only net advance-held is derivable. **Action:** confirm the V2 deposit/wallet ledger lands in `tatva_clinic`; otherwise read from the billing microservice.
5. **Appointment↔billing join — unverified (blocks coverage/leakage).** **Action:** verify if `appointmentId`/`pam_id` from `createBill` persists to the billing rollup; this single fact upgrades the entire leakage block from fuzzy to exact.
6. **Expense / margin — Not in DB.** No cost table in `tatva_clinic`. **Action:** do not build Revenue-vs-Expense-vs-Profit combos (R1/R4) without an external finance feed; explicitly scope them out.
7. **Split-payment fidelity loss.** FE multi-split collapses to one `tobo_mod_of_payment`. **Action:** note as a known mode-mix limitation; precise split needs a payment-line table.
8. **Specialty rollup — Needs profiling.** Confirm a specialty column on `tbl_user_master` for department revenue.

### Sample questions

1. What was our OPD collection rate this month vs last, and is a drop driven by lower billing or slower collection?
2. How much cash is sitting in dues older than 90 days, and which 20 patients owe the most?
3. Which doctors give the highest discounts, and what's the rupee leakage from it?
4. How many finished consultations last week produced **no bill**, and what's the estimated lost fee?
5. Who edited or cancelled bills this month, and does the value reconcile with cash?
6. What's our cash-vs-UPI mix, and is cash-handling risk rising?
7. Which investigations and diagnoses drive the most lab orders we could capture in-house?
8. What's our pharmacy attach rate — how many prescribed drugs are filled at our counter vs walking out?
9. Which department contributes the most revenue per active doctor?
10. Do the three 3C streams (invoice − credit note + cash memo) reconcile against today's collected cash?

### Priority

- **Group 1 (Headline billing & collection) — P0.** The money hero; already live, the owner's first screen.
- **Group 10 (Coverage & zero-bill leakage) — P0.** Highest-ROI block; directly recovers lost fees. Blocked only on validating the appointment↔billing join — prioritise that verification.
- **Group 7 (3C reconciliation) — P0.** Cash-audit backbone; already built, legacy-parity critical.
- **Group 3 (Refunds & credit notes) — P1.** Live for totals; refund-type profiling is incremental.
- **Group 6 (Payment-mode mix) — P1.** Live; reconciliation + cash-risk value.
- **Group 8 (Revenue by doctor/dept) — P1.** Live for doctor; specialty rollup is the increment.
- **Group 12 (Cross-sell) — P1.** Top-N lists live now; attach-rate is the high-value second step (the in-house lab/pharmacy business case).
- **Group 5 (Edited/cancelled audit) — P1.** Near-zero build cost, high governance value once columns are mapped.
- **Group 11 (Most-sold services) — P1.** Trivial add from existing 3C union.
- **Group 9 (Unit economics) — P2.** Mostly derivable; avg-bill-per-visit waits on the appointment join.
- **Group 2 (Advances discrete flows) — P2.** Net-held is live; discrete flows wait on the deposit-ledger source.
- **Group 4 (Discounts) — P2.** Blocked on profiling/persistence; build after the discount source is confirmed.

---

## All Patients — Panel, Demographics, Retention & Value

> **DEEP pillar of the TatvaCare OPD analytics spec.** The patient *panel* is the clinic's only compounding asset: every retained patient is revenue you don't have to re-acquire. This pillar turns the registration + appointment + consultation + billing trail into a single answer to *"who is my panel, are they coming back, and what are they worth?"* — for the doctor who owns it, the HoD who compares it, and the owner who monetizes it.

---

### Why this matters & to whom

- **P1 — Practicing Doctor (own panel).** "Is my book growing or just churning? Which of my patients haven't returned, and which are my most loyal/valuable so I protect them?" The doctor sees retention as *clinical follow-through* (did the diabetic come back in 90 days?) and as *personal income* (a returning patient is recurring fee + Rx + lab attach with zero acquisition cost). Retention is the single metric that most predicts a doctor's 12-month earnings.
- **P2 — Specialty/Department Admin (HoD).** "Which doctor in my department retains patients and which leaks them? Is the gap a clinical-quality problem (no follow-up advised) or an experience problem (long waits, no recall)?" The HoD uses doctor-to-doctor retention/LTV variance to coach, reallocate panel, and defend headcount.
- **P3 — Operational Admin / Owner (multi-specialty).** "What is the clinic-wide active panel, the new:returning balance, the 90-day return rate, and the LTV distribution? Where is the acquisition coming from and is it ABHA-compliant? Who are my top-200 patients I cannot afford to lose?" The owner runs the panel as a portfolio: acquisition spend, retention rate, value tiers, and recall ROI.

---

### Revenue & retention angle (concrete)

- **Retention is the highest-leverage revenue lever in OPD.** A 90-day return is a *guaranteed* repeat consult fee + a high-probability Rx (pharmacy attach) + likely investigation (lab attach). The "return within N days" and "time-between-visits" metrics here are literally a revenue forecast.
- **Leakage surfaced:** (1) **Follow-up advised but never returned** — reconcile `tcm_followup_date` advised against an actual subsequent appointment; each gap is a lost consult fee. (2) **Single-visit patients (one-and-done)** — acquired and abandoned; the largest silent leak. (3) **Active-but-unbilled** — finished visits (status 3) with no matching `tbl_opd_billing_overview` row = consults given away free. (4) **Lapsed high-value patients** — top-LTV patients past their expected return window = a recall list with a rupee figure attached.
- **Cross-sell is explicit:** the most-valuable-patient register joins panel × billing × Rx × lab so the owner can see attach rates (pharmacy/lab) on the patients worth defending, and target recall campaigns by value tier rather than blindly.

---

### KPI GROUPS

#### Group 1 — Panel Size & Composition (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Total panel (cumulative) | Distinct patients ever seen in scope | `COUNT(DISTINCT patient_unique_id)` over all appts/consults | patients |
| Active panel (rolling) | Patients with ≥1 visit in last N (90/180/365) days | `COUNT(DISTINCT pid WHERE lastVisit >= CURDATE()-N)` | patients |
| New patients (period) | Registered in window | `SUM(pm_created_date BETWEEN :s AND :e)` | patients |
| Returning patients (period) | Seen in window with prior history (>1 lifetime visit) | `SUM(visits > 1)` | patients |
| New : Returning ratio | Acquisition vs loyalty balance | `newPatients / returning` | ratio |
| Single-visit (one-and-done) share | Patients with exactly 1 lifetime visit | `COUNT(visits=1) / COUNT(*)` | % |
| Reactivated patients | Returned in window after >N-day dormancy | prior lastVisit older than N, new visit in window | patients |
| Panel growth rate | New minus churned, period over period | `(newPatients − lapsed) / priorActive` | % |

**Persona / Action / Lens:** P1 sees own-book trajectory; P3 sees clinic acquisition health. **Action:** if New:Returning skews high *and* single-visit share is high → acquisition is leaking out the back; fund retention/recall before more acquisition. **Lens:** Retention + Growth.
**Feasibility:** **Buildable now** — `patients.ts` already returns per-patient `visits / firstVisit / lastVisit` (`MIN/MAX` of `tbl_appointment_master.pam_app_date` ∪ `tbl_case_manager.tcm_datetime`) and computes new (`pm_created_date`) + returning (`visits>1`) + total. Active/rolling/reactivated/single-visit are simple windows on that same CTE. **Caveat (Needs profiling):** "New" currently keys on `tbl_patient_master.pm_created_date` (registration date, global, not scoped per-doctor). For *first-visit-in-scope* semantics, prefer the cohort definition in Group 4 (`MIN(visit date)` within the doctor/clinic) over registration date.

---

#### Group 2 — Acquisition Trend & Channel (P1/P3) (P0 trend, P1 channel)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| New-patient acquisition trend | First-ever-visit patients by day/week/month | `COUNT(DISTINCT pid) GROUP BY grain(firstVisit)` | patients/period |
| Acquisition by doctor | New patients attributed to first-seen doctor | first-visit `um_id` | patients |
| Acquisition by channel | New patients by booking source | join `tbl_appointment_source.tas_source` on first appt | patients |
| Channel mix of panel | Share of panel acquired per source | KEA / Agent / Portal / App / Create-screen | % |
| Acquisition cohort retention | % of each acquisition channel that returns ≥1x | cohort return rate by `tas_source` | % |

**Persona / Action / Lens:** P3 decides where acquisition spend works (which channel brings patients who *return*, not just book once); P1 sees own new-patient inflow. **Action:** kill channels with high acquisition but low cohort-return; double down on sticky channels. **Lens:** Growth + Retention + Revenue.
**Feasibility:** Acquisition trend/by-doctor = **Buildable now** (date grain on first-visit CTE). **Channel = Needs profiling + new wiring:** `tbl_appointment_source` (`pam_id`, `tas_source`, `tas_created_date`, ~4,608/26,836 rows ≈ **17% coverage, recent rows only**) is RELIABLE where present but **not in the column map and used by no builder** — add to `db-check.js` and join on `pam_id`. Report channel-attributed metrics with an explicit "covers X% of appointments" caveat; do not present channel as complete.

---

#### Group 3 — Retention, Return-Cadence & Churn (P0 — the heart of this pillar)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Return-within-N rate | % of patients with a 2nd visit ≤ N days of first (N=30/60/90) | `COUNT(2nd visit ≤ N) / COUNT(eligible)` | % |
| Follow-up return rate | % of *advised* follow-ups that produced a later visit | visits after `tcm_followup_date` ÷ advised | % |
| Follow-up adherence to date | Returned on/around the advised follow-up date | actual visit within ±window of `tcm_followup_date` | % |
| Median time-between-visits | Per-patient median inter-visit gap | median(Δ consecutive visit dates) | days |
| Repeat-visit cohort depth | Distribution of patients by lifetime visit count (1,2,3,4+) | `COUNT GROUP BY visits bucket` | patients |
| Repeat-visit rate | Patients with ≥2 visits ÷ panel | `COUNT(visits≥2)/COUNT(*)` | % |
| Churn / lapsed rate | Patients whose lastVisit is older than their expected cadence (or > N days) | `COUNT(lastVisit < CURDATE()-N) / active prior` | % |
| Recall candidates | Lapsed patients overdue vs expected return | overdue list (count + value) | patients |
| Retention by doctor | Return-within-90 rate per `um_id` | per-doctor return cohort | % |
| Retention by specialty | Return rate aggregated to department | roll up `um_id`→specialty | % |

**Persona / Action / Lens:** P1 — "which of *my* patients didn't come back when I told them to?" drives a personal recall list. P2 — doctor-vs-doctor return-within-90 variance is the cleanest coaching signal (is Dr. A's low retention clinical or experiential?). P3 — clinic 90-day return rate is the headline retention KPI and the input to LTV. **Action:** generate recall lists; coach low-retention doctors; quantify the follow-up leak in rupees. **Lens:** Retention + Clinical-quality + Revenue.
**Feasibility:** **Buildable now (derived).** All return/cadence/churn metrics are windowed self-joins on the existing per-patient visit CTE (visit dates from `tbl_appointment_master` ∪ `tbl_case_manager`) — **no new table needed**, but **no retention builder exists yet** (Master_Spec lists retention/churn as not-built). Follow-up return/adherence joins `tbl_case_manager.tcm_followup_date` (2,229 advised rows, RELIABLE) to the next actual visit. **Reconcile (per grounding cross-cutting note 4):** follow-up lives in *two* places — appointment-level case-type (`toct_id`→`tbl_opd_case_type.toct_type`) and consultation-level `tcm_followup_date`; spec the metric off `tcm_followup_date` (the advised date) and count the *return* off any subsequent appointment. **Caveat:** consult date vs appointment date can both represent a "visit" — define visit = finished appointment (`pam_status=3`) ∪ consultation, dedup per patient-day, before computing gaps.

---

#### Group 4 — Acquisition Cohorts & Cohort Retention Curves (P1/P3) (P1)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Acquisition cohort | Patients grouped by month of first visit | `cohort = DATE_FORMAT(MIN(visit),'%Y-%m')` | cohort |
| Cohort survival (M1…M12) | % of a cohort still active each month after acquisition | retained ÷ cohort size by month offset | % |
| Cohort avg visits | Mean lifetime visits per acquisition cohort | `AVG(visits)` per cohort | visits |
| Cohort avg LTV | Mean billed value per acquisition cohort | `AVG(patient billed)` per cohort | ₹ |
| Cohort by channel | Survival curves split by `tas_source` | cohort × channel | % |

**Persona / Action / Lens:** P3 — "are patients we acquire this year stickier than last year's?" (is retention improving?). P1 — cohort depth shows whether own panel compounds. **Action:** triangle/cohort heatmap exposes the exact month patients drop off → time recall campaigns. **Lens:** Retention + Growth + Revenue.
**Feasibility:** **Buildable now (derived)** for visit-based cohorts; cohort×channel = **Needs profiling** (`tbl_appointment_source` 17% coverage). No builder today.

---

#### Group 5 — Visit Frequency / RFM Value Tiers (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Recency | Days since last visit | `DATEDIFF(CURDATE(), lastVisit)` | days |
| Frequency | Lifetime (or 12-mo) visit count | `visits` | visits |
| Monetary | Lifetime billed value | `SUM(tobo_invoice_grand_total)` per patient | ₹ |
| RFM tier | Quintile/segment score on R+F+M | composite score → Champions / Loyal / At-Risk / Lapsed / New | tier |
| Value-tier panel mix | Share of panel in each tier | `COUNT GROUP BY tier` | % |
| Revenue concentration (Pareto) | % revenue from top-X% patients | cumulative ₹ vs cumulative patients | % |

**Persona / Action / Lens:** P3 — segment the whole panel into Champions/At-Risk/Lapsed to target retention spend by value, not volume; the Pareto curve sizes "how dependent am I on my top patients." P1 — see own Champions to protect and At-Risk to recall. **Action:** At-Risk-high-value = priority recall; Champions = loyalty/cross-sell. **Lens:** Revenue + Retention.
**Feasibility:** R + F = **Buildable now** (recency/frequency from visit CTE). M / RFM / Pareto = **Buildable now** but requires the **patient↔billing join**: `tbl_opd_billing_overview` carries `patient_unique_id` (confirmed in column map) → `SUM(tobo_invoice_grand_total) WHERE tobo_delete=0 AND tobo_invoice_cancel=0`. No RFM builder exists yet. **Caveat:** monetary requires billing coverage; flag patients with visits-but-no-bills (these distort M downward and are themselves a leakage signal — see Group 8).

---

#### Group 6 — Lifetime Value (LTV) & Most-Valuable-Patient Register (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Patient LTV (billed) | Lifetime billed value per patient | `SUM(tobo_invoice_grand_total)` (net of cancel/credit) | ₹ |
| LTV = visits × avg bill | Decomposed LTV | `visits × avg(invoice)` | ₹ |
| Avg revenue per patient (ARPP) | Panel mean | `total billed / panel` | ₹ |
| Avg revenue per visit | Per-encounter yield | `total billed / total visits` | ₹ |
| LTV distribution | Histogram / percentiles | p50/p90/p99 of patient LTV | ₹ |
| Pharmacy attach value | Lifetime pharmacy spend per patient | retail-sale service sums per `patient_unique_id` | ₹ |
| Lab/path attach value | Lifetime path spend per patient | `tbl_path_opd_billing_overview` per patient | ₹ |

**Persona / Action / Lens:** P3 — ranked **most-valuable-patients register** (top 200) is the do-not-lose list; LTV decomposition tells whether value comes from frequency (retention play) or ticket size (pricing/cross-sell play). P1/P2 — per-doctor LTV shows who grows high-value relationships. **Action:** protect/recall top-LTV; raise ARPP via documented cross-sell. **Lens:** Revenue + Retention.
**Feasibility:** **Buildable now (derived).** Patient×billing join confirmed (`patient_unique_id` on `tbl_opd_billing_overview`, `tbl_path_opd_billing_overview`, retail-sale service tables). Pharmacy attach via `tbl_bill_reatil_sale_service.patient_unique_id`. **Caveat — Needs profiling:** `tobo_balance` can be negative (advance held); use net `GREATEST` logic consistent with `financial.ts` (`collected = Σ(g−bal)`, never double-count advances). No LTV builder exists today.

---

#### Group 7 — Demographics & Geography (verify + flag gaps) (P0 age/gender, P2 rest)

| KPI | Definition | Formula | Unit | Data flag |
|---|---|---|---|---|
| Age-band mix | `<18 · 18-30 · 30-45 · 45-60 · >60` | `TIMESTAMPDIFF(YEAR, pm_dob, CURDATE())` banded | % | **RELIABLE** |
| Gender mix | Male/Female/Other | `GROUP BY pm_gender` | % | **RELIABLE** |
| Blood-group mix | Top-10 + Unknown | `GROUP BY pm_blood_group` | % | **SPARSE** (194/53,254 ≈ 0.4%) |
| City / region mix | Top-12 cities | `GROUP BY pm_city` | % | **SPARSE** (1,082/53,254 ≈ 2%) |
| State mix | `GROUP BY pm_state` | — | % | Present, thin |
| Area / locality | `pm_area` | — | % | **NOT-IN-DB (effective)** — 26 rows |
| Occupation | `pm_occupation` | — | % | **NOT-IN-DB (effective)** — 46 rows |
| Marital status | `pm_married_status` | — | % | **NOT-IN-DB (effective)** — 118 rows |
| Contactability | % panel with mobile/email | non-null `pm_contact_no`/`pm_email` | % | RELIABLE (mobile) |

**Persona / Action / Lens:** P3 — demographic mix informs service-line and marketing decisions; geography informs catchment/satellite-clinic strategy. P2 — demographic skew per department. **Action:** target campaigns by age/gender/city; *and* drive a data-quality push (see Gaps). **Lens:** Growth + Compliance(data quality).
**Feasibility:** Age/gender = **Buildable now** (already in `patients.ts`: `AGE_EXPR`, `AGE_BAND`, gender/blood/city blocks). **Honest gaps:** blood-group, city, state are present but thin — chart with explicit "% known" denominators. **`pm_area` / `pm_occupation` / `pm_married_status` are captured by the registration form (PatientForm.js) but land in `tbl_patient_master` at 26–118 of 53k rows → effectively NOT-IN-DB for analytics.** Do not build segmentation on them; surface as a data-completeness gap instead.

---

#### Group 8 — Engagement Extremes & Billing-Leakage Register (P1/P2/P3) (P0)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Most-visits patients | Top patients by lifetime visit count | rank by `visits` | patients |
| Most-cancellations patients | Top serial-cancellers | `COUNT(pam_status=4)` per patient | patients |
| Serial-canceller share | Patients with ≥X cancellations | threshold count | % |
| Active-but-unbilled | Finished visits with no matching bill | status-3 visits minus billed (per patient) | visits / ₹ est. |
| Lapsed high-value (recall ₹) | Top-LTV patients past expected return | overdue × ARPP | ₹ at risk |
| Advised-follow-up-no-return | Patients advised follow-up who never returned | `tcm_followup_date` set, no later visit | patients / ₹ |

**Persona / Action / Lens:** P1 — own no-return-after-advice list (clinical + revenue). P2 — which doctor's panel cancels most (scheduling/experience problem). P3 — the **leakage register**: every finished-but-unbilled consult and every lapsed high-value patient is recoverable rupees. **Action:** bill recovery on unbilled visits; recall on lapsed high-value; intervene on serial-cancellers (overbooking/reminders). **Lens:** Leakage + Revenue + Retention.
**Feasibility:** Most-visits/most-cancellations/serial-canceller = **Buildable now** (`footfall.ts` already produces `topBookers`/`topCancellers`/`serial-cancellers` — extend to patient-level register). Active-but-unbilled = **Buildable now (derived)**: anti-join finished `tbl_appointment_master` (status 3) against `tbl_opd_billing_overview` per `patient_unique_id`+date. Lapsed-high-value & no-return-after-advice = **Buildable now (derived)** combining Group 3 + Group 6 CTEs.

---

#### Group 9 — ABHA-Linked Share of Panel (P3 compliance, P1 awareness) (P1)

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| ABHA linkage rate | % panel with ABHA address | `COUNT(pm_abha_address<>'') / panel` | % |
| ABHA verified (KYC) rate | % linked that are verified | `COUNT(pm_abha_verify=1) / linked` | % |
| ABHA share of new patients | New-patient linkage rate (trend) | linked ÷ new, by period | % |
| ABHA linkage by doctor | Per-`um_id` linkage rate | per-doctor | % |
| ABHA-linked value share | Revenue from ABHA-linked vs not | billed split | ₹ / % |

**Persona / Action / Lens:** P3 — ABDM compliance posture + a digitization-incentive lever (this is the India-specific differentiator absent from all 6 reference dashboards). P2 — which doctor's front-desk links ABHA. **Action:** set a linkage target, drive front-desk behavior; tie linked-patient revenue to digitization ROI. **Lens:** Compliance + Growth.
**Feasibility:** Rate/verified/by-doctor = **Buildable now** (`tbl_patient_master.pm_abha_address`, `pm_abha_verify` confirmed in column map; `operational/abha` builder already computes linkage+KYC+register). ABHA-of-new trend = Buildable now (cross with `pm_created_date`). **NOT-IN-DB / SPARSE:** ABHA *link-timestamp/stage* (created-vs-verified velocity) lives in `tbl_abha_hip_link_master`/`tbl_patient_abha_with_hospital` at 8–70 rows → cannot trend link velocity reliably; restrict to the boolean linked/verified semantics.

---

### Breakdowns / dimensions
Apply across groups: **doctor (`um_id`)** · **specialty/department** · **care-setting = OPD (scope)** · **time grain (day/week/month/quarter)** · **acquisition channel (`tas_source`, 17%)** · **age band** · **gender** · **city/region** · **new vs returning** · **RFM/value tier** · **visit-count cohort** · **acquisition-month cohort** · **ABHA-linked vs not** · **walk-in vs booked vs video** (`pam_appointment_type`/`pam_status_type_appointment`).

### Drill-down registers (row-level + CSV/Excel export)
1. **Patient panel register** — name, gender, age, mobile, city, registered, visits, firstVisit, lastVisit, recency, RFM tier, LTV, ABHA status (extends existing `patients.ts` register; honors all filters).
2. **Most-valuable-patients register** (top-N by LTV) — + visits, avg bill, pharmacy attach ₹, lab attach ₹, last visit, recall flag.
3. **Recall / lapsed register** — overdue patients past expected cadence, sorted by value-at-risk; one-click downloadable call list.
4. **Advised-follow-up-no-return register** — patient, advising doctor, advised date, days overdue, est. lost fee.
5. **Serial-canceller register** — patient, cancel count, last cancel, doctor.
6. **Active-but-unbilled register** — finished visit, doctor, date, no-bill flag (leakage recovery worklist).

### Recommended visualizations (metric → chart)
- Panel size / active panel / new vs returning → **KPI cards with delta-vs-prior tag** (R2 pattern).
- Acquisition trend → **line** (new patients/week); split by channel → **stacked area**.
- Return-within-N & repeat-visit cohort depth → **bar** (visit-count buckets) + **funnel** (visit1→2→3→4+).
- Cohort retention → **triangle/cohort heatmap** (acquisition month × months-since).
- Time-between-visits → **histogram** + median marker.
- RFM tiers → **segment treemap or ranked bars** (avoid pie >5 slices, per reference pitfall).
- LTV distribution → **histogram with p50/p90/p99**; revenue concentration → **Pareto (cumulative line + bars)**.
- Demographics → **age grouped bars, gender donut, city ranked bars** (label "% known").
- Retention/LTV by doctor → **Top-N leaderboard with secondary quality metric** (R3 pattern: volume bar + return-rate %).
- ABHA linkage → **gauge + trend line** (semantic color; linkage rising = green).
- Engagement extremes → **ranked bars** (most-visits green-theme, most-cancellations red-theme; pair sign/icon, not color alone).

### Behavioral analysis (doctor-to-doctor / cohort variation)
- **Retention variance by doctor** (return-within-90) is the flagship coaching signal for P2: normalize by case-mix and panel age before ranking. Pair each doctor's volume bar with their return-rate % (R3 leaderboard).
- **Follow-up-advice → return conversion by doctor:** does a doctor who *advises* follow-ups actually get patients back? Separates "documents well" from "retains well."
- **LTV-per-patient by doctor:** decompose into frequency vs ticket — identifies relationship-builders vs high-ticket-single-visit doctors.
- **Cohort-over-cohort retention** at clinic level: is this year's acquisition stickier than last year's (proxy for experience/quality improvement)?

### Cross-domain / cross-sell connections (explicit revenue)
- **Panel × Billing** → LTV, ARPP, RFM monetary, revenue concentration (Group 5/6).
- **Panel × Rx (`tbl_medicine_report`)** → pharmacy attach rate per value tier → target pharmacy cross-sell at Champions/Loyal.
- **Panel × Lab (`tbl_case_manager.tcm_investigation` / `tbl_path_opd_billing_overview`)** → lab attach value per patient → lab tie-up ROI; top investigations on top patients = packaging opportunity.
- **Retention × Follow-up (`tcm_followup_date`)** → the advised-but-no-return list is a quantified recall pipeline.
- **Acquisition channel × cohort LTV** → spend allocation to the channel that delivers high-LTV, high-retention patients.
- **ABHA-linked × LTV** → does digitization correlate with higher-value/stickier patients (digitization ROI narrative for P3).

### Gaps surfaced & recommended actions
1. **No retention/RFM/LTV/cohort builder exists** (Master_Spec lists retention/churn as not-built). **Action:** build a single `retention.ts`/`value.ts` builder over the existing per-patient visit CTE + patient↔billing join — *all derivable from current tables, no new service.* Highest-ROI gap to close in this pillar.
2. **Acquisition channel is only ~17% covered** (`tbl_appointment_source`, unused, not in `db-check.js`). **Action:** add to the column map, wire it, and always present channel metrics with a coverage caveat; push the write-path to populate source on all bookings.
3. **Demographics gaps:** `pm_area`/`pm_occupation`/`pm_married_status` captured at registration but near-empty (26–118/53k). **Action:** do **not** build segmentation on them; instead surface a *registration-completeness* KPI to drive front-desk data capture.
4. **Blood-group/city/state thin** (0.4–2%). **Action:** show with "% known" denominators; never imply full-panel coverage.
5. **"New patient" keyed on `pm_created_date`** (global registration, not in-scope first visit). **Action:** for doctor/specialty-scoped acquisition, switch to `MIN(visit date)` within scope.
6. **ABHA link velocity/stage NOT trendable** (timestamp tables 8–70 rows). **Action:** restrict ABHA metrics to boolean linked/verified.
7. **`pam_type` (New/Old, 26k rows, RELIABLE) is unused** — a clean clinic-captured new-vs-returning signal sitting idle. **Action:** validate it against the derived visit-count definition; if consistent, use as a corroborating column.
8. **Active-but-unbilled leakage has no report** despite all data present. **Action:** ship the anti-join leakage register — direct rupee recovery.

### Sample questions this pillar answers
1. How many patients are in my active panel right now, and is it growing or shrinking vs last quarter?
2. What share of new patients return within 90 days — and how does that vary doctor-to-doctor?
3. Which of my top-50 highest-LTV patients are overdue for a visit, and how much revenue is at risk?
4. Of the follow-ups I advised last quarter, what % actually came back — and what fee did the no-shows cost?
5. Which acquisition channel brings patients who *return*, not just book once?
6. What is my one-and-done rate, and which doctors leak the most single-visit patients?
7. How concentrated is my revenue — what % comes from my top 10% of patients?
8. What's the median time between visits for chronic patients, and who's overdue against it?
9. What share of my panel is ABHA-linked and KYC-verified, and is the new-patient linkage rate improving?
10. How many finished consults last month were never billed, and which patients/doctors?

### Priority summary
| Group | Priority | Rationale |
|---|---|---|
| 1 Panel Size & Composition | **P0** | Foundational; mostly built in `patients.ts`. Fast win. |
| 2 Acquisition Trend & Channel | **P0 trend / P1 channel** | Trend buildable now; channel gated by 17% coverage. |
| 3 Retention, Cadence & Churn | **P0** | The revenue heart of the pillar; derivable now, not yet built. |
| 4 Cohorts & Retention Curves | **P1** | High insight, needs cohort builder; channel split partial. |
| 5 RFM Value Tiers | **P0** | Segments the whole panel for targeted retention spend. |
| 6 LTV & Most-Valuable Register | **P0** | The do-not-lose list; direct revenue prioritization. |
| 7 Demographics & Geography | **P0 (age/gender) / P2 (rest)** | Age/gender built; rest honestly gap-flagged. |
| 8 Engagement Extremes & Leakage | **P0** | Direct rupee recovery (unbilled, lapsed-high-value, no-return). |
| 9 ABHA-Linked Share | **P1** | Compliance differentiator; built for boolean, not velocity. |

> **Build note:** Groups 1, 7 (age/gender), 8 (extremes) and 9 reuse `patients.ts`/`footfall.ts`/`operational.abha` directly. Groups 3, 4, 5, 6 and the leakage registers in 8 are all **derivable from existing `tatva_clinic` tables** (visit CTE + `patient_unique_id`↔`tbl_opd_billing_overview` join) and warrant a dedicated `retention.ts`/`patient-value.ts` builder — the single highest-leverage unbuilt capability in the OPD analytics surface.

---

## Prescriptions / RxPAD — Internals, Consult Mode & Behavioral

*OPD-only. DB = `tatva_clinic` (MySQL, read-only). All feasibility flags below are verified against the live DB on 2026-06-09 and against the shipped builders (`drug.ts`, `quality.ts`, `diagnosis.ts`, `lab.ts`, `consultations.ts`).*

---

### Why this matters & to whom

The Rx PAD is the single highest-signal artifact in the EMR: every finished OPD visit funnels through one consolidated `addCaseManager` save (`HeaderPrescription.js`), regardless of capture mode (in-clinic one-click, VoiceRx, SmartSync, SnapRx/Tab-Rx, walk-in). What a doctor *writes* — which medicines, how many, generic vs branded, which diagnoses, which investigations, whether they advise follow-up — is simultaneously a **clinical-quality signal**, a **productivity signal**, and the **single largest revenue lever** in the clinic (every drug line is a pharmacy attach opportunity; every investigation line is a lab attach opportunity).

- **P1 Practicing Doctor (own panel):** "Am I prescribing rationally and completely? Where is my own documentation thin (no advice, no follow-up), and where am I leaking my own revenue (drugs I write but the patient fills elsewhere)?" Drives self-correction on completeness, polypharmacy, generic adherence, follow-up discipline.
- **P2 Specialty/Department Admin (HoD):** "Within my department, which doctors prescribe 8 drugs when peers prescribe 3? Who never records a generic? Who never advises a follow-up? Who under-documents?" Drives doctor-vs-doctor coaching, formulary/protocol enforcement, identifying outliers.
- **P3 Operational Admin / Owner (multi-specialty):** "Clinic-wide, what is my Rx → pharmacy and Rx → lab capture rate? How many finished visits produced an Rx at all (documentation completeness = ABDM/digitization compliance)? Which drug volumes justify deeper distributor terms?" Drives cross-sell capture, compliance, and procurement leverage.

---

### Revenue & retention angle (concrete; leakage surfaced)

- **Pharmacy attach leakage (the headline number).** `tbl_medicine_report` carries **20,991 prescribed drug lines** (95% with generic name, 87% with manufacturer). The clinic's own pharmacy sales sit in `tbl_bill_retail_sale_master`/`tbl_bill_reatil_sale_service` (the `operational/pharmacy` builder). Joining *what was prescribed* to *what was dispensed in-house* (by patient + date) surfaces **prescribed-but-not-filled-here** = direct, recoverable pharmacy revenue. This join is not built today and is the single biggest cross-sell opportunity in the pillar.
- **Lab attach leakage.** `tbl_case_manager.tcm_investigation` (CSV, 3,098 rows populated) lists ordered investigations; in-house pathology revenue is in `tbl_path_*_billing_overview` (the `operational/pathology` builder). Ordered-vs-fulfilled by patient/date = lab leakage. Top ordered tests also feed a **lab tie-up / panel-pricing** decision (P3).
- **Procurement leverage (retention of margin).** Top drugs (`tbl_medicine_master.tmm_medicine_name`) and top manufacturers (`tmm_company`) by volume tell P3 which SKUs justify better distributor terms — pure margin retention, no clinical change required.
- **Documentation completeness = compliance + retention.** A finished appointment (status 3) with no Rx row, no diagnosis, no advice is both a digitization-compliance gap and a patient-experience gap (no take-home record → lower return). Completeness is a retention lever, not just a hygiene metric.
- **Follow-up advice → revisit revenue.** `tcm_followup_date` (2,229 set) is the leading indicator of the next billable visit; doctors who never advise follow-up structurally suppress their own repeat revenue (ties to the Follow-ups pillar).

---

### KPI groups

#### Group 1 — Rx Volume & Reach `[P0]`

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Total Rx (prescriptions issued) | Distinct consultations that produced a clinical record | `COUNT(DISTINCT tcm_id)` on `tbl_case_manager WHERE tcm_del=0` | count |
| Rx-bearing rate of finished visits | Finished appts that produced any Rx artifact | finished consults ÷ `pam_status=3` appts | % |
| Drug lines prescribed | Total medication lines written | `COUNT(*)` `tbl_medicine_report` | count |
| Patients prescribed to | Distinct patients with ≥1 drug line | `COUNT(DISTINCT patient_unique_id)` | count |
| Distinct drugs in formulary use | Unique molecules/brands written | `COUNT(DISTINCT tmm_id)` (1,021 live) | count |
| Avg drug lines per Rx | Polypharmacy proxy | drug lines ÷ `COUNT(DISTINCT tcm_id)` | lines/Rx |

**Persona / Action / Lens:** P3 sizes the prescribing footprint (procurement + compliance baseline); P1 sees own volume vs panel. **Lens: Productivity, Compliance.**
**Feasibility:** **Buildable now** — `tbl_medicine_report` (20,991 rows; `tcm_id` 100% filled, `pam_id` 81% filled), `tbl_case_manager`. Already partially in `drug.ts`/`quality.ts`.

---

#### Group 2 — Component Fill-Rate / Rx Completeness `[P0]`

This is the "what does each Rx actually capture" group. **Critical reality:** OPD Rx components are NOT stored in clean normalized per-component tables. Some live in dedicated child tables (reliable); others live as **inline blobs/CSV on `tbl_case_manager`** and are sparse; two briefed components have **no backing data at all**.

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| % Rx with medications | Consults with ≥1 drug line | consults in `tbl_medicine_report` ÷ all consults | % |
| % Rx with diagnosis | Consults with ≥1 diagnosis | distinct `tcm`/patient in `tbl_casemanager_diagnosis` ÷ consults | % |
| % Rx with investigations (lab tests) | Consults with non-empty `tcm_investigation` | 3,098 ÷ 38,224 ≈ **8.1%** | % |
| % Rx with advice | Non-empty `tcm_advice` blob | 2,500 ÷ 38,224 ≈ **6.5%** | % |
| % Rx with examination | Non-empty `tcm_examination_box` blob | 3,374 ÷ 38,224 ≈ **8.8%** | % |
| % Rx with follow-up advised | `tcm_followup_date >= '2000-01-01'` | 2,229 ÷ 38,224 ≈ **5.8%** | % |
| % Rx with medical history | Non-empty `tcm_mh_json` | 338 ÷ 38,224 | % |
| Avg diagnoses per Rx | Diagnosis lines ÷ consults | `COUNT * / COUNT(DISTINCT consult)` | dx/Rx |
| Avg investigations per Rx | CSV-split count ÷ consults | JS split of `tcm_investigation` | tests/Rx |
| Avg meds per Rx | (see Group 1) | — | lines/Rx |

**Persona / Action / Lens:** P1 sees own completeness gaps ("I record meds but rarely advice/follow-up"); P2 ranks doctors by completeness to coach; P3 reads completeness as a digitization/ABDM-readiness compliance number. **Lens: Clinical-quality, Compliance, Retention.**
**Feasibility — mixed, flagged honestly:**
- Medications: **Buildable now** (`tbl_medicine_report`).
- Diagnosis: **Buildable now** — `tbl_casemanager_diagnosis` (104,548 rows; ICD on 51%).
- Investigations: **Needs profiling** — `tcm_investigation` is **FREE-TEXT-MESSY CSV**, split in JS (lab.ts already does this, flagged); only ~8% of consults populated.
- Examination / Advice / Medical-history: **Buildable-as-presence-flag only** — these are inline blobs (`tcm_examination_box`, `tcm_advice`, `tcm_mh_json`), good for a *fill-rate* metric but **not** for structured content analytics. Per-patient examination/advice *registers* are **Not in DB** (`tbl_outpatient_examination_master`/`tbl_outpatient_advice_master` are template catalogs, not patient records).
- **Symptoms: Not in DB** for per-patient prevalence — symptom fields are not on the consultation row; true symptom data is in a separate symptoms microservice. The shipped `clinical/symptoms` builder only reflects template-level `tmoc_symptoms`. **Symptom fill-rate is not computable from `tatva_clinic`.**
- **Procedures: Not in DB (OPD).** Verified: `tbl_casemanager_surgery` **does not exist**; the only procedure table `tbl_inpatient_doctor_procedure` (46 rows) is IPD. The Rx pad's `surgeries[]` array has no OPD landing table. **Procedures-per-Rx is not buildable for OPD.**
- **Custom modules per-Rx: Not in DB** (see Group 5).

> **GAP to flag loudly:** the *displayed* fill-rates (~6–9% for advice/follow-up/investigation/examination) almost certainly reflect **storage location, not clinician behavior** — the richer content for VoiceRx/SmartSync/SnapRx flows may be materialized into child tables (meds, diagnosis) while the inline `tcm_*` blobs are only populated by the legacy "old" UI path. **Do not publish raw inline-blob fill-rates as "doctor X never gives advice" without confirming the write path per mode.** Frame examination/advice/MH as "structured-capture coverage," with a `meta.note`.

---

#### Group 3 — Generic vs Branded & Drug Mix `[P0]`

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Generic-recorded rate | Lines with a generic name captured | `SUM(tmm_generic<>'') / COUNT(*)` ≈ **95%** | % |
| Brand-only lines | Lines with no generic captured | `COUNT(*) − generic` | count |
| Manufacturer-attribution rate | Lines with `tmm_company` | ≈ **87%** | % |
| Top drugs (brand) | Ranked by line count | `GROUP BY tmm_medicine_name` (via `tbl_medicine_master`) | rank |
| Top generics (molecules) | Ranked by line count | `GROUP BY tmm_generic` | rank |
| Top manufacturers | Ranked by line count | `GROUP BY tmm_company` | rank |
| Polypharmacy rate | Consults with ≥5 drug lines ÷ consults | verified: large tail (5→175, 6→246, 10→55, 15→16 consults) | % |

**Persona / Action / Lens:** P1 self-audits rational prescribing; P2 enforces formulary/generic policy across the department; P3 uses top-drug/top-manufacturer volume for **procurement negotiation** and pharmacy stocking. **Lens: Clinical-quality, Revenue (procurement), Leakage.**
**Feasibility:** **Buildable now** — all in `tbl_medicine_report` + `tbl_medicine_master`. `drug.ts`/`quality.ts` already compute generic rate, manufacturer mix, top drugs, and avg-drugs/consult. Polypharmacy distribution verified queryable.
**Nuance:** "generic rate" here means *generic-name-recorded* (95%), NOT *generic-substitution-prescribed*. The DB cannot distinguish "wrote the generic molecule" from "wrote a branded generic and the field auto-filled." **Label it "generic captured," not "generic prescribed."**

---

#### Group 4 — Consult Mode (documentation channel) `[P1 — feasibility-constrained]`

The brief asks for share/trend/adoption of in-clinic / VoiceRx / SmartSync / Consult. **Hard truth, verified:** there is **no consult-mode/product-mode column** on `tbl_case_manager`. The mode-ish columns that exist are `case_consultation_type` (free-text: 'First Consultation' 22,251 / NULL 14,066 / junk), `oneclick_cosultation_template_id`, `abha_context_link`, `tcm_tmm_template_id` — none label VoiceRx/SmartSync/Consult. The `addCaseManager` payload itself carries `ui_version` and `useVoiceRx` flags but **these are not persisted to `tatva_clinic`** (no such columns exist).

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| In-clinic vs video vs walk-in share | Channel mix of consults | join consult/Rx → appt `pam_status_type_appointment IN(1,2)` (video/tele), `pam_appointment_type='Walk'` | % |
| Video/tele consult trend | Video share over time | weekly `pam_status_type_appointment` mix | % / trend |
| Channel mix by doctor / specialty | Per-doctor video vs in-clinic | group by `um_id` | % |
| WhatsApp-share signal | Rx shared via WhatsApp | `tbl_case_manager_ip_logs.whatsapp_flag` (1=13,712) | count |

**Persona / Action / Lens:** P3 tracks digital-consult adoption (the TatvaCare wedge); P2 sees which doctors embrace tele. **Lens: Capacity, Compliance/Adoption.**
**Feasibility:**
- In-clinic/video/walk-in mode: **Buildable now (derived join)** — verified the meds→appointment join works (9,740 in-clinic Appointment, 6,503 Walk, 314 video, 88 tele). This is the *appointment* channel, mapped onto the consultation. Already partly in `operational/consultation-channel`.
- **VoiceRx / SmartSync / Consult / SnapRx product-mode adoption: Needs other service.** These are NOT distinguishable in `tatva_clinic`. VoiceRx writes audio to the `rx_digitization` service (`/api/v1/digitization/voice/*`); SmartSync to `digitization_api_url`; SnapRx undigitized list to `snap_rx_api_url`. **Mode-of-documentation adoption requires reading those services' own stores** — it is the `engagement/*` builder that currently throws `NotImplementedException`. This is the explicit feasibility caveat the brief asked for: **consult-mode product adoption is NOT in the analytics DB and must be sourced from the digitization/voice microservices.**

---

#### Group 5 — Custom Modules `[P2 — feasibility-constrained]`

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Custom modules defined | Configured custom sections | `COUNT(*) tbl_case_custom_option` = **213** (111 distinct names, 1 business) | count |
| Custom modules created (last 30d) | New definitions by window | `tcco_created_by` + (created-date if present) | count |
| Custom modules *used* (per-patient) | Times a custom section was filled on an Rx | **— no backing table** | — |
| Module usage by doctor | Who fills which module | **— no backing table** | — |

**Persona / Action / Lens:** P2/P3 would want to know which bespoke sections doctors actually use vs abandon (kill dead templates, scale popular ones). **Lens: Productivity, Product-adoption.**
**Feasibility — verify result, as the brief demanded:**
- Definition counts: **Buildable now but config-only** — `tbl_case_custom_option` (213 rows). Note it is single-business in this DB.
- **Per-patient custom-module USAGE: Not in DB.** Verified — the `addCaseManager` payload's `moduleContents[]` rides into the consultation but **no per-patient module-value table exists** in `tatva_clinic` (searched `%custom%/%dynamic%/%module%`: only `tbl_case_custom_option` config-213, `tbl_module_master` config-18, `tbl_hospital_module_user_type` config-6). **#used / by-whom is not computable.** Module instance content is written by the `vaccination_api_url /dynamicmodules/*` service and not materialized here.
- **Template-vs-free-text reliance: effectively Not in DB.** `oneclick_cosultation_template_id` exists but is populated on only **13 of 38,224 rows**; `tcm_tmm_template_id` on 2. So "template adoption" is *not* meaningfully measurable from these columns despite their existence — flag as near-empty, not buildable.

---

#### Group 6 — Behavioral / Doctor-to-Doctor Variation `[P1]`

This is the highest-value analytical group for P2. It treats the Rx as a behavioral fingerprint and compares doctors against their peer cohort.

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Generic-capture rate by doctor | Per-`um_id` generic share | `SUM(tmm_generic<>'')/COUNT(*)` group by `um_id` (HAVING ≥5) | % |
| Meds-per-visit by doctor | Polypharmacy fingerprint | drug lines ÷ distinct consults, per doctor | lines/visit |
| Diagnoses-per-visit by doctor | Documentation depth | dx lines ÷ consults, per doctor | dx/visit |
| Tests-per-visit by doctor | Investigation-ordering intensity | CSV-split `tcm_investigation` ÷ consults, per doctor | tests/visit |
| Polypharmacy outlier flag | Doctors >cohort-mean + Nσ on meds/visit | statistical vs specialty peers | flag |
| Follow-up-advice rate by doctor | `tcm_followup_date` set ÷ own consults | per `um_id` | % |
| Completeness score by doctor | Composite of Group-2 fill-rates | weighted % | index |
| Antibiotic rate by doctor | Antibiotic lines ÷ total lines | **needs drug-class mapping** | % |

**Persona / Action / Lens:** P2 runs the doctor-vs-doctor leaderboard (the R3 reference pattern: volume bar + quality metric beside it) to find the over-prescriber, the never-records-generic doctor, the never-advises-follow-up doctor → targeted coaching. P1 sees own position vs anonymized peer band. **Lens: Clinical-quality, Behavioral, Capacity.**
**Feasibility:**
- Generic / meds-per-visit / dx-per-visit / tests-per-visit / follow-up-rate by doctor: **Buildable now** — `tbl_medicine_report.um_id`, `tbl_casemanager_diagnosis.um_id`, `tbl_case_manager.um_id` + `tbl_user_master.um_name`. `quality.ts` already does per-doctor generic rate.
- **Antibiotic / drug-class rate: Needs profiling** — requires a molecule→ATC/therapeutic-class mapping. `tmm_generic` is a free-text molecule string with no class column; building antibiotic rate needs a curated dictionary (one-time profiling effort against the 1,021 distinct molecules).
- Template-vs-free-text reliance by doctor: **Not in DB** (per Group 5 — columns near-empty).

---

#### Group 7 — Rx → Revenue Cross-Sell (Pharmacy & Lab Attach) `[P0 — revenue]`

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Pharmacy attach rate | Patients prescribed who filled in-house | matched (patient+date) pharmacy sales ÷ patients prescribed | % |
| Pharmacy leakage (₹ est.) | Prescribed lines with no matching in-house sale | unmatched lines × est. value | ₹ |
| Lab attach rate | Patients with investigation order who paid in-house | matched path bills ÷ patients with `tcm_investigation` | % |
| Lab leakage | Ordered tests with no matching path bill | unmatched orders | count / ₹ |
| Under-billed finished Rx | Finished visits with Rx but no/low bill | `pam_status=3` ∧ has Rx ∧ no `tbl_opd_billing_overview` row | count / ₹ |
| Top-drug → distributor-leverage list | High-volume SKUs for procurement | top `tmm_id` by line count | rank |

**Persona / Action / Lens:** P3 quantifies recoverable cross-sell and procurement leverage; P1 sees own leakage (drugs I write that walk out the door). **Lens: Revenue, Leakage.**
**Feasibility:** **Buildable now (cross-domain join), not yet built.** Prescribed = `tbl_medicine_report`; in-house pharmacy = `tbl_bill_retail_sale_master`/`tbl_bill_reatil_sale_service` (pharmacy builder); lab orders = `tcm_investigation`; in-house path = `tbl_path_*_billing_overview` (pathology builder); under-billing = `tbl_appointment_master pam_status=3` ⋈ `tbl_opd_billing_overview`. **Caveat:** matching is patient+date heuristic (no order_id→bill_line FK), so attach rates are *estimates* — label as directional. `tbl_medicine_report` has no price column, so ₹ leakage needs a price source (`tbl_medicine_master`/pharmacy item master) — **Needs profiling** for the ₹ figure; the *count/rate* is buildable now.

---

### Breakdowns / dimensions

- **Time:** day / week / month (`tcm_datetime`); period-over-period delta (R2 card pattern).
- **Doctor (`um_id` → `tbl_user_master.um_name`)** and **Specialty/Department** — the core behavioral axis.
- **Channel/mode:** in-clinic / video / tele / walk-in (derived appointment join); product-mode (VoiceRx/SmartSync) only via external service.
- **Drug axis:** brand (`tmm_medicine_name`), molecule (`tmm_generic`), manufacturer (`tmm_company`), type (`tmr_type`: M=20,791 / P=104 / G=95).
- **Patient demographics:** age band (`<18·18-30·30-45·45-60·>60`), gender (`tbl_patient_master`) — for prescribing-by-cohort.
- **Visit type:** `toct_id → tbl_opd_case_type.toct_type` (New/Follow-up).
- **Polypharmacy buckets:** 1, 2, 3–4, 5–7, 8+ drug lines per Rx.

---

### Drill-down registers (row-level + download)

1. **Prescription line register** — date, UHID, patient, doctor, drug (brand), generic, manufacturer, dose (`tmr_tmm_dose`), type. (`drug.ts` already returns 5,000 rows.) Download CSV.
2. **Incomplete-Rx register** — finished consults missing diagnosis / advice / follow-up; for P1 self-cleanup and P2 coaching.
3. **Polypharmacy register** — consults with ≥8 drug lines: date, doctor, patient, drug list — for clinical review.
4. **Pharmacy-leakage register** — prescribed lines with no in-house pharmacy match: patient, drug, doctor, est. value.
5. **Lab-leakage register** — patients with `tcm_investigation` orders and no in-house path bill.
6. **Doctor behavioral scorecard** — one row per doctor: Rx volume, meds/visit, dx/visit, tests/visit, generic %, follow-up %, completeness index, with cohort percentile.

---

### Recommended visualizations

| Metric | Chart |
|---|---|
| Component fill-rate (Group 2) | Horizontal ranked bar (one bar per component, % of Rx) — instantly shows the weak sections |
| Generic vs branded | Paired big-number / donut (≤2 slices) |
| Top drugs / generics / manufacturers | Ranked horizontal bars (not pie — >5 slices) |
| Polypharmacy distribution | Histogram (drug-lines-per-Rx) |
| Rx volume trend | Line, weekly/monthly, with prev-period delta tag |
| Doctor behavioral comparison | **Leaderboard (R3 pattern): volume bar + secondary quality metric (generic % / follow-up %) beside it**; outliers flagged red |
| Meds/visit vs generic% by doctor | Scatter (intensity vs rationality), peer-band shaded |
| Consult-mode share | Stacked bar over time (in-clinic / video / tele / walk-in) |
| Pharmacy & lab attach rate | Gauge / paired big-number (attach % + ₹ leakage) |
| KPI hero strip | Value + semantic delta tag + "vs previous period" — **invert color for polypharmacy (red-up)** |

---

### Behavioral analysis (doctor-to-doctor / cohort variation)

The behavioral lens (Group 6) is where this pillar earns its keep for P2. Compute, per doctor (HAVING ≥5 Rx, like `quality.ts`), within-specialty: meds/visit, generic-capture %, dx/visit, tests/visit, follow-up-advice %. Then express each as a **deviation from the specialty-peer mean** so a GP isn't compared to a surgeon. Flag statistical outliers (over-prescriber, never-generic, never-follow-up, low-completeness). This is real and buildable from `um_id` joins today — the only behavioral metric that is *not* buildable is antibiotic-stewardship (needs a drug-class dictionary) and template-reliance (column near-empty).

---

### Cross-domain / cross-sell connections

- **→ Pharmacy pillar:** top drugs & manufacturers → stocking + procurement; prescribed-vs-dispensed → attach/leakage (Group 7).
- **→ Pathology/Lab pillar:** top ordered investigations → lab panel pricing + tie-up; ordered-vs-fulfilled → lab leakage.
- **→ Diagnosis pillar:** top diagnoses paired with their typical drug/test bundle → protocol templates + bundle pricing.
- **→ Follow-up pillar:** `tcm_followup_date` advice rate by doctor → revisit-revenue forecasting.
- **→ Billing pillar:** finished-Rx-without-bill → under-billing leakage; Rx line count vs bill line count → consistency audit.
- **→ Compliance/ABHA pillar:** Rx completeness = e-prescription/digitization readiness; `abha_context_link` on the consult ties the Rx to the ABDM health record.

---

### Gaps surfaced & recommended actions

1. **Consult-mode product adoption is invisible in `tatva_clinic`.** *Action:* build the stubbed `engagement/*` endpoint to read the VoiceRx/SmartSync/SnapRx services; this is the only way to report VoiceRx adoption (the explicit TatvaCare differentiator).
2. **Custom-module usage has no per-patient table.** *Action:* if module-usage analytics matter, the `dynamicmodules` service must materialize instance content into `tatva_clinic`, or expose its own aggregate read. Today only the 213 definitions are countable.
3. **Inline `tcm_*` component fill-rates (advice 6.5%, exam 8.8%, follow-up 5.8%) are storage-path artifacts, not pure behavior.** *Action:* confirm which capture modes write to inline blobs vs child tables before publishing per-doctor completeness, and prefer child-table-backed components (meds, diagnosis) for behavioral judgments.
4. **`oneclick_cosultation_template_id` is near-empty (13/38,224).** *Action:* drop template-vs-free-text reliance from the build unless the digitization services expose it; the column cannot support it.
5. **No drug-class / ATC mapping.** *Action:* one-time profiling of the 1,021 distinct molecules to enable antibiotic-stewardship and class-mix analytics.
6. **No price on `tbl_medicine_report`.** *Action:* join an item-price source to convert leakage counts into ₹.
7. **Symptoms & OPD procedures have no backing data.** *Action:* mark both as out-of-scope for Rx-internals analytics until the symptoms microservice is connected; procedures are IPD-only (`tbl_casemanager_surgery` does not exist).
8. **Generic metric semantics.** *Action:* relabel "generic rate" → "generic-name-captured rate" everywhere to avoid overclaiming substitution behavior.

---

### Sample questions

1. (P3) What share of finished OPD visits actually produced a prescription, and which doctors leave finished visits with no Rx record?
2. (P3) Of everything we prescribed last month, what % was filled at our own pharmacy — and what's the rupee value walking out the door?
3. (P2) Within Internal Medicine, which doctor prescribes the most drugs per visit, and is that doctor also the lowest on generic capture?
4. (P1) On what fraction of my visits do I advise a follow-up versus my anonymized specialty peers?
5. (P2) Which doctors order the most investigations per visit, and how many of those orders are fulfilled in our lab?
6. (P3) What are my top 10 drugs and top 5 manufacturers by volume this quarter (for distributor negotiation)?
7. (P1) What's my polypharmacy rate — how often do I write 5+ medicines on one Rx?
8. (P3) How many consultations were video/tele vs in-clinic vs walk-in, and is tele adoption trending up?
9. (P2) Rank my department's doctors by a documentation-completeness index (meds + diagnosis + advice + follow-up captured).
10. (P3) Which finished, prescribed visits have no bill attached (under-billing leakage)?

---

### Priority summary

| Group | Priority | Rationale |
|---|---|---|
| 1. Rx Volume & Reach | **P0** | Foundational; fully buildable; baseline for everything |
| 2. Component Fill-Rate / Completeness | **P0** | Compliance + clinical-quality headline; mostly buildable, blob caveats flagged |
| 3. Generic vs Branded & Drug Mix | **P0** | Procurement revenue + quality; already half-built, highest data quality (95/87%) |
| 4. Consult Mode | **P1** | High strategic value (VoiceRx wedge) but product-mode needs external service |
| 5. Custom Modules | **P2** | Per-patient usage Not-in-DB; only config counts buildable — low ROI until service exposes data |
| 6. Behavioral / Doctor-to-Doctor | **P1** | Biggest P2 value; buildable now except antibiotic-class & template-reliance |
| 7. Rx → Revenue Cross-Sell | **P0** | Largest concrete revenue/leakage lever; cross-domain join buildable now, ₹ needs price source |

**Verified-against-live-DB facts feeding this pillar (2026-06-09):** `tbl_medicine_report` = 20,991 lines, `tcm_id` 100% / `pam_id` 81% filled, generic 95% / company 87%, 1,021 distinct drugs, `tmr_tmm_dose` present, `tmr_type` M/P/G. `tbl_case_manager` = 38,224 live; inline fill exam 3,374 / treat 5,176 / inline-meds 5,746 / advice 2,500 / MH 338 / investigation 3,098 / follow-up 2,229. `oneclick_cosultation_template_id` populated on only 13 rows. `tbl_casemanager_diagnosis` = 104,548 (ICD 51%). `tbl_case_custom_option` = 213 (config-only, no per-patient value table). `tbl_casemanager_surgery` **does not exist** (OPD procedures Not-in-DB). Meds→appointment-mode join verified (in-clinic/walk/video/tele attributable). No consult-mode/product-mode, `is_draft`, or `ui_version` column exists on `tbl_case_manager`.

---

## Diagnoses

### Why it matters & to whom

Diagnoses are the clinical "what" of every OPD visit — the entity that explains *why* a test was ordered, *why* a drug was prescribed, and *which* specialties carry which disease burden. Ranked diagnosis intelligence turns a flat log of ICD strings into three distinct decisions:

- **P1 Practicing Doctor (own panel):** "What do I actually treat, and is my coding/documentation clean?" Drives self-audit of clinical pattern (am I a diabetes-heavy GP?), ICD-coding discipline (claims/ABDM readiness), and the diagnoses→follow-up loop for chronic conditions (retention lens).
- **P2 Specialty/Department Admin (HoD):** "Does my department's case-mix match its staffing, and do my doctors diagnose consistently?" Drives doctor-vs-doctor case-mix comparison (behavioral lens — is one cardiologist coding "Essential Hypertension" where another writes free-text "high BP"?), and spotting under-served conditions (capacity/clinical-quality lens).
- **P3 Operational Admin / Owner (multi-specialty):** "Which conditions drive my footfall and downstream revenue, and where am I leaking cross-sell?" Drives the diagnoses→lab-test and diagnoses→pharmacy demand linkage (revenue/cross-sell lens), ICD-coding completeness as a compliance gate (compliance lens), and chronic-condition load as a retention engine.

This pillar does **entity-level ranking** of conditions. Rx-*composition* (generic %, polypharmacy) stays in the Rx pillar; here drugs/tests appear only as *demand signals attached to a diagnosis*.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Patients diagnosed | Distinct patients with ≥1 recorded diagnosis in period | `COUNT(DISTINCT patient_unique_id)` | count |
| Distinct conditions | Unique diagnosis labels seen | `COUNT(DISTINCT diagnosis)` | count |
| Diagnoses recorded | Total diagnosis rows | `COUNT(*)` | count |
| Top diagnosis (period) | Highest patient-count condition | `argmax_diagnosis COUNT(DISTINCT patient)` | label |
| Top-5 concentration | Share of patients in the 5 most common conditions | `Σ patients(top5) ÷ patients diagnosed` | % |
| ICD-coded rate | Diagnoses with a non-empty `icd_code` | `COUNT(icd_code<>'') ÷ COUNT(*)` | % |
| Diagnoses per consult | Diagnosis-recording intensity per visit | `COUNT(*) ÷ COUNT(DISTINCT consult)` | ratio |
| Diagnosis capture rate | Finished visits that recorded any diagnosis (documentation completeness) | `consults with dx ÷ finished consults` | % |
| Chronic-condition load | Patients carrying a chronic dx (DM/HTN/thyroid/asthma/CKD by label/ICD) | `COUNT(DISTINCT patient where chronic) ÷ patients diagnosed` | % |
| Lab-order attach rate (per dx) | Same-visit diagnoses that also carry an investigation | `dx-visits with `tcm_investigation`≠'' ÷ dx-visits` | % |
| Pharmacy attach rate (per dx) | Same-visit diagnoses that also carry a prescribed drug | `dx-visits with medicine_report row ÷ dx-visits` | % |

> Keep the hero strip to ~5: Patients diagnosed · Top diagnosis · Distinct conditions · ICD-coded rate · Diagnoses/consult. The rest live in blocks/leaderboards.

### Breakdowns

- **Top-N condition leaderboard** (default top 25; patient-count bars).
- **ICD distribution** — coded vs free-text split; and within coded, ICD-chapter rollup (first char of `icd_code`) — *feasibility caveat below*.
- **By department / specialty** (via doctor→specialty) and **by doctor** (case-mix comparison, behavioral).
- **By age band** (`<18·18-30·30-45·45-60·>60`) and **by gender** — disease-burden demographics.
- **Trend** (monthly diagnoses + patients) and per-condition trend for chronic watch-list.
- **Diagnosis → top investigations** and **Diagnosis → top drugs (generic)** — the cross-sell tables.

### Recommended viz

- KPI strip: value + delta vs prior period (semantic color; ICD-coded rate green-up, free-text share red-up).
- **Ranked horizontal bars** for top conditions (not a pie — >5 slices unreadable).
- **Doctor case-mix leaderboard** with a secondary quality metric beside the volume bar: patient-count bar + that doctor's **ICD-coded %** (R3 dual-metric pattern) — exposes coding-discipline variation at a glance.
- Stacked bars for gender mix per top condition; grouped bars for age mix.
- ICD coded-vs-uncoded as a single compliance gauge.
- Cross-sell rendered as two side-by-side "Diagnosis → demand" tables (condition | patients | top-3 tests | top-3 drugs), each row click-through to the lab/Rx pillar.

### Data sources & feasibility

- **`tbl_casemanager_diagnosis`** (`diagnosis`, `icd_code`, `patient_unique_id`, `um_id`, `tcd_created_date`, `tcd_del`, `hm_business_id`) — **RELIABLE** core; already powering `clinical/diagnosis` builder. Scope `tcd_del=0 AND hm_business_id AND diagnosis<>''`, date on `tcd_created_date`.
- Patient join → **`tbl_patient_master`** (`pm_gender`, `pm_dob`) on `patient_unique_id` — **RELIABLE** for age/gender.
- Doctor/specialty → **`tbl_user_master`** (`um_name`) — **RELIABLE** for doctor; **department/specialty rollup is a GAP** — no specialty column was enumerated in the column map. Tag **VERIFY**: confirm a doctor→specialty field before shipping the "by department" breakdown; otherwise it degrades to by-doctor only.
- **Diagnoses/consult & capture rate** → join to **`tbl_case_manager`** (`tcm_id`, `tcm_datetime`, `tcm_del`). **Caveat:** `tbl_casemanager_diagnosis` has **no `tcm_id` FK** in the map — link must be `patient_unique_id` + same `DATE()` (dx `tcd_created_date` ≈ consult `tcm_datetime`). **RELIABLE-but-derived**; flag the join key in `meta.note`.
- **Cross-sell — lab demand** → same-visit **`tbl_case_manager.tcm_investigation`** (CSV, **FREE-TEXT-MESSY**, ~3,098/38,224 filled). Attach-rate is computable; per-test ranking inherits the lab pillar's JS-split honesty caveat.
- **Cross-sell — pharmacy demand** → same-visit **`tbl_medicine_report`** (`tmm_generic`, `tmm_company`, `tcm_datetime`, `patient_unique_id`) — **RELIABLE** per-line drug table (the same one `drug.ts` trusts). Join dx↔drug on patient + date.
- **ICD-chapter rollup** — derivable from `icd_code` first character **only where coded**. Given coded-rate is partial, present chapter view with the uncoded denominator visible. **RELIABLE-on-coded-subset**.
- **NOT-IN-DB / out of scope:** symptom→diagnosis correlation (symptoms are external microservice), comorbidity *pairs* (computable but specced, not built), and any IPD diagnosis.

### Revenue / retention / cross-sell angle

This is the pillar where clinical patterns convert to money and stickiness — make it explicit:

- **Cross-sell (lab tie-up):** rank conditions by patient volume, then by their **lab-order attach rate**. A high-volume condition with a *low* attach rate (e.g. "Type 2 Diabetes" patients without an HbA1c/lipid order on the visit) is quantified diagnostic-revenue leakage and a direct lab-package upsell target.
- **Cross-sell (pharmacy attach):** top diagnoses → top prescribed generics gives the pharmacy its demand-planning + in-house-fill argument; conditions with high Rx volume but the patient buying elsewhere is pharmacy leakage (attach-rate gap).
- **Leakage (under-billing):** diagnoses recorded on finished appointments that have *no* downstream test/drug *and* no consult charge are documentation-without-monetization — feed the finished-but-unbilled leakage view in the financial pillar.
- **Retention:** chronic-condition load (DM/HTN/thyroid) is the recurring-revenue base — pair each chronic cohort with its follow-up-advice rate; a chronic patient with no follow-up is churn risk, and the diagnoses→follow-up loop is the retention engine P1 owns.
- **Behavioral (doctor variation):** doctor case-mix + per-doctor ICD-coded% surfaces both clinical specialization drift and coding hygiene; HoD uses the spread to standardize coding (claims/ABDM revenue protection) and to rebalance referral routing.

### Sample questions

- *(P3)* "Which 10 conditions drive most of my footfall, and which of them under-order labs?"
- *(P3)* "What's my diagnoses→pharmacy attach rate, and where are we losing fill to outside chemists?"
- *(P2)* "Do my three GPs diagnose the same conditions the same way, and who codes ICD vs free-texts?"
- *(P2)* "Which conditions is my department seeing that we're under-staffed for?"
- *(P1)* "What's my top-5 case mix, my diagnoses-per-consult, and my chronic panel's follow-up rate?"
- *(P1)* "How many of my finished visits have no diagnosis recorded (documentation gap)?"

### Priority

**P0 (ship on current data):** top-N leaderboard, distinct-conditions/patients/diagnoses KPIs, age & gender mix, by-doctor case-mix, trend, ICD-coded rate — all already backed by the live `clinical/diagnosis` builder.
**P1 (high-value, derived join):** diagnoses/consult, diagnosis-capture rate, and the two cross-sell tables (dx→lab, dx→drug) — needs the patient+date join to `tbl_case_manager` / `tbl_medicine_report`; highest revenue payoff.
**P2 (verify first):** by-department/specialty rollup (needs doctor→specialty source) and ICD-chapter view (partial coded denominator).

---

Key grounding files: builder `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/diagnosis.ts` (live, wired to `clinical/diagnosis`); column map `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (lines 33–37, 66 confirm diagnosis/patient/medicine/case_manager columns). Two load-bearing facts surfaced: (1) `tbl_casemanager_diagnosis` has **no `tcm_id`** — diagnoses/consult and cross-sell joins must use `patient_unique_id`+`DATE()` against `tbl_case_manager`; (2) no doctor→specialty column is enumerated, so the "by department" breakdown is a VERIFY-gated gap.

---

## Symptoms

### Why it matters & to whom

Symptoms are the *presenting-complaint* layer of the OPD encounter — the "why the patient walked in" that sits upstream of diagnosis, investigation, and prescription. Done right, this section is a demand-signal and cross-sell engine. The honest reality (verified below) is that **per-patient symptom prevalence is NOT in `tatva_clinic`** — it lives in a separate symptoms microservice. What the read-only analytics DB *can* see today is **template-level** symptom config (`tbl_micro_oneclick_consultation.tmoc_symptoms`), which answers "what complaints do this clinic's one-click consultation templates standardize" — a workflow/standardization signal, not patient epidemiology. This section is therefore split into **what ships today (template-level, RELIABLE-but-degraded)** and **what the section is *for* once the microservice is wired (per-patient, the real prize)**.

- **P1 Practicing Doctor (own panel):** Which complaints dominate *my* chair, how my severity-coding and symptom→workup conversion compares to peers. LENS: Clinical-quality + Productivity (template adoption = faster documentation).
- **P2 Specialty/Department Admin (HoD):** Complaint mix per specialty (is the cardiology panel actually presenting cardiac, or absorbing GP overflow?), template standardization across the department, doctor-to-doctor symptom-coding variation. LENS: Clinical-quality + Capacity (triage/routing) + behavioral.
- **P3 Operational Admin / Owner:** Clinic-wide complaint demand → service-line and tie-up decisions (top symptoms → lab panel bundles & pharmacy attach), seasonality for staffing, marketing the right specialties. LENS: Revenue cross-sell + Capacity.

### KPIs

> Tier-T = computable **today** from template config (`tmoc_symptoms`). Tier-P = requires the **per-patient symptoms microservice** read connection (GAP, flagged).

| KPI | Definition | Formula | Unit | Tier |
|---|---|---|---|---|
| Top symptoms (30d) | Most-recorded presenting complaints, last 30d | `count(symptom) GROUP BY symptom ORDER BY count DESC` | rank/count | **P** (today: template frequency, Tier-T) |
| Distinct symptoms tracked | Unique complaints captured | `COUNT(DISTINCT symptom_name)` | count | T |
| Symptom mentions / entries | Total symptom rows | `COUNT(symptom rows)` | count | T (per-patient in P) |
| Severity mix | Share of entries by severity (Mild/Moderate/Severe/Unspecified) | `count(severity)/total` | % | T (template) / P (real) |
| Severity-coding completeness | Symptom entries with a non-blank severity | `1 − (Unspecified ÷ total entries)` | % | T |
| Template symptom coverage | One-click templates carrying ≥1 symptom | `templates_with_symptoms ÷ active templates` | % | T |
| Symptom→investigation conversion | Visits where a top symptom led to a lab/diagnostic order | `visits_with_order(symptom) ÷ visits(symptom)` | % | **P** (needs symptom↔`tcm_investigation` join) |
| Symptom→Rx conversion | Visits where symptom led to a prescription | `visits_with_Rx(symptom) ÷ visits(symptom)` | % | **P** |
| Symptom→diagnosis concordance | Top symptom paired with top diagnosis (e.g. "chest pain"→"angina") | co-occurrence rank | pair | **P** |
| Symptom trend (30/90d) | Volume of top-N symptoms over time | `count(symptom) GROUP BY week` | line | **P** (today: template change history only) |
| Doctor symptom-coding variation | Spread in severity-coding completeness across doctors in a specialty | `stddev(completeness_by_doctor)` | % spread | **P** |

### Breakdowns

- **By severity** (Mild / Moderate / Severe / Unspecified) — primary mix.
- **By department / specialty** (`toct`/doctor→specialty) — *the HoD lens; today only via which specialty's templates carry which symptoms.*
- **By age band** (`<18·18-30·30-45·45-60·>60`) and **gender** — *Tier-P only; templates are not patient-scoped.*
- **By doctor** (P1 self vs anonymized peer; P2 named) — Tier-P for per-patient; Tier-T for template adoption.
- **Over time** (week/month) — seasonality of complaints (Tier-P).

### Recommended viz

- **Top-N ranked horizontal bars** for top symptoms (avoid pie — complaint lists routinely exceed 5 slices; ranked bars per the reference pitfall note).
- **Stacked bar** for severity mix per symptom (Mild/Moderate/Severe), red-weighted for Severe.
- **Severity-by-department stacked bars** (R4/R5 In/Out mix pattern) — HoD triage view.
- **Multi-line trend** for top-5 symptoms over 90d (seasonality), with explicit axis/legend labels.
- **Honesty banner** at the top of the card whenever Tier-T data is shown: *"Showing consultation-template complaints (clinic workflow config). Per-patient symptom prevalence requires the symptoms microservice."* — matches the builder's existing `meta.note`.

### Data sources & feasibility

| Source | What it gives | Flag |
|---|---|---|
| `tbl_micro_oneclick_consultation.tmoc_symptoms` (JSON `[{symptom_name, since, severity}]`, scoped `tmoc_business_id`, `tmoc_del=0`) | Template-level top symptoms, distinct count, severity mix, template coverage | **RELIABLE (config-level only)** — what `symptoms.ts` ships today |
| `tbl_symptom_template` / `tbl_symptom_template_details` | Master symptom catalog | **CONFIG-ONLY** — no patient/business scope; not prevalence |
| Per-patient `symptoms` array (FE payload: symptom_name, since, severity, note) written via casemanager-api | The real per-visit complaint record | **NOT-IN-`tatva_clinic`** — confirmed: no `tcm_*` symptom column exists; data routes to the **symptoms microservice** (`symptoms_api_url` / `symptoms_collector_api_url`). Tier-P KPIs all blocked on this. |
| `tbl_case_manager` (`tcm_datetime`, `tcm_investigation`, `um_id`, diagnosis child tables) | Join target for symptom→investigation/Rx/diagnosis conversion | **RELIABLE** — but join key (symptom↔visit) only exists once Tier-P is connected |

**The headline GAP:** the entire high-value half of this section (per-patient prevalence, trend, severity mix on real visits, symptom→order/Rx conversion, doctor variation) is **blocked on a single missing read connection to the symptoms microservice**. Until then, every "symptom" number on the dashboard is a *template-config* number and must be labelled as such or it will be read as epidemiology and mislead. This is the most important honesty flag in the OPD clinical set.

A secondary GAP: VoiceRx/Symptom-Collector pre-fill (`symptoms_collector_api_url`) and the `engagement/*` endpoints are **NotImplemented** — the symptom-collector ingestion path that would feed Tier-P aggregates is itself unbuilt.

### Revenue / retention / cross-sell angle

This is where Symptoms earns its place beyond clinical curiosity — **but only at Tier-P**, so frame as the explicit payoff of wiring the microservice:

- **Cross-sell to lab tie-up:** top symptoms with low symptom→investigation conversion are under-worked complaints; high-volume symptoms (e.g. fatigue, chest pain, fever) map directly to standard panel bundles — *package the panel, surface it as a one-click order, capture the leakage*. P3 decision: which lab bundles to negotiate/stock.
- **Pharmacy attach:** top symptoms → top drug classes (join to `tbl_medicine_report`) tells the owner which OTC/Rx inventory to keep on the attached pharmacy counter; symptom seasonality drives stock-ahead.
- **Leakage:** finished visits recording a billable-workup-worthy symptom (e.g. "abdominal pain") but no investigation/procedure billed = under-billing — reconcile against `tbl_opd_billing_overview`.
- **Retention:** recurring same-symptom revisits by the same patient (bounce-back) flag unresolved complaints — a retention-risk and clinical-quality signal in one.
- **Behavioral (doctor-to-doctor):** severity-coding completeness and symptom→workup conversion vary by doctor; the HoD uses the spread to standardize documentation (drives template adoption = the Tier-T productivity win) and to spot over/under-investigators (cost & quality).

### Sample questions

- (P3) "What are the top 10 presenting complaints clinic-wide this month, and which three should drive our next lab-panel bundle?"
- (P3) "Which high-volume symptoms are NOT converting into investigations — where are we leaving diagnostic revenue on the table?"
- (P2) "Is my cardiology panel actually presenting cardiac complaints, or absorbing GP-type symptoms it should be triaging out?"
- (P2) "Which doctors leave symptom severity blank most often, and do under-coders also under-investigate?"
- (P1) "What are the top complaints on *my* chair, and how does my symptom→follow-up rate compare to the anonymized specialty median?"
- (Owner) "Do fever/respiratory complaints spike seasonally enough to justify pre-stocking pharmacy and adding GP slots?"

### Priority

**Tier-T (template-level): P2 — ship now but label aggressively.** Cheap, already built, useful as a standardization/workflow signal for HoDs; dangerous only if mislabelled as prevalence.

**Tier-P (per-patient): P0 strategic, P3 sequencing — blocked.** This is the section's real value and the differentiating cross-sell engine, but it cannot ship until the symptoms-microservice read connection (and the `engagement/*` symptom-collector aggregate endpoint) is built. Recommend an explicit roadmap line item: *"Add read connection to symptoms microservice"* — it unblocks 8 of the 11 KPIs above and the entire revenue angle.

---

Key files referenced (all absolute):
- Builder (template-level, shipped): `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/symptoms.ts`
- Column map confirming only `tbl_micro_oneclick_consultation` carries symptoms in-DB: `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (line 88)
- Per-patient capture (routes to microservice, not `tatva_clinic`): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/common/HeaderPrescription.js` (symptoms array, ~L1770/L1996)
- Microservice config keys (the missing read connection): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/config.js` (`symptoms_api_url` L5, `symptoms_collector_api_url` L62)

---

## Investigations & Lab

### Why it matters & to whom

Investigations are the single richest **cross-sell and leakage signal** in OPD: every test a doctor writes on the Rx pad is either (a) revenue captured if the clinic has an in-house lab / tie-up, or (b) revenue walking out the door to an external lab. Yet the order today lives as untyped free text — so the clinic can see *that* tests were advised but cannot price them, attach them, or close the loop on results. This section turns that free-text stream into a ranked demand-and-leakage view, and is explicit about what the DB genuinely cannot answer (results, abnormal flags, turnaround) so the spec does not over-promise.

- **P1 Practicing Doctor (own panel)** — *Clinical-quality + Productivity.* "What do I order most, for which age groups, and is my ordering an outlier vs my peers?" Drives self-audit of over- / under-investigation.
- **P2 Specialty/Dept Admin (HoD)** — *Clinical-quality + Behavioral (doctor-vs-doctor).* "Within Cardiology, who orders 3x the lipid panels per visit? Is that protocol or waste?" Drives panel standardization and protocol nudges.
- **P3 Operational Admin / Owner** — *Revenue + Leakage + Cross-sell.* "Which high-volume tests are advised but NOT billed in-house? That's the lab tie-up business case." Drives in-house-lab investment and external-lab tie-up negotiation.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Test order rate | Share of consults that advise ≥1 investigation | `consults with tcm_investigation<>'' ÷ total consults` | % |
| Investigations per consult | Ordering intensity (over-investigation signal) | `Σ split tests ÷ consults-with-tests` | tests/consult |
| Distinct tests ordered | Breadth of test menu in use | `COUNT(DISTINCT test)` after CSV split | count |
| Top investigations (volume) | Most-advised tests, ranked | `COUNT DISTINCT patients per test` | patients |
| In-house lab capture rate | Advised tests that became in-house path revenue | `path-billing test count ÷ advised test count` (name-matched) | % |
| Lab leakage (uncaptured demand) | Advised but not billed in-house | `1 − capture rate`, and ranked by test | %, count |
| In-house pathology revenue | Path billing collected, OPD | `Σ tpobo_invoice_grand_total` (OPD) | ₹ |
| Pathology revenue per advising consult | Lab monetization efficiency | `path revenue ÷ consults-with-tests` | ₹ |
| Top in-house tests (revenue) | Highest-earning path line items | `Σ tpbrss_total per test, ranked` | ₹ |
| Doctor ordering variation | Per-doctor investigations/consult, vs panel median | `tests ÷ consults per um_id` | tests/consult |

### Breakdowns

- **By test** (ranked bars — the spine of the section): volume, distinct patients, and in-house ₹ side-by-side.
- **By department** (`tbl_appointment_master.dp_id` / `tbl_case_manager.dp_id` → `tbl_department.dp_name`): order rate and tests/consult per specialty — the "abnormal rate by specialty" ask becomes **order rate / intensity by specialty** (see gaps).
- **By age band** (`<18·18-30·30-45·45-60·>60` from `pm_dob`) and **gender** — already shipped in `lab.ts` (`ageMix`/`genderMix`), enabling "dept/age-wise most-suggested."
- **By doctor** (`cm.um_id` → `tbl_user_master`): leaderboard with a *secondary intensity metric* beside the volume bar (R3 pattern) — surfaces the doctor-vs-doctor outlier for P2.
- **Trend** (monthly): order rate and in-house revenue over time.

### Recommended viz

- **Hero KPI strip** (value + delta vs prior period, R2 pattern): Test order rate · Investigations per consult · In-house pathology revenue · Lab capture rate.
- **Ranked horizontal bars** for top tests (avoid pies; >5 slices unreadable) with a paired ₹-captured column.
- **Leakage table**: test | times advised | times billed in-house | capture % | est. uncaptured revenue — sorted by uncaptured demand. This is the cross-sell worksheet.
- **Doctor leaderboard**: volume bar + intensity (tests/consult) tag, panel median reference line.
- **Dual-axis combo** for trend: bars = consults-with-tests, line = in-house capture rate.

### Data sources & feasibility

| Source | Use | Tag |
|---|---|---|
| `tbl_case_manager.tcm_investigation` (CSV, ~3,098/38,224 filled) | Advised investigations — split in JS (lab.ts already does this) | **FREE-TEXT-MESSY / RELIABLE-for-volume** |
| `tbl_case_manager.dp_id` + `tbl_department(dp_id,dp_name)` | Department breakdown | **RELIABLE** |
| `tbl_patient_master.pm_dob`, `pm_gender` | Age/gender mix | **RELIABLE** |
| `tbl_case_manager.um_id` → `tbl_user_master.um_name` | Doctor-vs-doctor | **RELIABLE** |
| `tbl_path_opd_billing_overview` (`tpobo_invoice_grand_total`, `tpobo_invoice_date`) | In-house OPD lab revenue | **RELIABLE** |
| `tbl_path_bill_reatil_sale_service` (`tpbrss_ser_description`, `tpbrss_total`) | Test-level in-house revenue lines | **RELIABLE** |
| Abnormal results / result values / reference ranges | abnormal count, abnormal rate by specialty | **NOT-IN-DB** |
| Test turnaround (ordered→resulted timestamps) | turnaround time | **NOT-IN-DB** |

**Free-text caveats (must show in `meta.note`):** `tcm_investigation` is verbatim free text — top-test lists will carry typos, casing variants ("CBC" vs "cbc"), placeholders, and bundled strings. Counts are *directionally* reliable for ranking demand, **not** exact. Capture-rate matching between advised free-text names and `tpbrss_ser_description` requires fuzzy/normalized matching and should be reported as an estimate with a confidence note, not a precise figure.

### Revenue / retention / cross-sell angle (make it explicit)

This is the most revenue-dense clinical section:

1. **Lab tie-up / in-house upsell business case (P3):** Rank tests by *advised volume × est. price* that have **low in-house capture**. A test ordered 400×/quarter with near-zero in-house billing is the headline slide in an in-house-lab or external-tie-up negotiation. The advised-vs-billed gap *is* the leakage number.
2. **Pharmacy + lab attach (P3):** Cross with the Drug/Rx section — consults that advise both a chronic-disease drug and the matching monitoring panel (e.g. metformin + HbA1c) but bill neither in-house = a packaged "diagnostics + dispensing" attach opportunity.
3. **Retention loop:** Tests advised create a *return reason*. Pairing advised-investigation cohorts with follow-up adherence (the Follow-ups section) shows whether result-review brings patients back — the in-house lab is a retention lever, not just a revenue one.
4. **Behavioral (P2):** Doctor-vs-doctor tests/consult variation flags both clinical drift (over-ordering) and missed-monetization (under-ordering in a clinic with idle in-house capacity).

### Surfaced gaps (be honest, and propose the path)

- **"Most ABNORMAL results" and "abnormal rate by specialty" are not feasible** against `tatva_clinic`. No result value, reference range, or abnormal flag is stored — only the *order* (free text) and the *bill* (test name + amount). Closing this requires ingesting an LIS / lab-result feed (results microservice or HL7/lab partner), out of current scope. **Substitute now:** order rate and ordering intensity by specialty (a real, useful proxy for investigation behavior).
- **Turnaround time is not feasible** — no ordered→resulted timestamps exist; only `tcm_datetime` (order) and `tpobo_invoice_date` (bill). Do not ship a TAT tile.
- **Capture rate is an estimate**, gated on free-text↔billing name normalization. Recommend a backend test-name dictionary (canonical test → aliases) as the unlock for precise leakage and abnormal-rate work later.

### Sample questions

- P1: "Across my panel, which five investigations do I order most, and is my tests-per-consult above the department median?"
- P2: "Within Internal Medicine, which doctor orders the most lipid/thyroid panels per visit, and does it track with case mix or look like over-ordering?"
- P3: "Which advised tests have the largest in-house capture gap — i.e. where is lab revenue leaking to outside labs, and what's the quarterly ₹ at stake?"
- P3: "Has in-house pathology revenue per advising consult grown since we opened the in-house lab?"

### Priority

**P1 (build now):** Top investigations (volume), order rate, investigations/consult, age/gender/department/doctor breakdowns — all derive from the already-shipped `lab.ts` plus a `dp_id` join.
**P1 (high revenue value):** In-house pathology revenue + test-level lines (already in `operational/pathology`) and the **advised-vs-billed leakage table** — the cross-sell centerpiece; ship even as an estimate with a confidence note.
**P3 (blocked, needs new data source):** Abnormal results, abnormal rate by specialty, turnaround — park until an LIS/result feed exists; do not fake.

---

Grounding notes for the calling pipeline: live builder is `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/lab.ts` (`clinical/lab-test`, already ships hero/KPIs/summary/labTrend/byDoctor/genderMix/ageMix/patients with an honest free-text `meta.note`); in-house revenue is `operational.ts` case `'pathology'` (`operational/pathology`). Department join is available via `tbl_case_manager.dp_id` → `tbl_department(dp_id, dp_name)` (per `scripts/db-check.js` lines 41, 93) but is **not yet wired into lab.ts** — it is the one net-new join the volume/leakage breakdowns require. Abnormal-result and turnaround data confirmed absent from the column map and all path/case_manager surfaces.

---

## Procedures (OPD)

> **Scope verdict — READ THIS FIRST.** OPD procedures have **no usable backing data** in `tatva_clinic`. This was confirmed against the live read-replica, not inferred:
> - `tbl_inpatient_doctor_procedure` (the table `procedures.ts` reads) is **IPD-only and is test garbage** — 53 rows across 6 businesses, 21 distinct titles, dominated by `"Procedure 1"`, `"Asynchronous one-way"`, `"COVID procedure"`, `"lmlml"`, `"TEST"`. Real clinical titles ("Appendectomy", "Fracture") are single-digit and inpatient.
> - `tbl_casemanager_surgery` — the table the column-map and the Rx-pad `surgeries[]` payload imply — **does not exist** in the live DB (`SHOW TABLES LIKE '%surg%'` → empty). The stale entry in `db-check.js` is aspirational; the Rx pad's `surgeries` array has no verified write target in this schema.
> - There is **no per-OPD-encounter procedure register, no CPT/SNOMED procedure coding, no "procedure suggested" vs "procedure performed" distinction** anywhere in scope.
>
> The owner's ask — *most-suggested/performed OPD procedures across age & department, counts, trend, revenue per procedure* — **cannot be answered as a clinical-procedure analytic today.** The only honest, shippable surface is a **billed-service proxy** (OPD billing line items), and even that is free-text-messy. This section specs (a) that proxy with explicit caveats and (b) the capture gap that must be closed to do this properly. **Do not ship a "Procedures" dashboard off `tbl_inpatient_doctor_procedure` for OPD — it is misleading.**

### Why it matters & to whom

Procedure analytics, done right, is one of the highest-margin lenses in an OPD practice — minor procedures (excisions, injections, dressings, cautery, IUD insertions, joint aspirations, etc.) are billed per-item and are pure productivity + revenue signal. The three personas would each use it as follows, *if the data existed*:

- **P3 Operational Admin / Owner** — **LENS: Revenue / Leakage / Capacity.** Which procedures drive procedural revenue, revenue-per-procedure, and (critically) **how many finished OPD encounters that clinically warranted a billable procedure were never billed** (leakage). Decision: pricing, capacity allocation for procedure rooms, plugging under-billing.
- **P2 Specialty/Department Admin (HoD)** — **LENS: Productivity / Behavioral / Clinical-quality.** Procedure mix and volume per doctor within the specialty, and **doctor-to-doctor variation** (does Dr A perform/bill 3× the minor procedures of Dr B for the same case mix?). Decision: training, referral routing, identifying the procedural workhorses.
- **P1 Practicing Doctor (own panel)** — **LENS: Productivity / Revenue.** Own most-performed procedures, trend, and own revenue contribution from procedures vs consults. Decision: skill investment, self-benchmarking.

Because the clinical-procedure surface is empty, **the only persona we can serve today is P3/P2 via the billed-service proxy** — and only as "top billed services" rather than "clinical procedures."

### KPIs

All KPIs below are **proxy KPIs built on OPD billing line items** (`tbl_opd_billing_invoice_service` ⋈ `tbl_bill_main_service`), not a procedure register. They answer "top billed services & their revenue," which overlaps with — but is not — "procedures."

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Top billed services | Most-billed named service lines, ranked | `GROUP BY tbms_service_name ORDER BY revenue DESC` | rank/list |
| Service line volume | Count of billed lines for a service in period | `COUNT(is_id)` per service | count |
| Quantity performed | Units billed (a service can be qty>1 per line) | `SUM(ims_qty)` per service | count |
| Revenue per service | Total billed revenue attributable to a service | `SUM(ims_total)` per service | ₹ |
| Avg price per unit | Revenue ÷ units — price-point signal | `SUM(ims_total) / NULLIF(SUM(ims_qty),0)` | ₹ |
| Distinct services billed | Breadth of service catalog actually used | `COUNT(DISTINCT tbms_service_name)` | count |
| Service revenue trend | Monthly billed-service revenue | `SUM(ims_total)` by `DATE_FORMAT(tobo_invoice_date,'%Y-%m')` | ₹/month |
| Procedure-billing leakage (GAP) | Finished encounters with **no** procedure/service line beyond consult | `finished_appts − appts_with_nonconsult_service_line` | count / % |
| Revenue per finished visit | Total OPD billed ÷ completed visits | `SUM(ims_total) / COUNT(status=3 appts)` | ₹ |
| Service revenue by doctor | Billed-service revenue per `doctor_unique_id` | `SUM(ims_total)` GROUP BY doctor | ₹ |

> Keep to ~10 KPIs. Leakage and revenue-per-visit are the two that make this section worth building at all; the rest are descriptive.

### Breakdowns

- **By age band** (`<18·18-30·30-45·45-60·>60`) via patient join on the invoice's `patient_unique_id` — **directly serves the owner's "across age" ask** (the one part of the ask that is feasible, on the billing surface).
- **By department / specialty** — **only weakly feasible.** There is no clean department on the billing line. The dirty `tbsg_service_group` (e.g. "Dermat", "Optho", "OPD Group", "Consult", plus junk "Abc"/"Test"/"Golden ") is the closest, or derive department by joining the invoice's `doctor_unique_id` → `tbl_user_master` → department. Both are messy; **flag in `meta.note`.**
- **By doctor** (`doctor_unique_id` on `tbl_opd_billing_overview`) — the behavioral doctor-vs-doctor lens for P2.
- **By month** (trend) and **by service group** (mix donut, but the group taxonomy is un-normalized — prefer ranked bars).
- **New vs returning patient** (via `pam_type` New/Old or appointment-count) — are procedures concentrated in repeat patients?

### Recommended viz

- **Ranked horizontal bars** for top billed services (not a pie — the catalog has >25 dirty entries; ranked bars with a revenue value + qty secondary metric, per reference R3's "volume bar + secondary metric" pattern).
- **Paired columns**: revenue (₹) and units (qty) side-by-side per service — exposes high-volume-low-margin vs low-volume-high-margin.
- **Trend line** for monthly service revenue.
- **Doctor leaderboard** (R3 pattern): billed-service revenue bar + a secondary "procedure-lines per 100 finished visits" rate, to surface behavioral variation.
- **Leakage KPI card** styled red-on-rise (finished visits with consult-only billing).
- **Persistent disclaimer banner**: "Reflects billed services, not a clinical procedure register. Service names are free-text and may include consults, checkups and labs."

### Data sources & feasibility

| Source | Use | Tag |
|---|---|---|
| `tbl_inpatient_doctor_procedure` | The table `procedures.ts` currently reads | **NOT-IN-DB for OPD** — IPD-only, 53 test rows; do **not** use for OPD |
| `tbl_casemanager_surgery` (Rx-pad `surgeries[]` target) | Per-encounter procedures/surgical history | **NOT-IN-DB** — table absent from live `tatva_clinic`; capture path has no verified sink |
| `tbl_doctor_procedure_template` / `tbl_discharge_procedure_master` | Procedure name config | **CONFIG-ONLY** — templates, not patient events |
| `tbl_opd_billing_invoice_service` (`ims_total`, `ims_qty`, `ims_price`, `tbms_id`) ⋈ `tbl_bill_main_service` (`tbms_service_name`, `tbsg_id`) | **The proxy surface** — billed named services + revenue | **FREE-TEXT-MESSY but RELIABLE-money** — verified live; names like "Regular Checkup", "X ray", "Consulting", "service 3", "Blood test" mix procedures/consults/labs |
| `tbl_bill_service_group` (`tbsg_service_group`) | Service-group taxonomy for "department"-ish grouping | **FREE-TEXT-MESSY** — dirty/dup groups ("Dermat", "OPD", "OPD Group", "Abc", "Golden ", "Test") |
| `tbl_opd_billing_overview` (`patient_unique_id`, `doctor_unique_id`, `tobo_invoice_date`, scope/cancel/delete flags) | Header for date, doctor, patient join, scoping | **RELIABLE** |
| `tbl_patient_master` | Age/gender breakdown on procedures | **RELIABLE** (age via `pm_dob`) |
| `tbl_appointment_master` (status=3) | Leakage denominator (finished visits) | **RELIABLE** |

**Surface the GAP explicitly to product:** to deliver true OPD procedure analytics (the owner's actual ask — suggested vs performed, by department, CPT-coded, revenue-per-procedure), the EMR must **(1)** persist the Rx-pad `surgeries[]` / a dedicated OPD-procedure capture into a real, business-scoped, OPD-flagged table, **(2)** code procedures against a controlled vocabulary, and **(3)** link the procedure event to its billing line. None of these exist today. This is a **capture/instrumentation change, not a query** — call it out in the spec so it lands on the EMR roadmap rather than being faked in analytics.

### Revenue / retention / cross-sell angle

This is where the proxy earns its keep even while imperfect:

- **Leakage (the headline revenue play):** finished OPD encounters billed for **consult only** — no procedure/service line — are candidate under-billing. The billing line is reliable even though the *name* is messy, so "did a non-consult line exist?" is answerable and directly quantifies leaked procedural revenue for **P3**.
- **Pharmacy / lab attach:** cross-reference top billed services against the live **drug** (`clinical/drug`) and **lab** (`clinical/lab-test`) dashboards — procedures that consistently co-occur with prescriptions or investigations are cross-sell anchors (procedure → dressing/medication attach; checkup service → lab-panel attach). The "Regular Checkup" and "Full Body Check Up" services already in the data are obvious lab-tie-up candidates.
- **Pricing:** avg-price-per-unit variance for the *same* service name across doctors/businesses flags inconsistent pricing — a quick-win revenue normalization for **P3**.

### Behavioral angle (doctor-to-doctor variation)

Two doctors with the same specialty and case mix who bill procedural services at very different rates is the single most actionable signal here for **P2 (HoD)**. Compute **procedure-service lines per 100 finished visits per doctor** and rank. High variance flags either an under-biller (revenue leakage / training gap) or an over-coder (compliance review). Pair the volume bar with this rate (R3 leaderboard pattern).

### Sample questions

- *(P3)* "What share of our completed OPD visits last quarter were billed for **only** a consultation, with no procedure or service line — and what's the estimated leaked revenue?"
- *(P3)* "Which 10 billed services generate the most OPD revenue, and what's the revenue-per-unit on each?"
- *(P2)* "Within Dermatology, which doctor bills the most procedure lines per 100 finished visits, and who is far below the median?"
- *(P2)* "How is procedural-service revenue trending month-over-month in my department?"
- *(P1)* "What are my most-billed services this quarter and how much revenue did they contribute vs my consults?"
- *(Owner, currently UNANSWERABLE)* "What are our most-**performed clinical procedures** by age and department?" → **requires the capture gap to be closed; flag, do not fake.**

### Priority

**P2 / Medium — but conditional and split:**
- **Build now (Medium):** the **billed-service proxy** (top services, revenue, qty, trend, by-doctor, **leakage card**) — reuses the already-wired `financial.ts` billing surface and the existing 3C/service-line plumbing, so incremental cost is low and the leakage + doctor-variation insights are genuinely valuable. Ship it **labelled as "Top Billed Services & Procedure-Billing Leakage," not "Procedures."**
- **Do NOT build:** any "Procedures" dashboard fed by `tbl_inpatient_doctor_procedure` for OPD — it is IPD test data and will mislead. The current `clinical/procedure` endpoint should be **suppressed or relabelled IPD-only** in the OPD nav.
- **Roadmap (High value, blocked):** true OPD clinical-procedure analytics — blocked on EMR capture instrumentation (persist + code the `surgeries[]`/procedure capture). This is the owner's real ask and should be raised as a **data-capture requirement**, the single biggest gap in the OPD clinical surface.

**Relevant files:** builder to relabel/scope `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/procedures.ts`; billing-proxy plumbing to reuse `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/financial.ts`; OPD nav endpoint map `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/shell/analyticsNav.jsx`; stale column-map entry to correct `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (line 95, `tbl_casemanager_surgery` does not exist live).

---

## Medical History

### Why it matters & to whom

Medical history is the **clinical risk and chronicity layer** of the OPD record — it tells you not what happened in one visit, but *who the patient base is*: their comorbidity load, allergy risk, lifestyle drivers, and surgical past. It is the single richest source for **panel risk-stratification, chronic-care revenue, and cross-sell** that does not depend on a single encounter. But it is also the **most degraded data surface in the OPD stack** — the headline source is free-text/JSON and effectively single-clinic in volume, so this section leads with honest feasibility and a clear "build the capture before you build the dashboard" message.

- **P1 — Practicing Doctor (own panel).** *Decision:* "How chronic/complex is my panel, and am I systematically capturing history?" Drives recall lists for diabetics/hypertensives, allergy-safety at prescribing time, and a personal documentation-completeness habit. **Lens: Clinical-quality + Retention.**
- **P2 — Specialty/Department Admin (HoD).** *Decision:* "Which doctors actually record history, and how does comorbidity load differ across my doctors' panels?" Drives documentation-discipline coaching and case-mix-adjusted comparison (a high-comorbidity panel justifies longer slots / lower throughput). **Lens: Productivity + Clinical-quality (behavioral).**
- **P3 — Operational Admin / Owner (multi-specialty).** *Decision:* "How large is my chronic-disease cohort, and what recurring-revenue and cross-sell does it unlock?" Drives chronic-care programs, lab/pharmacy tie-ups anchored on top conditions, and a capture-quality compliance baseline. **Lens: Revenue + Cross-sell + Compliance.**

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Patients with recorded history | Distinct patients with a non-empty `medical_history` JSON in window | `COUNT(DISTINCT patient_unique_id WHERE medical_history NOT IN ('','[]'))` | count |
| History capture rate | Share of seen patients who have any structured history recorded | `patients_with_history ÷ distinct_patients_seen` | % |
| Comorbidity load (avg) | Mean distinct conditions per patient who has any history | `Σ distinct_conditions ÷ patients_with_history` | conditions/patient |
| Multimorbid patient share | Patients carrying ≥2 chronic conditions | `COUNT(patients with ≥2 conditions) ÷ patients_with_history` | % |
| Top conditions (ranked) | Distinct patients per condition tag (`tags[].title`) | `COUNT(DISTINCT patient_unique_id) per condition` | count |
| Top chronic cohort size | Patient count for the #1 condition (e.g. Diabetes, Hypertension) | `MAX over conditions of patient count` | count |
| Allergy prevalence | Patients with ≥1 recorded allergy | `COUNT(DISTINCT patient_unique_id) in tbl_casemanager_allergies ÷ patients_seen` | % |
| Top allergens (ranked) | Distinct patients per allergen | `COUNT(DISTINCT patient_unique_id) per allergen` | count |
| Past-surgery prevalence | Patients with ≥1 recorded prior surgery | `COUNT(DISTINCT pm_pid) in tbl_casemanager_surgery ÷ patients_seen` | % |
| Lifestyle-flag prevalence | Patients with a recorded lifestyle factor (tobacco/alcohol/etc.) — *flag: see feasibility* | `COUNT(DISTINCT patient with lifestyle tag) ÷ patients_with_history` | % |
| Chronic cohort revenue contribution | Share of OPD collected revenue from patients in any top-condition cohort | `Σ collected (chronic cohort) ÷ Σ collected (all)` | % |
| Comorbidity load by doctor (P2) | Avg distinct conditions per patient, split by `um_id` of the recording consultation | `avg conditions/patient per doctor` (case-mix signal) | conditions/patient |

*Tightened deliberately to ~12.* The first four (capture, comorbidity load, multimorbidity, top conditions) are the decision-grade core; the rest are drill-downs.

### Breakdowns
- **By condition** (top-N ranked bars — Diabetes, Hypertension, Thyroid, CAD, Asthma, CKD…).
- **By demographic:** condition × gender, condition × age band (`<18·18-30·30-45·45-60·>60`) — already emitted by the builder.
- **By comorbidity count:** 0 / 1 / 2 / 3+ condition buckets (the multimorbidity distribution).
- **By doctor / specialty (P2):** capture rate and avg comorbidity load per `um_id` — behavioral variation lens.
- **Allergy class:** drug vs food vs environmental (only if the allergen text is clean enough; otherwise raw top-allergen list).
- **Comorbidity pairs (GAP, see below):** co-occurring condition pairs (Diabetes+Hypertension) — high-value, not yet built.

### Recommended viz
- **Hero KPI strip (R2 pattern):** Patients-with-history (+delta), History capture rate (green-up), Avg comorbidity load, Multimorbid share. Each with "vs previous period" baseline.
- **Top conditions:** ranked horizontal bars (NOT a pie — >5 slices, per references pitfall). Stack M/F inside each bar for the gender lens.
- **Comorbidity distribution:** simple histogram (0/1/2/3+ conditions).
- **Doctor capture-quality leaderboard (P2):** Top-N doctors, capture-rate bar + avg-comorbidity-load as the secondary metric beside it (R3 dual-metric leaderboard pattern). Use red/amber theme for *low* capture rate.
- **Allergy / surgery panels:** ranked bars + a patient register with condition/allergy/surgery columns for drill-down.
- **Comorbidity pairs (if built):** ranked pair bars, not a network/treemap.

### Data sources & feasibility

| Source table | Carries | Flag |
|---|---|---|
| `tbl_micro_patient_medical_history.medical_history` (JSON) | Top conditions via `tags[].title`; lifestyle/surgery *may* appear as additional sections | **FREE-TEXT-MESSY / SPARSE** — JSON string parsed in JS; verified shape `[{tags:[{title}], no_know_history, …}]`; only **338 `tcm_mh_json` rows** equivalent and the table itself is **test-clinic-thin**. Builder `medical.ts` already wired (`clinical/medical-history`). No `um_id` on this table → **doctor split needs a join through `tbl_case_manager` by patient+date**, which is approximate. |
| `tbl_casemanager_allergies` (26,223 rows) | Allergy prevalence + top allergens | **RELIABLE volume, UNUSED** — substantial data, *no builder reads it today*. Columns not enumerated in `db-check.js` (verify allergen/severity field names before build). **Biggest quick win in this section.** |
| `tbl_casemanager_surgery` (`surgery_name`, `pm_pid`, `tcm_datetime`) | Past-surgery prevalence + top surgeries | **RELIABLE-but-FREE-TEXT, UNUSED** — FE saves the Rx-pad `surgeries[]` array here; `surgery_name` is free-text so top-N needs normalization. No builder yet. |
| `tbl_patient_master` | Demographics for gender/age breakdowns | **RELIABLE** (already joined in builder). |
| `tbl_opd_billing_overview` | Revenue attribution for chronic-cohort contribution KPI | **RELIABLE** — join chronic cohort UHIDs to billing for the revenue-contribution metric. |

**Honest top-line feasibility flag (state this on the dashboard):** the primary medical-history surface is **JSON/free-text and effectively single-clinic in volume**. At current data density, condition rankings are *directional, not statistically robust* across a multi-specialty owner view. The high-confidence, ready-now metrics are **allergy prevalence** (26k rows, just needs a builder) and **history capture rate** (a documentation-discipline metric that is valuable *precisely because* the data is thin). Surface a `meta.note` exactly as the symptoms builder does.

### Revenue / retention / cross-sell angle (make it explicit)
- **Cross-sell — Lab tie-up:** Top conditions are the anchor for diagnostic packages. Diabetes cohort → HbA1c/lipid recall; Thyroid cohort → TSH panels; CKD → renal panels. **Action:** size each cohort (KPI above), then attach a recurring lab package and measure attach via `tcm_investigation` orders for that cohort. This converts a static history field into a recurring **diagnostics revenue line**.
- **Cross-sell — Pharmacy attach:** Chronic conditions imply chronic prescriptions. Cross-reference top-condition cohorts with `tbl_medicine_report` to find chronic-med patients *not* refilling through the in-clinic pharmacy → pharmacy-attach leakage list.
- **Retention — Chronic recall loop:** Multimorbid patients are the highest-LTV, highest-retention OPD segment. A "diabetic + hypertensive, no visit in 90 days" recall list (chronic cohort ⋈ last-visit date) is the single highest-yield retention play in the whole OPD spec.
- **Revenue attribution:** the *Chronic cohort revenue contribution* KPI quantifies how much of the clinic depends on chronic care — the business case for any chronic-care program or specialty hire (P3).
- **Leakage — capture as money:** every finished visit *without* recorded history is a missed risk-stratification and a missed cross-sell trigger. Low capture rate = invisible chronic cohort = un-monetized recurring revenue.

### Behavioral angle (doctor-to-doctor)
- **Capture discipline varies wildly by doctor** and is the cleanest behavioral signal here: two doctors seeing identical case-mix can have 80% vs 10% history-capture. P2 uses the capture-rate leaderboard to coach the laggards — and to *case-mix-adjust* productivity (a doctor with genuinely high comorbidity load is justifiably slower).
- **Comorbidity load by doctor** doubles as a panel-complexity signal: it explains revenue-per-visit and follow-up-rate differences that would otherwise look like underperformance.

### Sample questions
- P1: "How many of my patients are diabetic *and* hypertensive, and which haven't I seen in 90 days?"
- P1: "Before I prescribe, does this patient have a recorded drug allergy?"
- P2: "Which of my doctors actually records medical history, and is Dr X's slower throughput explained by a higher-comorbidity panel?"
- P3: "How big is my chronic-disease base, what share of revenue does it drive, and which conditions justify a lab/pharmacy package?"
- P3: "What's our overall history-capture rate — are we even capturing the data needed to run chronic-care programs?"

### Priority
- **P1 (build now, high ROI):** **Allergy prevalence + top allergens** (`tbl_casemanager_allergies`, 26k rows, zero builders — highest data-confidence quick win) and **History capture rate** (documentation-compliance metric, valuable despite thin data).
- **P2 (build next):** Top-conditions + comorbidity-load + multimorbidity (builder exists at `clinical/medical-history`; enrich with comorbidity-count buckets and the by-doctor capture leaderboard).
- **P3 (defer / gated on capture maturity):** Comorbidity-pair correlation, lifestyle-flag prevalence, and cross-DB enrichment — **GAP: do not invest until capture volume and JSON cleanliness improve.** Flag lifestyle as *aspirational* — it is not a confirmed structured field today.

**Surfaced GAPS:**
1. **Lifestyle is not a confirmed structured field** — it may ride inside the `medical_history` JSON sections but is not separately verified; treat as flag/aspirational until the JSON shape is audited for lifestyle tags.
2. **`tbl_casemanager_allergies` and `tbl_casemanager_surgery` have NO builder** despite real data — straightforward wins.
3. **No doctor attribution on `tbl_micro_patient_medical_history`** — by-doctor capture/comorbidity requires an approximate join through `tbl_case_manager`.
4. **Comorbidity-pair correlation** (specced, not built) — the single highest-value analytical upgrade once data density supports it.
5. **Free-text normalization** — both condition `tags[].title` and `surgery_name`/allergen are free-text; ranked top-N needs a synonym/normalization pass to avoid fragmenting "HTN" vs "Hypertension".

---

**Key files referenced (absolute):**
- Builder (live, wired to `clinical/medical-history`): `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/medical.ts` — parses `tbl_micro_patient_medical_history.medical_history` JSON; confirmed shape `[{ tags:[{ tmmhst_id, title }], no_know_history, … }]`; no `um_id` on the table.
- Column map: `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` — lines 74 (`micro_patient_medical_history`), 95 (`casemanager_surgery`). `tbl_casemanager_allergies` columns are NOT enumerated here; verify field names live before building the allergy builder.

---

## Vaccination (+behavioral)

**Scope note:** OPD only. Verified live against `tatva_clinic` — dose volumes are small (≈973 dose rows / 193 patients) and concentrated in pediatric/immunization clinics, so this section is a **specialty module**, not a clinic-wide KPI. Two columns are dirtier than their names suggest: `tvpv_dose` and `tvpv_route` are conflated free-text (dose holds `1/3`, route holds `PO`/`IM`/`IM RT`), so dose-number is derived from a per-patient sequence, not read raw.

### Why it matters & to whom

Immunization is the one OPD workflow with a **defined future obligation** baked into the data: every dose given implies a next dose due. That makes it the highest-retention, most-recallable revenue stream in the practice — a patient on a vaccination schedule is a guaranteed multi-visit relationship if the recall loop closes.

- **P1 Practicing Doctor (Pediatrician / GP own panel)** — *Decision:* "Which of my patients are due/overdue, and is my schedule adherence (on-time %) clinically acceptable?" Drives the daily recall list and protects the doctor's own follow-up revenue. **Lens: Clinical-quality + Retention.**
- **P2 Specialty/Dept Admin (HoD, Pediatrics/Preventive)** — *Decision:* "Which doctors close the recall loop vs. let panels lapse, and where are our age-band coverage gaps?" Drives coaching and panel rebalancing. **Lens: Behavioral + Compliance.**
- **P3 Operational Admin / Owner** — *Decision:* "How much recallable visit revenue is sitting in the overdue book, and is our schedule-tracking even being used?" Drives a recall campaign and a data-hygiene mandate. **Lens: Revenue/Leakage + Retention.**

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Doses administered | Dose-event rows in period | `COUNT(tvpv_id)` over `tbl_vaccine_patient_vacc` ⋈ given-date in range | count |
| Patients vaccinated | Distinct patients receiving ≥1 dose | `COUNT(DISTINCT patient_unique_id)` | count |
| Coverage by vaccine | Doses & patients per vaccine name | `COUNT(*)`, `COUNT(DISTINCT patient)` GROUP BY `tvac_name` | count |
| Dose-number distribution | Nth-dose mix (derived sequence per patient×vaccine) | `ROW_NUMBER() OVER(PARTITION BY patient, vaccine ORDER BY given_date)` then bucket 1st/2nd/3rd+ | count |
| **On-time adherence rate** | Doses given on/around scheduled due date | `Σ(given_date BETWEEN due_date−7d AND due_date+7d) ÷ Σ(doses with a matched due_date)` | % (green-up) |
| **Overdue due-doses** | Scheduled doses past due, not yet given | `COUNT(tvd_due_date < CURDATE() AND no matching given dose)` | count (red-up) |
| Upcoming due (next 30d) | Scheduled doses coming due — the recall worklist | `COUNT(tvd_due_date BETWEEN CURDATE() AND +30d, ungiven)` | count |
| Age-band coverage | Vaccinated-patient mix by standard band | bucket `pm_dob`→age `<1·1-5·5-12·12-18·>18` | % by band |
| Route mix (cleaned) | Administration route distribution | normalize `tvpv_route` → IM/SC/Oral/Intranasal/ID/Other | % |
| Refusal / missed (flagged) | Free-text remarks indicating non-administration | regex on `tvp_remarks` (`missed`, `refused`, `other hospital`) | count (caveated) |
| Coverage-by-doctor | Doses & on-time % per administering user | GROUP BY `tvpv_user`→`tbl_user_master` | count + % |
| Schedule-tracking adoption | Patients with any due-schedule generated | `COUNT(DISTINCT tvd patient) ÷ COUNT(DISTINCT vaccinated patient)` | % (data-hygiene) |

### Breakdowns
- By vaccine name (top-N ranked bars; pediatric primary series — BCG, OPV, Pentavalent, PCV, IPV — vs. adult Influenza/TdaP).
- By dose-number (1st / 2nd / 3rd+ stacked) — exposes **series drop-off** (the retention leak).
- By age-band and gender.
- By adherence bucket: **On-time · Late · Overdue (ungiven) · Upcoming**.
- By administering doctor (`tvpv_user`) — the behavioral lens.
- By route (normalized).

### Recommended viz
- **Hero recall card (paired big-number, R4/R5 pattern):** `Overdue (ungiven) | Upcoming 30d` — this is the action surface for all three personas. Overdue colored red.
- **Coverage funnel by dose-number** (1st→2nd→3rd+) per top vaccine — surfaces series completion vs. drop-off.
- **Adherence donut:** On-time / Late / Overdue / Upcoming, with on-time % as the headline.
- **Doctor leaderboard (R3 pattern):** dose-volume bar + on-time-% secondary metric, so a high-volume/low-adherence doctor is visible at a glance.
- **Age-band grouped bars** (coverage by band).
- **Recall worklist table:** patient · vaccine · due date · days overdue · last-seen doctor — directly clickable to act.

### Data sources & feasibility
- `tbl_vaccine_patient_vacc` (≈973 dose rows; `tvpv_vaccine`, `tvpv_user`, `tvpv_dose`, `tvpv_route`, `tvpv_site`) — **RELIABLE for counts**; dose/route columns **FREE-TEXT-MESSY & conflated** (must be normalized/derived, not read raw).
- `tbl_vaccine` (`tvac_id`, `tvac_name`, `hm_business_id`) — **RELIABLE**; sole business-scope anchor (dose rows carry no business col — current builder join is correct).
- `tbl_vaccine_patient` (`tvp_given_date`, `tvp_remarks`) — **RELIABLE** for date; remarks **FREE-TEXT-MESSY** (refusal/missed signal only, with junk like "Lorem Ipsum" present).
- `tbl_vaccine_duedate` (357 rows; `patient_unique_id`, `tvd_due_date`, `tvd_temp_id`) — **the schedule/due engine; RELIABLE-but-SPARSE & UNWIRED.** No builder reads it today. This single table unlocks the entire adherence/overdue/recall layer — the highest-value gap in this module.
- `tbl_vaccine_templete` / `tbl_vaccine_templete_vac` (`tvt_due_day/month/year`, `tvt_mg_*`, business-scoped) — IAP-style schedule definition; **RELIABLE config**, enables expected-due derivation when a per-patient due row is absent.
- `tbl_patient_master.pm_dob` — **RELIABLE on this cohort** (1290/1377 dose rows have dob) → age-band is feasible.
- `tbl_user_master` (via `tvpv_user`, 41 distinct, ~20% null/0) — **RELIABLE-but-partial** for doctor attribution.

**Hard GAPS (surface honestly, do not fake):**
- **Inventory / stock / recall-by-batch = NOT-IN-DB.** `tvac_qty`, `tvac_reorder_reminder`, `tvac_expire_reminder` are **all zero** across the catalog, and there is no batch/lot/expiry/stock-ledger table. Any "inventory" or "vaccine recall (defective lot)" KPI has no backing data — exclude it from the spec rather than ship an empty chart. (The task's "Revenue: inventory/recall" is therefore reframed below as **visit-recall**, which *is* backed.)
- **Refusals have no structured flag** — only messy `tvp_remarks`. Report as a caveated, regex-derived count, not a clean rate.
- **No appointment/consult FK on dose rows** — vaccination↔billing/consult tie-up must join by `patient_unique_id` + date.

### Revenue / retention / cross-sell & behavioral angle
- **Recall = the revenue engine (reframes "inventory/recall").** Overdue + upcoming-due counts (`tbl_vaccine_duedate`) are a **quantified pipeline of recallable visits**. For P3, multiply overdue due-doses × average consult/vaccination fee to size the recoverable revenue sitting in the lapsed book — then drive a recall campaign. This is real and currently invisible because no builder reads the duedate table.
- **Series drop-off = retention leak.** The dose-number funnel (1st→2nd→3rd+) directly shows where patients fall off a multi-dose schedule. A wide 1st→2nd gap is churn the clinic can win back with one SMS/call list.
- **Behavioral (doctor-to-doctor).** Same age-band, same vaccine catalog — yet on-time % and overdue-panel size will vary sharply by `tvpv_user`. The leaderboard turns recall discipline into a coachable, comparable metric for P2; a high-volume/low-adherence doctor is a targeted intervention, not a clinic-wide policy.
- **Schedule-tracking adoption** is the upstream gate: if few vaccinated patients have any `tvd` rows, the recall revenue can't be captured at all — P3's first action is mandating schedule generation at point-of-administration.

### Sample questions
- "Show me my overdue immunization panel for this month, sorted by days overdue." (P1, recall worklist)
- "What's my on-time adherence vs. the department average?" (P1 / P2, behavioral)
- "Where is the biggest 1st→2nd dose drop-off, and for which vaccine?" (P2, retention)
- "How much recallable visit revenue is in the overdue book, and which doctors own those panels?" (P3, revenue/leakage + behavioral)
- "Are we even generating due-schedules — what % of vaccinated patients have a tracked due date?" (P3, compliance/data-hygiene)
- "Which age bands are under-covered for the primary series?" (P2, coverage gap)

### Priority
- **P1 (build first):** Wire `tbl_vaccine_duedate` → Overdue / Upcoming-due recall card + worklist + on-time adherence. Highest value, currently unbuilt, directly drives revenue + retention.
- **P2:** Dose-number funnel (series drop-off) and coverage-by-doctor leaderboard (behavioral).
- **P3:** Age-band coverage, route-mix (normalized), refusal/missed (caveated), schedule-tracking adoption.
- **Explicitly de-scoped (no data):** vaccine inventory/stock, batch/lot recall, expiry-reminder analytics — flag as "needs a stock-ledger source" rather than building empty tiles.

Reference files: builder `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/vaccination.ts` (currently doses-only; does not read `tbl_vaccine_duedate`); column map `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (lines 83-86, lists only the core 3 tables — duedate/template tables are unmapped).

---

## Obstetric & Gynec

> **Reality gate (verified live, READ-ONLY `tatva_clinic`, 2026-06):** this is the single sparsest OPD surface in the product. `tbl_case_obstetrics_history` = **66 live rows / 27 patients / 5 businesses / 7 doctors**; `tbl_case_obstetrics_history_pregnancy` = **47 live / 41 patients / 5 businesses**; `tbl_doctor_anc_scheduler` = **225 live / 27 patients / 3–4 businesses**. These are test-clinic volumes. **Ship this section as a per-OB/Gyn-doctor specialty module, gated to businesses that actually capture it — never on the multi-specialty owner hero.** Every number below is a true count, never a rate shown without its denominator, and every block must degrade to an honest "Not enough obstetric data in this period" empty state. The shipped `gynec.ts` builder today reads ONLY `tbl_case_obstetrics_history` (retrospective outcome history) — it ignores the two richer unwired tables this audit surfaced (current-pregnancy LMP/EDD and the ANC scheduler), which is where the clinical and revenue value actually sits.

### Why it matters & to whom

OB/Gyn is a **longitudinal, high-touch, high-revenue specialty**: an antenatal patient is a guaranteed 8–12 visit relationship with predictable scan/lab/delivery spend. The decision this section drives is **"who is pregnant right now, where are they in the journey, and which scheduled ANC contact is overdue."** That is a retention-and-revenue engine, not a vanity clinical chart.

- **P1 Practicing OB/Gyn (own panel)** — owns the antenatal cohort. Decision: *"Which of my pregnant patients have a missed/overdue ANC test, and who is approaching EDD?"* Lens: **Clinical-quality + Retention**. This is the persona the section is built for; if data exists at all, it exists for them.
- **P2 Specialty/Department Admin (HoD OB/Gyn)** — owns the department's antenatal book. Decision: *"What is our live pregnant-patient load, our ANC-test completion rate, and which doctor's antenatal panel is leaking follow-ups?"* Lens: **Capacity + Compliance + behavioral doctor-to-doctor variation**.
- **P3 Operational Admin / Owner (multi-specialty)** — does **not** consume this clinically. Decision: *"Is the antenatal book converting into scan/lab/delivery revenue, and where is the antenatal-package leakage?"* Lens: **Revenue + Leakage**. For P3 this collapses to one or two revenue/throughput tiles, surfaced under the OB/Gyn department only.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Obstetric patients | distinct patients with any obstetric record in period | `COUNT(DISTINCT patient_unique_id)` over history ∪ pregnancy tables | patients |
| Active pregnancies | live pregnancy records flagged pregnant, no delivery date yet | `COUNT(*) WHERE tcohp_pregnant='1' AND NOT(tcohp_delivery_date>'2000-01-01')` | count |
| Avg gestational weeks (retrospective) | mean weeks at recorded outcome; live cohort only if undelivered rows exist | `AVG(TIMESTAMPDIFF(WEEK, tcohp_last_period_date, COALESCE(delivery_date,CURDATE())))` | weeks |
| Approaching EDD (next 30d) | active pregnancies with EDD within 30 days | `COUNT(*) WHERE EDD BETWEEN CURDATE() AND CURDATE()+30 AND not delivered` | count |
| Gravida (G) | total pregnancies ever per patient (P+A+E box rows) | `COUNT(history rows) per patient` | count/patient |
| Parity (P) | pregnancies carried to delivery per patient | `COUNT(history WHERE box_type='P' AND delivery recorded)` | count/patient |
| Abortions / losses (A) | abortion box-type records | `SUM(tcoh_box_type='A')` | count |
| Ectopic (E) | ectopic box-type records | `SUM(tcoh_box_type='E')` | count |
| Outcome mix | distribution Pregnancy/Delivery · Abortion · Ectopic | `GROUP BY tcoh_box_type` | % of records |
| Delivery-mode mix | NVD vs LSCS vs Assisted (free-text, normalized) | `GROUP BY normalized(tcoh_p_delivery)` | % of deliveries |
| Multiple-pregnancy count | pregnancies with >1 fetus | `COUNT(*) WHERE tcohp_no_of_fetuses>1` | count |
| ANC tests scheduled vs done | scheduler rows by status | `SUM(anc_status=1) / COUNT(*)` per patient | tests, % |
| ANC adherence rate | completed ANC tests ÷ scheduled-and-due | `SUM(anc_status=1) ÷ SUM(due ≤ today)` | % |
| Overdue ANC tests | scheduled, due-date passed, not done | `COUNT(*) WHERE anc_test_due_from < CURDATE() AND anc_status=0` | count |
| Gynec-condition prevalence | top gynec diagnoses (free-text matched — see GAP) | ranked `diagnosis` strings, OB/Gyn doctors only | count, ranked |

### Breakdowns

- **By doctor** (P2 behavioral lens): active-pregnancy load, ANC-adherence %, overdue-ANC count per doctor — the doctor-to-doctor variation that exposes which panel is leaking follow-ups.
- **By gestational trimester** (T1 <14w · T2 14–28w · T3 >28w) — derived from LMP/EDD; drives "who needs which scan now."
- **By outcome type** (P/A/E) and **delivery mode** (NVD/LSCS/Assisted).
- **By gravida/parity bucket** (primigravida vs multigravida) — clinical risk-stratification lens.
- **By ANC test type** (First Trimester, Anomaly Scan, Doppler, etc.) — the scan/lab attach surface for revenue.

### Recommended viz

- **Antenatal cohort register (the hero, not a KPI strip):** one row per active pregnancy — patient, current gestational week (or "delivered"), EDD, next scheduled ANC test + due date, overdue flag (amber/red pill, R1 status-pill pattern). This is the single most actionable artifact and what an OB actually opens the dashboard for.
- **Trimester distribution** as a 3-bucket bar (not a pie — <5 slices but ranked bars stay scannable).
- **Outcome mix** + **delivery-mode mix** as small ranked bars (avoid pie per reference pitfall).
- **ANC adherence gauge / paired big-number** (Scheduled | Done | Overdue) — R5 paired-number pattern.
- **By-doctor ANC-adherence leaderboard** (volume bar + adherence % secondary metric, R3 pattern) for P2.
- **Gravida/parity GP-grid** small-multiple only if volume supports it; otherwise suppress.

### Data sources & feasibility

- `tbl_case_obstetrics_history` — **SPARSE-but-RELIABLE-shape**. Cols verified: `tcoh_box_type` (P/A/E), `tcoh_p_term`, `tcoh_p_weeks`, `tcoh_p_delivery` (free-text: NVD/LSCS/Normal/Assisted — needs normalization), `tcoh_p_gender`, `tcoh_p_birth_weight`, `tcoh_a_*` (abortion), `tcoh_e_*` (ectopic), `tcoh_*_multi_child_json`. Already wired in `gynec.ts`. **66 live rows.**
- `tbl_case_obstetrics_history_pregnancy` — **RELIABLE-shape, SPARSE, and CURRENTLY UNWIRED (gap).** Cols: `tcohp_pregnant` (1/0), `tcohp_last_period_date` (LMP), `tcohp_expected_delivery_date` (EDD), `tcohp_delivery_date`, `tcohp_no_of_fetuses`, `tcohp_type_of_pregnancy`. LMP/EDD/delivery 100% populated (49/49). **This is the only source of gestational weeks, EDD tracking, and multiple-pregnancy — the gynec builder ignores it today.** Wiring it is the highest-value engineering action in this section.
- `tbl_doctor_anc_scheduler` (+ `tbl_master_anc_scheduler` config) — **RELIABLE-shape, SPARSE, UNWIRED (gap).** Cols: `anc_test_name` (free-text, dirty: contains 'test ', 'name test '), `anc_start_week`/`anc_end_week`, `anc_test_due_from`, `anc_status` (0=scheduled / 1=done). **225 live rows, the only ANC-visit/adherence signal in the DB.** No builder touches it.
- `tbl_casemanager_diagnosis` (free-text `diagnosis`) — for gynec-condition prevalence. **FREE-TEXT-MESSY / DEGRADED:** ICD chapter check returned **zero O- or N-coded rows** — `icd_code` is not populated with obstetric/gynec ICD chapters at all (codes are R/numeric/junk). Gynec-condition prevalence is therefore only obtainable by **string-matching free-text diagnosis on OB/Gyn doctors' visits** — flag with low confidence in `meta.note`.
- **NOT-IN-DB:** structured menstrual history, true live antenatal-flow status, ICD-coded gynec morbidity.

### Revenue / retention / cross-sell angle

This is where OB/Gyn earns its dashboard. The clinical data is sparse but the **money it forecasts is not**:

- **ANC-test → scan/lab attach (cross-sell, P3+P2):** every `anc_test_name` (Anomaly Scan, Color Doppler, Fetal-growth scan, Blood Test) is a billable line. Join `tbl_doctor_anc_scheduler` (scheduled tests) against `tbl_opd_billing_overview` / pathology billing by patient+date to compute **scheduled-but-unbilled ANC tests = direct leakage**, and surface the **scan/lab attach rate per antenatal patient** as the clearest in-house-lab tie-up opportunity in the whole product.
- **EDD pipeline → delivery revenue (revenue forecast):** "Approaching EDD (next 30d)" is a forward revenue pipeline — each is a probable delivery-package conversion. P3's one legitimate tile here.
- **Overdue-ANC = retention leak (retention, P1/P2):** an antenatal patient is an 8–12 visit annuity; a missed scheduled ANC contact is the leading indicator of churn out of the panel (to another clinic). The overdue-ANC register is a **recall worklist**, not just a compliance chart.
- **Behavioral (doctor-to-doctor, P2):** ANC-adherence % by doctor exposes which OB consistently schedules-and-closes the antenatal protocol vs which under-documents — directly correlated to per-patient lifetime billing.

### Sample questions

- P1: *"Which of my pregnant patients are >28 weeks with an overdue scan?"*
- P1: *"Who is due to deliver in the next 30 days?"*
- P2: *"What is our department's ANC-test completion rate, and which doctor's antenatal panel has the most overdue follow-ups?"*
- P2: *"What's our active-pregnancy load and primigravida vs multigravida split this quarter?"*
- P3: *"How many scheduled ANC scans went unbilled last month (leakage), and what's the scan attach rate per antenatal patient?"*
- P3: *"How many deliveries are in the EDD pipeline for the next 30 days?"*

### Priority

**P2 (Medium) — build behind a per-business + OB/Gyn-specialty gate, not in the default OPD nav.** Within this section: **(1) wire `tbl_case_obstetrics_history_pregnancy` (LMP/EDD/gestation/EDD-pipeline) and `tbl_doctor_anc_scheduler` (ANC adherence + overdue register) — currently unwired and the entire clinical+revenue payload lives there; (2) keep the existing outcome/gravida history blocks; (3) the ANC-scheduled-vs-billed leakage join is the P3 revenue hook.** Hard prerequisites before exposing rates: enforce honest empty states at these volumes, normalize free-text `tcoh_p_delivery` and `anc_test_name`, and label gynec-condition prevalence as free-text-derived/low-confidence (no ICD coding exists).

**Surfaced GAPS:** (a) the two richest obstetric tables are unwired in `gynec.ts`; (b) no ICD-coded gynec morbidity — prevalence is free-text-only; (c) ANC test names are dirty and need a normalization map against `tbl_master_anc_scheduler`; (d) all volumes are test-clinic scale — the section must be feature-flagged per business, never aggregated to the owner hero.

Key files: builder `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/gynec.ts` (extend); endpoint `clinical/gynec` mapped in `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/analytics/shell/analyticsNav.jsx`; column map `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (entry `tbl_case_obstetrics_history` — does not yet list the pregnancy/ANC tables).

---

## ABDM / ABHA Adoption & Linkage

### Why it matters & to whom

ABHA (Ayushman Bharat Health Account) linkage is the one analytic with **zero precedent across all six reference dashboards** — it is the India-specific compliance + digital-health wedge, not a vanity metric. It serves a clear decision chain:

- **P3 Operational Admin / Owner (primary)** — owns the **compliance + growth lens**. ABHA linkage is increasingly tied to ABDM incentive schemes, HIP/HIU empanelment standing, and "digital clinic" positioning. The decision it drives: *where is linkage leaking, and which staff/department/doctor needs a nudge or SOP change to lift the clinic-wide rate?* This is a front-desk-process and target-setting decision, not a clinical one.
- **P2 Specialty / Department Admin (HoD, secondary)** — owns **doctor-vs-doctor and department-vs-department** variation. Decision: *which doctors/desks in my specialty systematically skip ABHA capture, and is it a workflow gap or a patient-mix gap (e.g., elderly walk-ins without phones)?*
- **P1 Practicing Doctor (tertiary, awareness only)** — ABHA capture is overwhelmingly a **registration/front-desk action**, not a consultation action (the link is written to `tbl_patient_master`, triggered from appointment row / All-Patients / registration form, per the capture-flow audit). The doctor sees their own panel's linked-share as context for record-portability, but it is **not a productivity lever they control**. Do not frame this as a doctor scorecard.

**Honest scope flag up front:** the live, queryable surface is a **two-state boolean snapshot** (`pm_abha_address` present = linked; `pm_abha_verify=1` = KYC-verified). **Time-to-link, link-velocity, the stage at which linking happened (registration vs booking vs consultation), and "linked-by which staff member" are NOT reliably in the analytics DB** — the timestamp/stage tables exist but carry 8–70 rows and are unwired (see feasibility). This section is therefore **DEEP on adoption/linkage-rate and segmentation, and HONESTLY THIN on velocity/attribution** — and it says so on the dashboard rather than fabricating it.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| **ABHA linkage rate (patients)** | Share of distinct patients seen in period who have an ABHA address | `linkedPatients ÷ patientsSeen` | % |
| **ABHA linkage rate (appointments)** | Share of appointments in period belonging to an ABHA-linked patient | `appts(linked patient) ÷ totalAppts` | % |
| **Patients ABHA-linked** | Distinct patients with `pm_abha_address` non-empty (seen in period) | `COUNT(DISTINCT pm where pm_abha_address<>'')` | count |
| **KYC-verified patients** | Linked patients with `pm_abha_verify=1` | `COUNT(pm_abha_verify=1)` | count |
| **KYC-verified rate (of linked)** | Verified depth among those linked | `verified ÷ linked` | % |
| **Linked but not KYC-verified** | Capture-incomplete gap (link exists, verification missing) | `linked − verified` | count |
| **Not-linked patients** | Eligible patients with no ABHA | `patientsSeen − linked` | count |
| **New-patient ABHA capture rate** | Among patients whose first visit fell in period, share linked | `linked(new) ÷ newPatients` | % |
| **Linkage-rate trend** | Linked-share by period grain (daily/weekly/monthly) | per-bucket `linked ÷ patientsSeen` | % over time |
| **Linkage rate by department** | Linked-share per `toct_id`→case-type / per doctor's specialty | grouped rate | % |
| **Linkage rate by doctor** | Linked-share across each doctor's own panel | grouped rate | % |

> **Two denominators, deliberately.** Patient-level rate answers *"how much of our base is digitized"* (P3 compliance). Appointment-level rate answers *"how much of today's footfall is ABDM-ready"* (operational throughput / HIP record-push readiness). They diverge because linked patients tend to be repeat patients — showing both prevents the front desk from gaming one number.

### Breakdowns

- **By linkage state** (3-way): KYC-verified / Linked-not-verified / Not-linked — the core funnel.
- **By department / case-type** (`toct_id` → `tbl_opd_case_type.toct_type`) and **by doctor** (`um_id` → `tbl_user_master`) — the P2/P3 variation lens.
- **By new vs returning** (`pam_type` New/Old, or first-visit derivation) — captures whether linkage happens at the *acquisition* moment (the right moment) or only after repeat visits.
- **By appointment type** — walk-in (`pam_appointment_type='Walk'`) vs booked, and video/tele (`pam_status_type_appointment IN(1,2)`) vs in-clinic — to test the hypothesis that walk-ins / elderly patients depress linkage.
- **By age band / gender** (`<18·18-30·30-45·45-60·>60`) — to separate a *process* gap from a *patient-mix* gap (older patients less likely to have/share ABHA).
- **Over time** (trend) — the only velocity proxy that is honestly available (see gap below).

### Recommended viz

- **Hero KPI strip (R2 pattern):** ABHA linkage rate (patient) as the hero number + delta-vs-prior-period tag; secondary cards: KYC-verified rate, # linked, # not-linked. Delta is **green-up** (rising linkage is good).
- **3-state funnel / stacked bar:** Not-linked → Linked → KYC-verified, so the "linked-but-unverified" leak is visually obvious (this is the cheapest win — the patient is in the door, just finish KYC).
- **Linkage-rate trend line** (single series, % over time) with the period delta — the closest legitimate stand-in for "velocity."
- **Ranked horizontal bars** for by-doctor and by-department linkage rate (avoid pies; >5 slices). Pair each volume bar with the rate % (R3 leaderboard pattern) so a high-volume low-rate desk jumps out.
- **Patient register table** (already built, 5000-row cap) with ABHA-status pills (KYC verified / Linked / Not linked) — the actionable worklist the front desk calls down to complete KYC.

### Data sources & feasibility

| Element | Table / column | Tag |
|---|---|---|
| Linked flag, KYC flag, register | `tbl_patient_master.pm_abha_address`, `pm_abha_verify` (scoped via `tbl_appointment_master` patient set) | **RELIABLE** — already live in `operational/abha` builder |
| Appointment-level rate, dept/doctor/new-vs-old/type breakdowns | `tbl_appointment_master` (`patient_unique_id`, `um_id`, `toct_id`, `pam_type`, `pam_appointment_type`, `pam_status_type_appointment`) ⋈ patient ⋈ `tbl_opd_case_type` ⋈ `tbl_user_master` | **RELIABLE** — joins already used elsewhere; **net-new aggregation** (current builder is patient-totals + register only) |
| Linkage trend | derive linked-share per bucket over `pam_app_date` | **RELIABLE-derived** — net-new |
| **Time-to-link / link velocity (precise)** | `tbl_abha_hip_link_master.tahlm_created_date`, `tbl_patient_abha_with_hospital.createdAt/tokenCreatedAt` | **SPARSE / NOT-WIRED** — 8 and 70 rows respectively; **not in the analytics column map**; cannot support a clinic-wide metric today |
| **Stage at which linked (registration/booking/consultation)** | richer-than-mapped: `tbl_appointment_master.abha_token`, `tbl_case_manager.abha_context_link`/`abha_visit_id`, `tbl_abdm_webhook_logs` | **NOT-IN-DB as analytics** — stage events live in the ABHA microservice store, not `tatva_clinic`; appointment/consultation columns exist in raw schema but are unmapped and unverified |
| **Linked-by (doctor vs receptionist)** | no `linked_by` / actor column on `pm_abha_*`; capture is triggered from multiple UI surfaces but the actor is not persisted to `tatva_clinic` | **NOT-IN-DB** |

**Surfaced gaps (state explicitly on the dashboard — do not silently omit):**
1. **No time-to-link.** "AVG TIME-TO-LINK" cannot be computed reliably — the only timestamps are in 8–70-row side tables. **Recommendation:** show a `meta.note` ("Link velocity not yet instrumented") and use the **linkage-rate trend** as the interim velocity proxy. To unlock it, the analytics layer would need to map `tahlm_created_date` (or `tbl_patient_abha_with_hospital.tokenCreatedAt`) **and** the ABHA service would need to backfill those tables (currently near-empty).
2. **No link-stage.** Whether ABHA was captured at registration, booking, or consultation is not queryable from `tatva_clinic`. **Interim proxy:** compare linked-share of *new* patients (first visit in period) vs returning — high new-patient capture implies registration-stage capture is working; low new + high returning implies linkage is happening late/opportunistically.
3. **No "linked-by" actor.** Doctor-vs-receptionist attribution is impossible without a `linked_by` column. **Interim:** attribute by the patient's *attending doctor/department* as a proxy for *where in the clinic* linkage correlates — explicitly labelled a correlation, not an actor.

### Revenue / retention / compliance angle

- **Compliance & incentive (P3, primary lens):** ABHA linkage is the eligibility gate for ABDM digital-health-mission incentives and for credible "fully-digital clinic" positioning. The **linked-but-not-KYC-verified** count is found money — these patients are one OTP away from compliance; a front-desk SOP to complete KYC at the next visit converts the cheapest possible gain. Set a clinic linkage-rate target and track the trend delta against it.
- **Retention (genuine, not forced):** an ABHA-linked, KYC-verified patient carries a **portable longitudinal record into your EMR** — every linked patient is structurally stickier (their history lives with you), which is a real retention asset for the owner. Rising linkage among *new* patients is therefore both a compliance and a retention leading-indicator.
- **No revenue/cross-sell fabrication:** ABHA linkage does **not** directly drive lab tie-up or pharmacy attach revenue — claiming so would be invented. The honest revenue connection is **indirect and downstream**: ABHA-linked records enable HIP record-push and HIU consent-based fetch (M2/M3 flows exist in the FE), which improves cross-visit continuity and reduces duplicate registration leakage. Keep this as a stated secondary benefit, not a headline KPI.
- **Behavioral (doctor/department variation):** the **by-doctor and by-department linkage-rate bars are the actionable behavioral signal.** Wide variation at similar patient mix = a process/training gap at specific desks, not a patient problem — the single most useful output for P2/P3. Always show it next to patient volume so a high-volume low-linkage desk (the biggest leak) is unmistakable.

### Sample questions

- *(P3)* "What's our clinic-wide ABHA linkage rate this month, and is it up or down vs last month?"
- *(P3)* "How many patients are linked but not KYC-verified — i.e., our cheapest compliance win?"
- *(P3)* "Is ABHA being captured at first registration, or only after patients become repeat visitors?" *(answered via new-vs-returning proxy)*
- *(P2)* "Which doctors/desks in my department have the lowest linkage rate at comparable patient volume?"
- *(P2)* "Do walk-ins and over-60 patients drag down our linkage rate — process gap or patient-mix gap?"
- *(P1)* "What share of my own panel has a linked ABHA record?" *(context, not a target)*
- *(GAP — flagged, not answerable today)* "What's our average time-to-link, and who linked each patient — doctor or receptionist?"

### Priority

**P1 (build now) — strategic differentiator, low cost.** The core (patient-rate, appointment-rate, 3-state funnel, KYC gap, trend, by-doctor/department/new-vs-old breakdowns, register with status pills) is **fully feasible on the already-RELIABLE `pm_abha_*` fields** and is a modest aggregation extension of the live `operational/abha` builder — no new data dependency. It is also the **only KPI family with no competitive precedent** in the reference set, making it disproportionately high-leverage for owner positioning. **Defer to P3/backlog:** time-to-link, link-stage, and linked-by — explicitly blocked on ABHA-service instrumentation + column-map additions; ship the honest `meta.note` now and revisit when those side tables are populated.

---

Spec section delivered above as markdown. Grounding verified against the live builder at `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/operational.ts` (lines 316–369, the `abha` case) and the column map at `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (line 35) — confirming only `pm_abha_address` + `pm_abha_verify` are mapped/queryable, and that the link-timestamp/stage/actor data is genuinely absent from the analytics surface (flagged honestly rather than fabricated).

---

## Certificates

### Why it matters & to whom

Certificates (fitness, leave, travel, visa, COVID) are a **silent revenue-and-compliance surface**: every issued certificate is a billable, doctor-attributable, legally-significant document — yet most clinics issue them off-the-record, never charge for them, and have no visibility into who issues what. This section turns the issued-certificate log into a productivity, leakage, and medico-legal-compliance lens.

- **P3 — Operational Admin / Owner (multi-specialty).** Primary owner. Decision: *Are we leaking revenue on un-billed certificates, and which doctors/departments are the volume drivers?* Lens: **Leakage + Revenue + Compliance**. A finished OPD visit that produced a fitness/leave certificate but no certificate line on the bill is recoverable revenue; an issued certificate with no template/standard content is a medico-legal exposure.
- **P2 — Specialty / Department Admin (HoD).** Decision: *Within my department, is certificate-issuing concentrated in one or two doctors (a behavioral/compliance outlier), and is the certificate type-mix appropriate for our specialty?* Lens: **Behavioral (doctor-vs-doctor) + Clinical-quality**. A GP issuing 4× the leave-certificates of peers per 100 visits is either a magnet for sick-note seekers or an over-issuer — both are HoD conversations.
- **P1 — Practicing Doctor (own panel).** Decision: *What is my own certificate footprint, and am I using approved templates?* Lens: **Productivity + Compliance**. Lets a doctor self-audit free-text vs template-backed issuance.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Certificates issued | Count of live issued-certificate events in period | `COUNT(*) WHERE tcu_del=0 AND tcu_created_date∈[start,end]` (scoped `hm_business_id`) | count |
| Patients certified | Distinct patients receiving ≥1 certificate | `COUNT(DISTINCT patient_unique_id)` | count |
| Top certificate type | Most-issued resolved type | `MODE of COALESCE(NULLIF(tcu_title,''), cd.title)` | label |
| Type concentration | Share held by the single top type | `top_type_count ÷ total` | % |
| Certificates per issuing doctor | Volume normalized by active issuers | `total ÷ COUNT(DISTINCT um_id)` | count/doctor |
| Issuance rate per 100 finished visits | Certificate intensity vs throughput | `100 × certs_on_status3_appts ÷ finished_visits` (doctor- or dept-scoped) | per 100 |
| Template-backed rate | Share linked to an approved template (compliance) | `COUNT(tcu_content_id>0) ÷ total` | % |
| Free-text / untitled rate | Compliance-risk inverse | `COUNT(tcu_title IS NULL OR junk) ÷ total` | % (red-up) |
| Appointment-linked rate | Share attributable to a specific visit (billing hook) | `COUNT(pam_id>0) ÷ total` | % |
| **Un-billed certificate count (GAP)** | Finished visits with a certificate but no certificate bill-line | see Leakage angle | count — **Verify** |

### Breakdowns

- **By certificate type** (resolved: `COALESCE(NULLIF(tcu_title,''), tbl_certificate_document.title)` — this recovers the 132 NULL titles, e.g. 64 NULL→Medical Fitness, 24 NULL→Medical Leave).
- **By doctor** (`um_id` → `tbl_user_master.um_name`) — leaderboard, the behavioral lens. Volume is highly concentrated in the live data (top issuer 193 of 554).
- **By specialty / department** (`um_id` → `tbl_user_master.speciality`) — the P2 lens; **not** via appointment, because 46% of rows lack `pam_id`.
- **By trend** (`tcu_created_date`, weekly/monthly).
- **Type × specialty matrix** (which types each department issues — e.g. travel/visa concentrated where).

### Recommended viz

- **Hero KPI strip** (P3): Certificates issued (with vs-prior delta) · Patients certified · Certificates/100 finished visits · Free-text rate (red-up).
- **Ranked horizontal bars** for type-mix (not a pie — clean types are 4–5 meaningful + a long junk tail; bars expose the junk honestly).
- **Top-N doctor leaderboard** with a secondary compliance metric beside the volume bar (volume bar + template-backed % tag) — the R3 pattern.
- **Type × specialty heat grid** for HoD.
- **Trend line** with the legal-risk free-text % as a faint second series.

### Data sources & feasibility

| Element | Table / column | Tag |
|---|---|---|
| Issued-certificate event (the spine) | `tbl_certificate_upgrade` (554 live rows, `tcu_del=0`; 29 businesses, 125 patients, 33 doctors, 2023-06→2026-06) | **RELIABLE-LOW-VOLUME** (real per-patient issuance; test-clinic volumes) |
| Certificate type | `tcu_title`, with fallback `tcu_content_id` → `tbl_certificate_document.title` | **FREE-TEXT-MESSY** — 132/554 NULL titles + junk ('test','x','0'); COALESCE with template title is the fix, only 77/554 lack a template link |
| Issuing doctor | `tbl_certificate_upgrade.um_id` → `tbl_user_master.um_name` | **RELIABLE** (only 3/554 missing `um_id`) |
| Specialty / department | `um_id` → `tbl_user_master.speciality` | **RELIABLE** (doctor-derived; do NOT derive from appointment) |
| Issue timestamp / trend | `tcu_created_date` | **RELIABLE** (100% populated) |
| Appointment / visit link | `tcu_pam_id` → `tbl_appointment_master.pam_id` | **SPARSE/PARTIAL** — only 300/554 have `pam_id`; of those, 190 are status=3 (Finished) |
| Template library (denominator/config) | `tbl_certificate_document` (196 template rows) | **RELIABLE** (config only — what *could* be issued) |
| Certificate billing line (leakage) | OPD billing service-line tables (`tbl_opd_billing_invoice_service`) | **NOT-IN-DB as a tagged certificate charge** — see GAP below |

**Correction to grounding:** the backend audit flagged Certificates as *NOT-IN-DB (templates only)*. That is **wrong** — verified live: `tbl_certificate_upgrade` is a genuine per-patient, per-doctor, timestamped **issued-certificate event table** (553 of 554 doctor-attributable). It is simply unflagged in `db-check.js` and untouched by any builder. **This is unused, RELIABLE-but-low-volume data and should be promoted to a real `clinical/certificates` or `operational/certificates` builder.**

### Revenue / leakage / cross-sell angle (make it explicit)

- **Leakage (the headline P3 dollar):** Certificates are frequently issued free. Join issued certificates on status-3 appointments to the OPD bill for that `pam_id`/visit and flag those with **no certificate service-line** = recoverable, un-billed certificate revenue. The hook exists (190 certs sit on finished, billable visits); whether a certificate line-item *type* exists in the billing service-line catalog is **Verify** — if absent, the finding becomes "certificates are structurally un-billable today," which is itself an actionable owner insight (add a certificate SKU to `tbl_opd_billing_invoice_service`).
- **Pricing cross-sell:** Travel + Visa certificates (53 combined) are premium, often paid-out-of-pocket, fast-turnaround documents — flag clinics issuing them free as immediate priced-product opportunities.
- **Retention signal:** Leave/fitness certificate seekers are a recurring, predictable footfall segment; certified patients with repeat certificates over time are a low-cost retained base worth a recall campaign.

### Behavioral angle (doctor-to-doctor variation)

`certificates-per-100-finished-visits` by doctor is the core behavioral metric. Live data shows extreme concentration (one doctor at 193 issuances vs the median doctor in single digits). For an HoD this surfaces (a) an over-issuer / sick-note magnet warranting a compliance check, and (b) a free-text laggard (low template-backed %) creating medico-legal exposure. Pair every doctor's volume bar with their template-backed % so volume and quality are read together.

### Sample questions

- (P3) "How many certificates did we issue last quarter, what's the type-mix, and how many of those sat on a finished visit that we never billed?"
- (P3) "What share of issued certificates use free-text instead of an approved template — and is that share rising?"
- (P2) "In my department, is certificate issuance concentrated in one doctor, and is the type-mix appropriate for our specialty?"
- (P1) "How many certificates have I issued this month, and am I using standard templates?"
- (P3) "Are we giving away Travel/Visa certificates for free?"

### Priority

**P2 (Medium).** The data is real, doctor-attributable, and uniquely tied to a recoverable-revenue + compliance story no reference dashboard covers — but **low absolute volume** (554 lifetime rows in a test clinic) caps near-term impact and the title field needs the COALESCE cleanup. Build it as a lightweight leaderboard + leakage flag once a billing certificate-SKU is confirmed; **the un-billed-certificate leakage join is the single highest-value follow-up to verify.**

---

**Verified live facts (read-only, `tatva_clinic`):** `tbl_certificate_upgrade` = 554 live / 79 deleted rows; types: Medical Fitness 107, Medical Leave 103, Travel 39, Visa 14, plus 132 NULL (recoverable via template join) and test junk; 3/554 missing doctor, 254/554 missing appointment link; spans 29 businesses / 33 doctors. **Files:** issued-certificate table unflagged in `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js`; FE write flow at `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/ApiMedicalCertificate.js` (`addPatientCertificate`/`listPatientCertificate` on appointment API); no builder exists yet under `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/`.

---

## Pending Digitization (Documentation Compliance Backlog)

> **CRITICAL DATA-FEASIBILITY FLAG (read first).** Pending-digitization is **NOT a status, column, or timestamp in `tatva_clinic`** — the analytics read-replica this spec is built on. Verified against the live column map (`pm-analytics-service/scripts/db-check.js`) and the EMR flow (`Pm-Doctor-Portal/src/components/AppointmentData.js`): the "Pending Digitisation" tab is a **derived frontend view** — `ApiAppointments.getAllUnDigitisedAppointmentsList()` calls `/api/v1/digitization/undigitizedAppointments/list` on the **SnapRx / rx-digitization microservice** (`config.snap_rx_api_url`), gets a list of undigitized appointment IDs, then re-queries **finished appointments (`pam_status='3'`)** filtered by those IDs (`cvtAppointmentIdsStr`). There is no `pam_status` code for it, no `digitization_status` column, and no digitized-at timestamp in any analytics table. **`VisitService.syncDigitizationStatus` does write a status back to the visit-api source DB, so the raw signal exists somewhere — but it is not in the analytics column map and not read by any builder.** Therefore every KPI below is **BLOCKED pending one of two backend actions**: (a) expose a read/aggregate endpoint on the SnapRx service, or (b) materialize the digitization-status + digitized-timestamp into the analytics replica. **Turnaround (digitized-at − finished-at) is impossible today — no digitized-at timestamp is captured anywhere readable.** This section is therefore a **build-ready contract**, not a wire-it-today dashboard. Do not ship sample numbers as if live.

### Why it matters & to whom

A finished consultation that is never digitized is **revenue and clinical value already earned but not booked into the digital record** — the doctor saw and (presumably) billed the patient, but the structured Rx, diagnosis, and investigation data never lands. That backlog silently breaks three things the rest of this analytics platform depends on: ABHA/ABDM compliance (you cannot push an undigitized visit), every clinical dashboard (diagnosis/drug/lab builders read `tbl_case_manager` — undigitized visits are invisible to them, **systematically under-counting clinical volume and over-stating per-doctor leakage**), and cross-sell loops (no digitized Rx → no pharmacy attach, no lab tie-up). It is the single compliance metric none of the six reference dashboards cover — an India/EMR-specific edge.

- **P3 Operational Admin / Owner (primary owner).** LENS: **Compliance + Leakage + Productivity.** DECISION: where is documentation debt accumulating, is it growing or shrinking week-on-week, and which doctor/specialty needs an intervention (reminder nudge, scribe support, or a policy SLA). This is an ops-admin compliance instrument first.
- **P2 Specialty / Department Admin (HoD).** LENS: **Compliance + Behavioral (doctor-vs-doctor).** DECISION: which doctor in my department is the chronic backlog driver, and is it a workload problem (high-volume doctor) or a discipline problem (low-volume, still behind). Drives the doctor-level coaching conversation.
- **P1 Practicing Doctor (own panel).** LENS: **Compliance + Productivity (self).** DECISION: "how many of my own finished visits are still undigitized, and how stale are they" — a personal to-do nudge, not a surveillance metric. Scoped strictly to `um_id = self`.

### KPIs

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| Pending-digitization backlog | Finished visits (status 3) flagged undigitized by SnapRx, open as of now | `COUNT(undigitized finished appts)` | count |
| Backlog rate | Share of finished visits not yet digitized | `pending ÷ COUNT(status=3 in period)` | % (red-up) |
| Avg digitization turnaround | Time from visit-finish to digitization-complete (**closed items only**) | `AVG(digitized_at − pam_app_datetime)` | hours |
| P90 turnaround | 90th-percentile turnaround (tail, not mean) | `PERCENTILE(turnaround, 0.90)` | hours |
| Aged backlog (>48h / >7d) | Open pending items past an SLA threshold | `COUNT(pending WHERE now − finish > 48h)` | count |
| Worst doctor (backlog) | Doctor with highest open-pending count and rate | `MAX by um_id (pending count, pending rate)` | name + count + % |
| Worst specialty (backlog) | Specialty/dept with highest pending rate | `MAX by specialty (pending ÷ finished)` | name + % |
| Backlog trend | Open-pending count over time (daily/weekly) | `COUNT(pending) by grain` | count series |
| Digitized-this-period (clearance) | Items that moved pending → digitized in window | `COUNT(digitized_at IN period)` | count |
| Net backlog change | Inflow (new finished-undigitized) − clearance | `new_pending − digitized_this_period` | ± count |

Backlog count, avg turnaround, worst doctor, worst specialty, and trend are the **owner-focus core** called out in the brief; the rest (rate, P90, aged buckets, clearance, net change) are the supporting compliance framing that turns a vanity count into an actionable, trending SLA metric.

### Breakdowns

- **By doctor (`um_id` → `tbl_user_master`):** open count + backlog rate + avg turnaround + oldest open item. The behavioral lens — **normalize by the doctor's finished-visit volume** so a high-throughput doctor isn't unfairly flagged.
- **By specialty / department (`dp_id`):** rate-ranked, for HoD comparison.
- **By age bucket:** `<24h · 24–48h · 48h–7d · >7d` — separates "normal end-of-day catch-up lag" from genuine abandoned documentation.
- **By capture mode (if SnapRx exposes it):** SnapRx vs VoiceRx vs SmartSync vs manual — tells the owner whether a *tooling* gap (e.g. one mode chronically lags) drives the backlog.
- **By visit recency / inflow-vs-outflow:** today's new pending vs cleared, to read momentum.

### Recommended viz

- **Hero strip (R2 pattern):** Backlog count (delta, **red-up**), Backlog rate %, Avg turnaround (hours), Aged-backlog >48h count. Each with explicit "vs previous period" baseline.
- **Backlog trend** — line/area, daily or weekly, with the SLA threshold drawn as a reference line. Optionally dual-series inflow vs clearance to show whether the team is keeping up.
- **Worst-doctor leaderboard (R3 pattern):** horizontal bars of open-pending count with **backlog-rate % as the secondary metric beside the bar** — red/amber negative theme. Avoids penalizing volume by showing rate next to raw count.
- **Aged-backlog stacked bar** by age bucket per doctor/specialty.
- **Pending register table** with status pills (R1): patient, doctor, specialty, finish date, age (hrs), capture mode — the actionable worklist ops can act on directly.
- **Pitfall guard:** color-only red is insufficient — pair with an up-arrow/sign for "bad-and-rising" (accessibility), and never render this as a pie.

### Data sources & feasibility (tag each)

- **Undigitized appointment IDs** — `/api/v1/digitization/undigitizedAppointments/list` on **SnapRx / rx-digitization service** (`config.snap_rx_api_url`). **NOT-IN-DB (external microservice).** This is the *only* authoritative source of "what is pending." Today it is a per-doctor frontend call returning a live list — **no historical/aggregate/turnaround endpoint exists.**
- **Finished-visit denominator** — `tbl_appointment_master` (`pam_status='3'`, `pam_del=0`, `hm_business_id`, `um_id`, `pam_app_date`/`pam_app_time`). **RELIABLE** (analytics replica).
- **Doctor identity** — `tbl_user_master` via `um_id`. **RELIABLE.**
- **Specialty / department** — `dp_id` on appointment/consultation. **RELIABLE-but-verify** the dept→specialty label join exists in the replica.
- **Digitized-at timestamp (for turnaround)** — **NOT-IN-DB / BLOCKED.** No digitized-completion timestamp is mapped in `db-check.js` or read by any builder. `pam_modify_date` exists but is a generic row-modify stamp, **not** a digitization-complete marker — do not proxy turnaround with it without confirming semantics, or the metric will be silently wrong.
- **Draft (`is_draft=1` on `tbl_case_manager`)** — a **distinct, adjacent** documentation-incompleteness signal (consultation saved but not finalized), **NOT the same as pending-digitization** (which is a *finished* visit not yet digitized). Verify whether `is_draft` is materialized in the replica before combining; the column map lists only `tcm_id, tcm_datetime, tcm_investigation, tcm_followup_date, tcm_del` — **`is_draft` is NOT in the current map → treat as NOT-IN-DB until added.**

**Required backend work to unblock (build contract):** Either (a) add a SnapRx read endpoint returning `{appointment_id, finished_at, digitized_at|null, doctor_id, mode}` rows for a date range (enables backlog, turnaround, clearance, trend in one shot), **or** (b) have `syncDigitizationStatus` persist `digitization_status` + `digitized_at` onto the appointment/consultation row in the source DB and add both to the analytics replica + column map. (a) is preferred — it owns the turnaround clock natively.

### Revenue / retention / cross-sell angle

Pending-digitization is a **direct leakage signal**, not a soft compliance nicety:

- **Billing-vs-documentation reconciliation (leakage):** join undigitized finished visits to `tbl_opd_billing_overview`. A finished, **billed**, but **undigitized** visit = revenue captured with zero structured clinical record — the highest-risk audit/compliance bucket and a clean cross-sell *miss* (no Rx → no pharmacy attach, no investigation → no lab tie-up). A finished, **undigitized, unbilled** visit is potential *outright* revenue leakage (visit happened, neither billed nor recorded) — flag both as separate buckets.
- **Cross-sell suppression:** every undigitized visit is a Rx/diagnosis/investigation that the pharmacy-attach and lab tie-up loops (built elsewhere in this spec from `tbl_medicine_report` / `tbl_casemanager_diagnosis` / `tcm_investigation`) **never see** — so backlog *understates* attach opportunity. Clearing backlog mechanically grows the addressable cross-sell base.
- **Clinical-dashboard correction:** because diagnosis/drug/lab builders read `tbl_case_manager`, a doctor with a large digitization backlog will look artificially low-volume on every clinical metric. Surfacing backlog lets the owner **deflate** those comparisons fairly.

### Behavioral angle (doctor-to-doctor variation)

The worst-doctor / worst-specialty cut is explicitly behavioral. The decision-grade question is **rate, not raw count**: a 200-visit/week doctor with 15 pending is healthier than a 20-visit/week doctor with 15 pending. Plotting backlog-rate against finished-volume per doctor separates the three intervention types the HoD actually needs to distinguish — **workload-driven lag** (high volume, moderate rate → needs scribe/tooling), **discipline gap** (low volume, high rate → needs coaching/SLA), and **tooling mismatch** (backlog concentrated in one capture mode → fix the tool). This is the same R3 leaderboard-with-secondary-metric pattern, applied to compliance.

### Sample questions

- "What is our open documentation backlog right now, and is it growing or shrinking vs last week?" (P3)
- "Which doctor has the worst backlog *rate* once we adjust for how many patients they actually saw?" (P2/P3)
- "How long does a finished visit typically sit before it's digitized — and what's the worst 10% tail?" (P3)
- "How many undigitized visits were already *billed* — i.e. money booked with no clinical record?" (P3, leakage)
- "Is one specialty or one capture mode (SnapRx vs VoiceRx) dragging the whole clinic's compliance down?" (P2/P3)
- "How many of *my own* finished visits are still pending, and which are oldest?" (P1)

### Priority

**P1 — high-value, but BLOCKED on backend.** This is the brief's explicitly requested owner-compliance instrument and a genuine differentiator (no reference dashboard has it). However it **cannot be built against the current analytics replica** — the pending signal lives only in the SnapRx microservice and the turnaround clock has no readable timestamp. **Recommended sequencing:** ship the backend contract (option (a) SnapRx aggregate endpoint) first; until then, the only honest live metric is **backlog count + backlog rate via a live per-period call to the undigitized-list endpoint joined to finished-visit counts** — turnaround, P90, aged buckets, and clearance must be marked "pending instrumentation" rather than rendered with placeholder data.

---

Verification notes (all confirmed live, not assumed):
- Pending-digitization derivation confirmed in `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/components/AppointmentData.js` (`isDigitisationTab`, `getAllUnDigitisedAppointmentsList`, `cvtAppointmentIdsStr` filtering `apStatue:3`) and endpoint in `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/ApiAppointments.js:177` (`/api/v1/digitization/undigitizedAppointments/list`).
- `VisitService.syncDigitizationStatus` exists at `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/VisitService.js:18` — a status IS written back to the visit-api source, so the raw signal exists upstream, but it is absent from the analytics column map.
- No `digitiz`/`draft`/`is_draft`/`tpvl`/`patient_visit_logs`/digitized-timestamp column appears anywhere in `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js` (full 156-line map checked). `tbl_case_manager` map lists only `tcm_id, patient_unique_id, um_id, hm_business_id, tcm_datetime, tcm_investigation, tcm_followup_date, tcm_del` — so `is_draft` and any digitized-at are NOT-IN-DB in the replica today.

---

## AI Agents (Symptom Collector & Appointment Booking)

> **Source-verification verdict (read this first — it governs every KPI below).** This section covers two distinct "AI agent" surfaces, and they live in **two different places** with **two very different feasibility profiles**. I verified both against code, not assumptions.
>
> 1. **Symptom Collector** — a **SEPARATE microservice**, NOT in `tatva_clinic`. The EMR talks to it via `config.symptoms_collector_api_url` through `/api/v1/agents/get-symptoms`, `/api/v1/agents/get-appointment-ids`, `/api/v1/agents/set-add-to-rx` (verified in `src/api/services/ApiGenRx.js` L160-220 and the mobile twin `ApiGenRxMobile.js`). The doctor-portal only **consumes** a pre-built summary (`summary_json_doctor`, keyed by `_id`, joined to a visit by `pam_id`) and writes back a single "added to Rx" acknowledgement (`set-add-to-rx`). The collector's own store (which patient got the link, did they open it, did they submit, the raw symptom payload) is **NOT-IN-DB** for the read-only analytics replica. The backend confirms this honestly: `engagementDashboard()` in `pm-analytics-service/src/analytics/analytics.service.ts` L101-107 **throws `NotImplementedException`** ("symptom-collector → symptoms_collector_api store. Contract §5"). **No builder, no endpoint, no table today.**
> 2. **Appointment Booking agent** — this is the **only AI-agent signal that exists inside `tatva_clinic`**: `tbl_appointment_source` (4,608 rows, `pam_id` ⋈ `tas_source`) carries `APPOINTMENT_AGENT`=680, `KEA`=1,432, `CREATE_APPOINTMENT_SCREEN`=2,079 (receptionist/front-desk), `CHIKITSALY-PORTAL`=268, `VISIT-PATIENT-APP`=149. This is **RELIABLE-but-PARTIAL** (~17% of 26,836 appts, recent rows only) and is **currently read by NO builder** — a free, high-value lens sitting unused. Walk-in is a separate axis: `pam_appointment_type='Walk'` on `tbl_appointment_master` (RELIABLE).
>
> **Honest dependency statement:** every Symptom-Collector funnel KPI (assigned → clicked → submitted → completed) requires a **new cross-service read** into the agents microservice DB (mirror the `engagement/*` contract §5). Until that connection ships, those KPIs are **un-buildable from `tatva_clinic`** and must be marked as a roadmap dependency, not a deliverable. The Booking-agent KPIs **are** buildable today from `tbl_appointment_source` + `tbl_appointment_master`.

### Why it matters & to whom

The AI agents are TatvaCare's product wedge — they exist to (a) move clerical symptom capture **off the doctor** and into a pre-visit agent, and (b) divert booking volume **away from human receptionists** toward automated channels. Both promises are only credible if measured.

- **P3 Operational Admin / Owner** is the primary persona. Owner-level questions: *Is the AI booking agent actually converting, or is it just shadowing the receptionist? What share of bookings did I automate, and what did it cost vs front-desk staff time? Is the symptom collector reaching the patients I assigned it to, or leaking at the click?* This is a **Capacity / Leakage / cost-to-serve** lens — agent adoption directly substitutes labour and front-desk throughput.
- **P2 Specialty/Department Admin (HoD)** uses the **doctor-to-doctor behavioral lens**: which doctors in my department actually open the symptom-collector summary and accept it into the Rx (`set-add-to-rx`) vs which ignore it. Low acceptance = the agent is generating output nobody trusts — a training/product signal, not a patient signal.
- **P1 Practicing Doctor (own panel)** cares narrowly: *of my assigned patients, how many arrived with a completed symptom summary, and did using it save me documentation time / improve note completeness?* A **Productivity** lens.

**Booking conversion** (booked-via-agent vs receptionist vs walk-in; new vs follow-up) is a **Revenue/Capacity** decision for P3: every booking the agent closes that a receptionist didn't is recovered staff capacity, and the new-vs-follow-up split tells the owner whether the agent acquires (new) or merely retains (follow-up).

### KPIs

Tag legend per KPI row: **[BUILDABLE]** = derivable today from `tatva_clinic`; **[BLOCKED]** = needs the symptom-collector microservice read connection (does not exist yet).

| KPI | Definition | Formula | Unit |
|---|---|---|---|
| **Bookings by source** [BUILDABLE] | Appt count split by booking channel | `COUNT(*) GROUP BY tas_source` over `tbl_appointment_source ⋈ tbl_appointment_master` (scope `pam_del=0`, date) | count |
| **AI-agent booking share** [BUILDABLE] | Automation rate of booking | `COUNT(tas_source='APPOINTMENT_AGENT') ÷ COUNT(all sourced appts)` | % |
| **Receptionist vs agent vs walk-in mix** [BUILDABLE] | Three-way channel mix | agent = `tas_source='APPOINTMENT_AGENT'`; receptionist = `tas_source='CREATE_APPOINTMENT_SCREEN'`; walk-in = `pam_appointment_type='Walk'` (no source row) | % share |
| **Agent-booking conversion (show rate)** [BUILDABLE] | Agent-booked appts that completed | `COUNT(agent ∧ pam_status=3) ÷ COUNT(agent ∧ pam_status IN(0,3,4))` | % |
| **Agent-booking cancellation rate** [BUILDABLE, red-up] | Agent bookings cancelled | `COUNT(agent ∧ pam_status=4) ÷ COUNT(agent total)` | % |
| **New vs follow-up via agent** [BUILDABLE] | Acquisition vs retention split of agent bookings | join `toct_id → tbl_opd_case_type.toct_type`; cross-check `pam_type` New/Old | % / ratio |
| **Source coverage (data-honesty KPI)** [BUILDABLE] | Share of appts that have ANY source row | `COUNT(DISTINCT pam_id in tbl_appointment_source) ÷ COUNT(appts)` | % |
| **Symptom-collector: doctors assigned** [BLOCKED] | Distinct doctors with ≥1 collector-enabled patient | `COUNT(DISTINCT um_id)` from agents store | count |
| **Symptom-collector: patients assigned → clicked** [BLOCKED] | Patients who opened the collector link | `clicked ÷ assigned` (agents store event log) | % funnel |
| **Submissions received** [BLOCKED] | Completed patient submissions | `COUNT(submissions)` / `submitted ÷ clicked` | count / % |
| **Collector completion rate** [BLOCKED] | End-to-end funnel | `submitted ÷ assigned` | % |
| **Doctor acceptance rate (add-to-Rx)** [PARTIAL] | Collector summaries the doctor pulled into the Rx | `COUNT(set-add-to-rx fired) ÷ COUNT(summaries served)` — **acknowledgement is sent FROM the EMR but landing table unconfirmed; verify whether it persists in `tatva_clinic` or only the agents store** | % |

**Reasoning carried per group (not a dump):**
- *Bookings-by-source / agent share / channel mix* — **WHO:** P3 owner. **DECISION:** staffing & automation ROI — if agent share is rising while receptionist share falls at constant volume, front-desk hours can be reallocated. **LENS:** Capacity/Leakage.
- *Agent conversion & cancellation* — **WHO:** P3. **DECISION:** is the agent booking *quality* volume or junk that no-shows? A high agent-cancellation rate vs receptionist is a product-quality red flag (red-up coloring). **LENS:** Revenue/Capacity.
- *New vs follow-up via agent* — **WHO:** P3 + P2. **DECISION:** position the agent — if it skews follow-up it's a retention tool; if new, an acquisition tool; staff the funnel accordingly. **LENS:** Retention vs Acquisition.
- *Source-coverage* — a deliberate **honesty KPI**: with only ~17% of appts sourced, every channel %% above must be read "of sourced appts," not "of all appts." Surfacing coverage prevents the owner over-reading a partial dataset.
- *Collector funnel (assigned→clicked→submitted→completed)* — **WHO:** P3 owns reach, P1 owns the per-panel benefit. **DECISION:** where does the funnel leak — assignment, the patient click, or submission? — which routes the fix (more assignment vs better link UX vs shorter form). **LENS:** Productivity/Compliance. **All BLOCKED on the microservice read.**
- *Doctor acceptance (add-to-Rx)* — **WHO:** P2 HoD. **DECISION:** behavioral trust signal; doctor-to-doctor variation in acceptance tells the HoD whom to coach. The write exists (`setAddToRx`), so this is the **closest-to-buildable** of the collector metrics — pending a check of where that ack lands.

### Breakdowns

- **By booking source** (`tas_source`: APPOINTMENT_AGENT / KEA / CREATE_APPOINTMENT_SCREEN / CHIKITSALY-PORTAL / VISIT-PATIENT-APP) — primary axis.
- **By doctor (`um_id`)** — for the doctor-to-doctor acceptance/assignment behavioral comparison (P2).
- **By specialty/department** — roll `um_id` up to specialty for HoD oversight.
- **New vs follow-up** (`toct_type` / `pam_type`).
- **Over time** (`pam_created_date` grain day/week/month) — agent-share trend is the headline adoption curve.
- **Collector funnel stage** (assigned / clicked / submitted) — BLOCKED until the agents store is connected.

### Recommended viz

- **Stacked-bar booking-channel mix over time** (agent / receptionist / walk-in / portal) — the owner's adoption headline; matches reference R4/R5 In/Out stacked-bar pattern. Avoid a pie (>5 slices, R6 pitfall).
- **Funnel chart** for the symptom collector (Assigned → Clicked → Submitted → Completed) with drop-off % at each step — rendered as a **disabled/"coming soon" placeholder** today with an explicit `meta.note` that the data source is the external agents service.
- **Doctor leaderboard** (R3 pattern): bar = collector summaries served per doctor, secondary metric beside it = acceptance % (`add-to-Rx`). Pairs volume with a quality metric.
- **KPI strip** (R2 pattern: value + delta tag + "vs prev period"): Agent booking share, Agent conversion, Collector completion (blocked → grey/"pending source").
- Booking-source coverage shown as a small inline data-quality chip, not a hero card.

### Data sources & feasibility

| Surface | Table / endpoint | Flag |
|---|---|---|
| Booking channel (agent/receptionist/portal/app) | `tbl_appointment_source` (`pam_id`, `tas_source`, `tas_created_date`) ⋈ `tbl_appointment_master` | **RELIABLE-but-PARTIAL** (~17% coverage; recent rows). No builder yet — **net-new, low-effort.** |
| Walk-in axis | `tbl_appointment_master.pam_appointment_type='Walk'` | **RELIABLE** |
| Status / conversion | `tbl_appointment_master.pam_status` (0/3/4) | **RELIABLE** |
| New vs follow-up | `toct_id → tbl_opd_case_type.toct_type`; corroborate `pam_type` (New/Old) | **RELIABLE** |
| Booking lead-time (agent vs front-desk) | `pam_created_date` (100% populated) → `pam_app_date` | **RELIABLE-derived** (bonus angle) |
| Symptom collector funnel (assigned/clicked/submitted) | external `symptoms_collector_api_url` `/api/v1/agents/*` store | **NOT-IN-DB** — needs new cross-service read; `engagementDashboard` is a `NotImplementedException` stub |
| Doctor add-to-Rx acceptance | EMR fires `set-add-to-rx`; landing table unconfirmed | **VERIFY** — confirm whether ack persists in `tatva_clinic` or only the agents store |

**Surfaced GAPS (actionable):**
1. **`tbl_appointment_source` is unused by every builder** — the booking-agent vs receptionist lens is fully buildable *today* with one new query. Ship this first; it is the only AI-agent analytic with real backing data.
2. **Source coverage is ~17%** — confirm whether new bookings now always write a source row (if so, recent-window analytics are sound even though lifetime totals are partial). Add a coverage guard to the response `meta`.
3. **Symptom-collector funnel needs a microservice read connection** — file as the `engagement/symptom-collector` contract (§5), mirroring the planned `engagement/voice-rx`. Owner-facing reach/completion KPIs cannot be delivered from `tatva_clinic`; do not fake them with template-symptom data (the existing `clinical/symptoms` builder already reads only template-level `tmoc_symptoms` and is flagged degraded — do not conflate it with the patient-facing collector).
4. **Verify the `set-add-to-rx` sink** — if that acknowledgement lands in any `tatva_clinic` table, doctor-acceptance becomes the one collector KPI shippable without the cross-service read.

### Revenue / retention / cross-sell / behavioral angle

- **Cost-to-serve / capacity (Revenue-adjacent):** agent booking share is a direct labour-substitution metric — quantify recovered front-desk hours = `agent-booked appts × avg front-desk handling time`. This is the owner's ROI case for the agent.
- **Leakage:** if agent-booked appts cancel/no-show at a materially higher rate than receptionist-booked, the automation is generating low-intent volume — a revenue leak masquerading as growth. The conversion + cancellation KPIs expose it.
- **Retention vs acquisition:** the new-vs-follow-up split tells the owner whether to point the agent at reactivating lapsed patients (retention) or net-new acquisition.
- **Behavioral (doctor-to-doctor):** symptom-collector **acceptance variation across doctors in a department** is the sharpest behavioral signal here — two doctors served identical summaries, one accepts into Rx, one ignores. That gap is a product-trust + training lever for the HoD (P2), and predicts which doctors will sustain the documentation-time savings the collector promises (P1 productivity).
- **Cross-sell tie-in:** a completed symptom summary front-loads the visit's likely investigations/diagnoses; once the collector store is connected, its captured symptoms can feed the same diagnosis→lab / drug→pharmacy attach analyses used elsewhere in the spec — but that is downstream of unblocking the data source.

### Sample questions

- What % of this month's bookings did the AI agent close vs the receptionist vs walk-ins, and how is that trending?
- Do agent-booked appointments show up (complete) at the same rate as receptionist-booked ones, or do they cancel more?
- Is the booking agent bringing me **new** patients or just rebooking follow-ups?
- Of the patients I assigned the symptom collector to, how many actually submitted before the visit? *(BLOCKED — needs agents-service read)*
- Which doctors in Cardiology actually use the collector summary in their Rx, and which ignore it? *(VERIFY ack sink)*
- How much front-desk time did the booking agent save us this quarter?

### Priority

- **P1 (ship now):** Booking-source mix, AI-agent booking share, agent conversion/cancellation, new-vs-follow-up split, source-coverage guard — all **BUILDABLE** from the unused `tbl_appointment_source`, single net-new builder, high owner value.
- **P2 (small spike):** Verify the `set-add-to-rx` sink; if in-DB, ship doctor add-to-Rx acceptance + leaderboard.
- **P3 (roadmap, blocked):** Full symptom-collector funnel (assigned → clicked → submitted → completed) — requires building the `engagement/symptom-collector` cross-service read per Contract §5. Render as an honest placeholder until then; do not substitute template-symptom data.

---

Verified-source artifacts (absolute paths): symptom-collector client `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/ApiGenRx.js` (L160-220, `/api/v1/agents/*` on `symptoms_collector_api_url`) and its mobile twin `.../ApiGenRxMobile.js`; consumer flow `.../src/pages/VoiceRxConsult.js` (L126-158, `getSymptomsCollectorData`); backend stub confirming NOT-IN-DB `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/analytics.service.ts` (L101-107, `engagementDashboard` → `NotImplementedException`); booking-source table `tbl_appointment_source` (per audit + `.../pm-analytics-service/scripts/db-check.js`).

---

# OPD Analytics — Addenda (supplement pass)

_Grounded follow-up on ABHA/KYC depth, the booking-channel taxonomy incl. "Visit My Website", and an end-to-end OPD-flow gap scan. The ABHA/KYC deep-dive below supersedes the base "ABDM / ABHA Adoption & Linkage" section._


## ABDM / ABHA & KYC — Deep Dive (supersedes base ABHA section)

> **Scope note:** OPD only. Grounded in live read-only introspection of `tatva_clinic` (53,254 patients) and the EMR ABHA module (`Pm-Doctor-Portal/src/components/abha/*`). **Read this honesty banner first — it changes how every KPI below should be presented.**

### Ground truth from the live DB (why this section is mostly "Needs other service")

**1. ABHA in `tatva_clinic` is overwhelmingly sandbox/test data today.**
- `tbl_patient_master`: 53,254 patients. Only **2,759 carry an ABHA number** (`pm_abha_no <> ''`) and **2,757 an ABHA address** (`pm_abha_address`).
- Of those addresses, **2,733 end in `@sbx`** (ABDM sandbox), 11 other-domain, 13 no domain. **Zero `@abdm` (production) addresses.** The EMR helper confirms `@sbx` = non-prod, `@abdm` = prod (`src/components/abha/helpers/index.js`).
- **2,743 of the 2,759 linked records were created by a single user** `pm_created_by = 64` (a test/integration account). Addresses look like `test13.test@sbx`, `keval.909012@sbx`.
- **Implication:** any "ABHA adoption rate" computed on this DB today (~5.2%) is a **test artifact, not a clinical KPI.** Every KPI below must be built to be *correct* once real ABHA volume lands, but the dashboard should show a **"Sandbox data detected — production ABHA pending"** badge until `@abdm`-suffixed rows appear. Be explicit with stakeholders; do not ship a vanity 5% number.

**2. The two "status" columns are corrupted and unsafe as-is.**
- `pm_abha_verify` (int, default 0): clean values are `0` = 50,543 and `1` = 2,658. **But ~110 rows hold garbage 9-digit values** (e.g. `168603802`, `198309840`) — one per patient, a buggy write path stamping an epoch/timestamp fragment into the flag. Same disease in `pm_abha_consent` (`0`=50,534, `1`=2,677, plus ~110 garbage rows).
- **Builder rule:** never `GROUP BY pm_abha_verify` raw. Bucket as `CASE WHEN pm_abha_verify = 1 THEN 'verified' WHEN pm_abha_verify = 0 THEN 'not_verified' ELSE 'dirty' END`. Surface the `dirty` count as a **data-quality KPI** for P3 (it's a real bug worth flagging).

**3. There is NO clean "KYC status", "time-to-link", "link stage", or "link source" column in `tatva_clinic`.**
- `tbl_patient_master` ABHA columns: `pm_abha_address`, `pm_abha_no`, `pm_abha_name`, `pm_abha_gender`, `pm_abha_dob`, `pm_abha_verify`, `pm_abha_consent`, `pm_abha_card` (blob), `pm_abha_aadhar_no`, `pm_abha_contact_no`, `pm_aadhar_card_number`. **No `kyc_status`, no `abha_linked_at`, no `link_method`, no `link_source`/`stage` column.**
- There is **no dedicated ABHA timestamp.** Only `pm_created_date` / `pm_modify_date` exist. For the linked cohort, created≈modified for only 3 rows and the rest have null/sparse dates → **time-to-link is NOT derivable** from this table.
- KYC *method* (Aadhaar-OTP vs biometric/fingerprint vs mobile vs ABHA-address vs ABHA-number) is fully implemented **in the frontend + microservice** (see flow below) but **none of it is persisted to `tatva_clinic`** in a queryable form.

**4. KYC and care-context actually live in a separate ABDM microservice + thin helper tables.**
- Frontend calls `config.abha_api_url` against ABDM milestones **M1** (enrollment/verification: `/abdm/m1/enrollmentByAadhaar/*`, `/abhaVerification/*`), **M2** (`/abdm/m2/linkCareContext/generate-token`), **M3** (`/abdm/m3/hiuConsent/*`). KYC OTP/biometric success/failure events are transacted here, not in `tatva_clinic`.
- Helper tables in `tatva_clinic` are **near-empty**, confirming production hasn't ramped: `tbl_abha_hip_link_master` = **8 rows** (8 distinct patients, all from 2022); `tbl_abha_response_master_new` = **8 rows, 1 distinct ABHA, 0 data pushed**; `tbl_abdm_webhook_data`/`tbl_abdm_webhook_logs` = **0 rows**; `tbl_patient_abha_with_hospital` = 51 rows (richer KYC payload: `aadhaarNumber`, `healthIdNumber`, `kycPhoto`, `stateName`, `districtName`, `abha_hospital`, `abha_doctor`, `created_date`, `tokenCreatedAt`).

**Net:** today, only **ABHA-present / verified / consent / number-vs-address split** are honestly Buildable-now from `tatva_clinic`. KYC success/failure, time-to-link, link-method, and care-context push require the ABDM service or a backfill of `tbl_patient_abha_with_hospital` / webhook tables.

---

### KPI group A — ABHA linkage volume & rate `[Buildable now]`

**WHO:** P2 (specialty/HoD admin), P3 (operational admin/owner) · **ACTION:** monitor ABDM adoption across the practice · **LENS:** Compliance (primary), Capacity (secondary)

| KPI | Definition (real columns) | Feasibility |
|---|---|---|
| ABHA-linked patient count | `COUNT(*) WHERE pm_abha_no <> '' OR pm_abha_address <> ''` on `tbl_patient_master` | Buildable now |
| ABHA-linked rate | linked / total patients (`53,254`) | Buildable now |
| **Production vs sandbox split** | `CASE pm_abha_address LIKE '%@abdm'` (prod) `vs '%@sbx'` (sandbox) | Buildable now — **must be shown**; today 0 prod / 2,733 sandbox |
| OPD-attributable linked patients | linked ∩ patients with a row in `tbl_appointment_master (pam_del=0)` | Buildable now (join on `patient_unique_id`) |

- **Recommended viz:** single KPI tile "ABHA-linked patients" with a prod/sandbox stacked sub-bar; a gauge for linkage rate vs an ABDM target (e.g. 70%).
- **Sample questions:** "What share of our OPD patients have a real (`@abdm`) ABHA linked?" "Are we still on sandbox?"
- **Priority:** **P0** (it's the headline ABDM-compliance number) — but gated behind the sandbox banner.

### KPI group B — KYC / verification status mix `[Buildable now, with caveats]`

**WHO:** P3 operational admin, P2 HoD · **ACTION:** see how many linked ABHAs are verified vs consented vs raw · **LENS:** Compliance, Quality

| KPI | Definition | Feasibility |
|---|---|---|
| Verified vs not-verified vs non-ABHA | bucketed `pm_abha_verify` (1 / 0 / no-ABHA), **excluding `dirty` bucket** | Buildable now |
| Consent-captured rate | bucketed `pm_abha_consent = 1` among linked | Buildable now |
| **Linked-but-unverified gap** | `pm_abha_no<>''` AND `pm_abha_verify<>1` (clean) — there are ~40 consent-without-verify and ~30 verify-without-consent mismatches in the crosstab | Buildable now — operational follow-up list |
| **Dirty-flag count** (data-quality) | `pm_abha_verify NOT IN (0,1)` (~110 rows) | Buildable now — **flag as a bug**, not a clinical metric |

- **Important honesty point:** `pm_abha_verify`/`pm_abha_consent` are **proxies for "verified/consented in the EMR record", not for ABDM-side KYC success.** A true "KYC verified" event (Aadhaar-OTP / biometric passed at UIDAI) is confirmed only inside the microservice. Label this KPI "ABHA record verified (EMR)" — do not call it "KYC complete".
- **Recommended viz:** 100%-stacked bar (Verified / Consented-only / Linked-raw / Non-ABHA) + a small red "dirty flags: N" data-quality chip.
- **Sample questions:** "Of patients with an ABHA, how many have a verified+consented record?" "Where are we capturing the address but skipping consent?"
- **Priority:** P1.

### KPI group C — ABHA-number vs ABHA-address split `[Buildable now — distinguishable]`

**WHO:** P3, P2 · **ACTION:** understand which identifier form patients hold · **LENS:** Compliance, Capacity

- The two are cleanly distinguishable by **format**, verified on live data:
  - `pm_abha_no` matches `^\d{2}-\d{4}-\d{4}-\d{4}$` (14-digit ABHA number) for **2,750 of 2,759** rows.
  - `pm_abha_address` is the human-readable `name@abdm`/`@sbx` health ID; suffix split already computed above.
- **KPIs:** has-number-only / has-address-only / has-both / has-neither; share with an ABHA *card* persisted (`pm_abha_card` blob NOT NULL).
- **Recommended viz:** 2×2 matrix (number × address) or a simple 4-segment donut.
- **Sample questions:** "How many patients gave us a full ABHA number vs only a health-ID address?"
- **Priority:** P2 (nice diagnostic; low decision-weight).

### KPI group D — KYC method, success vs failure `[Needs other service]`

**WHO:** P3 operational owner · **ACTION:** track which verification rail patients use and where KYC drops · **LENS:** Leakage, Quality

- The EMR implements four+ KYC/link rails (from `src/components/abha/` and `src/api/services/ApiAbha.js`):
  1. **Create ABHA via Aadhaar-OTP** (`enrollmentByAadhaar/request-otp` → `verify-otp`)
  2. **Create/verify via biometric fingerprint** (`verify-fingerPrint`, `BiometricVerification.js`, RD-client device capture)
  3. **Link existing via mobile-OTP** (`abhaVerification/mobile-request-otp`/`verify-otp`)
  4. **Link via ABHA address** and **link via ABHA number** (`abhaAddress-*`, `abhaNumber-*`)
- **Success/failure is observable in the UI** (`verificationStatus: success|error|loading`, duplicate-token error `ABDM-1092`) but these events are **not written to `tatva_clinic`.** `tbl_abdm_webhook_logs`/`tbl_abha_response_logs` are empty/near-empty (0 / 8 rows).
- **Feasibility:** `[Needs other service]` — requires the ABDM service to emit per-attempt method + outcome (or to backfill `tbl_abha_response_logs`). **KYC success-rate and failure-reason KPIs are NOT in tatva_clinic today.**
- **If sourced:** funnel (Attempt → OTP/biometric → Verified → Address set → Linked), KYC success % by method, top failure reasons.
- **Priority:** P1 *once the service exposes events* — this is the single highest-value ABDM metric (where adoption leaks).

### KPI group E — Stage-of-link & time-to-link `[Needs profiling / Needs other service]`

**WHO:** P2 HoD, P3 · **ACTION:** know *when* in the journey ABHA gets linked and how long it takes · **LENS:** Productivity, Capacity

- **Stage is known from code, not data.** `AbhaDrawer` is opened from **`WalkInConsultation.js`** (registration/check-in of a walk-in) and **`AllPatients.js`** (patient roster) — i.e. linking happens at **registration / front-desk**, occasionally pre-consultation, **not during the clinical note.** Care-context *Rx sync* (`AbhaSyncButton` → `m2/linkCareContext/generate-token`) happens **post-consultation**. So there are two stages: **link-at-registration** and **care-context-push-at-consultation-end**.
- **Time-to-link is NOT derivable:** no ABHA timestamp column; `pm_modify_date` is overwritten by any later edit. `[Not in DB]` for `tatva_clinic`. A real time-to-link needs `tbl_patient_abha_with_hospital.created_date` / `tokenCreatedAt` minus `pm_created_date` — feasible **only after that table is populated in prod** → `[Needs profiling]`.
- **Recommended viz (when sourced):** stage-funnel (registered → linked → care-context pushed); median time-from-registration-to-link.
- **Priority:** P2.

### KPI group F — Linked-by (doctor / receptionist / self) `[Needs profiling]`

**WHO:** P2, P3 · **ACTION:** attribute who is driving ABHA capture · **LENS:** Productivity, Compliance

- Attribution columns **exist** but are unusable today: `tbl_patient_master.pm_created_by` / `um_id`, and richer `tbl_abha_hip_link_master.um_id` + `doctor_unique_id` + `tahlm_created_by`, and `tbl_patient_abha_with_hospital.abha_doctor` / `abha_hospital`.
- **But:** in current data `pm_created_by = 64` for 2,743/2,759 (single test account) and the hip-link table has 8 rows. So **the join is structurally ready, the data is not.** Map `pm_created_by`/`um_id` → `tbl_user_master.um_id` → role to split doctor vs receptionist (self-service isn't represented — all linking is staff-initiated in this EMR).
- **Feasibility:** `[Needs profiling]` — correct in shape, blocked on real production volume + confirming a role field on `tbl_user_master`.
- **Recommended viz:** ranked bar of linked-patients by staff member / by role.
- **Sample questions:** "Which receptionists are reliably linking ABHA at check-in?" "Are doctors skipping it?"
- **Priority:** P2.

### KPI group G — Trend & department/doctor breakdown `[Needs profiling]`

**WHO:** P1 doctor (own panel), P2 HoD (department), P3 (practice) · **ACTION:** track ABHA-linkage momentum and concentration · **LENS:** Compliance, Capacity

- **Trend:** best available time axis is `pm_created_date` of the patient (new-patient ABHA capture rate by month). This is a **"ABHA-capture-among-newly-registered" trend**, not a true "linked-on date" trend (see group E). Honest label required.
- **By department/doctor:** `tbl_patient_master` has no `dp_id`; department/doctor attribution must come via the patient's **OPD appointments** (`tbl_appointment_master.dp_id` / `um_id` → `tbl_department`, `tbl_user_master`). Feasible as a join, but a patient maps to many appts → define as "linked patients who had ≥1 OPD visit in dept X".
- **Feasibility:** `[Needs profiling]` (real prod volume) for both; the join paths are confirmed to exist.
- **Recommended viz:** monthly line for capture rate; small-multiples or ranked bar by department.
- **Priority:** P2 trend, P3 dept/doctor breakdown.

---

### Build summary (honest feasibility ledger)

| Group | KPI | Tag |
|---|---|---|
| A | ABHA-linked count/rate, **prod-vs-sandbox split**, OPD-attributable | **Buildable now** |
| B | Verified / consent / non-ABHA mix, linked-unverified gap, dirty-flag count | **Buildable now** (bucket dirty values) |
| C | ABHA-number vs ABHA-address split, card-present | **Buildable now** (regex on `pm_abha_no` / suffix on `pm_abha_address`) |
| D | KYC method, success vs failure, failure reasons | **Needs other service** (ABDM M1; webhook/response logs empty) |
| E | Stage-of-link (known from code), **time-to-link** | Stage = code-derived; time-to-link **Not in DB** → Needs profiling on `tbl_patient_abha_with_hospital` |
| F | Linked-by doctor/receptionist/self | **Needs profiling** (columns ready, data is one test account) |
| G | Trend, by department/doctor | **Needs profiling** (join paths exist; trend axis is registration date, not link date) |

**Hard honesty callouts for the spec author:**
1. **Do not ship an "ABHA adoption %" without the sandbox banner** — current prod ABHA count is **0** (`@abdm`); the 2,759 are sandbox.
2. **KYC success/failure, time-to-link, and link-method are NOT in `tatva_clinic`** — they require the ABDM microservice (`config.abha_api_url`, milestones M1/M2/M3) or a backfill of `tbl_patient_abha_with_hospital` and `tbl_abdm_webhook_logs`/`tbl_abha_response_logs` (currently 0/8 rows).
3. **`pm_abha_verify` / `pm_abha_consent` carry ~110 corrupted 9-digit values each** — a real write-path bug; bucket them and surface the count as a data-quality flag (worth a separate ticket).

**Key files referenced (absolute paths):**
- DB introspection harness: `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js`; creds `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/.env` (DB `tatva_clinic`)
- ABHA flow / stage: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/components/abha/AbhaDrawer.js`, `.../abha/hooks/useAbhaScreens.js`, `.../abha/helpers/index.js` (`@abdm`/`@sbx` suffix), `.../abha/screens/BiometricVerification.js`
- KYC method endpoints (microservice): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/ApiAbha.js` (M1/M2/M3)
- Care-context push at consultation end: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/components/AbhaSyncButton.js`
- Linking stage entry points: `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/WalkInConsultation.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/allPatients.js/AllPatients.js`
- Helper tables for future KYC sourcing: `tbl_patient_abha_with_hospital` (51 rows; `aadhaarNumber`, `healthIdNumber`, `kycPhoto`, `abha_doctor`, `abha_hospital`, `created_date`, `tokenCreatedAt`), `tbl_abha_hip_link_master` (8 rows; `um_id`, `doctor_unique_id`, `tahlm_created_date`), `tbl_abha_response_master_new` (8 rows; `consent_grant_date`, `is_data_push`, `care_context_*`)

## Booking Channels & Visit-My-Website (Appointments addendum)

> **Grounding:** All channel values, volumes, and behaviour below are read live from `tatva_clinic` (READ-ONLY) on 2026-06-09. `tbl_appointment_source` schema: `tas_id` PK, `pam_id` (UNIQUE FK → `tbl_appointment_master.pam_id`), `tas_created_date`, `tas_source varchar(100)`. The table has **4,608 rows** spanning **2024-09-03 → 2026-06-09**.

### 0. The honesty problem you must surface first (read before any channel KPI)

`tbl_appointment_source` is **sparsely populated**. Of **26,738** live appointments (`pam_del=0`), only **4,525 (~16.9% lifetime)** have a matching source row. The other ~83% are channel-**unknown**.

| Coverage lens | Value (live) |
|---|---|
| Lifetime appointments with a source row | **4,525 / 26,738 = 16.9%** |
| Recent monthly coverage (Dec'25–Jun'26) | **31.4% – 45.5%** (Feb'26 peak 44.9%, Apr'26 trough 31.4%) |

**Implication:** lifetime channel-mix charts are biased toward whichever flows write a source row. Coverage is materially better in recent months, so **channel KPIs should default to a recent window (last 90 days) and always render an "Unattributed" slice**. Never publish a channel-share number without the coverage denominator next to it. This is the single most important caveat in this section.

### 1. Channel taxonomy — real `tas_source` values mapped to meaning

`SELECT tas_source, COUNT(*) GROUP BY tas_source` (whole table) returns **exactly 5 values — there is no literal `WEBSITE` / `MICROSITE` value.**

| `tas_source` (real) | Rows | Channel label (proposed) | What it actually is (evidence) | Created-by signature | Lead-time (avg days) | Case-type signature |
|---|---|---|---|---|---|---|
| `CREATE_APPOINTMENT_SCREEN` | **2,079** | **Receptionist / front-desk** | EMR "Create Appointment" screen. Spread across **many staff `pam_created_by`** (524, 821, 514, 502…), 41 clinics / 57 doctors. | many staff IDs | +0.83 | mixed (New 1206, F/U 661, Urgent, Revisit) |
| `KEA` | **1,432** | **AI Receptionist (booking link)** | KEA backend powers the AI-receptionist self-service link (`/api/v1/kea/appointment/web/*` in `src/api/services/VisitService.js`; `appointment_master.kea_appointment_sequence` column exists). Mix of system (`pam_created_by`=0/null, 588 rows) + staff. | system + staff | +0.46 | New-heavy (New 1023, F/U 378) |
| `APPOINTMENT_AGENT` | **680** | **AI Receptionist (agent setup)** | Appointment-Agent module (`src/pages/appointmentAgent/`). 12 clinics / 28 doctors. | staff + system | +1.19 | almost all Follow-up (670 of 678) |
| `CHIKITSALY-PORTAL` | **268** | **Patient web portal / microsite (→ "Visit My Website" proxy)** | Patient-facing Chikitsaly web portal — the public booking surface the microsite/booking-link embeds. Created by a **single service account `pam_created_by`=968** (244/253), 2 clinics / 5 doctors. | one portal service acct | **−0.01 (same-day)** | **100% "New" (253/253)** |
| `VISIT-PATIENT-APP` | **149** | **Patient mobile app** | Patient self-booking from the mobile app. Single service account `pam_created_by`=972, 2 clinics / 4 doctors. | one app service acct | −0.06 (same-day) | 100% "New" |
| *(no source row)* | ~22,213 | **Unattributed** | No row in `tbl_appointment_source`. | — | — | — |
| `pam_appointment_type='Walk'` | 6,095 appts | **Walk-in** | Derived from `tbl_appointment_master.pam_appointment_type` (`Walk`=6,095, `Appointment`=20,669). **Orthogonal axis** — not in `tbl_appointment_source`; nearly all walk-ins are unattributed in source. | — | — | — |

**Proposed roll-up groups for the dashboard:**
- **AI Receptionist** = `KEA` + `APPOINTMENT_AGENT` (the booking-link / agent flow)
- **Front-desk / receptionist** = `CREATE_APPOINTMENT_SCREEN`
- **Patient self-service (web)** = `CHIKITSALY-PORTAL`  ← the "Visit My Website" proxy
- **Patient self-service (app)** = `VISIT-PATIENT-APP`
- **Walk-in** = `pam_appointment_type='Walk'` (separate axis; show as parallel cut, not a fifth slice of the same pie, to avoid double-counting)
- **Unattributed** = appointments with no source row

### 2. "Visit My Website" — what it is, and the honest attribution verdict

**Feature mechanics (from EMR `src/`):**
- The doctor's website is built in **`src/pages/DoctorWebsiteSetting.js`** + `src/components/doctor_website/*` + `src/redux/doctorWebsiteSlice.js` (save/publish/AI-generate). Live URL pattern: `{env.doctor_website_url}/doctor_website/` (e.g. `https://practice.tatvacare.in/doctor_website/`). `src/common/Header.js` exposes "Set up website URL".
- **Critical nuance:** the microsite itself (`src/website/Homepage.js`) renders a "Book Appointment" modal whose copy is *"Please contact the clinic to schedule an appointment."* — i.e. the marketing microsite does **not** book directly. The actual bookable surface is the **shared booking link** (`appointmentLinkShared` / `appointment_booking_link`) produced by the **AI Receptionist / Appointment-Agent** setup and distributed via WhatsApp, GMB, SMS, QR, and (per `src/pages/appointmentAgent/components/knowMore/BookingLinkKnowMore.js`) **"TatvaCare Microsite"**.

**Attribution verdict (be honest):** there is **no `tas_source` literally meaning "doctor's website/microsite."** A booking that originates from the doctor's public web surface lands as **`CHIKITSALY-PORTAL`** (the patient web portal backing the link) — confirmed by: 100% "New" case type, same-day lead time, and a single portal **service account** (`pam_created_by`=968) rather than clinic staff. So:

> **"Visit My Website" bookings ≈ `tas_source='CHIKITSALY-PORTAL'`** — this is a **defensible proxy, not an exact match.** It conflates (a) bookings from the doctor's microsite, (b) bookings from the generic Chikitsaly portal, and (c) bookings from any link share that routes through the portal. It cannot distinguish *which* doctor's website drove the click. Present every Website KPI with this proxy disclaimer.

If product wants true per-website attribution, that requires either a new `tas_source` value (e.g. `DOCTOR_MICROSITE`) or UTM/referrer capture on the booking link — **[Needs other service]** (booking-link service / KEA), not in the DB today.

### 3. KPIs

Status semantics (canonical, from EMR `src/utils/constants.js` + shipped `operational.ts`): **`pam_status` 0=Queue, 3=Finished/Completed, 4=Cancelled, 7=Clinic-queue/requested**. Video/tele = `pam_status_type_appointment IN (1,2)`. New-vs-Followup via `tbl_opd_case_type` (`toct_id → toct_type`).

| # | KPI | WHO (persona) | ACTION | LENS | Definition (real tables/cols) | Feasibility |
|---|---|---|---|---|---|---|
| 1 | **Bookings by channel** | P3 owner, P2 HoD | Where do bookings come from? | Capacity / Leakage | `COUNT(*)` over `tbl_appointment_source ⋈ tbl_appointment_master(pam_del=0)` GROUP BY `tas_source`, period-filtered on `pam_app_date`. + an **Unattributed** row = appts with no source join. | **Buildable now** (⚠ ~17% lifetime / ~40% recent coverage) |
| 2 | **Channel mix & trend** | P3, P2 | Is the mix shifting (digital ↑, front-desk ↓)? | Productivity / Capacity | Same join, `GROUP BY DATE_FORMAT(pam_app_date,'%Y-%m'), tas_source`. 100%-stacked over time; Unattributed kept visible. | **Buildable now** (coverage caveat) |
| 3 | **AI-agent vs receptionist vs walk-in vs website share** | P3 owner | What % is automated vs manual labour vs self-service? | Productivity / Leakage | AI=`KEA`+`APPOINTMENT_AGENT`; Receptionist=`CREATE_APPOINTMENT_SCREEN`; Website=`CHIKITSALY-PORTAL`; App=`VISIT-PATIENT-APP`; Walk-in=`pam_appointment_type='Walk'` (parallel cut). | **Buildable now** (walk-in is a separate axis — don't sum into one pie) |
| 4 | **'Visit My Website' booked count + share** | P1 doctor, P3 owner | Is my website producing any bookings? | Revenue / Capacity | `SUM(tas_source='CHIKITSALY-PORTAL')` and its % of (a) attributed appts and (b) all appts. | **Buildable now (proxy)** — label "web-portal proxy" |
| 5 | **Website conversion (show-rate)** | P1, P2 | Do website bookings actually show up? | Quality / Leakage | Within `CHIKITSALY-PORTAL`: `SUM(pam_status=3)/COUNT(*)` (completed) and `SUM(pam_status=4)` (cancelled). Live: of 253, completed(3)=115, requested/clinic-queue(7)=121, cancelled(4)=5 → **show-rate ≈ 45%**, but a large chunk sits in status 7 (pending/clinic-queue) → flag as needs-status-profiling. | **Buildable now**; status-7 meaning **Needs profiling** |
| 6 | **Website new-vs-followup** | P1 doctor | Is the website bringing *new* patients or just rebooking known ones? | Revenue / Retention | `CHIKITSALY-PORTAL ⋈ tbl_opd_case_type`. Live: **100% "New"** (253/253) — strong evidence the website is a new-patient acquisition channel. | **Buildable now (proxy)** |
| 7 | **Website bookings by doctor** | P2 HoD, P3 owner | *Which* doctors' websites actually convert? | Revenue / Productivity | `CHIKITSALY-PORTAL` GROUP BY `um_id ⋈ tbl_user_master.um_name`. Live: only **5 doctors / 2 clinics** have any → honest answer today is "almost nobody is getting website bookings yet." | **Buildable now (proxy)**; per-*website* attribution **Needs other service** |
| 8 | **Website-booking lead time** | P3, P2 | How far ahead do web patients book? | Capacity | `AVG(DATEDIFF(pam_app_date, DATE(tas_created_date)))` within `CHIKITSALY-PORTAL`. Live: **≈ same-day (−0.01d)**, range −12..+2 → web bookings are overwhelmingly same-/walk-in-day, NOT advance planning. | **Buildable now** (negative values exist — clamp/winsorize) |
| 9 | **Source-coverage honesty KPI** | P3 owner, P2 | How much do we even *know* about origin? | Compliance / Quality | `SUM(source row exists)/COUNT(*)` over `tbl_appointment_master`, trended monthly. This is a **data-quality governance metric**, surfaced as a banner on every channel chart. | **Buildable now** — should be a permanent footnote/gauge |

### 4. Recommended viz
- **#1/#3:** horizontal bar (channels) + a single **donut with an always-visible "Unattributed" wedge**; walk-in shown as a separate small bar, not inside the donut.
- **#2:** 100%-stacked area/bar by month; overlay the **coverage % line** on a secondary axis so viewers see mix and trust together.
- **#5:** funnel (Booked → Confirmed/Queue(7) → Completed(3) | Cancelled(4)) for the website channel.
- **#6:** New vs Follow-up paired bars, website vs all-channels benchmark.
- **#7:** ranked bar of doctors with ≥1 website booking; empty-state copy: "No website-attributed bookings yet for the rest."
- **#8:** lead-time histogram with a "same-day" highlight bucket.
- **#9:** small gauge / KPI tile ("We can attribute origin for **X%** of appointments this period") pinned atop the whole section.

### 5. Sample questions the section answers
- "What share of my OPD bookings came through the AI receptionist vs my front desk last quarter?" (#1, #3)
- "Is my published doctor website actually generating appointments — and are they new patients?" (#4, #6)
- "Which doctors in my group are getting web/portal bookings and which aren't?" (#7)
- "Do patients who book via the website show up, or do they no-show?" (#5)
- "How reliable are these channel numbers — what fraction of appointments do we even know the origin of?" (#9)

### 6. Priority
- **P0 (ship first):** #9 coverage-honesty KPI (gates trust in everything else), #1 bookings-by-channel, #3 AI-vs-receptionist-vs-walk-in-vs-website. Highest owner/HoD value, cleanest to build.
- **P1:** #2 mix-trend, #4 website count/share, #6 website new-vs-followup. Directly answers the "is my website working" question (P1/P3).
- **P2:** #5 website show-rate (blocked on status-7 profiling), #7 by-doctor, #8 lead-time. Valuable but small-n today (only 5 doctors / 268 web rows) and dependent on status-code clarification.

### 7. Open items / honest gaps to flag to product
1. **No literal website/microsite `tas_source`** — `CHIKITSALY-PORTAL` is a proxy; true per-doctor-website attribution needs a new source value or UTM capture on the booking link **[Needs other service]**.
2. **`pam_status=7` is undefined in the shipped map** (constants call it `TAB_CLINIC_QUEUE`); it dominates CHIKITSALY-PORTAL (121/253). Confirm whether 7 = "patient-requested / awaiting confirmation" before trusting web show-rate **[Needs profiling]**.
3. **~83% lifetime unattributed** (better, ~60% unattributed, in recent months) — default all channel views to last-90-days and always show the Unattributed slice.
4. **Walk-in lives on a different column** (`pam_appointment_type`) and is essentially absent from `tbl_appointment_source` — treat as a parallel axis, never a pie slice alongside the source channels.

**Relevant files (absolute):**
- DB column map / introspection: `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js`
- Appointment/status logic (backend): `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/operational.ts` (status map 0/3/4), `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/src/analytics/builders/footfall.ts`
- Booking-link / AI receptionist (EMR): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/appointmentAgent/AppointmentAgent.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/appointmentAgent/components/knowMore/BookingLinkKnowMore.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/VisitService.js`
- Doctor website / microsite (EMR): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/DoctorWebsiteSetting.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/website/Homepage.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/redux/doctorWebsiteSlice.js`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/components/doctor_website/`, `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/common/Header.js`
- Status constants (EMR): `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/utils/constants.js`

## OPD-Flow Gap Scan — Additional Analytics

Ground rules used: every idea below is checked against the live `tatva_clinic` schema (394 tables) and tagged for feasibility with real table/column names. Items the existing spec already covers (appointment status funnel, follow-up adherence loop, ABHA layer, billing leakage, RFM/LTV, Rx/lab/pharmacy cross-sell, per-doctor load) are NOT repeated — this list is net-new or materially under-covered. Personas: P1 doctor, P2 specialty/HoD admin, P3 ops admin/owner.

---

### Stage 1 — Registration & Patient Identity
*(spec covers demographics/panel/ABHA share; these are the gaps)*

1. **Registration→booking source attribution** — share of new patients first acquired via each channel. Persona/lens: P3, Acquisition/Marketing. Source: `tbl_appointment_source.tas_source` (4,608 rows; values `CREATE_APPOINTMENT_SCREEN`, `KEA`, `APPOINTMENT_AGENT`, `CHIKITSALY-PORTAL`, `VISIT-PATIENT-APP`) joined to `tbl_appointment_master.pam_id` → first-ever appt per `patient_unique_id`. **[Buildable now]** Priority: **P0** — the spec discusses "booking channel" but does not exploit this dedicated, populated table; it is the cleanest channel signal in the DB.

2. **Payer / insurance-vs-cash mix** — % of panel with an insurance/TPA record, by doctor/specialty. Persona/lens: P3/P2, Revenue/Capacity. Source: `tbl_patient_insurance` (130 rows: `policy_number`, `tpa_number`, `patient_unique_id`). **[Needs profiling]** — table is thin and has NO claim/sum-insured amount, so no revenue linkage; flag as descriptive coverage only. Priority: **P3**.

3. **Duplicate / merged-patient hygiene** — patients sharing `pm_contact_no` across distinct `patient_unique_id` (registration data-quality leak that inflates panel + breaks retention math). Persona/lens: P3, Quality/Compliance. Source: `tbl_patient_master.pm_contact_no` + `patient_unique_id`. **[Buildable now]** Priority: **P2**.

---

### Stage 2 — Booking, Channel & Slot Scheduling
*(spec's slot/throughput KPI was gated "on timestamps" — but the booking grid is fully timestamped, so a whole layer is feasible today)*

4. **Slot utilization & idle-time per doctor-day** — booked-minutes ÷ scheduled-clinic-minutes, plus largest idle gaps in the day. Persona/lens: P2/P3, Capacity/Productivity. Source: `tbl_appointment_master.pam_app_time`, `pam_app_end_time`, `pam_appointment_duration` — **populated on 26,710/26,836 rows (99.5%)**, joined to `tbl_comman_slot` (`tcs_doc_id`,`tcs_hours`,`tcs_days`) for the denominator. **[Buildable now]** Priority: **P0** — biggest under-covered capacity gap; the timing data the spec assumed missing actually exists on the booking grid.

5. **Double-booking / overbooking rate** — count of overlapping `[pam_app_time, pam_app_end_time]` intervals per doctor per day. Persona/lens: P2, Capacity/Quality. Source: same appointment timing columns. **[Buildable now]** Priority: **P1**.

6. **Booking lead-time by channel** — days between `pam_created_date` and `pam_app_date`, split by `tas_source`. Tests whether agent/portal bookings are same-day vs planned (no-show risk driver). Persona/lens: P3, Capacity/Leakage. Source: `tbl_appointment_master.pam_created_date`/`pam_app_date` + `tbl_appointment_source`. **[Buildable now]** Priority: **P1**.

7. **Walk-in vs scheduled mix & its load profile** — `pam_appointment_type` is real (`'Appointment'` 20,669 vs `'Walk'` 6,095). Walk-in share by hour/doctor exposes unplanned demand. Persona/lens: P2/P3, Capacity. Source: `tbl_appointment_master.pam_appointment_type`. **[Buildable now]** Priority: **P1** (spec mentions case-type mix but not the walk-in/scheduled operational split).

---

### Stage 3 — Check-in, Queue & Wait
*(spec gated this on timestamps; reality is nuanced — there is a status-log table but it is often single-click)*

8. **Visit status-transition funnel with elapsed timing** — booked(0) → in-progress → done(3) → cancelled(4)/no-show, using the per-row timestamps. Persona/lens: P3/P2, Capacity/Quality. Source: `tbl_patient_visit_logs` (**41,905 rows**; `pam_id`, `status`, `tpvl_created_date`, `tpvl_remarks`); status dist: 3=20,339 / 0=19,754 / 4=873 / 7=321. **[Buildable now]** for the funnel. Priority: **P0** — this 42k-row log is the single largest lifecycle table the spec never references.

9. **In-clinic dwell / wait time (true)** — minutes between first (status 0) and consult-done (status 3) log per `pam_id`. Persona/lens: P1/P2, Capacity. Source: `tbl_patient_visit_logs` MIN→MAX `tpvl_created_date` per `pam_id`. **[Needs profiling]** — profiling shows ~11,726 appts log 0 and 3 at the *same instant* (doctor flips status in one click), so only ~1,600 appts (the 15-min-to-3h buckets) yield genuine dwell; usable as a *coverage-gated* metric, NOT a clinic-wide average. Honest caveat the spec should carry. Priority: **P1 (gated)**.

10. **No-show & late-cancel signal panel** — no-show/cancel rate by channel, lead-time bucket, doctor and day-of-week (predictive feature set, not an ML model). Persona/lens: P3, Leakage/Capacity. Source: `tbl_appointment_master.pam_status` (4=cancelled 921, plus no-show statuses) × `tbl_appointment_source.tas_source` × lead-time. **[Buildable now]** for descriptive drivers. Priority: **P0** (the spec's status funnel counts cancellations but does not build the no-show *driver* cut).

11. **Queue-jump / out-of-order service** — appointments served (status-3 timestamp) materially out of `pam_app_time` order within a doctor-day. Persona/lens: P2, Quality/Fairness. Source: `tbl_patient_visit_logs` done-timestamp vs `pam_app_time`. **[Needs profiling]** — depends on the same single-click limitation as #9. Priority: **P2**.

---

### Stage 4 — Consultation & RxPAD
*(spec covers Rx internals/consult-mode/behavioral; gaps are mode-economics and consult-duration)*

12. **Teleconsult vs in-clinic split & outcome** — volume, revenue-per, follow-up-attach and Rx-completeness for tele vs physical. Persona/lens: P1/P3, Productivity/Revenue. Source: `tbl_appointment_master.pam_status_type_appointment` (real tele marker: value 2 = 430 appts, 1 = 814, 0 = 25,590) — **use this, not `tbl_video_call_appointment` which has only 7 rows**. Tele *pricing* exists in `tbl_video_call_price` (451 rows, `tvcp_price`). **[Buildable now]** for the split; outcome linkage to billing **[Buildable now]** via existing financial join. Priority: **P1** (spec mentions consult-mode for documentation channel but not the tele/in-clinic *outcome economics*).

13. **Consultation duration (scheduled)** — distribution of `pam_appointment_duration` by doctor/case-type; flags doctors systematically over/under their booked slot. Persona/lens: P1/P2, Productivity. Source: `tbl_appointment_master.pam_appointment_duration` (populated 26,735/26,836). **[Buildable now]** Priority: **P2**.

---

### Stage 5 — Orders (Labs / Procedures / Vaccines)
*(spec covers these domains individually; the gap is order-set/bundling behavior)*

14. **Appointment-level order-set breadth** — % of consults that generated ≥1 of {diagnosis, Rx, lab, procedure, vaccine} — the "thin encounter" detector (consult with zero documented orders = leakage + compliance signal). Persona/lens: P2/P3, Leakage/Quality. Source: presence-join across `tbl_case_manager`/`tbl_casemanager_diagnosis`/`tbl_medicine_report`/`tbl_inpatient_doctor_procedure`/`tbl_vaccine_patient` on `patient_unique_id`+date. **[Buildable now]** Priority: **P1**.

---

### Stage 6 — Billing & Payment
*(spec is deep on billing/3C/refund/discount; these are genuinely new)*

15. **Service-package uptake & realization** — how often configured OPD packages are sold vs à-la-carte, and package price vs realized line total. Persona/lens: P3, Revenue/Cross-sell. Source: `tbl_service_package` (24 rows: `tsp_package_name`, `tsp_price`, `tbms_id`) joined to billed services (`tbl_opd_billing_invoice_service`). **[Buildable now]** Priority: **P2** (spec's cross-sell block never touches the package table).

16. **Booking-payment (Razorpay prepaid) vs counter collection** — share of appointments paid online at booking vs at desk. Persona/lens: P3, Revenue/Leakage. Source: `tbl_appointment_master.razorpay_payment_id`/`razorpay_order_id` (presence) vs `tbl_opd_billing_overview.tobo_mod_of_payment`. **[Buildable now]** Priority: **P1** — a prepaid-collection lens the billing spec omits.

17. **Discount-approver audit** — discount given by which user, with approval trail. Persona/lens: P3, Compliance/Leakage. Source: discount value exists (`tbl_bill_retail_sale_master.tbrsm_total_discount`, OPD discount fields) but **there is NO approver/audit table** (negative scan: no `*approv*`, no `*audit*`). **[Not in DB]** — flag explicitly: approver attribution is not capturable; only discount *amount/% by creating user* (`tobo`/`tbms` created_by) is feasible. Priority: **P2 (capped at "by-user", no approval workflow)**.

---

### Stage 7 — Follow-up, Recall & Referral
*(spec covers the follow-up adherence loop from `tcm_followup_date`; these add the structured recall + referral-in/out layers)*

18. **Structured follow-up advice register & recall realization** — advised follow-ups logged vs returned. Persona/lens: P1/P2, Retention. Source: `tbl_patient_followup` (**13,216 rows**: `pam_id`, `tcm_id`, `tpf_date`, `tpf_advice`, `tpf_type`) — richer than the `tcm_followup_date` the spec uses; cross-check realization against next actual `tbl_appointment_master` visit. **[Buildable now]** Priority: **P1** (under-covered: spec leans on case-manager follow-up date, not this dedicated 13k-row table).

19. **Referring-doctor / referral-source contribution** — inbound referral volume by referrer, type and category. Persona/lens: P3/P2, Acquisition/Revenue. Source: `tbl_reference_master` (162 rows: `rm_name`, `rm_type`, `rm_category`, `rm_organization`, `patient_unique_id`) + `tbl_refer_type` (10) + `tbl_refer_category` (13). **[Buildable now]** for referral *counts/source*. Referral *revenue value* `rm_total` is **[Needs profiling]** — profiled as ~129/162 null/zero, so do NOT present referral revenue. Priority: **P2**.

20. **Recall-message scheduling follow-through** — scheduled care messages and their send status. Persona/lens: P3, Retention/Engagement. Source: `tbl_casemanager_followup_care` (64 rows: `tcfc_schedule_date`, `tcfc_status`, `tcfc_msg_action`, `tcfc_msg_request_id`). **[Needs profiling]** — only 64 rows; feature exists but adoption is near-zero, so report as adoption-gap, not a KPI. Priority: **P3**.

---

### Stage 8 — Communication / Notification Engagement

21. **Patient notification reach** — push notifications tied to appointments/patients. Persona/lens: P3, Engagement. Source: `tbl_user_notification` (1,199 rows: `appointment_id`, `patient_unique_id`, `status`, `timestamp`). **[Buildable now]** for sent-counts; open/click engagement **[Not in DB]**. Priority: **P3**.

22. **SMS/WhatsApp delivery analytics** — *flag as largely infeasible*. Persona/lens: P3, Engagement. Source: `tbl_sms` (151) and `tbl_whatsapp_sms` (124) are **template definitions, not per-patient send logs**; the only delivery signal is `tbl_sms_webhook_data` (77 rows, `tuc_id`/`requestId`) which is too sparse to join reliably. **[Not in DB / Needs other service]** — communication engagement should be marked out of scope until a messaging service exposes send/delivery events. Priority: **flag only**.

---

### Stage 9 — Digitization & ABHA Push
*(spec has Pending-Digitization + ABDM sections; gap is the consent/care-context artifact layer)*

23. **ABDM care-context / consent artifact tracking** — *flag as not-in-DB-yet*. Persona/lens: P3, Compliance. Source: `tbl_abdm_webhook_data` (**2 rows**: `abha_id`, `care_context_id`, `request_type`) + `tbl_abdm_webhook_logs`. **[Needs other service]** — consent/care-context volume is effectively unpopulated in `tatva_clinic`; the linkage *status* the spec already covers via `pm_abha_address`/`pm_abha_verify` is the only reliable ABHA signal. Priority: **flag only** (prevents over-promising ABDM consent dashboards).

24. **Digitization turnaround time** — lag between visit/consult date and digitized-Rx creation. Persona/lens: P3, Compliance/Productivity. Source: `tbl_appointment_master.pam_app_date` → first `tbl_medicine_report.tcm_datetime` / case-manager creation; undigitized list already exposed via SnapRx endpoint `digitization/undigitizedAppointments`. **[Buildable now]** Priority: **P1** — spec's Pending-Digitization section counts the backlog but does not measure *turnaround latency*.

---

### Hard "Not in tatva_clinic" call-outs (be explicit in the spec to avoid scoping fiction)
- **Patient feedback / rating / NPS / satisfaction** — no table exists (negative scan: no `*feed*`, `*rat*`, `*star*`, `*nps*`, `*satisf*`). Do not promise quality-of-experience scoring.
- **Live queue / token numbers / waiting-room board** — no `*queue*`/`*token*`/`*wait*` table; the closest substitute is the `tbl_patient_visit_logs` status timeline (#8/#9), with the single-click caveat.
- **Membership / loyalty / patient wallet** — none (`tbl_service_package` is a billing bundle, not a membership). The `monetization`/`tbl_campaign*` tables are the **doctor's SaaS subscription to TatvaCare**, not patient OPD revenue — must not be mixed into OPD revenue analytics (`src/pages/monetization`, `ApiMonetization.js` confirm this is platform billing).
- **Discount approval workflow, TPA claim amounts, insurance reconciliation** — no approver/audit/claim tables; only discount amount-by-user and a 130-row insurance descriptor exist.
- **Teleconsult via `tbl_video_call_appointment`** — 7 rows only; always use `pam_status_type_appointment` as the tele marker instead.

### Priority rollup (net-new, build first)
- **P0:** #1 booking-source attribution, #4 slot utilization & idle-time, #8 visit-status funnel timing, #10 no-show driver panel.
- **P1:** #5 double-booking, #6 lead-time by channel, #7 walk-in/scheduled load, #12 tele-vs-clinic economics, #14 thin-encounter detector, #16 prepaid-vs-counter, #18 structured follow-up recall, #24 digitization turnaround.
- **P2/P3 + flags:** insurance mix, duplicate-patient hygiene, package uptake, referral source, consult duration, notification reach; explicit infeasibility flags for feedback, live queue/token, discount-approver workflow, SMS/WhatsApp engagement, ABDM consent artifacts.

Key evidence files: live schema verified via read-only introspection against `tatva_clinic`; column map at `/Users/shyamsundar/Documents/work-tp/pm-analytics-service/scripts/db-check.js`; EMR lifecycle confirmed in `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/api/services/ApiAppointments.js`, `ApiTeleconsult.js`, `VisitService.js` (KEA visit/digitization sync), `ApiBillingPackage.js`, `ApiMonetization.js`, and `/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/src/pages/opdBilling`. Temp introspection scripts were created under the service `scripts/` dir and removed after use.