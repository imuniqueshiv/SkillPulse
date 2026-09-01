# SkillPulse

India-wide skill-development and labour-market intelligence platform.

Phase 1 establishes a working monorepo development foundation. Product features, database, and authentication are not included yet.

## Architecture

```text
Next.js (apps/web)              http://localhost:3000
        ↓
TypeScript + Express (apps/api) http://localhost:4000
        ↓
Python + FastAPI intelligence   http://localhost:8000
```

PostgreSQL/Prisma and Clerk are deferred to later phases.

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

Phase 1 defaults:

| Variable | Default | Used by |
| --- | --- | --- |
| `NODE_ENV` | `development` | API |
| `API_PORT` | `4000` | API |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Web |
| `INTELLIGENCE_SERVICE_URL` | `http://localhost:8000` | later API integration |
| `INTELLIGENCE_PORT` | `8000` | Intelligence service |

Do not put secrets in this file. Clerk and database credentials belong to later phases.

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
| Web | http://localhost:3000 | SkillPulse development page |
| API | http://localhost:4000/health | `{ "status": "ok", "service": "skillpulse-api" }` |
| Intelligence | http://localhost:8000/health | `{ "status": "ok", "service": "skillpulse-intelligence" }` |

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```
