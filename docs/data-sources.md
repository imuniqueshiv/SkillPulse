# Data sources

**DataSource Registry ≠ Data Ingestion.**

The registry describes sources SkillPulse may use later. It does **not** download, scrape, parse, or import source data.

```text
DataSource  →  Job.sourceId
DataSource  →  Evidence.sourceId
```

Those links preserve provenance. Connectors, HTTP clients, CSV import and job ingestion belong to later phases.

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
