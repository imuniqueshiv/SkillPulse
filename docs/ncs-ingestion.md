# NCS ingestion (Phase 17)

National Career Service (NCS) is the intended **job-demand** source for SkillPulse.

Official site: [https://www.ncs.gov.in/](https://www.ncs.gov.in/)

**SkillPulse does not assume unrestricted permission to scrape NCS. Live ingestion requires an authorized access mechanism.**

---

## 1. Purpose

Supply source-backed job observations into the existing Phase 5 pipeline so Phases 6–8 can analyse **observed** demand — without inventing an NCS API or claiming complete Maharashtra labour-market coverage.

## 2. Access modes

| Mode | Meaning |
| --- | --- |
| `DISABLED` | Source registered; ingestion not configured (`ACCESS_NOT_CONFIGURED`) |
| `SYNTHETIC_FIXTURE` | Evaluation/demo sample only — **not real NCS data** |
| `AUTHORIZED_FILE` | Operator-supplied NCS-shaped JSON file (authorized sharing) |
| `AUTHORIZED_LIVE` | **Not implemented** — no authorized live API client in this repo |

Code: `apps/api/src/modules/ingestion/sources/ncs-access.ts`

## 3. Authorization limitation

- Homepage reference verified: NCS exists as a government portal.
- Public machine-readable API, bulk dump, license, and scraping permission: **NOT VERIFIED**.
- Therefore: **no production scraper**, no invented endpoints, no CAPTCHA bypass.

## 4. Collected fields (when present in file)

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
# Dry-run synthetic fixture (no DB writes for Jobs)
pnpm --filter api ncs:ingest -- --mode synthetic --dry-run

# Filter demonstration geography (parameterized; not hard-coded in engines)
pnpm --filter api ncs:ingest -- --mode synthetic --state Maharashtra --dry-run

# Authorized file (operator-provided)
pnpm --filter api ncs:ingest -- --mode file --input path/to/ncs-shaped.json

# Live mode is refused
pnpm --filter api ncs:ingest -- --mode live   # exits non-zero
```

Reports: mode, counts (accepted/rejected/failed), jobs created/reused, unresolved skill terms, duration. Never prints secrets.

## 8. Maharashtra scope

Maharashtra is the **initial demonstration filter** (`--state Maharashtra`). Core intelligence modules remain state-agnostic. The same adapter can ingest other states when authorized files exist.

## 9–13. Phase integration

```text
NCS-shaped file / synthetic fixture
        ↓
ncsAdapter (Phase 17)
        ↓
Phase 5 ingestSourceDataset / ingestJobObservation
  raw → validate → dedup → freshness → evidence → skills → Job
        ↓
Phase 6 processJobIntelligence (phase6-v1)
        ↓
Phase 7 assessJobQuality (quality-v1)
        ↓
Phase 8 summarizeDemand (demand-v1)
```

No NCS-specific validation/dedup/freshness/demand engines.

## 14. Provenance

`DataSource` `sp.source.ncs` → `RawIngestionRecord` → `Evidence` (`raw-ingestion:<id>`) → canonical `Job` (`sourceId` + `externalId`).

Source `functional_role` / `sector` stay in `sourceMetadata` — distinct from Phase 6 occupation/sector.

## 15. Snapshot / batch

Reuses Phase 5.12 dataset ingest (`ingestSourceDataset`). No new ingestion-run table.

## 16. Limitations

- **REAL NCS DATA INGESTED = NO** unless an operator supplies an authorized file and documents it separately.
- Synthetic fixture must not be presented as Maharashtra labour statistics.
- Limited samples support “observed NCS-shaped demand”, not “complete Maharashtra demand”.
- `AUTHORIZED_LIVE` remains blocked until a real authorized mechanism exists.
