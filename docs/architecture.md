# Architecture

SkillPulse is a modular monolith. Local run instructions are in the [root README](../README.md).

```text
Browser → Next.js (apps/web) :3000
       → TypeScript/Express (apps/api) :4000
       → Prisma → Neon PostgreSQL
```

```mermaid
flowchart TD
    Browser --> Web[Next.js web]
    Web --> API[Express API]
    API --> Prisma[Prisma]
    Prisma --> DB[Neon PostgreSQL]
```

The web app calls the API over HTTP (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000`). Prisma is used only from `apps/api`.

A FastAPI service exists at `services/intelligence` (`:8000`). It is optional for local web + API development and is not called by Express today.

Phases 1–3 provide local processes, Neon/Prisma, and Clerk authentication with Express RBAC. Phase 4 adds the canonical skill taxonomy. Phases 5.1–5.12 provide source registry through state-agnostic job ingestion. Phase 6 derives **per-job** intelligence from a canonical Job. It does not score market demand, forecast, recommend, or aggregate across jobs.

```text
canonical Job (observed)
        ↓
prepare text → extract skill terms → resolveTerm (Phase 5.9 / 4)
        ↓
requirement signals (REQUIRED / PREFERRED / OPTIONAL / MENTIONED)
        ↓
classify occupation → derive sector
        ↓
parse experience / qualification if caller supplies text
        ↓
JobIntelligenceResult  (optional JobIntelligence row)
```

Phase 6 is state-agnostic and source-agnostic. It does not read `RawIngestionRecord.payload`. Canonical Job has no experience or qualification columns; those parsers accept optional caller-supplied strings and otherwise return UNKNOWN.

### Observed vs derived vs evaluation vs synthetic

| Kind | Meaning |
| --- | --- |
| OBSERVED DATA | Source observation and canonical Job fields |
| DERIVED INTELLIGENCE | Deterministic Phase 6 `JobIntelligence` / `JobIntelligenceResult` |
| EVALUATION DATA | Manually annotated benchmark under `data/sample/evaluation/` — **not** labour-market evidence |
| QUALITY ASSESSMENT | Deterministic Phase 7 `JobQualityAssessment` / analytical eligibility |
| SYNTHETIC FIXTURE DATA | Development/test fixtures such as `data/sample/ingestion/mahaswayam-rojgar.sample.json` — **not** real Maharashtra labour-market evidence |

Phase 6.7 classifies requirement level from the **clause that contains the skill**. Unrelated sentences do not change another skill. Ambiguous wording (`familiarity`, `exposure`, `knowledge of`, bare `Python experience`) stays `MENTIONED`. Stronger local signals win (REQUIRED > PREFERRED > OPTIONAL > MENTIONED).

Phase 6.8 keeps confidence as HIGH / MEDIUM / LOW with evidence (raw term, span, method, source field). Unresolved skills are LOW. Raw ingestion payloads are not copied into intelligence.

Phase 6.9 identity remains `(jobId, processorVersion)` with `JOB_INTELLIGENCE_PROCESSOR_VERSION = "phase6-v1"`. Re-running the same pair upserts one row. A FAILED write never overwrites a PROCESSED result. A new processor version may store a second row.

Phase 6.10 orchestrator is `processJobIntelligence` in `apps/api/src/modules/intelligence/pipeline.ts`. Stage algorithms stay in sibling modules.

Phase 6.11 evaluation dataset and `evaluate.ts` compare expected annotations to derived output. Metrics describe that small EVALUATION DATA set only.

Phase 6.12 runs the Maharashtra **synthetic** fixture through the same state-agnostic pipeline. There is no Maharashtra branch in intelligence modules.

### Phase 7 — Data quality & trust

```text
canonical Job + Phase 5 provenance signals (when available)
        + Phase 6 JobIntelligence (phase6-v1)
        ↓
completeness / source trust / freshness / duplication / intelligence confidence
        ↓
analytical eligibility: INCLUDE | INCLUDE_WITH_CAUTION | EXCLUDE
        ↓
JobQualityAssessment (quality-v1)
```

Phase 7 evaluates data for analytical eligibility. It does **not** aggregate market demand. Freshness and deduplication semantics remain owned by Phase 5. Source trust is registry-based and conservative (`STANDARD` for active registered sources; `UNVERIFIED` when missing/inactive/unresolved). `VERIFIED`/`TRUSTED` are reserved until explicit verification metadata exists.

Reassessment (7.7–7.9) keeps `(jobId, assessmentVersion)` uniqueness: identical fingerprints skip writes; changed inputs nest the prior successful snapshot in `result.previousAssessment`; `quality-v2` coexists as a separate row. Bulk assessment (7.10) is synchronous and bounded. Summary (7.11) counts PROCESSED rows only.

### Phase 8 — Market demand intelligence

```text
PROCESSED JobQualityAssessment (quality-v1)
        + PROCESSED JobIntelligence (phase6-v1)
        + Job.postedAt / Location (when present)
        ↓
demand-v1 policy weights (quality × requirement)
        ↓
dynamic aggregation: skills / occupations / sectors / geography /
                     experience / qualifications / trends
        ↓
DemandSummary (typed service contract)
```

Phase 8 is the analytical consumer of Phase 7 eligibility. It does **not** recalculate quality, re-extract intelligence, mutate Job/JobSkill/JobIntelligence/JobQualityAssessment, or persist DemandSnapshot rows (MVP uses dynamic aggregation). Event time is `postedAt` (Phase 5 freshness semantics). Maharashtra is ordinary `state` filtering — never special-case code.

Demand metrics represent available analytically eligible job observations. They are **NOT** official government labour-market statistics.

Phase 8 does **NOT** calculate labour supply, skill gaps, recommendations, curriculum, or forecasting.

### Phase 9 — Skill gap intelligence

```text
Phase 8 DemandSummary (demand-v1)
        +
caller-provided SupplyObservation[] (typed; often synthetic)
        ↓
comparability (DIRECT | PROXY | UNKNOWN)
        ↓
gap-v1 metrics / severity / confidence / trends / priority
        ↓
SkillGapSummary
```

Phase 9 consumes Phase 8 demand — it does **not** recompute demand or Phase 7 eligibility. There is **no** real labour-supply volume registry in the MVP; supply observations are explicit and type-separated (`TRAINED`, `CERTIFIED`, `AVAILABLE_WORKFORCE`, `TRAINING_CAPACITY`, `OTHER`). Types are never silently summed.

`TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED`.

A numerical gap is **not** automatically a verified labour shortage. Interpretation depends on comparability, coverage, quality, and data availability.

Phase 9 does **not** produce recommendations, curriculum advice, forecasting, or Phase 10+ intervention engines. MVP uses dynamic computation (existing Prisma `SkillGap` stub unused).

### Phase 10 — Training & curriculum intelligence

```text
Phase 9 SkillGapSummary (gap-v1)
        +
Course / Curriculum / CurriculumSkill (canonical mappings)
        +
optional TRAINING_CAPACITY supply observations
        ↓
training-v1
        ↓
Training Need (market)  |  Curriculum Gap (program)
Program alignment (demand-weighted coverage)
```

Phase 10 keeps **training need** (market-level) separate from **curriculum gap** (program-level). It reuses existing Course/Curriculum/CurriculumSkill — no new TrainingProgram table. Coverage = CurriculumSkill presence (FULL); no title/text inference. Does **not** produce learner/course recommendations, funding decisions, or Phase 11+.

### Phase 11 — Institute & program intelligence

```text
Phase 9 SkillGapSummary (gap-v1)
        +
Phase 10 ProgramAlignment (training-v1) — consumed, not recomputed
        +
Organization (TRAINING_INSTITUTE) / Course / Curriculum / CurriculumSkill
        +
optional TRAINING_CAPACITY observations (scoped)
        ↓
institute-v1
        ↓
Program intelligence | Provider capability | Capability gap | Geographic capability
```

Phase 11 keeps **provider** (Organization) separate from **program** (Course/Curriculum). **Skill gap ≠ capability gap**. Missing provider data → `INSUFFICIENT_DATA` (not `MISSING`). `TRAINING_CAPACITY` is never converted from/to other supply types. Program relevance uses bands (`HIGH_RELEVANCE` / `MODERATE_RELEVANCE` / `LOW_RELEVANCE` / `INSUFFICIENT_DATA`). Provider Capability Score is decision-support — **not** a best-institute ranking. Does **not** produce placement, funding, marketplace, or Phase 12+.

### Phase 12 — Employer & placement intelligence

```text
Explicit EmploymentOutcomeObservation[] (caller-provided)
        +
optional Phase 8–11 summaries (consumed, not recomputed)
        ↓
employment-v1
        ↓
Outcome totals | Rates | Time-to-employment | Skill utilization
Employer insights | Program employment insights | Trends
```

Phase 12 is **observational**. `TRAINED ≠ CERTIFIED ≠ PLACED ≠ EMPLOYED`. `REPORTED ≠ CONFIRMED`. SkillPulse MVP has **no durable learner/placement Prisma model** — intelligence is limited by provided observations. Synthetic evaluation fixtures are **not** real labour-market evidence. Does **not** predict, rank, forecast, or implement Phase 13+.

See [data-model.md](data-model.md).

```text
DataSource registry (5.1)
        │
        ▼
source adapter (5.4 / 5.12) → contract (5.2) → ingestJobObservation (5.11)
        → raw (5.3) → validation (5.5) → dedup (5.6) → freshness (5.7)
        → provenance (5.8) → skills (5.9) → canonical Job (5.10)
```

```text
                    STATE-AGNOSTIC CORE
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Maharashtra         Gujarat            Karnataka
    adapter             adapter              adapter
   (first impl)        (future /          (future)
                        test fixture)
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                 Common Job contract
                           ▼
                 ingestJobObservation()
```

A future state is added by registering a DataSource and an adapter that emits the existing contract. The core pipeline must not branch on state names. Named expansion targets (not ingested unless listed as first implementation / test fixture): Gujarat, Karnataka, Tamil Nadu, Telangana, Andhra Pradesh, Kerala, Rajasthan, Madhya Pradesh, Uttar Pradesh, West Bengal, Odisha, Bihar, Punjab, Delhi. See [data-sources.md](data-sources.md).
