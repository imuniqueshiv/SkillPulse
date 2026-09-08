# NCS ingestion (Phase 17 / 17.2)

National Career Service (NCS) is the intended **job-demand** source for SkillPulse.

Official site: [https://www.ncs.gov.in/](https://www.ncs.gov.in/)

**SkillPulse does not scrape NCS, reverse-engineer private API envelopes, or invent endpoints.** Live retrieval requires an operator-configured official feed (`AUTHORIZED_API`) or an authorized file (`AUTHORIZED_FILE`).

---

## 1. Purpose

Supply source-backed job observations into the existing Phase 5 pipeline so Phases 6–8 can analyse **observed** demand — without claiming complete Maharashtra labour-market coverage.

Phase 17.2 adds a provider-neutral **acquisition layer** above the Phase 17 NCS adapter: immutable snapshots, change detection, lifecycle status, retention, and a 24-hour scheduler abstraction.

## 2. Access modes

| Mode | Meaning |
| --- | --- |
| `DISABLED` | Source registered; ingestion not configured (`ACCESS_DENIED` / `ACCESS_NOT_CONFIGURED`) |
| `SYNTHETIC_FIXTURE` | Evaluation/demo sample only — **not real NCS data** |
| `AUTHORIZED_FILE` | Operator-supplied NCS-shaped JSON file (authorized sharing) |
| `AUTHORIZED_API` | Official feed URL + bearer token (`NCS_API_BASE_URL`, `NCS_API_TOKEN`). Does **not** default to ncs.gov.in |

Code: `apps/api/src/modules/ingestion/sources/ncs-access.ts`. Connectors: `apps/api/src/modules/acquisition/`.

`--mode live` / `NCS_LIVE_ENABLED=true` remain **rejected**. The scheduler never executes unless the mode is `AUTHORIZED_API` or `AUTHORIZED_FILE`.

## 3. Authorization limitation

- Homepage reference verified: NCS exists as a government portal.
- Public machine-readable API, bulk dump, license, and scraping permission: **NOT VERIFIED**.
- Therefore: **no production scraper**, no invented endpoints, no CAPTCHA bypass, no undocumented envelope decryption.

## 4. Collected fields (when present in file/feed)

`job_id`, `title`, `description`, `employer_name`, location (`city`/`district`/`state`), `sector`, `functional_role`, `required_skills`, `preferred_skills`, `experience`, `education`, salary fields, `posted_on`, `notice_url`.

Missing fields stay null/undefined. SkillPulse does **not** invent them.

## 5. Excluded fields

Candidate/jobseeker PII (names, phones, emails, Aadhaar, resumes, applications), credentials, cookies, tokens, hidden/private API payloads.

## 6. File format

SkillPulse sample export (`skillpulse-ncs-sample-v1`), **not** an official NCS schema.

Synthetic fixture:

`data/sample/ingestion/ncs-maharashtra.sample.json`

Labelled: `acquisition: synthetic-fixture`, `accessClass: SYNTHETIC_FIXTURE`, note contains `NOT REAL NCS DATA`.

## 7. Ingestion command

```bash
# Dry-run synthetic fixture (no DB writes for Jobs or snapshots)
pnpm --filter api ncs:ingest -- --mode synthetic --dry-run

# Filter demonstration geography (parameterized; not hard-coded in engines)
pnpm --filter api ncs:ingest -- --mode synthetic --state Maharashtra --dry-run

# Authorized file (operator-provided)
pnpm --filter api ncs:ingest -- --mode file --input path/to/ncs-shaped.json

# Authorized official feed (requires NCS_API_BASE_URL + NCS_API_TOKEN)
pnpm --filter api ncs:ingest -- --mode api

# Live scrape mode is refused
pnpm --filter api ncs:ingest -- --mode live   # exits non-zero
```

Reports: mode, snapshot id, checksum, created/changed/skipped/expired/rejected/failed. Never prints secrets. Does not retrain ML models.

## 8. Maharashtra scope

Maharashtra is the **initial demonstration filter** (`--state Maharashtra`). Core intelligence modules remain state-agnostic. The same adapter can ingest other states when authorized files/feeds exist.

## 9–13. Phase integration

```text
NCS connector (synthetic file / authorized file / authorized API)
        ↓
IngestionSnapshot (immutable batch metadata + checksum)
        ↓
Change detection (externalId + contentHash + observedAt)
        ↓
ncsAdapter (Phase 17) — new/changed jobs only
        ↓
Phase 5 ingestJobObservation
  raw → validate → dedup → freshness → evidence → skills → Job
        ↓
Phase 6 processJobIntelligence (phase6-v1)
        ↓
Phase 7 assessJobQuality (quality-v1)
        ↓
Phase 8 summarizeDemand (demand-v1) — unchanged; historical Jobs/observations retained
```

No NCS-specific validation/dedup/freshness/demand engines. Phases 6–8 intelligence logic is not modified.

Unchanged jobs are skipped (lifecycle stays ACTIVE; `lastObservedAt` updates). Jobs missing from an authorized full feed are marked `EXPIRED`, never deleted.

## 14. Provenance

`DataSource` `sp.source.ncs` → `IngestionSnapshot` + `RawIngestionRecord` → `Evidence` (`raw-ingestion:<id>`) → canonical `Job` (`sourceId` + `externalId`, `contentHash`, `lifecycleStatus`).

Source `functional_role` / `sector` stay in `sourceMetadata` — distinct from Phase 6 occupation/sector.

## 15. Snapshot / batch (Phase 17.2)

Each acquisition persists an immutable `IngestionSnapshot`: `sourceId`, `retrievalTime`, `sourceReference`, `accessMethod`, `recordCount`, `checksum`, plus created/changed/skipped/expired counts and explicit failure codes:

`SOURCE_UNAVAILABLE` · `ACCESS_DENIED` · `SCHEMA_CHANGED` · `VALIDATION_FAILED` · `DUPLICATE` · `PROCESSING_FAILED` · `PARTIAL_SYNC`

Raw payload retention is configurable (`NCS_RAW_RETENTION_DAYS`, default 90). Cleanup strips old raw payloads but keeps the latest observation per `externalId` and never deletes Jobs, Evidence, or demand observations.

The 24-hour scheduler (`runScheduledNcsAcquisition`) is an abstraction only — it is **not** started with the API process, and it refuses to run unless the mode is `AUTHORIZED_API` or `AUTHORIZED_FILE`.

## 16. Limitations

- **REAL NCS DATA INGESTED = NO** unless an operator supplies an authorized official feed/file and documents it separately.
- Synthetic fixture must not be presented as Maharashtra labour statistics.
- Limited samples support “observed NCS-shaped demand”, not “complete Maharashtra demand”.
- `AUTHORIZED_API` stays inert without `NCS_API_BASE_URL` and `NCS_API_TOKEN` from an official source.
- Website scraping / undocumented NCS API envelopes remain out of scope.
