# Architecture

SkillPulse is a modular monolith.

```text
Users → Next.js (apps/web)
      → TypeScript/Express (apps/api)
      → Neon PostgreSQL (Phase 2)
      → Python/FastAPI intelligence (services/intelligence)
```

Phase 1 provides runnable local processes and health checks only. Database, Clerk, and domain modules are not implemented.
