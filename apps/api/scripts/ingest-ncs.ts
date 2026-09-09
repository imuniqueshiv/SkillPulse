/**
 * Phase 17.2 — NCS acquisition CLI.
 *
 * Usage:
 *   pnpm --filter api ncs:ingest -- --mode synthetic --state Maharashtra --dry-run
 *   pnpm --filter api ncs:ingest -- --mode file --input data/raw/ncs/maharashtra/ncs-maharashtra-2026-09-08.json --state Maharashtra
 *   pnpm --filter api ncs:ingest -- --mode api
 *
 * Does not print secrets. Does not retrain ML models. Does not scrape NCS.
 */

import { resolve } from "node:path";
import {
  defaultMaharashtraRawSnapshotPath,
  parseNcsShapedFile,
} from "../src/modules/acquisition/connectors";
import { runNcsAcquisition } from "../src/modules/acquisition/pipeline";
import { disconnectPrisma } from "../src/config/database";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import {
  describeNcsAccess,
  NCS_ACCESS_MODE,
  resolveNcsAccessMode,
} from "../src/modules/ingestion/sources/ncs-access";
import { recordMatchesGeoFilter } from "../src/modules/ingestion/sources/ncs-public-listing";
import { ncsAdapter } from "../src/modules/ingestion/sources/ncs";

type CliArgs = {
  mode: string;
  input?: string;
  state?: string;
  district?: string;
  city?: string;
  limit?: number;
  dryRun: boolean;
  expireMissing?: boolean;
  force: boolean;
  observedAt: string;
  ingestedAt: string;
  referenceTime: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    mode: process.env.NCS_ACQUISITION_MODE ?? "disabled",
    dryRun: false,
    force: false,
    observedAt: "2026-09-08T10:00:00.000Z",
    ingestedAt: "2026-09-08T10:05:00.000Z",
    referenceTime: "2026-09-15T00:00:00.000Z",
  };
  let ingestedAtExplicit = false;

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--mode" && next) {
      args.mode = next;
      i += 1;
    } else if (flag === "--input" && next) {
      args.input = next;
      i += 1;
    } else if (flag === "--state" && next) {
      args.state = next;
      i += 1;
    } else if (flag === "--district" && next) {
      args.district = next;
      i += 1;
    } else if (flag === "--city" && next) {
      args.city = next;
      i += 1;
    } else if (flag === "--limit" && next) {
      args.limit = Number(next);
      i += 1;
    } else if (flag === "--dry-run") {
      args.dryRun = true;
    } else if (flag === "--force") {
      args.force = true;
    } else if (flag === "--expire-missing") {
      args.expireMissing = true;
    } else if (flag === "--no-expire-missing") {
      args.expireMissing = false;
    } else if (flag === "--observed-at" && next) {
      args.observedAt = next;
      i += 1;
    } else if (flag === "--ingested-at" && next) {
      args.ingestedAt = next;
      ingestedAtExplicit = true;
      i += 1;
    } else if (flag === "--reference-time" && next) {
      args.referenceTime = next;
      i += 1;
    } else if (flag === "--help" || flag === "-h") {
      console.log(
        "Usage: ingest-ncs.ts --mode synthetic|file|api|public|disabled [--input file] [--state Name] [--district Name] [--city Name] [--limit N] [--dry-run]",
      );
      process.exit(0);
    }
  }

  // Keep ingestedAt after observedAt unless the operator set it explicitly.
  if (!ingestedAtExplicit) {
    const observedMs = Date.parse(args.observedAt);
    if (Number.isFinite(observedMs)) {
      args.ingestedAt = new Date(observedMs + 5 * 60 * 1000).toISOString();
    }
  }

  return args;
}

function defaultSyntheticPath(): string {
  return resolve(
    __dirname,
    "../../../data/sample/ingestion/ncs-maharashtra.sample.json",
  );
}

function resolveFileInput(mode: string, input?: string): string {
  if (input) {
    return input;
  }
  if (mode === "SYNTHETIC_FIXTURE") {
    return defaultSyntheticPath();
  }
  return defaultMaharashtraRawSnapshotPath();
}

async function dryRunIngest(
  records: Record<string, unknown>[],
  observedAt: string,
  ingestedAt: string,
): Promise<{
  total: number;
  valid: number;
  review: number;
  rejected: number;
  failed: number;
  withoutPostedAt: number;
  withoutState: number;
  unresolvedPreview: string[];
}> {
  let valid = 0;
  let review = 0;
  let rejected = 0;
  let failed = 0;
  let withoutPostedAt = 0;
  let withoutState = 0;
  const unresolved = new Set<string>();

  for (const record of records) {
    try {
      const mapped = ncsAdapter.map({
        ...record,
        observedAt,
        ingestedAt,
      } as never);
      const validation = validateJobIngestion(mapped);
      if (!mapped || typeof mapped !== "object") {
        failed += 1;
        continue;
      }
      const payload =
        "payload" in mapped && mapped.payload && typeof mapped.payload === "object"
          ? (mapped.payload as {
              postedAt?: unknown;
              location?: { state?: string };
              sourceMetadata?: { skills?: unknown };
            })
          : {};
      if (!payload.postedAt) {
        withoutPostedAt += 1;
      }
      if (!payload.location?.state) {
        withoutState += 1;
      }
      if (validation.status === "REJECTED") {
        rejected += 1;
      } else if (validation.status === "REVIEW") {
        review += 1;
      } else {
        valid += 1;
      }
      const skills = payload.sourceMetadata?.skills;
      if (Array.isArray(skills)) {
        for (const term of skills) {
          if (typeof term === "string") {
            unresolved.add(term);
          }
        }
      }
    } catch {
      failed += 1;
    }
  }

  return {
    total: records.length,
    valid,
    review,
    rejected,
    failed,
    withoutPostedAt,
    withoutState,
    unresolvedPreview: [...unresolved].sort().slice(0, 20),
  };
}

async function main(): Promise<void> {
  const started = Date.now();
  const args = parseArgs(process.argv.slice(2));

  let mode;
  try {
    mode = resolveNcsAccessMode({
      mode: args.mode,
      liveEnabled: process.env.NCS_LIVE_ENABLED,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid NCS mode");
    process.exitCode = 1;
    return;
  }

  const access = describeNcsAccess(mode);
  console.log(
    JSON.stringify(
      {
        phase: 17.2,
        access,
        dryRun: args.dryRun,
        stateFilter: args.state ?? null,
        districtFilter: args.district ?? null,
        cityFilter: args.city ?? null,
        limit: args.limit ?? null,
      },
      null,
      2,
    ),
  );

  if (args.dryRun) {
    if (
      mode === NCS_ACCESS_MODE.DISABLED ||
      mode === NCS_ACCESS_MODE.AUTHORIZED_API ||
      mode === NCS_ACCESS_MODE.PUBLIC_PAGE
    ) {
      console.error(
        "Dry-run supports synthetic|file only. AUTHORIZED_API/PUBLIC_PAGE are not fetched in dry-run.",
      );
      process.exitCode = 1;
      return;
    }

    let inputPath: string;
    try {
      inputPath = resolveFileInput(mode, args.input);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
      return;
    }

    const file = parseNcsShapedFile(inputPath, new Date(args.observedAt));
    if (
      mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE &&
      file.acquisition !== "synthetic-fixture"
    ) {
      console.error("Synthetic mode requires acquisition=synthetic-fixture");
      process.exitCode = 1;
      return;
    }

    let records = file.records.filter((row) =>
      recordMatchesGeoFilter(row, {
        state: args.state,
        district: args.district,
        city: args.city,
      }),
    );
    if (typeof args.limit === "number" && Number.isFinite(args.limit) && args.limit >= 0) {
      records = records.slice(0, Math.floor(args.limit));
    }

    const preview = await dryRunIngest(records, args.observedAt, args.ingestedAt);
    console.log(
      JSON.stringify(
        {
          source: "sp.source.ncs",
          mode,
          inputPath,
          sourceFile: file.sourceFile ?? null,
          reportedTotalOnPage: file.reportedTotalOnPage ?? null,
          extractedCountClaim: file.extractedCount ?? null,
          state: args.state ?? null,
          district: args.district ?? null,
          durationMs: Date.now() - started,
          ...preview,
          note: "dry-run: no snapshot or canonical Job writes; only records present in the JSON are counted",
        },
        null,
        2,
      ),
    );
    return;
  }

  let inputPath: string | undefined;
  try {
    inputPath =
      mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE ||
      mode === NCS_ACCESS_MODE.AUTHORIZED_FILE
        ? resolveFileInput(mode, args.input)
        : args.input;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const result = await runNcsAcquisition({
    mode,
    observedAt: args.observedAt,
    ingestedAt: args.ingestedAt,
    referenceTime: new Date(args.referenceTime),
    inputPath,
    state: args.state,
    district: args.district,
    city: args.city,
    limit: args.limit,
    expireMissing: args.expireMissing ?? false,
    processDownstream: true,
    forceReprocess: args.force,
  });

  console.log(
    JSON.stringify(
      {
        source: "sp.source.ncs",
        accessMode: result.mode,
        state: result.state,
        district: result.district,
        city: result.city,
        runId: result.runId,
        snapshotId: result.snapshotId,
        checksum: result.checksum,
        sourceReference: result.sourceReference,
        parserVersion: result.parserVersion,
        status: result.status,
        failureCode: result.failureCode,
        durationMs: result.durationMs,
        totalObserved: result.total,
        valid: result.accepted,
        invalid: result.rejected,
        duplicates: result.duplicates,
        unchanged: result.skipped,
        changed: result.changed,
        persisted: result.created + result.changed,
        expired: result.expired,
        withdrawn: result.withdrawn,
        failed: result.failed,
        unresolvedSkills: result.unresolvedSkillTerms,
        qualityIncluded: result.qualityIncluded,
        qualityExcluded: result.qualityExcluded,
        officialNcsApiFeed: false,
        realCapturedPublicListingData:
          mode === NCS_ACCESS_MODE.AUTHORIZED_FILE,
        note:
          mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE
            ? "SYNTHETIC_FIXTURE is not real NCS labour-market data"
            : mode === NCS_ACCESS_MODE.AUTHORIZED_FILE
              ? "Local captured public job-listing snapshot — not an official NCS API feed; only JSON records are ingested"
              : undefined,
      },
      null,
      2,
    ),
  );

  if (
    result.status === "ACCESS_DENIED" ||
    result.status === "SOURCE_UNAVAILABLE" ||
    result.status === "SCHEMA_CHANGED" ||
    result.status === "FAILED"
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
