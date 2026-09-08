# Deployment (Phase 15)

SkillPulse is a modular monolith. There is **no fixed cloud vendor** in application code. Deploy the API and web app to any Node 20+ host that can reach Neon PostgreSQL and Clerk.

## Architecture (runtime)

```text
Browser → Next.js (apps/web)
       → Express API (apps/api) :API_PORT
       → Prisma → Neon PostgreSQL
```

Optional FastAPI (`services/intelligence`) is **not** required for readiness or Phase 7–14 intelligence.

## Prerequisites

| Requirement | Value |
| --- | --- |
| Node.js | `>=20` |
| pnpm | `9.15.9` (see root `packageManager`) |
| PostgreSQL | Neon (or compatible) |
| Clerk | Application with publishable + secret keys |

## Environment variables

See root [`.env.example`](../.env.example).

| Variable | Where | Required (prod) | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | API | yes (`production`) | Enables HSTS, stricter env checks |
| `API_PORT` | API | no (default 4000) | Listen port |
| `DATABASE_URL` | API | **yes** | Prisma runtime |
| `DIRECT_URL` | API / migrate | recommended | Unpooled URL for migrations |
| `CLERK_SECRET_KEY` | API + Web server | **yes** | Never `NEXT_PUBLIC_*` |
| `CORS_ORIGINS` | API | yes | Comma-separated web origins; no `*` in production |
| `JSON_BODY_LIMIT` | API | no | Default `100kb` |
| `TRUST_PROXY` | API | no | Default on in production |
| `NEXT_PUBLIC_API_URL` | Web | yes | Public API base URL |
| `NEXT_PUBLIC_CLERK_*` | Web | yes | Clerk client config |

Do not put `DATABASE_URL` or `CLERK_SECRET_KEY` in any `NEXT_PUBLIC_*` variable.

## Migration (production)

From repo root (or `apps/api` with env loaded):

```bash
pnpm db:migrate
# equivalent: pnpm --filter api exec prisma migrate deploy
```

Use **`prisma migrate deploy` only**. Do **not** use `prisma db push` in production.

Order:

1. Set `DATABASE_URL` / `DIRECT_URL`
2. `pnpm db:generate` (if image does not already include generated client)
3. `pnpm db:migrate`
4. Start API
5. Start Web

## Build & start

```bash
pnpm install --frozen-lockfile
pnpm --filter api build
pnpm --filter web build

pnpm --filter api start
pnpm --filter web start
```

Web build needs Clerk public + secret placeholders/keys available to Next.js at build/runtime per your host.

## Health & readiness

| Path | Purpose |
| --- | --- |
| `GET /health` | Process liveness (no DB) |
| `GET /health/db` | Explicit DB probe |
| `GET /ready` | Readiness — PostgreSQL `SELECT 1`; **503** if unavailable |

Responses do not include credentials or stack traces. `X-Request-Id` is set on responses.

## Rate limiting

**RATE LIMITING NOT REQUIRED FOR CURRENT MVP DEPLOYMENT.**

Rationale: SIH MVP traffic is authenticated dashboard use behind Clerk; protecting intelligence with auth/RBAC and bounded queries is the primary control. Process-local or Redis rate limiting is deferred unless public abuse appears. Revisit if unauthenticated public API surface expands.

## Smoke test

With API listening:

```bash
npx tsx apps/api/scripts/smoke-production.ts
# optional authenticated checks:
SMOKE_BEARER_TOKEN=<clerk_session_jwt> npx tsx apps/api/scripts/smoke-production.ts
```

Manual UI path (after login):

Overview → Skill Intelligence → Programs & Institutes → Decision Signals → Data Quality → Outcomes (SAMPLE label only)

## Performance baseline

```bash
npx tsx apps/api/scripts/perf-baseline.ts
```

Reports local sample latencies for `/health`, `/ready`, and anonymous `/api/v1/intelligence/overview` (expects 401). **Not** a capacity claim.

## Backup & recovery (Neon)

SkillPulse uses managed Neon PostgreSQL. Verified project capability in this repo is limited to:

- Application connects via `DATABASE_URL`
- Migrations via `prisma migrate deploy`
- `/ready` returns 503 when the database is unreachable (API should not claim readiness)

**Not inventable from this repository:** backup frequency, retention, RPO/RTO, or point-in-time restore SLAs. Use the Neon console/docs for the project’s actual backup/PITR settings. On DB outage: API readiness fails; do not run intelligence pipelines as health checks.

Recovery outline:

1. Restore/repair database per Neon procedures
2. Confirm `GET /ready` → 200
3. Re-run `prisma migrate deploy` if schema drift after restore
4. Re-run smoke test

## Rollback

1. Redeploy previous API/Web artifacts
2. Do **not** rewrite applied Prisma migrations; roll forward with a new migration if schema must change
3. Confirm `/health` and `/ready`

## Security assumptions

- Clerk verifies identity; Express enforces roles and organization scope
- Phase 14 intelligence routes require auth; government decisions require elevated roles
- SAMPLE `GET /api/v1/outcomes` is not Phase 12 production evidence
- Helmet provides baseline headers; CSP is left to the Next.js app (API disables CSP)

## Known limitations

- No Redis/shared rate limiter
- Dockerfiles are optional stubs — prefer platform Node builds for MVP
- CI runs typecheck/build; Neon-backed tests need repository `DATABASE_URL` secret
