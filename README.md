# SkillPulse

India-wide skill-development and labour-market intelligence platform.

Phase 3 is in place: Clerk authenticates identity, Express authorizes roles and organization scope, and Neon stores the application User. Phase 4 adds the canonical skill taxonomy. Job intelligence features are not included yet.

## Architecture

```text
Next.js (apps/web)              http://localhost:3000
        ↓
TypeScript + Express (apps/api) http://localhost:4000
        ↓
Prisma + Neon PostgreSQL
        ↓
Python + FastAPI intelligence   http://localhost:8000
```

Clerk authenticates users. Express authorizes application roles and organization scope. See [docs/authentication.md](docs/authentication.md).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+ (`corepack enable` or `npm install -g pnpm`)
- Python 3.12+

## Installation

```bash
pnpm install

python -m venv services/intelligence/.venv
# Windows
services/intelligence/.venv/Scripts/activate
# macOS/Linux
# source services/intelligence/.venv/bin/activate

pip install -r services/intelligence/requirements.txt
```

Use a virtual environment so FastAPI dependencies stay project-local.

## Environment setup

```bash
cp .env.example .env
```

Phase 1 defaults plus Neon (Phase 2):

| Variable | Default | Used by |
| --- | --- | --- |
| `NODE_ENV` | `development` | API |
| `API_PORT` | `4000` | API |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Web |
| `INTELLIGENCE_SERVICE_URL` | `http://localhost:8000` | later API integration |
| `INTELLIGENCE_PORT` | `8000` | Intelligence service |
| `DATABASE_URL` | _(required for Prisma)_ | API — Neon pooled URL |
| `DIRECT_URL` | _(required for migrations)_ | API — Neon unpooled URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | _(required for web auth)_ | Next.js |
| `CLERK_SECRET_KEY` | _(required for auth)_ | Next.js proxy + Express API |

Do not put real credentials in Git. Never set `NEXT_PUBLIC_DATABASE_URL` or `NEXT_PUBLIC_CLERK_SECRET_KEY`.

### Neon setup

1. Create a Neon project and database.
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Copy the **unpooled / direct** connection string into `DIRECT_URL`.
4. If you only have one URL, set both variables to that value.
5. Apply schema and demo seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Until those variables are set, `GET /health` still works and `GET /health/db` returns HTTP 503.

### Clerk setup

1. Create a Clerk application.
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to root `.env` (Next.js also reads this file via `next.config.ts`).
3. Restart the web and API processes.

New users are provisioned as `LEARNER`. See [docs/authentication.md](docs/authentication.md).

## Run web

```bash
pnpm dev:web
```

Opens [http://localhost:3000](http://localhost:3000).

## Run API

```bash
pnpm dev:api
```

Health: [http://localhost:4000/health](http://localhost:4000/health)

Database health: [http://localhost:4000/health/db](http://localhost:4000/health/db) (requires Neon)

## Database (Prisma + Neon)

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

See [docs/data-model.md](docs/data-model.md) and [docs/taxonomy.md](docs/taxonomy.md).

## Run intelligence service

Python is outside the pnpm workspace.

```bash
pnpm dev:intelligence
```

Equivalent:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir services/intelligence
```

Health: [http://localhost:8000/health](http://localhost:8000/health)

## Run TypeScript apps together

```bash
pnpm dev
```

Starts Next.js and the Express API. Start the intelligence service separately with `pnpm dev:intelligence`.

## Health endpoints

| Service | URL | Expected |
| --- | --- | --- |
| Web | http://localhost:3000 | SkillPulse landing (sign in / dashboard) |
| API | http://localhost:4000/health | `{ "status": "ok", "service": "skillpulse-api" }` |
| API database | http://localhost:4000/health/db | `{ "status": "ok", "database": "connected" }` |
| Intelligence | http://localhost:8000/health | `{ "status": "ok", "service": "skillpulse-intelligence" }` |

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
