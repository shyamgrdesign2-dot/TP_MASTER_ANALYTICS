<!-- Generated 2026-06-09 via multi-agent review/UX workflow. OPD-only. Companion to OPD_Analytics_Spec.md. -->

# OPD Analytics — Review & Prioritization (CEO/PM/User/Design/Eng lenses)

## 1. How to read this

This document synthesizes seven independent reviews of the OPD Analytics Spec (`/Users/shyamsundar/Documents/work-tp/Pm-Doctor-Portal/docs/analytics-planning/OPD_Analytics_Spec.md`) across five lenses: CEO/Founder, Product Manager, three personas (Practicing Doctor / P1, Specialty-admin / P2, Operational-owner / P3), Design/UX, and Architecture/Eng/DevEx.

**It judges the spec for worth-it, not just completeness.** A metric is not justified merely because the data exists in the database. Every metric here is held to a single gate: *does a named persona take a different action the morning after seeing it, and is that action worth a rupee or a retention point?* Data that exists but drives no decision (vanity), data that lives only in sandbox/test rows (fake), data that requires an unbuilt microservice (absent), or data whose cost exceeds its value — all get cut or deferred regardless of how "complete" the catalog feels.

Where a recommendation overrides the spec's own stated priority (its §8 KPI matrix and roadmap), that is called out explicitly. Section 9 supersedes the spec's roadmap. Section 10 is the respectful pushback to the spec owner.

---

## 2. Headline verdict

**Is the spec right? Mostly yes — and it is the best analytics spec this team has produced.** It is disciplined, honest to the row count, and it correctly identifies the one structural insight that turns it from a chart gallery into a product: **one engine, many reports, where leakage → cross-sell → retention are joins on the same tables.** Every lens independently endorsed the leakage-and-retention spine. The spec already names a persona + decision + next-action per card and carries an honest N/P/S/X feasibility tag — rare discipline.

**The 3-5 things that matter most (consensus across all lenses):**

1. **Verify the `pam_id` appointment↔billing join (§12.1) before building anything else.** This single unconfirmed fact gates the entire headline value prop — finished-but-unbilled leakage, avg-bill-per-visit, billing-coverage, and RFM-monetary all ride on it. It is currently buried as "Open Question 1." It must become the #1 build task, treated as a profiling spike and a go/no-go gate, not a card. (CEO, PM, P2, P3, Eng all flag this.)
2. **The leakage story is the product.** Finished-but-unbilled → recovery worklist with a rupee number → front-desk "bill at checkout" policy change. It compounds across all four pillars and is the one thing an owner will pay for repeatedly.
3. **Retention is the second compounding asset.** RFM tiers + LTV most-valuable register + lapsed-high-value recall + the follow-up adherence loop (advised → kept → overdue). Buildable now; the "kept" join is the single highest-value *new* profiling step.
4. **Cut the sandbox/microservice/vanity tail hard.** ABHA depth, VoiceRx/SmartSync, symptom-collector, pending-digitization turnaround, and discount/refund taxonomy are wearing P0/P1 labels they have not earned. The spec fell in love with the completeness of its DB audit.
5. **Ship three role-default landing pages, not one shared Overview.** P1, P2, and P3 make different decisions and must land on different hero strips.

**The single biggest risk:** the entire leakage value prop (the headline) hangs on the unverified `pam_id` join. A leakage register that a front-desk manager acts on must be *exact* — a fuzzy `patient_unique_id`+date match generates false accusations, gets challenged on the first wrong row, and discredits the whole dashboard. There is no honest "fuzzy leakage register" middle ground. Verify the join first; until then, label any leakage number "directional."

---

## 3. Consensus KEEP — the true core

Metrics backed by every lens, buildable now or on existing RELIABLE builders, each driving a real next click:

| Metric | Why it earns its place | Lens consensus |
|---|---|---|
| **Billing money hero** — billed / collected / outstanding / collection-rate / avg-bill (Billing G1) | The P&L hero. Already live in `financial.ts` with period-over-period wired. Decision: chase dues vs fix volume/pricing. | All 5 lenses |
| **Finished-but-unbilled leakage register** (Billing G10 / Appts G7 / Patients G8) | The single highest-ROI block. Drives the one action an owner acts on this week: mandate bill-at-checkout. *Gated on `pam_id` verification.* | All 5 lenses |
| **3C reconciliation + payment-mode mix** (Billing G7, G6) | Live, legacy-parity, used daily by accountants. Cash-audit backbone. | CEO, PM, P3, Eng |
| **RFM tiers + LTV most-valuable register + Pareto** (Patients G5/G6) | The compounding retention asset; the top-N "do-not-lose" register is the daily-use artifact. R+F free off the visit CTE; M gated on `pam_id`. | All 5 lenses |
| **Retention / return-within-90 + churn + lapsed recall** (Patients G3) | Cheapest revenue in OPD; leading churn indicator. Derivable now. | All 5 lenses |
| **Follow-up adherence loop** — advised → kept → overdue (Appts G3 / Patients G8) | The cheapest repeat-revenue lever and a genuine differentiator (absent from all reference dashboards). The "kept" join is the one profiling step worth funding. | All 5 lenses |
| **Per-doctor / per-specialty comparison** as variance vs peer median (Appts G6, Rx G6, Billing G8) | The coaching surface for P2. "Variance not league table" framing is the right call. All `GROUP BY um_id` on live data. | CEO, PM, P2, Eng |
| **Rx quality + cross-sell** — generic-capture %, polypharmacy, drug/manufacturer mix, completeness (meds+dx only) | Procurement leverage + quality in one. RELIABLE off `tbl_medicine_report ⋈ medicine_master`. | All 5 lenses |
| **OPD Overview headline strip** (value + delta tag, no charts) | The 10-second triage screen. Highest value-per-line-of-code. *Drop ABHA and Top-symptoms from the strip — see §4.* | PM, Design, Eng |
| **Status funnel** (Appts G1) + **slot utilization / idle-time** (Gap-Scan #4) + **visit-status funnel** on `tbl_patient_visit_logs` (41,905 rows, Gap-Scan #8) | The capacity layer the front-matter wrongly assumed was timestamp-blocked. `pam_appointment_duration` is 99.5% populated. The spec's best self-correction. | CEO, PM, P3, Design, Eng |
| **Top diagnoses / drugs / investigations lists** (Overview, Rx G7) | The cross-sell *map* (the lists, not the attach rates) — real, valuable as a stocking/tie-up map. | All 5 lenses |
| **Cross-sell attach map — lab/pharmacy** (Billing G12) | Keep the top-N lists (live) and the *rate* as directional. The in-house tie-up business case. *Cut the ₹-upside estimate — see §4.* | CEO, PM, P3 |

---

## 4. Consensus CUT / DESCOPE — the most important section

Ruthless. Each item below failed the worth-it test for the stated reason. Consensus was strong across lenses.

### Fake data (sandbox / test only) — CUT
- **ABHA stage / velocity / time-to-link / linked-by / KYC-method (ABHA Deep-Dive Groups D–G, Appts G8 link-stage, Patients G9 detail).** **Reason: fake + vanity.** 2,733 of 2,759 ABHA addresses are `@sbx` sandbox, **zero `@abdm` production**, 2,743 created by one test account (`pm_created_by=64`). Backing stage tables hold **8–70 rows**. A velocity trend on 8 rows is "a lie with a confidence interval." **Keep exactly ONE thing:** a boolean linked/verified share tile behind a "Sandbox data — production ABHA pending" badge, plus the ~110 dirty-flag count as a data-quality bug ticket. **Pull ABHA off the Overview hero strip entirely** — this contradicts the spec's §8, and that contradiction is deliberate: showing "5.2% ABHA compliance" on the owner's first screen ships a number that is *wrong*, not just incomplete, and it will end up in a board deck.
- **Occupation / marital / area demographics (Patients G7).** **Reason: fake + low-action.** 26–118 of 53k rows. Already tagged NOT-IN-DB; delete the rows entirely, do not even render as a "% known" or data-quality tile on a revenue dashboard.
- **Notification reach / SMS-WhatsApp engagement / recall-message follow-through (Gap-Scan #20/#21/#22), ABDM consent (#23, 2 rows), patient-insurance mix (#2, 130 rows).** **Reason: fake/near-empty.** Template definitions and 64–77-row logs, not send data. Move to a single "explicitly out of scope" appendix — do NOT carry as numbered analytics; a reader skimming 24 Gap-Scan items assumes 24 features.

### Absent data (microservice, NotImplemented) — CUT from analytics roadmap
- **VoiceRx / SmartSync / SnapRx product-mode adoption (Rx G4, §7 "the wedge").** **Reason: absent.** Requires the `engagement/*` cross-service read that *throws `NotImplementedException`*. You cannot measure your own wedge from this DB. This belongs to the engagement-service team. **Do NOT render a "coming soon" placeholder for your flagship product** — it signals you can't measure yourself. Demote to a roadmap line / backend-contract appendix.
- **Symptom-collector funnel (AI Agents, all [BLOCKED]).** **Reason: absent.** Separate microservice, no table, no endpoint. The honest write-up is excellent, but honesty about a thing you can't build doesn't make it a deliverable. Cut to "flag only"; do NOT render placeholder funnels. (The only defensible collector KPI is the `set-add-to-rx` ack *if* it lands in `tatva_clinic` — a 1-day spike, not a feature.)
- **Pending-digitization turnaround / P90 / aged buckets / clearance / net-change.** **Reason: absent.** No digitized-at timestamp exists anywhere readable; the signal lives in SnapRx, and `pam_modify_date` is explicitly the wrong proxy. Keep ONLY a live backlog count + rate via a SnapRx list call. This is a **backend contract (SnapRx aggregate endpoint), not an analytics sprint** — roadmap the endpoint first, then the dashboard. The spec's marquee compliance ask is fully BLOCKED today.

### Vanity / low-action — CUT or descope
- **Discount value/% & leakage, refund-type taxonomy, advances discrete flows (Billing G2/G3/G4).** **Reason: cost > value on tiny-n / unmapped data.** No discount column is mapped (`NotImplemented` stub); refund-type splits on ~36 rows with no reason field; advance flows need the V2 wallet ledger. **Keep the directional totals** (refund ₹, credit-note ₹, advance-held liability, discount-by-creating-user); **cut the taxonomy/approval/discrete-flow/per-type layers.** Putting "Dr. X is over-discounting" in front of an owner off reconstructed guesses is a reputational landmine.
- **Cross-sell attach *rates* and ₹-upside estimates (Billing G12 detail).** **Reason: vanity precision.** The order→fill join key doesn't exist (free-text `tcm_investigation`, no order-ID linkage). A rupee figure from fuzzy free-text matching will be wrong by a lot and *will* be used to justify capex. Ship the demand-side lists (real); cut the attach-rate % and ₹-upside until an order-ID linkage exists.
- **Top-symptoms tile on the Overview landing.** **Reason: fake on the first screen.** Template-config only, not per-patient. A knowingly-fake number on the screen every persona sees first poisons trust in the whole digest; a `meta.note` does not rescue a landing tile. Remove from Overview; if it must exist, bury it in the Symptoms domain labelled "template-level config, not patient data."
- **True OPD clinical procedures (Procedures domain).** **Reason: fake/absent.** `tbl_inpatient_doctor_procedure` is 53 rows of IPD test garbage ("lmlml", "TEST"); `tbl_casemanager_surgery` doesn't exist live. Keep only the billed-service proxy, **relabel it "Top billed services," fold into Billing G11**, and kill the "Procedures" leaf entirely.
- **Wait-time as a P0 / headline metric.** **Reason: ~12% real coverage.** Gap-Scan #9: ~11,726 of ~13,300 logged appts record status 0 and 3 at the *same instant* (one-click), leaving only ~1,600 with genuine dwell. A box-plot implies a distribution you don't have. **Demote from P0 to a coverage-gated, footnoted single number** (or cut until profiling proves the "seen" timestamp). Ship the status-funnel *counts* (buildable) instead.
- **RFM framework vocabulary on the P1 view, scatter/box-plots for P2 coaching, cohort-triangle heatmap, LTV histogram.** **Reason: cognitive load > value for the persona.** Doctors think "Mrs. Sharma is overdue," not "At-Risk quintile." HoDs act on a leaderboard row, not a scatter. Keep the derived *outputs* (value-sorted recall list, deviation-from-median leaderboard); cut the analyst-grade charts.
- **Lab abnormal-results / reference ranges / turnaround, vaccine inventory/batch, expense/margin, ICD-coded gynec morbidity, custom-module usage counts, queue-jump / consult-duration distribution / double-booking (Gap-Scan #5/#11/#13).** **Reason: absent or low-action.** Already de-scoped or single-business config; keep out of nav so they don't generate empty leaves. Ensure no "Revenue vs Expense" tile leaks back — there is no cost table, refuse the combo.

---

## 5. MERGE / SIMPLIFY

- **One Leakage Console, not five front-doors.** Finished-but-unbilled (Billing G10), active-but-unbilled (Patients G8), advised-follow-up-no-return (Patients G8), prescribed-but-not-filled (Billing G12), undigitized-but-billed (Digitization) are scattered across four pillars. It is **one anti-join** (`status=3 LEFT JOIN billing WHERE bill IS NULL`) re-scoped per persona. Build **one leakage builder**, parameterize by JWT scope (P3 clinic / P2 doctor / P1 own), surface it as tabbed sub-registers under one "₹-at-risk" hero. Don't let it become four builders.
- **One Department Scorecard for P2, not four leaderboards.** Appts G6 (volume, cancel%, utilization), Rx G6 (generic%, meds/visit, follow-up%, completeness), Patients G3 (retention-90), Billing G8 (revenue, collection%) are all `GROUP BY um_id` over the same doctor set. Build **one register** — one row per doctor, each cell rendered as deviation-from-specialty-median with outliers flagged. This *is* P2's default landing.
- **One `patient-value.ts` builder** emitting RFM tiers + most-valuable register + Pareto blocks in a single envelope (RFM G5 and LTV G6 are the same patient×billing aggregate sliced differently). One PR, not two.
- **Merge Billing unit-economics (G9) and revenue-by-doctor (G8) into the G1 headline.** Avg-bill-per-invoice, ARPP, revenue-per-doctor are `Billed ÷ {denominator}` — card variants, not separate KPI groups. One headline strip + one ranked doctor-contribution bar with collection-rate as the secondary metric.
- **Collapse retention's 5+ cards to three:** one retention-rate KPI + delta, one lapsed-high-value recall register, one visit-depth funnel. Cut the time-between-visits histogram and cohort-triangle heatmap.
- **Merge the two ABHA sections into one.** The base "ABDM/ABHA" and the "Deep-Dive (supersedes)" coexist — delete the base outright. One `operational/abha` builder, boolean-share only, sandbox-banner gated, stage/velocity explicitly parked.
- **Merge Booking-Channels + AI-agent-booking + Gap-Scan #1/#6/#7 into one Booking Channels page.** All read the same `tbl_appointment_source` (17% coverage). One channel donut (with Unattributed wedge) + mandatory coverage gauge + lead-time-by-channel. The AI-agent slice is one `tas_source` value (`APPOINTMENT_AGENT`=680) inside the donut — no standalone "AI Agents" page. Collapse the five "Visit My Website" cards into one website card with the proxy disclaimer.
- **Fold Procedures (billed-proxy) into Billing G11 "Most-sold services"** — same `tbl_opd_billing_invoice_service` union, one builder.
- **Collapse Rx completeness sub-flags to a meds+dx-weighted index.** Advice/exam/MH "presence flags" reflect storage location (inline blobs), not clinician behavior (advice 6.5%, exam 8.8% fill-rates). Drop them, don't footnote them. Label the survivor "structured-capture coverage."

---

## 6. MISSING — gaps to add (consolidated)

- **A single consolidated "OPD revenue-at-risk" headline number** on the Overview: "you billed ₹X, collected ₹Y, ₹Z is recoverable across unbilled + dues>90d + lapsed-high-value." The spec has a leakage counter but no sized total opportunity. (CEO)
- **Scheduled/emailed digest + alerting.** A busy owner does not log in daily. A **weekly "leakage + dues + backlog" email with the recovery worklist attached** is the highest-leverage P3 feature and the cheapest path to renewal. Infra (scheduled tasks) is trivial relative to value. Currently absent. (CEO)
- **"So-what → action → did it work?" closure / success metric for the dashboard itself.** Nothing tracks whether an intervention moved the number (₹ leakage recovered MoM, recall-list conversion rate) — which is what proves ROI and renews the contract. Define a north-star + adoption funnel (weekly active P1/P2/P3, exports acted on). (CEO, PM)
- **Per-persona purpose-built landing pages.** P1 has no "My Day / My Panel Today" home (queue depth, overdue recalls, draft/unfinalized consults, chronic-overdue count); the spec auto-scopes data but gives all three personas one Overview layout. P1 must never land on the owner digest. (P1, Design, Eng)
- **Chronic-condition recall by diagnosis cadence.** Join `tbl_casemanager_diagnosis` (104,548 rows) to a condition→cadence map so a diabetic/hypertensive surfaces as overdue even if no follow-up date was set. This is the recall list a doctor actually cares about. (P1)
- **Draft/unfinalized consults *register* (not just a count)** — `is_draft`, the documentation-discipline self-cleanup worklist for P1. (P1)
- **Case-mix / panel-age normalization for P2 comparisons** — named (line 1152) but never specified. Without stratifying return-rate by new-vs-follow-up and broad case-type before computing peer deviation, the chronic-disease doctor is an unfair "low-retention" outlier. P2's entire fairness premise collapses without it. Plus a standardized **minimum-volume gate** (`n≥N`, "directional not statistical") on every per-doctor variance card. (P2)
- **Department-vs-other-departments benchmark row** — a HoD's #1 upward-reporting question ("how does Cardiology's collection-rate / retention compare to clinic median?") has no card. (P2)
- **No-show driver panel** (Gap-Scan #10) — the funnel counts cancellations but never cuts no-shows by channel × lead-time × DOW, which is the difference between a number and an action. Buildable now. (PM, P3, Design)
- **Multi-branch comparison** (`tobo_hm_id`/`hospitalId` exist) — branch-vs-branch P&L/leakage/capacity for a group owner. The eventual moat; named as North Star. (CEO, P3)
- **Prepaid (Razorpay) vs counter collection** (Gap-Scan #16) and **referral-source contribution** (Gap-Scan #19, 162 rows, descriptive only) — real cash-flow and acquisition lenses, buildable now. (P3)
- **Duplicate-patient hygiene** (Gap-Scan #3) — patients sharing `pm_contact_no` across IDs inflate panel size and silently corrupt every retention/LTV number. A prerequisite data-quality gate for the whole Patients pillar. (CEO, P3)
- **Eng infrastructure gaps:** (a) a column-map migration PR adding the six confirmed-but-unmapped columns (`pam_created_date`, `pam_type`, `pam_app_end_time`, `pam_appointment_duration`, `is_draft`, billing-audit cols) — one PR, day-one, unblocks the most downstream metrics; (b) a profiling-spike backlog as first-class tickets (spike → unblocks-which-KPIs → effort → decision-needed); (c) caching/refresh-cadence decision for heavy full-panel scans (RFM/LTV/cohorts) on the shared read replica; (d) envelope versioning + blocked-metric error contract (200-with-`meta.blocked`); (e) smoke-test acceptance criteria (envelope conformance + mandatory `meta.note` on any non-N metric). (Eng)
- **Design components:** defined empty/partial-data state component (coverage % + why-tooltip) applied to every gated/sparse metric; mobile/narrow-viewport reflow (P1 checks on a phone between consults); a11y beyond color; an explicit drill-down interaction model (does a hero tile filter, open the register, or navigate?). (Design)

---

## 7. Per-persona must-have dashboards (P0 card sets)

### Doctor (P1) — lands on "My Panel Today"
1. **My Recall List** — overdue follow-ups + lapsed-high-value + due vaccinations, one register, days-overdue sorted, CSV export. *Re-spine on `tbl_patient_followup` (13,216 rows), not `tcm_followup_date` (2,229 rows / 5.8%).*
2. **My Panel Today** landing — queue depth, today's overdue-recall count, draft/unfinalized backlog, chronic-overdue count.
3. **Follow-up adherence** (advised → kept → overdue), scoped to my `um_id`, overdue list one click away.
4. **My panel trajectory** — active panel + new:returning + single-visit share (thinning-book early warning).
5. **Chronic-condition recall** by diagnosis cadence (build it — missing today).
6. **My finished-but-unbilled register** — my own lost earnings (gated on `pam_id`).
7. **My prescribing self-audit** — completeness (meds+dx) + polypharmacy + generic %, vs opt-in anonymized peer band, strictly private.
8. **My draft/unfinalized consults register.**

*Off P1 entirely:* ABHA nudges (compliance chore, fake data), 3C/discount/refund audit, RFM quintile framework, channel LTV, demographics — owner vocabulary that is surveillance-adjacent cognitive load for a clinician.

### Specialty-admin (P2) — lands on the Department Scorecard
1. **Unified Department Scorecard** — one `GROUP BY um_id` table, all coaching metrics as peer-median deviation, outliers flagged.
2. **Per-doctor volume + cancel-rate + utilization-spread** (the rebalance/hire trigger; buildable now).
3. **Rx behavioral scorecard** — generic% · meds/visit · follow-up-advice% · meds+dx completeness (buildable now).
4. **Retention-by-doctor (return-within-90)** *with* case-mix/panel-age normalization and an `n≥N` gate (normalization non-negotiable).
5. **Revenue + collection-rate per doctor, paired** (contribution + dues-problem flag).
6. **Follow-up "kept" adherence by doctor** — promote to Phase 1; without it, retention coaching is hollow.
7. **Department-vs-peer-departments benchmark row** (the upward-reporting view, currently missing).
8. **Per-doctor finished-but-unbilled** — *conditional on `pam_id` confirmation*; otherwise demote to P3-aggregate.

*Off P2:* per-doctor ABHA bar (coaches the front desk, not the clinician — keep at dept aggregate only), per-doctor advice/exam/MH completeness (storage artifact — dangerous to coach on), VoiceRx-by-doctor.

### Ops-admin / Owner (P3) — lands on the P&L + Leakage Console
1. **Money hero** — billed / collected / outstanding / collection-rate / avg-bill, with vs-prior deltas (live).
2. **Leakage Console** — merged register (zero-bill finished + active-but-unbilled + dues 90+ + lapsed-high-value) with one ₹-at-risk total. *Gated on `pam_id` verification — the #1 build task.*
3. **3C reconciliation** (live).
4. **RFM tiers + LTV most-valuable register + Pareto** (highest-leverage unbuilt capability).
5. **Retention / return-within-90 / churn + lapsed recall.**
6. **Capacity layer** — slot utilization + idle-time (Gap-Scan #4) + visit-status funnel (#8) + no-show driver cut (#10).
7. **Cross-sell attach map** — top dx/drugs/investigations lists (live) + lab/pharmacy in-house attach *rate* (directional; cut the ₹-upside).
8. **Channel mix with coverage-honesty gauge** (last-90d default + Unattributed wedge).

*Off P3 P0:* ABHA (sandbox), pending-digitization turnaround (blocked), discounts (unmapped), demographics beyond age/gender (sparse).

---

## 8. Customization decisions

**Configurable (ship as settings, with sane defaults):**
- **Default landing per role** — P1 → My Panel Today + recall list; P2 → Department Scorecard pre-scoped to `dp_id`; P3 → Leakage Console + P&L hero. This is the single biggest UX lever and the JWT scoping is already half-built. The default *should follow role*, not be one shared digest.
- **Saved views / filter presets** — the standard filter bar (date · specialty · doctor · visit-type · gender) savable per-user (e.g. P2's "My Dermatology, last 90d").
- **Card pinning on the hero strip** — each persona pins their 4–5 cards; the rest collapse. Cheaper than a builder, solves breadth-overwhelm, high-retention. (Lets P3 swap the sandbox-ABHA tile out of prime real estate.)
- **Configurable thresholds** (clinic-specific; hardcoding generates wrong worklists and erodes trust): digitization SLA bands (48h/7d), "lapsed" window (90/180/365), follow-up "kept" tolerance window, no-show proxy window, RFM tier cutoffs, polypharmacy cutoff, dues-ageing bands, collection-rate target, peer-median outlier band (Nσ, per-department for P2), ABHA linkage target (currently hardcoded 70%). P1 controls clinical thresholds (chronic cadence per condition); P2 controls departmental outlier bands; P3 controls policy bands.
- **Recall-list export** now + (later) one-click WhatsApp/SMS recall campaign — the action the data is for.
- **Choose-your-secondary-metric** on P2's leaderboard (swap retention / collection% / generic% / follow-up% beside the volume bar).
- **Per-doctor watch-list** for P2 (pin the 2–3 doctors in a coaching cycle) + a coaching-annotation/target layer (the "did the coaching work?" loop — currently missing).
- **Peer-band opt-in** for the P1 self-audit (never expose a doctor by name to peers).
- **Specialty-thin module feature-flags per business** (Obstetric/Gynec, Vaccination) — already specced; keep, and ensure they never pollute owner-hero aggregates. Extend the same gating to the sandbox-ABHA banner and the 17%-coverage booking-source card.

**Fixed (refuse to build):**
- **No self-serve metric/report/chart builder for v1.** Unanimous across CEO, PM, P2, P3, Design, Eng. It is a product in itself, it breaks the "every card answers a decision" contract and the honest-no-data discipline, and it invites the chart-gallery sprawl the spec is trying to avoid. Saved views + pinning + thresholds covers ~90% of the need at ~10% of the cost. Defer indefinitely.
- The standard page shape (filter bar → KPI hero → one trend → ranked bars → register) stays as the fixed default template; only ordering/pinning within it is configurable.

---

## 9. Revised prioritization (supersedes the spec's roadmap)

**Phase 0 (gates everything — do before any card):**

| Item | Lens-consensus | Feasibility | Verdict |
|---|---|---|---|
| Verify `pam_id` → billing-rollup persistence (§12.1) | All 5 | Profiling spike (1 query vs billing svc) | **P0 — the fork.** Gates leakage, avg-bill-per-visit, billing-coverage, RFM-M |
| Column-map migration PR (6 unmapped columns) | Eng | 1 PR, trivial | **P0 — day one.** Unblocks lead-time, new/returning truth, consult duration, bill audit |
| Lock envelope + db-check + smoke-test acceptance criteria | Eng | Low | **P0** — the contract that keeps "add a builder" safe |
| Duplicate-patient hygiene gate (Gap-Scan #3) | CEO, P3 | Buildable now | **P0** — prerequisite or every retention/LTV number is corrupt |

**P0 — ship (RELIABLE, high consensus):**

| Metric | Lens-consensus | Feasibility | Verdict |
|---|---|---|---|
| Three role-default landing pages (P1/P2/P3) | All 5 | Scoping half-built | **P0** |
| Billing money hero + 3C + payment-mode | All 5 | Live | **P0** |
| Overview headline strip (no ABHA, no symptoms) | PM, Design, Eng | Live | **P0** |
| Status funnel + per-doctor/specialty comparison (variance) | All 5 | Buildable now | **P0** |
| Slot utilization + visit-status funnel + no-show drivers (Gap-Scan #4/#8/#10) | CEO, PM, P3, Design, Eng | Buildable now | **P0** (promoted from Gap-Scan) |
| RFM (R+F) tiers + LTV register + Pareto | All 5 | Buildable now (M gated) | **P0** |
| Retention / return-90 / churn + lapsed recall | All 5 | Buildable now | **P0** |
| Rx generic% + polypharmacy + drug/mfr mix + meds+dx completeness | All 5 | RELIABLE | **P0** |
| Top dx/drugs/investigations lists + most-sold services | All 5 | Live/trivial | **P0** |
| Department Scorecard (one `GROUP BY um_id`) | PM, P2, Eng | Buildable now | **P0** |
| Leakage register (one builder, persona-scoped) | All 5 | **Gated on Phase-0 join** | **P0 after gate** |
| Follow-up adherence loop ("kept" join) | All 5 | Needs profiling | **P0** — highest-value new build |

**P1:**

| Metric | Lens-consensus | Feasibility | Verdict |
|---|---|---|---|
| Lab/pharmacy cross-sell attach *rate* (directional) | CEO, PM, P3 | Fuzzy join | **P1** — cut ₹-upside |
| Dues-ageing 90+ register | CEO, P3 | Live | **P1** |
| Booking-channel mix + coverage gauge | CEO, PM, P3, Eng | 17% coverage guard | **P1** (recent-window only) |
| Allergy prevalence (26,223 rows) | PM, Eng | RELIABLE, unused | **P1** — cleanest quick win |
| Case-mix normalization + n≥N gate for P2 | P2 | Method spec needed | **P1** — non-negotiable for fairness |
| Department-vs-peer-departments benchmark | P2 | Buildable now | **P1** |
| Chronic-condition recall (diagnosis cadence) | P1 | Build (dx join) | **P1** |
| Weekly emailed leakage+dues+backlog digest | CEO | Scheduled-task infra | **P1** — renewal driver |
| Prepaid-vs-counter, referral-source (Gap-Scan #16/#19) | P3 | Buildable now | **P1** |
| Consolidated "revenue-at-risk" headline number | CEO | Derived | **P1** |

**P2 (deferred / conditional):**

| Metric | Lens-consensus | Feasibility | Verdict |
|---|---|---|---|
| Wait-time (timing) | PM, Design | ~12% coverage | **P2-gated** — coverage-footnoted single number, off hero |
| ABHA boolean linked/verified share | All (descope) | Sandbox | **P2** — sandbox-badged tile only; all stage/velocity CUT |
| Refund/advance/discount *totals* | PM, P3, Eng | Directional | **P2** — totals only, taxonomy CUT |
| Antibiotic/drug-class rate by doctor | P2 | Needs ATC dictionary | **P2** — don't let it block the scorecard |
| Multi-branch comparison | CEO, P3 | Needs branch dim | **P2** — named as North Star |
| Pending-digitization backlog count (live SnapRx) | PM, P3 | Backend contract | **P2** — endpoint first, turnaround metrics CUT |
| Coaching-annotation / "did it work?" loop | P2, CEO | New surface | **P2** |

**CUT entirely (not on the roadmap):** ABHA stage/velocity/KYC-method, VoiceRx/SmartSync adoption, symptom-collector funnel, per-patient & template symptoms, clinical procedures, lab abnormal-results/turnaround, vaccine inventory, expense/margin, occupation/marital/area demographics, notification reach / SMS-WhatsApp engagement, ABDM consent, custom-module usage counts, cross-sell ₹-upside estimates, self-serve builder.

---

## 10. Pushback to the owner

Where the stated requirements should change — reasoned and respectful — plus open decisions.

**Pushback 1 — Remove ABHA from the headline / stop calling it the "India differentiator" today.** The spec's §8 puts ABHA linkage rate on the Overview hero and tags it P0/P1, while the spec's own deep-dive admits prod ABHA = 0 and stage tables hold 8–70 rows. These contradict each other. Leading the suite's differentiator narrative on sandbox data is a credibility landmine — the number is *wrong*, not just incomplete, and it will be quoted in a board deck. **Change the requirement:** build ABHA correctly, ship it dark behind a sandbox badge, and treat real ABHA analytics as a fast-follow once production linkage is non-trivial. (CEO, PM, P1, P3, Eng all converge here.)

**Pushback 2 — Finished-but-unbilled is a P0 *verification spike*, not a P0 *card*.** The entire revenue thesis rests on it, then the spec admits the appt↔billing join is unverified with a fuzzy fallback "of lower precision." A leakage register a front-desk manager acts on must be exact, or it generates false accusations and dies on the first wrong row. **Change the requirement:** make the `pam_id` verification the #1 task; the card either becomes the best in the suite or it doesn't ship — no fuzzy middle ground. Until verified, every leakage number is labelled "directional," and per-*doctor* unbilled attribution stays off P2 (clinic-aggregate only).

**Pushback 3 — Don't roadmap microservice work as analytics deliverables.** VoiceRx/SmartSync adoption and the symptom-collector funnel throw `NotImplementedException`. They are cross-service build tasks, not analytics tasks. **Change the requirement:** move them to a backend-contract appendix; do not render "coming soon" placeholders for your flagship product (it signals you can't measure yourself); raise them to the engagement-service team as data-capture requests. Same logic moves pending-digitization turnaround from "Phase-1 dashboard" to "SnapRx aggregate endpoint, then dashboard."

**Pushback 4 — One shared Overview is wrong; ship three role-default landings.** The spec auto-scopes data by JWT but assumes one layout. A doctor must never land on the owner's collection/leakage digest, and an owner doesn't want a recall list. **Change the requirement:** default landing follows role.

**Pushback 5 — Re-cut the roadmap around the `pam_id` fork and the column-map PR, not around domains.** The cheapest, highest-leverage eng work (one migration PR unblocking lead-time, new/returning truth, consult duration, bill audit) is buried as a §12.9 footnote. Lead with it.

**Pushback 6 — Acknowledge there is no cost/margin data.** Every "revenue" number is top-line. "Revenue by specialty" must never read as "profit by specialty." This is the single biggest decision-blocker for an owner and deserves a front-and-center caveat, not a buried §9 line.

**Pushback 7 (P1-specific, near-disqualifying) — the flagship recall list is specced against the wrong table.** The follow-up spine is `tcm_followup_date` (2,229 rows / 5.8% coverage) while Gap-Scan #18 documents `tbl_patient_followup` at **13,216 rows** — unmentioned in the front-matter and unreconciled in Open Q2. At 5.8% the recall list is mostly empty and the doctor stops trusting it on day two. **Change the requirement:** re-spine recall on the 13k-row table before Phase 1.

**Pushback 8 — The 24-item Gap Scan is presented as a build queue; ~1/3 should be a fenced "not building" list.** Split it: **ship** (#1 booking-source, #4 slot utilization, #8 status-funnel timing, #10 no-show drivers, #14 thin-encounter, #18 structured recall) vs **explicitly not building** (notification reach, SMS/WhatsApp, ABDM consent, patient-insurance, queue-jump, double-booking). A reader skimming 24 numbered items assumes 24 features.

**Open decisions for the owner:**
- Confirm or refute `pam_id` persistence onto `tbl_opd_billing_overview` (blocks Phase 2).
- Confirm the doctor→specialty map (still "VERIFY") — gates all specialty rollups; resolve once or none ship.
- Pick the follow-up spine: `tbl_patient_followup` (13k) vs `tcm_followup_date` (2.2k) vs `toct_type`.
- Decide refresh cadence for heavy panel scans (live query vs nightly materialization) before they hit the shared read replica.
- Confirm whether a SnapRx aggregate endpoint will be built (gates the only honest digitization metric).
- Decide whether multi-branch comparison is named as the explicit North Star now (it is the eventual moat).