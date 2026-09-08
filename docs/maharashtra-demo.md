# Maharashtra SIH demonstration scenario

**Classification of fixtures used:** SYNTHETIC DEMO / EVALUATION  
**Label for judges:** “Synthetic demonstration data — not Maharashtra labour-market statistics.”

Maharashtra is a **validation geography**, not hard-coded production logic. Modules must remain state-agnostic (enforced in Maharashtra regression tests).

---

## Primary narrative skill

Canonical skill: **React** (`sp.skill.react` in seed taxonomy)

Synthetic job path: Mahaswayam Rojgar sample vacancy `MH-ROJ-1003` (Software Developer, Mumbai Suburban, skills include React.js / typo “java scriptt” for normalization demo).

## End-to-end chain (technical)

```text
SYNTHETIC fixture (mahaswayam-rojgar.sample.json)
        ↓
Adapter parse → Job (+ JobSkill)
        ↓
Phase 6 processJobIntelligence
        ↓
Phase 7 assessJobQuality
        ↓
Phase 8 summarizeDemand (postedAt window, optional state=Maharashtra)
        ↓
Phase 9 summarizeSkillGaps (+ optional TRAINING_CAPACITY supply observations)
        ↓
Phase 10 summarizeTrainingIntelligence (Course/Curriculum mappings)
        ↓
Phase 11 summarizeInstituteIntelligence (Organization providers)
        ↓
Phase 12 summarizeEmploymentIntelligence (optional outcome observations)
        ↓
Phase 13 summarizeGovernmentDecisions (explainable signals)
        ↓
Phase 14 GET /api/v1/intelligence/* → Next.js UI
```

## How to reproduce (developer)

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL, Clerk keys, CORS_ORIGINS
pnpm db:migrate
pnpm db:seed
pnpm --filter api test   # includes maharashtra-* and maharashtra-product tests
pnpm dev
```

Focused Maharashtra → product adapter proof:

```bash
cd apps/api && ./node_modules/.bin/tsx --test --test-concurrency=1 tests/maharashtra-product.test.ts
```

This test asserts phase versions, synthetic acquisition labeling, employment AVAILABLE only when observations are supplied, and that SAMPLE outcomes placeholders are not embedded.

## UI demo path (authenticated government role)

1. `/dashboard` — Overview (demand / gaps / decisions / quality statuses)  
2. `/skills` — demand + gap highlights; open React skill by **canonical ID**  
3. `/programs` — training needs; open course/institute by ID if present  
4. `/decisions` — filter HIGH / SKILL_SHORTAGE; open signal explainability  
5. `/quality` — Phase 7 assessment counts  
6. `/outcomes` — **SAMPLE only** (do not present as Phase 12)

## Employment evidence rule

If no Phase 12 observations are supplied to the product API:

show **INSUFFICIENT_DATA** — never invent placement rates.

## Isolation

| Path | Class |
| --- | --- |
| `data/sample/ingestion/*` | SYNTHETIC ingestion fixtures |
| `data/sample/evaluation/*` | EVALUATION benchmarks (not labour evidence) |
| Neon production/demo DB | OBSERVED or operator-loaded DEMO — keep separate from evaluation JSON |

Do not load evaluation JSON into production demand calculations as if it were live jobs.
