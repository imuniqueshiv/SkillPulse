# SIH Demo Script (5–7 minutes)

**Audience:** Smart India Hackathon judges  
**Geography for the walkthrough:** Maharashtra (validation/demo geography only — architecture is state-agnostic)  
**Data class:** SYNTHETIC / DEMO / EVALUATION fixtures — **not** official Maharashtra labour-market statistics

Opening line:

> “SkillPulse does not scrape job boards to recommend courses. It turns observable labour-market evidence into explainable government decision *signals* — and it shows when evidence is insufficient.”

---

## 1. Problem (30–45s)

SIH PS 26134: skill programs are hard to align with industry demand.

Pain: demand, curricula, institutes, and placement evidence live in silos; dashboards often hide uncertainty as “0%”.

## 2. SkillPulse (30s)

Show architecture briefly:

Sources → Ingestion → Quality → Demand → Gap → Training → Institute → Employment → Decision → API → Dashboard

Auth: Clerk identity + Express RBAC + organization scope.

## 3. Demand (45–60s)

Navigate: **Overview** / **Skill Intelligence**

Point to market demand highlights for canonical skills (e.g. React from synthetic Mahaswayam-style fixture path).

Say: demand uses `demand-v1`, `postedAt` windows, quality eligibility — not inventing zeros.

## 4. Skill Gap (45–60s)

Show gap severity / insufficient-data rows.

Emphasize: without supply observations → **INSUFFICIENT_DATA**, not “no shortage”.

Java ≠ JavaScript (canonical Skill IDs).

## 5. Training (30–45s)

**Programs & Institutes** → training need / curriculum alignment from Phase 10.

Training need ≠ curriculum gap (market vs program).

## 6. Institute (30–45s)

Open institute by organization ID if seeded, or explain provider = Organization, program = Course/Curriculum.

No “best institute” ranking.

Course location = UNKNOWN if no location evidence (not inferred from gap geography).

## 7. Employment (30–45s)

If Phase 12 observations exist in the demo path: show rates carefully.

If not: show **INSUFFICIENT_DATA**.

Call out: **Outcomes (SAMPLE)** page is SAMPLE UI — not Phase 12 evidence.

## 8. Government Decision (60–90s)

**Decision Signals** table → open one signal (**Explain**).

Show: priority, category, action (REVIEW_*/INVESTIGATE_*/MONITOR), rationale, contributing metrics, evidence, phase versions, limitations.

Phrase: “decision-support signal for investigation” — not autonomous policy.

## 9. Data Quality (30s)

**Data Quality**: freshness / eligibility counts from Phase 7.

Stale/EXCLUDE → interpret demand-backed signals with caution.

## 10. Close (20s)

State-agnostic core; Maharashtra is the first synthetic validation geography.

Limitations are visible by design.

---

## Presenter navigation sequence

1. Sign in (Clerk) — GOVERNMENT_MANAGER or PLATFORM_ADMIN preferred for decisions  
2. `/dashboard` — Overview  
3. `/skills` → skill detail  
4. `/programs` → optional `/courses/[id]` / `/programs/institutes/[orgId]`  
5. `/decisions` → `/decisions/[signalId]`  
6. `/quality`  
7. Optionally `/outcomes` — label as SAMPLE only  

If login unavailable in the environment: run API smoke + Maharashtra product tests as the technical demo fallback (see [maharashtra-demo.md](maharashtra-demo.md)).
