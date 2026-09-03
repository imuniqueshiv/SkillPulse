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

Phase 6 (`processJobIntelligence`) is also internal. It does not add HTTP routes, demand scores, or dashboards.
