# API

## Process health

`GET /health`

```json
{
  "status": "ok",
  "service": "skillpulse-api",
  "timestamp": "2026-09-01T00:00:00.000Z"
}
```

This does not query PostgreSQL.

## Database health

`GET /health/db`

Runs `SELECT 1` against Neon via Prisma.

Connected:

```json
{
  "status": "ok",
  "service": "skillpulse-api",
  "database": "connected"
}
```

Unavailable or unconfigured: HTTP 503 with `"database": "disconnected"`.

Unknown routes return `{ "error": { "message": "Not Found", "statusCode": 404 } }`.

## Authentication

`GET /api/v1/auth/me`

Requires `Authorization: Bearer <Clerk session token>`.

```json
{
  "user": {
    "id": "...",
    "clerkUserId": "...",
    "role": "LEARNER",
    "organizationId": null
  }
}
```

Unauthenticated: HTTP 401.

`GET /api/v1/auth/privileged` requires `PLATFORM_ADMIN` (HTTP 403 otherwise).

`GET /api/v1/auth/scope` returns the authorized organization. Supplying another organization's id is 403 unless the user is `PLATFORM_ADMIN` or `GOVERNMENT_MANAGER`.

See [authentication.md](authentication.md).

## Taxonomy

All taxonomy routes require `Authorization: Bearer <Clerk session token>`.

`GET /api/v1/skills`

Query: `q`, `status` (default `ACTIVE`), `category`, `skillType`, `occupationId`, `limit` (max 50), `offset`.

`GET /api/v1/skills/:id` — UUID or `code`. Includes aliases, occupation links and external mappings.

`GET /api/v1/occupations` — `q`, `status`, `sectorId`, `code`, `limit`, `offset`.

`GET /api/v1/occupations/:id` — UUID or NCO-2015 `code`.

`GET /api/v1/sectors` and `GET /api/v1/sectors/:id`.

`GET /api/v1/taxonomy/normalize?term=`

```json
{
  "query": "JS",
  "normalized": "js",
  "status": "resolved",
  "matchType": "alias",
  "confidence": 0.95,
  "skill": { "id": "...", "code": "sp.skill.javascript", "name": "JavaScript" }
}
```

Unknown terms return `"status": "unresolved"` with no skill. The API does not guess.

See [taxonomy.md](taxonomy.md).

## Data-source registry

**DataSource Registry ≠ Data Ingestion.** Authenticated users may read the registry. Writes require `PLATFORM_ADMIN`. Sources are not deleted (use `active`).

`GET /api/v1/data-sources`

Query: `q`, `type`, `domain`, `accessMethod`, `geographicScope`, `active`, `isDemo`, `limit`, `offset`.

`GET /api/v1/data-sources/:id` — UUID or `code`.

`POST /api/v1/data-sources` — `PLATFORM_ADMIN`. Body includes `code`, `name`, `type`; optional `url`, `description`, `reliability` (0–1), `accessMethod`, `domain`, `geographicScope`, `active`. Duplicate `code`/`name` → 409.

`PATCH /api/v1/data-sources/:id` — `PLATFORM_ADMIN`.

See [data-sources.md](data-sources.md).

There is no ingestion HTTP API. Phases 5.2–5.12 are internal. `ingestJobObservation` runs one observation through adapter → raw storage → validation → dedup → freshness → provenance → skill normalization → canonical Job persistence. `ingestSourceDataset` iterates a source dataset through a registered adapter into that same function. Neither fetches nor scrapes.

Phase 6 (`processJobIntelligence`) is also internal. It does not add HTTP routes, demand scores, or dashboards. Remaining Phase 6 work (requirement signals, confidence/evidence, persistence preservation, evaluation dataset, Maharashtra synthetic validation) stays on that internal module.

Phase 7 (`assessJobQuality`) is internal. It produces analytical eligibility (`INCLUDE` / `INCLUDE_WITH_CAUTION` / `EXCLUDE`) and does not add HTTP routes or market demand APIs. Related internal services: `reassessJobQuality`, `assessJobsQuality`, `summarizeQualityAssessments`.

Phase 8 (`summarizeDemand`) is an internal typed service contract (`demand-v1`) for market-demand aggregation. It does not add HTTP routes in this phase (same pattern as Phase 6/7). Filters: `from`/`to` (postedAt), geography, source, skill, occupation, sector, bounded limits.

Phase 9 (`summarizeSkillGaps`) is an internal typed service (`gap-v1`). It requires explicit supply observations plus Phase 8 demand filters. No HTTP routes in this phase.

Phase 10 (`summarizeTrainingIntelligence`) is an internal typed service (`training-v1`). It consumes Phase 9 gap summaries and Course/Curriculum mappings. No HTTP routes in this phase.

Phase 11 (`summarizeInstituteIntelligence`) is an internal typed service (`institute-v1`). It consumes Phase 9 gaps, Phase 10 alignments, and Organization/Course/Curriculum. No HTTP routes in this phase. Not an institute ranking or marketplace API.

Phase 12 (`summarizeEmploymentIntelligence`) is an internal typed service (`employment-v1`). It consumes explicit employment outcome observations (no durable learner Prisma model in MVP). No HTTP routes in this phase. Distinct from the mock `GET /api/v1/outcomes` SAMPLE metrics. Not a prediction or ranking API.

Phase 13 (`summarizeGovernmentDecisions`) is an internal typed service (`decision-v1`). It synthesizes Phase 7–12 summaries into explainable decision-support signals. Not autonomous government policy.

## Phase 14 — Intelligence product API

Thin authenticated adapters over Phase 7–13. Response shape: `{ data, meta }` where `meta.generatedAt` is presentation-only and is not mixed into analytical fingerprints.

All routes require `Authorization: Bearer <Clerk session token>`.

### Roles

| Endpoint family | Allowed roles |
| --- | --- |
| overview, skills, programs, institutes | `PLATFORM_ADMIN`, `GOVERNMENT_MANAGER`, `INSTITUTE_ADMIN`, `TRAINER`, `EMPLOYER` |
| decisions (+ detail) | `PLATFORM_ADMIN`, `GOVERNMENT_MANAGER` |
| quality | `PLATFORM_ADMIN`, `GOVERNMENT_MANAGER`, `INSTITUTE_ADMIN` |

`LEARNER` receives 403. Scoped roles (`INSTITUTE_ADMIN`, `TRAINER`, `EMPLOYER`) may only access programs/institutes within `resolveOrganizationScope` — URL `organizationId` / `courseId` is not trusted.

### Endpoints

`GET /api/v1/intelligence/overview`

Purpose: bounded executive highlights (demand, gaps, training, employment status, decision signals, quality snapshot).

Query: `from`, `to` (ISO), `state`, `district`, `country`, `skillId`, `occupationId`, `sectorId`, `limit` (default 20, max 50).

Errors: 401, 403, 400.

Limitations: without caller-supplied Phase 9 supply / Phase 12 employment observations, employment and many gap metrics are `INSUFFICIENT_DATA` (not fabricated zeros).

`GET /api/v1/intelligence/skills/:skillId`

Purpose: skill-level adapter over demand, gap, training, institute capability, employment status, related decisions.

Path: canonical Skill `id` (also resolves `code` / `canonicalName`).

`GET /api/v1/intelligence/programs/:courseId`

Purpose: program/course adapter (curriculum skills, alignment, institute relevance, employment status, decisions). Course location is `UNKNOWN` when no location evidence exists.

`GET /api/v1/intelligence/institutes/:organizationId`

Purpose: institute/provider adapter. Resource-scope enforced for non–cross-org roles.

`GET /api/v1/intelligence/decisions`

Purpose: bounded Phase 13 signal list.

Query: overview filters plus `priority`, `category`, `confidence`, `offset`. Limit max 50.

`GET /api/v1/intelligence/decisions/:signalId`

Purpose: full explainable signal (rationale, contributing metrics, evidence, phase versions, limitations). `signalId` is URL-encoded composite key.

`GET /api/v1/intelligence/quality`

Purpose: Phase 7 `summarizeQualityAssessments` product view.

Known limitations: Phase 14 does not load durable labour-supply or learner outcome registries (none in MVP schema). SAMPLE `GET /api/v1/outcomes` is not used as Phase 12 evidence.
