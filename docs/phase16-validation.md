# Phase 16 validation notes

Internal checklist evidence for SIH final validation. Not a second intelligence engine.

## Phase 15 gap disposition (re-audited)

| Gap from Phase 15 report | Disposition |
| --- | --- |
| Full API suite not rerun | **VERIFIED** — final run **223 passed / 0 failed** (`FINAL_EXIT:0`, ~986s) after Neon timeout + test isolation fixes |
| Authenticated browser smoke | **NOT VERIFIABLE** — no live Clerk session / `SMOKE_BEARER_TOKEN` |
| Cloud deploy E2E | **NOT VERIFIED** — no fixed target; provider-neutral docs only |
| Docker stubs | **NOT REQUIRED** — optional stub Dockerfiles retained |
| No Redis rate limiter | **NOT REQUIRED FOR CURRENT MVP** — documented in deployment.md |

## Local anonymous smoke (VERIFIED)

```text
GET /health → 200
GET /ready → 200 database ok
GET /api/v1/intelligence/overview → 401 + X-Request-Id + Helmet headers
smoke-production.ts → PASS (auth smoke skipped without token)
prisma migrate deploy → No pending migrations
```

LOCAL BASELINE (`perf-baseline.ts`, 5 samples): health p50≈6ms; ready p50≈406ms; overview (401) p50≈5ms. Not production capacity.

## Focused Phase 14–15 tests

`production-hardening` + `intelligence-product*` + `maharashtra-product`: **21 passed / 0 failed**

## Authenticated API / browser smoke

`SMOKE_BEARER_TOKEN` unset → **NOT VERIFIABLE**. Web protection: `apps/web/proxy.ts` (`clerkMiddleware` + `auth.protect()`).

## Commands for another developer

```bash
pnpm install
cp .env.example .env
pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm build
pnpm --filter api test
pnpm dev
```

See also: [demo-script.md](demo-script.md), [judge-qa.md](judge-qa.md), [maharashtra-demo.md](maharashtra-demo.md), [deployment.md](deployment.md).
