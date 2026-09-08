# Judge Q&A (SkillPulse)

Concise, technically defensible answers for SIH evaluation.

---

### Why is this different from a job portal?

A job portal matches people to postings. SkillPulse aggregates **analytically eligible** job evidence, compares it to supply/training/institute/employment observations when provided, and emits **explainable government decision signals**. It does not run a job board or learner marketplace.

### Where does data come from?

Registered **DataSources**, adapters (e.g. synthetic Mahaswayam Rojgar fixture), ingestion → canonical **Job**, Phase 6 intelligence, Phase 7 quality. Curriculum/institute data from Course/Curriculum/Organization. Employment requires explicit outcome observations (no durable learner Prisma model in MVP).

### How is quality handled?

Phase 7 (`quality-v1`): completeness, trust, freshness, duplication, intelligence confidence → eligibility `INCLUDE` / `INCLUDE_WITH_CAUTION` / `EXCLUDE`. Demand and later phases consume eligibility — they do not invent labour statistics.

### How is demand calculated?

Phase 8 (`demand-v1`): weighted skill/occupation/sector/geography aggregates over `postedAt` windows from quality-eligible jobs. Trends compare equal-length prior periods. Methodology notes are returned with summaries.

### How is skill gap calculated?

Phase 9 (`gap-v1`): Phase 8 demand + **caller-provided** supply observations. Comparability, severity, confidence, and shortage quantities are explicit. Missing supply → **INSUFFICIENT_DATA**, not “zero gap”.

### How is training connected?

Phase 10 (`training-v1`) consumes gap summaries + CurriculumSkill mappings on Course/Curriculum. Training need (market) is separate from curriculum gap (program).

### How are institutes identified?

Phase 11 (`institute-v1`): provider = Organization (`TRAINING_INSTITUTE`); program = Course/Curriculum. Capability and relevance bands — **not** best-institute rankings.

### How is employment handled?

Phase 12 (`employment-v1`): observational rates from explicit TRAINED/CERTIFIED/PLACED/EMPLOYED observations. `GET /api/v1/outcomes` SAMPLE metrics are **not** this engine. Absent observations → **INSUFFICIENT_DATA**.

### Why no LLM?

Deterministic, auditable pipelines for government decision-support. LLMs would introduce non-reproducible evidence and weaker explainability for this SIH scope.

### Is this forecasting?

**No.** Trends describe observed recent vs previous windows. No prediction, ranking engines, or autonomous policy execution.

### How is false certainty prevented?

Explicit states: UNKNOWN, INSUFFICIENT_DATA, ZERO, ERROR. UI must not convert API failure or missing evidence into 0%. Decision signals carry limitations and phase versions.

### Can it work outside Maharashtra?

**Yes.** Adapters are state-agnostic. Maharashtra synthetic fixtures validate the pipeline; production deployment would register other sources the same way.

### What is synthetic?

`data/sample/ingestion/mahaswayam-rojgar.sample.json` and `data/sample/evaluation/*` are **SYNTHETIC / EVALUATION**. They are not official government statistics.

### What are limitations?

No durable labour-supply or learner registry in MVP; employment/gap coverage depends on provided observations; Course has no location field; no cloud deploy verified in-repo; rate limiting deferred for authenticated MVP; FastAPI service optional and unused by Express today.

### How would real government deployment work?

Configure Neon + Clerk + `CORS_ORIGINS`, `prisma migrate deploy`, build/start API and web, register real DataSources, supply real supply/employment observations through governed processes, restrict decision APIs to government roles. See [deployment.md](deployment.md).
