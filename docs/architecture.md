# Architecture

SkillPulse is a modular monolith.

```text
Users → Next.js (apps/web)
      → TypeScript/Express (apps/api)
      → Neon PostgreSQL (Phase 2)
      → Python/FastAPI intelligence (services/intelligence)
```

Phases 1–3 provide local processes, Neon/Prisma, and Clerk authentication with Express RBAC. Phase 4 adds the canonical skill taxonomy (skills, aliases, NCO occupations, sectors and external mappings). Job intelligence and NLP are not implemented yet.
