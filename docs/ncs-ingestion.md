# NCS ingestion (Phase 17 / 17.2)

National Career Service (NCS) is the intended **job-demand** source for SkillPulse.

Official site: [https://www.ncs.gov.in/](https://www.ncs.gov.in/)

**SkillPulse does not assume unrestricted permission to scrape NCS. Live acquisition requires a permitted/authorized access mechanism or a documented compliant public-page collection method.**

SkillPulse does not scrape NCS, reverse-engineer private API envelopes, invent endpoints, bypass CAPTCHA/auth, or rotate proxies.

---

## 1. Purpose

Supply source-backed Maharashtra job observations into Phase 5 so Phases 6–13 can analyse **observed** demand — without claiming complete labour-market coverage.

Phase 17.2 adds a provider-neutral **acquisition layer**: connectors, immutable snapshots, change detection, lifecycle, retention, scheduler gating, and truthful data-status for the product API/UI.

## 2. Access modes

| Mode | Meaning |
| --- | --- |
| `DISABLED` | Source registered; ingestion not configured |
| `SYNTHETIC_FIXTURE` | Evaluation/demo sample only — **not real NCS data** |
| `AUTHORIZED_FILE` | Operator-supplied NCS-shaped JSON (authorized sharing) |
| `AUTHORIZED_API` | Official feed URL + token (`NCS_API_BASE_URL`, `NCS_API_TOKEN`). Does **not** default to ncs.gov.in |
| `PUBLIC_PAGE` | Permission-gated. Requires `NCS_PUBLIC_PAGE_PERMITTED=true` after documented terms review. **No page collector is shipped** — acquisition refuses rather than scrape |

Code: `apps/api/src/modules/ingestion/sources/ncs-access.ts`. Connectors: `apps/api/src/modules/acquisition/`.

`--mode live` / `NCS_LIVE_ENABLED=true` remain **rejected**. The 24h scheduler never executes unless mode is `AUTHORIZED_API` or `AUTHORIZED_FILE`.

Never classify public-page data as `AUTHORIZED_API`. Never classify synthetic data as real.

## 3. Authorization limitation

- Homepage reference verified: NCS exists as a government portal.
- Public machine-readable API, bulk dump, license, and scraping permission: **NOT VERIFIED**.
- Therefore: **no production scraper**, no invented endpoints, no CAPTCHA bypass.

## 4. Maharashtra scope

Configure with `--state Maharashtra` and optional `--district` / `--city` / `--limit`.

Filters apply in the connector only. Core intelligence modules remain **state-agnostic**. Future states reuse the same path.

## 5. File format / synthetic fixture

`data/sample/ingestion/ncs-maharashtra.sample.json`

Labelled: `acquisition: synthetic-fixture`, `accessClass: SYNTHETIC_FIXTURE`, note contains `NOT REAL NCS DATA`.

## 6. Real Maharashtra snapshot (captured public listings)

Local raw snapshot (do not rewrite):

`data/raw/ncs/maharashtra/ncs-maharashtra-2026-09-08.json`

- **source_file:** `https://ncs.gov.in/job-listing`
- **access mode:** `AUTHORIZED_FILE` (local operator-supplied snapshot of public page cards)
- **not** an official NCS API/feed
- **not** synthetic demo data
- **260** job cards in the file; webpage “total” (e.g. 3843) is metadata only — only JSON records are ingested

```bash
pnpm --filter api ncs:ingest -- --mode file --input data/raw/ncs/maharashtra/ncs-maharashtra-2026-09-08.json --state Maharashtra --dry-run
pnpm --filter api ncs:ingest -- --mode file --input data/raw/ncs/maharashtra/ncs-maharashtra-2026-09-08.json --state Maharashtra
```

Relative `posted` labels (`N hours/days ago`) are converted using the snapshot retrieval time when precise; imprecise labels (e.g. `30+ days ago`) leave `postedAt` unavailable and preserve `postedRaw` in source metadata.

## 7. Architecture flow

```text
NCS connector (synthetic / authorized file / authorized API / public-page stub)
        ↓
GovernmentSourceConnector → AcquiredBatch
        ↓
IngestionSnapshot (immutable: sourceId, retrievalTime, sourceReference,
  accessMethod, recordCount, checksum, parserVersion, counts, failure)
        ↓
Change detection (externalId + contentHash); skip UNCHANGED
        ↓
ncsAdapter → Phase 5 ingestJobObservation
  raw → validate → dedup → freshness → evidence → taxonomy → Job
        ↓
Phase 6 JobIntelligence (phase6-v1)
        ↓
Phase 7 quality-v1
        ↓
Phase 8 demand-v1 → Phase 9–13 (unchanged engines)
```

Do not create Jobs directly from the connector. Do not rewrite Phases 6–13 formulas.

## 8. Change detection and lifecycle

- **NEW** — no prior Job for `sourceId + externalId`
- **UNCHANGED** — same `contentHash` (clock fields excluded) → skip Phase 5–7; update `lastObservedAt`
- **CHANGED** — different hash → re-ingest through Phase 5–7
- Intra-batch duplicate `externalId` → counted as duplicate, not double-persisted

Lifecycle (`docs` + `lifecycle.ts`):

- `ACTIVE` — observed in latest acquisition
- `EXPIRED` — missing from an authorized full feed (`expireMissing`, default on API/file). Synthetic/partial district filters do **not** expire the rest of the source.
- `WITHDRAWN` — source **explicitly** signals withdrawal/cancellation. “Not observed” alone is **not** withdrawn.

Historical Jobs and observations are never deleted by acquisition.

## 9. Provenance / evidence

`DataSource sp.source.ncs` → `IngestionSnapshot` → `RawIngestionRecord` → `Evidence` → canonical `Job` (`contentHash`, `lifecycleStatus`, `lastObservedAt`) → `JobSkill`.

Product overview exposes truthful `demandSource` status (`NOT_CONFIGURED` / `SYNTHETIC_FIXTURE` / `AUTHORIZED_*` / `PUBLIC_PAGE` / failure statuses). **`liveNcsData` is always false** until an official authorized feed is documented and connected.

## 10. Future sources (prep only)

Registry stubs: MSSDS (`sp.source.mssds`), NQR, DGT. Shared `GovernmentSourceConnector` abstraction. No collectors. Do not invent NSQF IDs, ITI placement rates, or training capacity.

## 11. Limitations

- **REAL NCS DATA INGESTED = NO** unless an operator supplies an authorized official feed/file and documents it.
- Synthetic fixture must not be presented as Maharashtra labour statistics.
- `AUTHORIZED_API` stays inert without official URL+token.
- `PUBLIC_PAGE` stays refused without terms flag **and** a future compliant collector.
- Website scraping / undocumented NCS API envelopes remain out of scope.
