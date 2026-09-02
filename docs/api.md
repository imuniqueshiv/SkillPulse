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
