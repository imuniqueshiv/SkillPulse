# Data model

Phase 2 stores SkillPulse domain data in **Neon PostgreSQL** via **Prisma**, accessed only from `apps/api`.

## Stack

```text
Express API  →  Prisma  →  Neon PostgreSQL
```

The Next.js app and FastAPI intelligence service do not connect to the database.

## Models

| Model | Purpose |
| --- | --- |
| Organization | Government, institutes, employers, industry bodies |
| User | Application profile linked to Clerk (`clerkUserId`). Role and organization live here. No passwords. |
| Location | India-wide country / state / district / city |
| Sector | Industry grouping; optional NIC-2008 mapping |
| Occupation | Occupational role; `code` is NCO-2015 when set |
| Skill | Canonical skill (`code`, type, lifecycle status) |
| SkillAlias | Raw term → one canonical skill (unique normalized form) |
| SkillOccupation | Skill ↔ occupation with relation and confidence |
| TaxonomyMapping | External codes (NCO, NIC, ESCO, O*NET, NCVET, NSQF) |
| Job | Canonical persisted job posting; incomplete fields stay optional. Distinct from the Phase 5.2 ingestion observation contract |
| JobSkill | Job ↔ Skill |
| Course | Training course |
| Curriculum | Versioned course curriculum |
| CurriculumSkill | Curriculum ↔ Skill |
| DataSource | Registry of external/internal sources (not ingestion). Jobs, Evidence and RawIngestionRecord point here |
| RawIngestionRecord | Preserved source observation (payload as received). Not a Job, not an adapter, not intelligence |
| Evidence | Observation provenance: `sourceId` → DataSource, optional `reference` / `observedAt` / `metadata`. Job-ingestion provenance uses `type=JOB_POSTING` and `reference=raw-ingestion:<observationId>` (not a foreign key) |
| DemandObservation | Stored demand signal (not the scoring engine) |
| SkillGap | Stored gap result (not the gap engine) |
| Recommendation | Stored recommendation (not the recommendation engine) |
| JobIntelligence | Derived Phase 6 analysis of one Job (`processorVersion` + result JSON). Not a Job, not demand scoring |
| JobQualityAssessment | Phase 7 analytical eligibility assessment (`assessmentVersion` + result JSON). Does not mutate Job / JobSkill / JobIntelligence |

Demo seed rows are labeled `[DEMO]` and/or `isDemo = true`. They are not labour-market evidence.

A validated ingestion contract record is written to `Job` in Phase 5.10. Phase 5.11 (`ingestJobObservation`) stores a raw observation first, then may persist that Job. Phase 5.12 (`ingestSourceDataset`) maps a source dataset through a source adapter into that same pipeline. There is no State table and no Maharashtra-specific Job model: geographic scope stays on `DataSource.geographicScope` and optional observation `location` fields. See [data-sources.md](data-sources.md).

## Job intelligence (Phase 6)

`processJobIntelligence` reads a canonical Job (`title`, `description`, `JobSkill`) and writes optional `JobIntelligence` keyed by `(jobId, processorVersion)` currently `phase6-v1`. Re-running the same pair upserts one PROCESSED row. Canonical Job and `JobSkill` are not used as a substitute for derived intelligence and are not rewritten by Phase 6.

A FAILED persist **does not overwrite** an existing PROCESSED result for that `(jobId, processorVersion)`. A different `processorVersion` may store a separate row so later algorithms can coexist.

It does **not** set `Job.occupationId` / `Job.sectorId`. Extraction vs normalization: extractors emit raw terms; `resolveTerm` decides RESOLVED / UNRESOLVED. Occupation classification is conservative (ties and weak CORE-skill votes stay UNCLASSIFIED). Sector is derived only from a classified occupation’s existing `Occupation.sector` relation.

Skill requirement levels (REQUIRED / PREFERRED / OPTIONAL / MENTIONED) are derived from local clause evidence around each skill, not from mention frequency. Missing requirement evidence stays MENTIONED.

Experience and qualification live on the Phase 5.2 contract but are **not** persisted on `Job`. Phase 6 parsers run only if the caller passes `experienceText` / `qualificationText`.

`JobIntelligence.result` stores derived fields and evidence only. It must not copy `RawIngestionRecord.payload`, credentials, headers, or network responses.

**EVALUATION DATA** (`data/sample/evaluation/`) is a manual benchmark for this pipeline. It is not observed data and not labour-market evidence. The Maharashtra sample under `data/sample/ingestion/` remains **SYNTHETIC FIXTURE DATA**.

Phase 6 does not implement demand analytics, skill-gap analysis, forecasting, recommendations, curriculum intelligence, dashboards, or scheduled workers.

## Job quality assessment (Phase 7)

`assessJobQuality` evaluates whether an existing canonical Job (plus available Phase 5 provenance signals and Phase 6 `JobIntelligence`) is trustworthy enough for downstream analytics. It writes optional `JobQualityAssessment` keyed by `(jobId, assessmentVersion)` currently `quality-v1`.

Primary output is analytical eligibility:

- `INCLUDE`
- `INCLUDE_WITH_CAUTION`
- `EXCLUDE`

Phase 7 **consumes** Phase 5 freshness/dedup/validation when recoverable (Evidence metadata and/or recomputation via `evaluateJobFreshness` with the Phase 5 policy). It does **not** invent competing freshness or identity algorithms. Missing historical signals stay `UNKNOWN`.

Phase 7 does **not** calculate market demand. It does not mutate Job, JobSkill, JobIntelligence, or taxonomy. A FAILED assessment never overwrites a PROCESSED assessment for the same version.

Phase 7.7–7.11 add assessment history via one-level `previousAssessment` nested in `result` JSON (no new history table), deterministic fingerprints (`fingerprint` / change detection), safe reassessment (`reassessJobQuality`), bounded bulk assessment (`assessJobsQuality`, limit ≤ 100), and PROCESSED-only summaries (`summarizeQualityAssessments`) filtered by `assessmentVersion` without double-counting nested history.

**EVALUATION DATA** for Phase 7 lives at `data/sample/evaluation/quality.json` and is not labour-market evidence.

## Market demand intelligence (Phase 8)

`summarizeDemand` is a typed service in `apps/api/src/modules/demand/`. Methodology version: **`demand-v1`**.

It consumes PROCESSED `JobQualityAssessment` (`quality-v1`) and PROCESSED `JobIntelligence` (`phase6-v1`). Quality gate:

| Eligibility | Quality weight |
| --- | --- |
| INCLUDE | 1.0 |
| INCLUDE_WITH_CAUTION | 0.5 |
| EXCLUDE | 0.0 |

Skill contribution = qualityWeight × requirementWeight (REQUIRED 1.0, PREFERRED 0.75, OPTIONAL 0.50, MENTIONED 0.25). Duplicate skill mentions within one job count once (strongest requirement).

Metrics stay distinct: `jobCount`, `weightedDemand`, `jobPenetration` (vs weighted eligible jobs), `skillDemandShare` (vs total skill weighted demand). Ranking: weightedDemand DESC, jobCount DESC, name ASC.

Geography uses `Location` (country/state/district/city) when `Job.locationId` is set; unknown stays unknown. Experience/qualification percentages are **among known (PARSED)** values only, with explicit coverage rates.

Time windows are explicit `[from, to)` on **`postedAt`**. Trends compare the previous equal-duration period; directions RISING / STABLE / DECLINING / INSUFFICIENT_DATA use ±10% thresholds and a minimum sample of 10. No opaque 0–100 AI score.

MVP uses **dynamic aggregation** (no DemandSnapshot). The existing `DemandObservation` Prisma stub is unused by the engine.

Demand metrics represent available analytically eligible job observations — **NOT** official government labour-market statistics. Phase 8 does **not** calculate labour supply, skill gaps, recommendations, curriculum, or forecasting.

**SYNTHETIC EVALUATION DATA** for Phase 8: `data/sample/evaluation/demand.json`.

## Skill gap intelligence (Phase 9)

`summarizeSkillGaps` in `apps/api/src/modules/gaps/` consumes Phase 8 `summarizeDemand` (`demand-v1`) plus caller-provided `SupplyObservation` rows. Methodology: **`gap-v1`**.

Supply types are retained separately. Comparability defaults: `AVAILABLE_WORKFORCE`→DIRECT (same geo scope), `TRAINED`/`CERTIFIED`/`TRAINING_CAPACITY`→PROXY, `OTHER`→UNKNOWN. Mismatched geography scopes → UNKNOWN.

Equations: `netGap = demand − supply`, `shortageQuantity = max(netGap, 0)`, ratios nullable when denominators are zero (never Infinity). Severity/confidence/trend/priority are centralized in gap-v1. Existing Prisma `SkillGap` model remains an unused curriculum-anchored stub — Phase 9 does not write it.

Demand metrics remain Phase 8 quality-aware. Phase 9 does not recalculate eligibility.

**SYNTHETIC EVALUATION DATA**: `data/sample/evaluation/skill-gaps.json`.

## Training & curriculum intelligence (Phase 10)

`summarizeTrainingIntelligence` in `apps/api/src/modules/training/` consumes Phase 9 `SkillGapSummary` plus Course/Curriculum/CurriculumSkill mappings. Methodology: **`training-v1`**.

- **Training need** — market-level signal from Phase 9 gaps (+ optional TRAINING_CAPACITY).
- **Curriculum gap** — program-level missing market-relevant skills.
- **Alignment** — demand-weighted coverage of program skills vs market demand.

`TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED`.

No new Prisma models. Existing `SkillGap` stub remains unused by this engine.

**SYNTHETIC EVALUATION DATA**: `data/sample/evaluation/training-intelligence.json`.

## Institute & program intelligence (Phase 11)

`summarizeInstituteIntelligence` in `apps/api/src/modules/institute/` consumes Phase 9 gaps + Phase 10 alignments + Organization/Course/Curriculum. Methodology: **`institute-v1`**.

- **Provider** — `Organization` with type `TRAINING_INSTITUTE` (no separate Provider table).
- **Program** — Course + latest Curriculum (same analytical unit as Phase 10).
- **Capability** — skills explicitly covered by active programs; ADEQUATE / LIMITED / MISSING / INSUFFICIENT_DATA.
- **Capability gap** — high/severe skill gap without confirmed training capability (distinct from Phase 9 skill gap).
- **Capacity** — only `TRAINING_CAPACITY` observations; additive only when scopes are compatible; overlapping provider vs program seats are not summed.

`TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED`.

No new Prisma models. Course has no `locationId` — geographic capability uses gap-context geography.

**SYNTHETIC EVALUATION DATA**: `data/sample/evaluation/institute-intelligence.json`.

## Employer & placement intelligence (Phase 12)

`summarizeEmploymentIntelligence` in `apps/api/src/modules/employment/` consumes explicit `EmploymentOutcomeObservation[]` plus optional Phase 8–11 summaries. Methodology: **`employment-v1`**.

- **Outcomes** — TRAINED / CERTIFIED / PLACED / EMPLOYED kept distinct; REPORTED ≠ CONFIRMED.
- **Rates** — null when cohort linkage missing or denominator zero (never Infinity/NaN/fake 0%).
- **Skill utilization** — canonical skill ID intersection only; never inferred from job titles.
- **Employers** — Organization `EMPLOYER` when `employerId` present; observational insights, not rankings.

No new Prisma models. Existing mock `GET /api/v1/outcomes` SAMPLE metrics are **not** this engine.

**SYNTHETIC EVALUATION DATA**: `data/sample/evaluation/employment-intelligence.json`.

## Government decision intelligence (Phase 13)

`summarizeGovernmentDecisions` in `apps/api/src/modules/decision/` consumes Phase 7–12 summaries. Methodology: **`decision-v1`**.

Categories: SKILL_SHORTAGE, TRAINING_CAPACITY, CURRICULUM_ALIGNMENT, EMPLOYMENT_OUTCOME, GEOGRAPHIC_MISMATCH, DATA_QUALITY, PROGRAM_REVIEW.
Actions: REVIEW_*, INVESTIGATE_*, IMPROVE_DATA_COLLECTION, MONITOR — never CLOSE_*/ALLOCATE_*.

No new Prisma models. Signals are decision-support only.

**SYNTHETIC EVALUATION DATA**: `data/sample/evaluation/decision-intelligence.json`.

## Commands

From the repo root (Prisma uses `DATABASE_URL` from `.env`):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```
