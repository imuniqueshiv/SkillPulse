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
