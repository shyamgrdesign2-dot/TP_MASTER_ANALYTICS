# TatvaCare Analytics — KPI Benchmarks & Research Citations
### Cited evidence layer for the metric catalog (PRD v2.0 §8) and the "why" (§3 of the architecture doc)

**Method:** deep-research harness — 6 search angles → 25 sources fetched → 121 claims extracted → 25 adversarially verified (3-vote) → **21 confirmed, 4 refuted**, then synthesized to 8 high-confidence findings. Each row below carries its source and confidence so Finance/Clinical can sign off on real numbers, not folklore.

> **Read this with the caveats (Section 5) in view.** Two parts of what we wanted — *per-metric chart recommendations* and *dashboard UX for non-analysts* — were **not** substantiated by any surviving claim. Our chart taxonomy (architecture doc §11.3 / PRD §13.5) stands on convention, not on this research. Flagged honestly so we don't overclaim.

---

## 1. KPI-by-domain table (formula · why · benchmark · chart · source)

Benchmarks are **US/global reference points** (HFMA, HFMA MAP Keys, MGMA, government utilization formulas). Treat them as *orientation targets to localize for the Indian market*, not hard SLAs. Chart picks are **our convention** (research gap — see §5).

### Operational / IPD utilization
| Metric | Formula (cited) | Why it matters | Benchmark (cited) | Chart | Source · conf. |
|---|---|---|---|---|---|
| **ALOS** | Total inpatient days ÷ admissions (worked: 40,000/6,000 = **6.67 d**) | Rising ALOS = discharge bottlenecks/complications; falling = throughput ↑ | No single global target (case-mix dependent); track trend & vs peer | Bar / line (trend) | Hawaii SHPDA (primary) · **high** |
| **Average Daily Census (ADC)** | Total inpatient days ÷ 365 (worked: 40,000/365 ≈ **110**) | Demand planning — staffing, nursing ratios, consumables | n/a (absolute) | Line (trend) | Hawaii SHPDA (primary) · **high** |
| **Bed Occupancy Rate (BOR)** | (ADC ÷ licensed beds) × 100 (worked: 109.59/150 = **73.06%**) | Too low = wasted capacity; too high = no surge buffer / safety risk | Example midpoint ~73%; commonly ~80–85% healthy band (localize) | KPI tile + line | Hawaii SHPDA (primary) · **high** |
| **No-show rate** | no-shows ÷ scheduled appointments | Direct revenue leakage + scheduling/reminder failure signal | **Target 5–7%; <10% acceptable; >20% poor** (MGMA-backed) | KPI tile + trend line | simbo.ai (secondary, MGMA-backed) · **medium** |

### Financial / revenue-cycle (anchored to HFMA MAP Keys — the canonical standard: 29 KPIs / 5 groups)
| Metric | Formula (cited) | Why it matters | Benchmark (cited) | Chart | Source · conf. |
|---|---|---|---|---|---|
| **Net Days in A/R (FM-1)** | Net A/R ÷ avg daily net patient-service revenue | The headline indicator of overall A/R / collection health | **30–40 days; A/R >90 days should be <10%** | KPI tile + trend | HFMA (primary) · **high** |
| **Net collection rate** | payments ÷ (charges − contractual adjustments) | How much of *collectible* revenue you actually capture | **≥95% minimum; 97–99% optimal** | KPI tile / gauge | HFMA (primary) · **high** |
| **Claim/Bill denial rate** | denied ÷ total submitted claims | Wasted admin effort + cash delay | **Target 5–10%; <5% optimal** *(HFMA target — observed initial-denial rates run higher ~12–20%; label as target)* | Bar (by reason) + trend | HFMA (primary) · **high** |
| **Clean Claim Rate (CL-1)** | claims passing edits w/ no manual intervention ÷ claims accepted | Data-quality at billing entry; drives denial rate | Higher = better (data-quality KPI) | KPI tile | HFMA MAP Keys (primary) · **high** |

> **India localization note:** "claims/denials/payer" map to **TPA/insurance** workflows here; for self-pay-heavy OPD, the equivalent is *collection efficiency = collected ÷ billed* and *AR/dues ageing*. Our DB supports both (receipts vs invoiced — see buildability doc PB-5).

### Clinical / patient (taxonomy)
| Item | Finding | Source · conf. |
|---|---|---|
| **Most-tracked hospital KPIs** | ALOS, nosocomial-infection rate, patient satisfaction, mortality, bed occupancy — the top-5 most-cited across the literature | PMC scoping review (primary) · **high** |
| **Domain taxonomy** | Two axes: **effectiveness** (safety, quality, responsiveness, accessibility) × **efficiency** (productivity, financial). Maps cleanly to our operational / financial / clinical / growth grouping | PMC scoping review (primary) · **high** |

---

## 2. The research *validates our architecture* (semantic layer + RLS)

The "build-your-own-view on a governed semantic layer with server-side multi-tenant isolation" design (PRD v2.0 §8, §10; architecture doc §8) is **exactly the documented pattern** of Cube (the leading open semantic-layer tool):

- **Per-request tenant identity from a `securityContext`** (default from the API token) drives isolation — mirrors our **scope-injection stage** that reads `hm_business_id` from the JWT. *(Cube docs, primary, high.)*
- **Row-level security via `queryRewrite`** injects tenant-scoped filters into a shared DB — our exact "inject `hm_business_id` WHERE clause server-side, never trust the client" model. *(primary, high.)*
- **Public-by-default until RLS is configured**, and **failing to declare the tenant context leaks one tenant's data to another** — independent confirmation that our "scope is mandatory, enforced before the query runs" stance is the safety-critical part, not optional polish. *(primary, high.)*
- A single **access-policy mechanism enforces both member-level** (which metrics/dimensions a role sees) **and row-level** security — validates our role×metric matrix + tenant scope being one governance layer.

**Takeaway:** we are not inventing; we are reimplementing a proven pattern. If we ever wanted to shortcut the Analytics Service, **Cube is a credible off-the-shelf semantic layer** — worth a build-vs-buy note in the roadmap.

---

## 3. Compliance — India (ABDM / DPDP), cited

- **ABDM Health Data Management Policy (Ch. III):** consent is valid only if **free, informed, specific, clearly given, and withdrawable at any time**; the data principal retains control over collection & processing. *(IFF wiki verified against primary HDM PDF — high.)*
- **Privacy-by-design principles** the data fiduciary must follow: **purpose limitation, data minimization (collection/usage/storage limits), accountability, transparency, consent-driven sharing, reasonable security.** *(primary-verified — high.)*
- **Direct implications for the analytics module** (already in PRD §18, now cited): aggregates-by-default (data minimization), role-gated + audited patient-level drill (purpose limitation + accountability), de-identified `dim_patient`, in-region data residency, immutable audit log.
- ⚠️ **Time-sensitivity:** the verified HDM text is the **2022 draft**; the **DPDP Act 2023 + its Rules layer on top** and were still settling at research time. **Confirm the current operative ABDM/DPDP rule text with Compliance before finalizing** — do not treat the 2022 wording as final.

---

## 4. How this maps to *our* buildable metrics

Cross-referencing [Analytics_Buildability_and_Scope.md](Analytics_Buildability_and_Scope.md):

| Researched KPI | Buildable on our DB? | Where |
|---|---|---|
| ALOS / ADC | ✅ after PB-3 (discharge date from `tbl_atd_logs`) | Tier ⚠️→✅ |
| BOR (point-in-time) | ✅ now; (bed-day) needs census snapshot | Tier ⚠️/🔴 |
| No-show rate | ✅ after PB-1 (status vocabulary) | Tier ⚠️ |
| Net Days in A/R / dues ageing | ✅ (`tbl_receipt_master` rm_pending_amount) | Tier ✅ |
| Net collection rate / collection efficiency | ✅ after PB-5 (money semantics) | Tier ✅ |
| Denial/clean-claim | ⚠️ depends on TPA/claims data presence — **verify table coverage** (not yet located in dictionary) | open |
| Diagnosis/case-mix, Rx patterns | ✅ now | Tier ✅ |

**New open item surfaced:** denial/clean-claim KPIs assume a claims/TPA workflow — we have **not** located claims-adjudication tables in the dictionary. For a self-pay-heavy Indian OPD this may not exist; **confirm with backend** whether insurance-claim data is captured before promising denial-rate metrics.

---

## 5. Honest gaps & the refuted claims (do not reintroduce)

**Gaps the research did NOT cover (treat as our own judgment, not evidence):**
1. **Per-metric chart-type recommendations** — zero confirmed claims. Our chart taxonomy is convention-based; fine, but not "research-backed."
2. **Dashboard UX for clinical/non-analyst users** — zero confirmed claims.
3. **Semantic-layer comparison** — only **Cube** survived verification; Looker/Power BI/Tableau/Metabase modeling is *not* evidenced here.
4. **Unverified OPD/growth metrics** — payer/payment-mode mix, case-mix index, follow-up adherence, referral attribution, cancellation rate: named in scope but **no verified definition/benchmark**. Define these ourselves (most are simple counts/ratios our DB supports).

**Refuted claims (4) — excluded on purpose; if you see these elsewhere, they failed verification:**
- ❌ "No-show 5–23%, global avg ~23%" (0-3) — over-broad; use the 5–7% target tier instead.
- ❌ An alternate Bed-Occupancy definition ("beds in use ÷ total beds") (1-2) — use the ADC÷licensed-beds formula above.
- ❌ "Days in AR <30, top performers ~25 days" (Plutus Health) (1-2) — use HFMA's **30–40 days**.
- ❌ "Net collections ratio target 98–99%" (Plutus Health) (0-3) — use HFMA's **≥95% / 97–99% optimal**.

---

## 6. Source list (verified)
**Primary:** PMC scoping review `PMC12200011` · Hawaii SHPDA utilization formulas (PDF) · HFMA MAP Keys + HFMA 7-KPIs · Cube docs (multitenancy, row-level-security) · ABDM HDM Policy (via IFF, verified vs primary PDF).
**Secondary/blog (corroborating):** MGMA-backed no-show (simbo.ai), MD Clarity, insightsoftware, ClearPoint, eazyBI/GoodData/FusionCharts (chart guidance — unverified), Ardent/AMLegals/datasecure (DPDP).

*Confidence legend: **high** = primary source, 3-0 vote · **medium** = secondary source backstopped by primary, split vote.*
