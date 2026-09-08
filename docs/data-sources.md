# Data sources

**DataSource Registry ≠ Data Ingestion.**

The registry describes sources SkillPulse may use later. It does **not** download, scrape, parse, or import source data.

```text
DataSource  →  Job.sourceId
DataSource  →  Evidence.sourceId
```

Those links preserve provenance. Connectors, HTTP clients, CSV import and job ingestion belong to later phases.

## Ingestion contract (Phase 5.2)

**DataSource Registry describes sources.
Ingestion Contract standardizes records coming from those sources.
Neither one performs ingestion.**

The contract is a source-agnostic observation entering SkillPulse. It is not a Prisma `Job` row. Future flow:

```text
external source format
        ↓
   raw storage                 ← Phase 5.3
        ↓
   source adapter              ← Phase 5.4
        ↓
 SkillPulse ingestion contract ← Phase 5.2
        ↓
 validation (5.5)
        ↓
 deduplication (5.6)
        ↓
 freshness (5.7)
        ↓
 provenance / evidence (5.8)
        ↓
 skill normalization (5.9)
        ↓
 canonical Job persistence (5.10)
        ↓
 end-to-end pipeline (5.11)
        ↓
 source dataset ingest (5.12)     ← adapters + fixtures; no live fetch
```

Code: `apps/api/src/modules/ingestion/`. Runtime validation is Zod (`parseJobIngestionRecord`). There is no ingestion HTTP API and no external connector.

```text
RAW DATA  ≠  INGESTION CONTRACT  ≠  VALIDATION  ≠  DEDUPLICATION  ≠  FRESHNESS  ≠  EVIDENCE  ≠  SKILL NORMALIZATION  ≠  CANONICAL JOB  ≠  BUSINESS INTELLIGENCE
```

### Envelope

| Field | Required | Meaning |
| --- | --- | --- |
| `kind` | yes | Discriminator. Only `JOB` is implemented. Further kinds can be added later without changing the job payload. |
| `contractVersion` | yes | Currently `"1"`. Identifies the contract shape. |
| `adapterName` | yes | Which adapter produced the record |
| `adapterVersion` | yes | Adapter implementation version |
| `payload` | yes | Kind-specific observation |

### JOB payload — required

| Field | Meaning |
| --- | --- |
| `sourceId` and/or `sourceCode` | Registered DataSource identity. At least one is required. Codes are registry codes (`sp.source.ncs`); the contract does not look them up. |
| `title` | Source-reported job title, preserved as given |
| `observedAt` | When SkillPulse observed the source record (timezone-aware instant) |
| `ingestedAt` | When SkillPulse accepted the record into the ingestion pipeline (timezone-aware instant) |

### JOB payload — optional

`externalId`, `description`, `employerName`, `location` (`raw`, `city`, `district`, `state`, `country`), `employmentType`, `experience`, `qualification`, `salary` (`raw`, `min`, `max`, `currency`), `sourceUrl` (http/https), `postedAt`, `expiresAt`, `sourceMetadata`, `rawRef`.

`postedAt` / `expiresAt` are what the source claimed. They are not inferred from `observedAt`.

Raw values are not normalized (e.g. `"React.js / React JS"` stays that string). No skill extraction.

`rawRef` is an opaque pointer to an original payload stored elsewhere — not credentials, not a dump of secrets. `sourceMetadata` must not contain keys such as `password`, `token`, or `apiKey`.

### Adapter boundary

A source adapter maps a source-specific record into this contract and calls `parseJobIngestionRecord`. Adapters are in-process code (`adapter.ts` registry, keyed by DataSource `code`). They do **not** persist `Job` rows and do **not** replace the DataSource registry.

Executable adapters live under `apps/api/src/modules/ingestion/`. The test-only fixture `skillpulse-test-fixture` (`sp.source.demo-seed`) remains for Phase 5.4–5.11 tests. Phase 5.12 adds Mahaswayam Rojgar (`sp.source.mahaswayam-rojgar`). Phase 17 adds an **NCS-shaped** file/synthetic adapter (`sp.source.ncs`, `skillpulse-ncs`) — see [ncs-ingestion.md](ncs-ingestion.md). Phase 17.2 adds a provider-neutral acquisition layer (`apps/api/src/modules/acquisition/`) for authorized API/file/synthetic modes. It does **not** scrape NCS. Registered `accessMethod` values remain `WEB_REFERENCE` unless independently verified later.

## Raw storage (Phase 5.3)

`RawIngestionRecord` preserves what the source provided before mapping. `storeRawObservation` requires a registered DataSource (`sourceId` and/or `sourceCode`). It does not create canonical Jobs, extract skills, or perform business-level job deduplication.

Two observations of the same posting may both be stored. A checksum match means the **payload bytes** are identical, not that two records are the same job.

| Field | Meaning |
| --- | --- |
| `sourceId` | FK to DataSource (required) |
| `kind` | Record kind. Only `JOB` is implemented |
| `externalId` | Optional source-provided id |
| `payload` | Inline original representation (JSONB). Not normalized |
| `payloadRef` | Optional pointer to an external raw object. No object-storage integration |
| `payloadFormat` | `JSON`, `TEXT`, or `EXTERNAL_REF` |
| `checksum` | SHA-256 hex of canonical JSON of the inline payload (object keys sorted recursively; array order kept). If there is no inline payload: SHA-256 of `payloadRef:` + the reference string. UTF-8. Not a semantic duplicate detector |
| `observedAt` | When SkillPulse observed the source record |
| `receivedAt` | When SkillPulse persisted the raw row |
| `status` | Raw processing state: `RECEIVED`, `PROCESSED`, `REJECTED`, `FAILED`. Initial value is `RECEIVED`. Not job validity or demand confidence |
| `adapterName` / `adapterVersion` | Optional, if an adapter was already known |

Credentials must not appear in payloads. Raw storage does not log payload bodies.

## Job source adapters (Phase 5.4)

In-process registry: `registerJobSourceAdapter`, `getJobSourceAdapter`, `listJobSourceAdapters`. Duplicate `sourceCode` registration is rejected. Unknown codes (including registered DataSources that have no executable adapter) return “Unknown source adapter”.

Flow: source record → `adapter.map()` → `parseJobIngestionRecord()` → `validateJobIngestion()` → later pipeline. The adapter does not call `prisma.job.create()`.

## Job ingestion validation (Phase 5.5)

`validateJobIngestion(input)` is a pure function. It does not persist, mutate raw observations, look up DataSource rows, or create Jobs.

**Input:** a Phase 5.2 job ingestion object (`unknown`). Structural parsing reuses the existing Zod contract. Missing optional fields (`description`, `employerName`, `qualification`, `salary`, `location`) are allowed.

**Output:** `{ status, reasons, record }`.

| Status | When |
| --- | --- |
| `VALID` | Contract-valid and no review signals |
| `REJECTED` | Required contract/integrity rule failed. `record` is null when the object cannot be parsed |
| `REVIEW` | Parsed successfully but ambiguous/suspicious in a documented way |

Integrity failures (`REJECTED`) include: `TITLE_MISSING`, `TITLE_INVALID_TYPE`, `SOURCE_IDENTITY_MISSING`, `INVALID_SOURCE_ID`, `INVALID_SOURCE_CODE`, `INVALID_SOURCE_URL`, `INVALID_POSTED_AT`, `INVALID_EXPIRES_AT`, `INVALID_OBSERVED_AT`, `INVALID_INGESTED_AT`, `IMPOSSIBLE_TIMESTAMP_RANGE` (`expiresAt < postedAt` or `ingestedAt < observedAt`), `INVALID_SALARY_RANGE`.

Review signals (do not reject by themselves):

| Code | Rule |
| --- | --- |
| `TITLE_TOO_SHORT` | Parsed title length ≤ 2 |
| `TITLE_PLACEHOLDER` | Exact title, case-insensitive, in `{n/a, na, n.a., none, unknown, untitled, null, undefined, tbd}` |
| `POSTED_AFTER_OBSERVED` | `postedAt` is later than `observedAt` |

If any reason is `REJECTED`, status is `REJECTED` even when review reasons are also present. Reasons are sorted and deduplicated by `severity + code + path`.

This phase does **not** classify freshness (`expiresAt < observedAt` is not stale-here), deduplicate, normalize skills, or query the source registry. Source identity is format-checked only.

## Job deduplication (Phase 5.6)

`deduplicateJobObservation(candidate, priors)` classifies whether a **validated** observation is the same underlying source job as a prior observation.

It is a pure function. It does not persist, delete, overwrite, or merge `RawIngestionRecord` rows. Checksum equality is recorded but never used as job identity.

**Input:** `JobDedupObservation` values. Each must include a Phase 5.5 `JobValidationResult` with status `VALID` or `REVIEW` and a caller-supplied `observationId` (typically a raw-record id). `REJECTED` results are not classified (`AppError` 400). This module does not call `validateJobIngestion`.

**Output:** `{ status, strategy, reason, matchedObservationId, fingerprint, sameContentChecksumObservationIds }`.

| Status | Meaning |
| --- | --- |
| `UNIQUE` | No deterministic duplicate of this source job |
| `DUPLICATE` | Strong identity match; both observations remain |
| `POSSIBLE_DUPLICATE` | Weak/incomplete evidence; do not merge |

### Matching hierarchy

**Level 1 — observation identity (source-scoped `externalId`).** Same source scope (`sourceId` if present, else `sourceCode`) and same `externalId` → `DUPLICATE` / `SOURCE_EXTERNAL_ID`. Different sources with the same `externalId` are not duplicates. Different `externalId` values on the same source are not duplicates, even if title/employer/location/description match. When `externalId` is present, Level 2 is not used.

**Level 2 — content fingerprint, only when `externalId` is absent.** SHA-256 of version `1`, source scope, normalized title, employer, and location key, joined with U+001F. Normalization: NFKC, trim, collapse whitespace, lowercase. Punctuation is kept. Missing employer/location become empty slots. Location key is `country|state|district|city|raw` using only present parts.

`DUPLICATE` via fingerprint requires title, employer, and location all present on **both** sides and equal after normalize. Same title + employer + different location → `POSSIBLE_DUPLICATE`. Same title + different employer → `UNIQUE`. Missing `externalId` without a complete fingerprint → `POSSIBLE_DUPLICATE` / `INSUFFICIENT_IDENTITY` (not automatically `UNIQUE`).

**Checksum** (Phase 5.3) means identical stored payload bytes. It is listed in `sameContentChecksumObservationIds` and does not produce `DUPLICATE`.

Tie-break among matches: lexicographically smallest `observationId`. Priors with the candidate’s own id are ignored.

## Job freshness (Phase 5.7)

`evaluateJobFreshness` classifies how temporally current a **validated** observation is. It is a pure function. The caller supplies `referenceTime` and an optional policy. The module does not call `Date.now()`, persist data, or mutate raw observations.

**Input:** Phase 5.5 `JobValidationResult` (`VALID` or `REVIEW`). `REJECTED` is not evaluated (`AppError` 400). Optional `relatedObservations` / `lastSeenAt` / `dedupStatus`.

Timestamp meanings:

| Field | Meaning |
| --- | --- |
| `postedAt` | Source-claimed listing event time. Used for age. Never replaced by `observedAt` |
| `expiresAt` | Source-claimed listing expiry. Optional |
| `observedAt` | When SkillPulse observed the source record |
| `ingestedAt` | When SkillPulse accepted the record into the pipeline (contract). Raw storage uses `receivedAt` for persist time |
| `lastSeenAt` | Derived: explicit value, else max `ingestedAt` of the candidate and related sightings. Not a Prisma column |

| Status | When |
| --- | --- |
| `STALE` | `expiresAt <= referenceTime`, or `postedAt` age `>= staleAfterMs` |
| `AGING` | not expired, and `agingAfterMs <= age < staleAfterMs` |
| `FRESH` | not expired, and age `< agingAfterMs`, or `expiresAt` still in the future with no `postedAt` |
| `UNKNOWN` | no `postedAt` and no `expiresAt`; or `postedAt` after reference time; or `observedAt` after reference time (unless already `STALE`) |

Default policy: `agingAfterMs` = 14 days, `staleAfterMs` = 45 days. Bounds are inclusive at the threshold. Age is `referenceTime - postedAt`. Comparisons use UTC milliseconds (`Date#getTime`). `expiresAt === referenceTime` is `STALE`.

`ingestedAt < observedAt` remains a Phase 5.5 rejection. Freshness does not re-check it.

Deduplication status may be echoed on the result. `DUPLICATE` is not stale. `UNIQUE` is not fresh.

## Job posting provenance / Evidence (Phase 5.8)

**Freshness classifies temporal status. Evidence records where an observation came from.** They are not the same thing.

Phase 5.8 reuses the existing `Evidence` and `DataSource` models. It does not add a Prisma relation to `RawIngestionRecord` or `Job`.

| Question | Where it lives |
| --- | --- |
| Which source produced this? | `Evidence.sourceId` → `DataSource.id` |
| What kind of evidence? | `Evidence.type` = existing `JOB_POSTING` |
| What source/raw reference? | `Evidence.reference` = `raw-ingestion:<observationId>` |
| When was it observed? | `Evidence.observedAt` = contract `payload.observedAt` |
| Extra provenance? | `Evidence.metadata` (small JSON; not a second raw store) |

**Input:** `observationId` (caller-supplied; typically `RawIngestionRecord.id`), Phase 5.5 `JobValidationResult` (`VALID` or `REVIEW`), optional `dedupStatus` / `freshnessStatus`. `REJECTED` is not accepted ingestion evidence (`AppError` 400). This module does not call `validateJobIngestion`.

**Builder** (`buildJobPostingProvenance`): pure, no I/O, no `Date.now()`. Copies `observedAt` from the contract payload. Records `ingestedAt` only inside metadata so it cannot be confused with `observedAt`. Does not copy title, description, salary, or the raw payload.

**Persist** (`recordJobPostingEvidence`): resolves `DataSource` by `sourceId` (UUID) or `sourceCode` the same way raw storage does. Idempotent lookup on `(sourceId, type=JOB_POSTING, reference)`. If a row exists, it is returned unchanged (first write wins). Historical Evidence is not updated. No unique constraint was added.

`sourceUrl` is recorded as the source supplied it. It is not fetched and not independently verified.

`DUPLICATE` (5.6) and `STALE` (5.7) still produce Evidence. Duplicate does not delete the raw observation. Each distinct `observationId` gets its own reference and can persist as a separate Evidence row.

`confidence` is left null. Canonical `Job` / `JobSkill` are not written.

## Job skill normalization (Phase 5.9)

**Evidence records where an observation came from. Skill normalization interprets supplied skill terms against the Phase 4 taxonomy.** They are not the same thing.

`JobObservation` has no skills field. The test fixture may store an unparsed `sourceMetadata.skillsText` blob; Phase 5.9 does **not** extract skills from title, description, or that blob.

**Input:** `observationId`, Phase 5.5 `JobValidationResult` (`VALID` or `REVIEW`), and skill terms. Terms come from explicit `skills` (`string` or `{ term }`), or, if that array is omitted, from `sourceMetadata.skills` when it is already a `string[]`. `REJECTED` is not normalized (`AppError` 400). This module does not call `validateJobIngestion`.

**Resolver:** each term is passed to existing `resolveTerm` in `taxonomy.service.ts` (which uses `normalizeTerm`). There is no second matcher, no NLP, no fuzzy/embedding search.

Lookup order (Phase 4):

1. Exact `Skill.canonicalName` (`ACTIVE` or `DEPRECATED`)
2. Exact `SkillAlias.normalizedTerm` (skill must be `ACTIVE` or `DEPRECATED`)
3. `UNRESOLVED`

`DRAFT` and `ARCHIVED` skills do not resolve. Original `inputTerm` is preserved separately from `canonicalName`. Repeated terms that resolve to the same Skill are collapsed in `resolvedSkills` (still not persisted as `JobSkill`).

`DUPLICATE` (5.6) and `STALE` (5.7) do not change matching. Evidence rows are not created or updated.

`AMBIGUOUS` is not emitted: `Skill.canonicalName` and `SkillAlias.normalizedTerm` are unique, and `resolveTerm` never picks a candidate.

## Canonical Job persistence (Phase 5.10)

**Skill normalization resolves taxonomy. Persistence writes canonical `Job` / `JobSkill`.** This is the first phase allowed to create those rows.

**Input:** `observationId`, Phase 5.5 `JobValidationResult`, optional Phase 5.9 `JobSkillNormalizationResult`. This module does not call `validateJobIngestion`, `deduplicateJobObservation`, `evaluateJobFreshness`, `recordJobPostingEvidence`, or `resolveTerm`.

**Eligibility:** `VALID` and `REVIEW` may persist. `REJECTED` is refused (`AppError` 400). `Job` has no review/pending column; REVIEW vs VALID remains on the validation result and on Phase 5.8 Evidence metadata.

**Canonical identity:** resolved `DataSource.id` + required `externalId` (source-scoped). Missing `externalId` is refused; one is never invented. Same source + `externalId` reuses the existing Job (first write wins for Job fields). The same `externalId` under a different source is a different Job. Dedup/freshness statuses are not stored and do not skip persistence: `DUPLICATE` reuses the Job row when that identity already exists; `STALE` still persists.

**Mapping:** `title`, `description` (contract field, not the raw payload JSON), `companyName` ← `employerName`, `sourceId`, `externalId`, `postedAt`, `expiresAt`, `sourceUrl`, `isDemo` ← DataSource. `locationId` / `occupationId` / `sectorId` stay null unless a later phase supplies canonical IDs. Unnormalized location strings are not turned into `Location` rows.

**JobSkill:** only `resolvedSkills[].skillId`. Unresolved terms are not materialized. `importance` / `proficiency` stay null. Unique `(jobId, skillId)`; `createMany({ skipDuplicates: true })`. Deprecated skills persist as resolved by Phase 4/5.9. Taxonomy rows are not created or updated.

**Transaction:** Job create + JobSkill writes run in `prisma.$transaction`. Concurrent creates rely on `@@unique([sourceId, externalId])` (P2002 → load existing).

**Not written:** Evidence, raw observations, Skill, SkillAlias, TaxonomyMapping.

## End-to-end job ingestion pipeline (Phase 5.11)

**Phase 5.11 is a thin orchestrator.** It does not reimplement 5.3–5.10. Call `ingestJobObservation`.

Order:

1. Optional in-process adapter (`adapter.parse`) → Phase 5.2 contract
2. Raw storage (`storeRawObservation`) — payload is `rawPayload` / `sourceRecord` / contract. Observation id = `RawIngestionRecord.id`
3. Validation (`validateJobIngestion`) once
4. Deduplication (`deduplicateJobObservation`) against caller-supplied `relatedObservations`
5. Freshness (`evaluateJobFreshness`) with explicit `referenceTime` (never `Date.now()`)
6. Provenance (`recordJobPostingEvidence`) — idempotent per observation id
7. Skill normalization (`normalizeJobObservationSkills`) — supplied terms only
8. Canonical persistence (`persistCanonicalJob`) — Job + JobSkill transaction

**REJECTED:** raw row is kept. No Evidence, no Job, no JobSkill. Later stages are not run.

POSSIBLE_DUPLICATE is not coerced to DUPLICATE. Phase 5.6 only emits it on the fingerprint path (typically no `externalId`); Phase 5.10 still requires `externalId` to persist a Job, so that combination stores raw/Evidence and then fails persistence.

**Retry:** raw storage always inserts a new row (not idempotent). Evidence and Job reuse their existing identity rules. Repeating the same source + `externalId` does not create a second Job.

No HTTP ingestion API. No live scrape of NCS/Mahaswayam/data.gov.in. Phase 17.2 supports **synthetic / authorized-file / authorized-API** NCS-shaped acquisition only ([ncs-ingestion.md](ncs-ingestion.md)). The authorized API connector is inert without an official feed URL and token.

## State-agnostic source ingestion (Phase 5.12)

**Maharashtra is the first implementation, not a Maharashtra-specific core architecture.**

A state is a geographic scope. A data source is a provider/dataset. One state may have many sources later. SkillPulse does not add a State table; `DataSource.geographicScope` (`STATE` / `INDIA` / `GLOBAL`) plus observation `location` fields are enough.

```text
External state/source
        ↓
Source-specific adapter          ← only place source field names live
        ↓
Common Job ingestion contract    ← Phase 5.2
        ↓
ingestJobObservation()           ← Phase 5.11, state-agnostic
        ↓
Canonical Job                    ← existing Job / JobSkill
```

`ingestSourceDataset` in `ingest-dataset.ts` iterates records, calls `adapter.map`, then `ingestJobObservation`. It does not reimplement validation, dedup, freshness, provenance, skill matching, or persistence.

Adapters register by DataSource `code` (`registerJobSourceAdapter` / `BUILTIN_JOB_SOURCE_ADAPTERS`). Adding another state must not edit `job-ingestion-pipeline.ts` or Phases 5.5–5.10.

### Maharashtra (first source)

| | |
| --- | --- |
| DataSource | `sp.source.mahaswayam-rojgar` (already registered, `geographicScope=STATE`) |
| Adapter | `skillpulse-mahaswayam-rojgar` (`sources/mahaswayam-rojgar.ts`) |
| Live access | **Not implemented.** Portal homepage `https://rojgar.mahaswayam.gov.in/` is a WEB_REFERENCE. Live fetch returned 403 earlier. No API/file/scraping permission is registered. |
| What tests ingest | Synthetic fixture `data/sample/ingestion/mahaswayam-rojgar.sample.json` (`acquisition: synthetic-fixture`). These are **not** live portal records. |

Field mapping (fixture / documented export shape — not an official portal API schema):

| Source field | Common contract |
| --- | --- |
| `vacancy_id` | `payload.externalId` |
| `post_name` | `payload.title` |
| `employer_name` | `payload.employerName` |
| `job_description` | `payload.description` |
| `city` / `district` / `state` | `payload.location.city` / `.district` / `.state` and `.raw` |
| `posted_on` | `payload.postedAt` |
| `valid_upto` | `payload.expiresAt` |
| `notice_url` | `payload.sourceUrl` |
| `skills` (`string[]` only) | `payload.sourceMetadata.skills` → Phase 5.9 |
| (caller) `observedAt` / `ingestedAt` | `payload.observedAt` / `ingestedAt` |

Missing source fields stay omitted/null. Skills are never extracted from title or description. Location strings are not parsed into `Location` rows (`locationId` stays null).

### National Career Service (Phase 17 / 17.2)

| | |
| --- | --- |
| DataSource | `sp.source.ncs` (registered, `geographicScope=INDIA`, `accessMethod=WEB_REFERENCE`) |
| Adapter | `skillpulse-ncs` (`sources/ncs.ts`) |
| Acquisition | `apps/api/src/modules/acquisition/` (snapshots, change detection, lifecycle) |
| Access states | `DISABLED` / `SYNTHETIC_FIXTURE` / `AUTHORIZED_FILE` / `AUTHORIZED_API` / `PUBLIC_PAGE` |
| Live scrape | **Rejected.** `AUTHORIZED_API` requires official feed credentials. `PUBLIC_PAGE` requires terms flag and has no collector yet. |
| What tests ingest | Synthetic fixture `data/sample/ingestion/ncs-maharashtra.sample.json` (`SYNTHETIC` — **not real NCS data**) |
| CLI | `pnpm --filter api ncs:ingest -- --mode synthetic\|file\|api\|public [--state Maharashtra] [--district …] [--limit N] [--dry-run]` |

Source `functional_role` / `sector` remain in `sourceMetadata` and are **not** Phase 6 occupation/sector.

### How to add another state/source

1. Register a DataSource (`registry.json` + seed, or admin API). Do not create rows during ingest.
2. Add `apps/api/src/modules/ingestion/sources/<source>.ts` that maps source fields → Phase 5.2 contract.
3. Append the adapter to `BUILTIN_JOB_SOURCE_ADAPTERS` in `ingest-dataset.ts` (or pass it into `ingestSourceDataset({ adapter })`).
4. Add source-specific tests. A second-state **test fixture** (Gujarat employment adapter) already proves the pipeline accepts another mapping without core edits.
5. Call `ingestSourceDataset` / `ingestJobObservation`. Do not add `if (state === ...)` to the pipeline.

Gujarat, Karnataka, and other states listed below do **not** have live ingestion. Gujarat appears only as a test fixture adapter.

### Future geographic expansion (not implemented)

The architecture is meant to support additional Indian states/UTs as **future sources**, each with their own adapter(s). Naming them here does not mean data is ingested:

Maharashtra (first implementation), Gujarat, Karnataka, Tamil Nadu, Telangana, Andhra Pradesh, Kerala, Rajasthan, Madhya Pradesh, Uttar Pradesh, West Bengal, Odisha, Bihar, Punjab, Delhi.

### Batch / partial failure

| Failure | Behaviour |
| --- | --- |
| Unknown adapter, unknown DataSource, unreadable dataset input | Abort. Source-level. |
| One record missing title / invalid contract | `REJECTED`. Raw row kept. Continue. |
| One record missing `externalId` after validation | Persist throws. Counted `FAILED`. Continue. |
| Same dataset ingested again | New raw rows; canonical Job reused (`sourceId` + `externalId`). |

No all-or-nothing batch transaction. No cron, queues, or workers.

## Intentionally not implemented

Live portal/API fetch, scraping, scheduled ingestion, LLM/NLP APIs, demand/supply intelligence, curriculum, and additional state sources beyond the Maharashtra fixture adapter. Deterministic per-job skill extraction in Phase 6 is not an ingestion connector.

Phase 6.12 validation uses the same **synthetic** Mahaswayam fixture as Phase 5.12. It is EVALUATION/FIXTURE input into the state-agnostic intelligence pipeline, not real Maharashtra labour-market evidence, and it does not add Maharashtra-specific intelligence rules.

Phase 7 quality assessment is also state-agnostic. It may validate Maharashtra synthetic fixture Jobs through Job → Phase 6 → Phase 7, but must not add Mahaswayam-specific quality branches.

## What a DataSource is

A registry row is a named, stable source identity. It is not a credential store and not a live feed.

| Field | Meaning |
| --- | --- |
| `id` | UUID primary key |
| `code` | Stable public identity (`sp.source.ncs`) |
| `name` | Human-readable official name (unique) |
| `type` | Existing `DataSourceType` |
| `url` | Official/reference homepage when verified |
| `description` | What was verified — and what was not |
| `reliability` | Optional 0–1 source-level authority. Not extraction or demand confidence. Left unset unless a value is known |
| `accessMethod` | How data *may* be obtained later (`WEB_REFERENCE`, `API`, `FILE`, `MANUAL_IMPORT`, `PARTNER_FEED`). Does not implement that method |
| `domain` | Primary content domain (`JOBS`, `TRAINING`, `QUALIFICATIONS`, `EMPLOYMENT`, `LABOUR_MARKET`, `OTHER`) |
| `geographicScope` | `INDIA`, `STATE`, or `GLOBAL`. Maharashtra is not a schema field |
| `active` | Registry enabled flag. Prefer deactivating over deleting (Jobs/Evidence may point here) |
| `isDemo` | Synthetic seed rows |

API keys, passwords and tokens must not be stored on `DataSource`.

Phase 4 taxonomy authorities (NCO-2015, NSQF, ESCO, O*NET) remain classification mappings in `TaxonomyMapping`. They are not ingestion sources.

## Current registered sources

Seeded from `data/data-sources/registry.json` (idempotent upsert by `code`).

| Code | Name | Type | Access | Domain | Scope | Homepage | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sp.source.ncs` | National Career Service | GOVERNMENT | WEB_REFERENCE | JOBS | INDIA | https://www.ncs.gov.in/ | **VERIFIED** homepage. API/file/license **NOT VERIFIED** |
| `sp.source.data-gov-in` | Open Government Data Platform India | PUBLIC_DATASET | WEB_REFERENCE | LABOUR_MARKET | INDIA | https://www.data.gov.in/ | **VERIFIED** about page. Specific datasets/APIs **NOT VERIFIED** |
| `sp.source.ncvet` | National Council for Vocational Education and Training | GOVERNMENT | WEB_REFERENCE | TRAINING | INDIA | https://ncvet.gov.in/ | **VERIFIED** official organisation URL via public sources. API **NOT VERIFIED** |
| `sp.source.nqr` | National Qualifications Register | GOVERNMENT | WEB_REFERENCE | QUALIFICATIONS | INDIA | https://nqr.gov.in/ | **VERIFIED** homepage. Migration target and APIs **NOT VERIFIED** |
| `sp.source.dgt` | Directorate General of Training | TRAINING | WEB_REFERENCE | TRAINING | INDIA | https://dgt.gov.in/en | **VERIFIED** homepage. Feeds **NOT VERIFIED** |
| `sp.source.mahaswayam-rojgar` | Mahaswayam Rojgar | GOVERNMENT | WEB_REFERENCE | EMPLOYMENT | STATE | https://rojgar.mahaswayam.gov.in/ | Official portal URL **VERIFIED** in public sources. Live homepage fetch returned 403. API/file **NOT VERIFIED** |
| `sp.source.demo-seed` | [DEMO] SkillPulse Seed | OTHER | MANUAL_IMPORT | OTHER | INDIA | — | Synthetic. `isDemo`, `active=false` |

**Not seeded:** Skill India Digital Hub (`skillindiadigital.gov.in`) — candidate overlapped DGT; a separate SIDH row was not added because a live homepage was not confirmed in this phase.

`reliability` is null on government registry rows (not fabricated).

## API

Authenticated users may list and read sources.

`GET /api/v1/data-sources`

Query: `q`, `type`, `domain`, `accessMethod`, `geographicScope`, `active`, `isDemo`, `limit` (max 50), `offset`.

`GET /api/v1/data-sources/:id` — UUID or `code`.

`POST /api/v1/data-sources` and `PATCH /api/v1/data-sources/:id` require `PLATFORM_ADMIN`. There is no DELETE; set `active: false`.

See [api.md](api.md).
