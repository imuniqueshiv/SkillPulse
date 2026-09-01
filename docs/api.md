# API

Phase 1 exposes a single operational endpoint on the Express API.

`GET /health`

```json
{
  "status": "ok",
  "service": "skillpulse-api",
  "timestamp": "2026-09-01T00:00:00.000Z"
}
```

Unknown routes return `{ "error": { "message": "Not Found", "statusCode": 404 } }`.
