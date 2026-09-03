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
| Evidence | Observation provenance and optional metadata |
| DemandObservation | Stored demand signal (not the scoring engine) |
| SkillGap | Stored gap result (not the gap engine) |
| Recommendation | Stored recommendation (not the recommendation engine) |

Demo seed rows are labeled `[DEMO]` and/or `isDemo = true`. They are not labour-market evidence.

A validated ingestion contract record is not written to `Job` in Phases 5.2–5.6. Deduplication classifies observations; it does not create or merge canonical Jobs. See [data-sources.md](data-sources.md).

## Commands

From the repo root (Prisma uses `DATABASE_URL` from `.env`):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```
