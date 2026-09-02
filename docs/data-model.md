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
| Sector | Industry sector |
| Occupation | Occupational role, optional external code |
| Skill | Canonical skill record (aliases/taxonomies come later) |
| Job | Job posting; incomplete fields stay optional |
| JobSkill | Job ↔ Skill |
| Course | Training course |
| Curriculum | Versioned course curriculum |
| CurriculumSkill | Curriculum ↔ Skill |
| DataSource | Provenance of ingested data |
| Evidence | Observation provenance and optional metadata |
| DemandObservation | Stored demand signal (not the scoring engine) |
| SkillGap | Stored gap result (not the gap engine) |
| Recommendation | Stored recommendation (not the recommendation engine) |

Demo seed rows are labeled `[DEMO]` and/or `isDemo = true`. They are not labour-market evidence.

## Commands

From the repo root (requires `DATABASE_URL` and `DIRECT_URL` in `.env`):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```
