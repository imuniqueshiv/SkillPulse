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
 validation / dedup / freshness  ← not implemented
        ↓
 canonical Job persistence       ← not implemented
```

Code: `apps/api/src/modules/ingestion/`. Runtime validation is Zod (`parseJobIngestionRecord`). There is no ingestion HTTP API and no external connector.

```text
RAW DATA  ≠  INGESTION CONTRACT  ≠  CANONICAL JOB  ≠  BUSINESS INTELLIGENCE
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

The only implemented adapter is the test-only fixture `skillpulse-test-fixture` (`sp.source.demo-seed`). No NCS, data.gov.in, Mahaswayam, NCVET, or DGT adapter exists. Registered `accessMethod` values remain `WEB_REFERENCE` unless independently verified later.

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

Flow: source record → `adapter.map()` → `parseJobIngestionRecord()` → validated `JobIngestionRecord`. The adapter does not call `prisma.job.create()`.

### Intentionally not implemented

External connectors, scraping, CSV/file ingest, validation pipeline, job deduplication, freshness, Evidence processing, taxonomy normalization of ingested jobs, canonical Job persistence from this pipeline, NLP, demand/supply intelligence, queues, and scheduled jobs.

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
