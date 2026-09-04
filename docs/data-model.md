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

## Commands

From the repo root (Prisma uses `DATABASE_URL` from `.env`):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```
