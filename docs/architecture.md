# Architecture

SkillPulse is a modular monolith.

```text
Users → Next.js (apps/web)
      → TypeScript/Express (apps/api)
      → Neon PostgreSQL (Phase 2)
      → Python/FastAPI intelligence (services/intelligence)
```

Phases 1–3 provide local processes, Neon/Prisma, and Clerk authentication with Express RBAC. Domain intelligence modules are not implemented yet.
