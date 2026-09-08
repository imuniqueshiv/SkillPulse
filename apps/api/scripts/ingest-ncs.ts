/**
 * Phase 17.2 — NCS acquisition CLI.
 *
 * Usage:
 *   pnpm --filter api ncs:ingest -- --mode synthetic --state Maharashtra --dry-run
 *   pnpm --filter api ncs:ingest -- --mode synthetic --state Maharashtra --district Pune
 *   pnpm --filter api ncs:ingest -- --mode file --input path/to/file.json --limit 100
 *   pnpm --filter api ncs:ingest -- --mode api
 *   pnpm --filter api ncs:ingest -- --mode public   # refused unless permitted + collector exists
 *
 * Does not print secrets. Does not retrain ML models. Does not scrape NCS.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runNcsAcquisition } from "../src/modules/acquisition/pipeline";
import { disconnectPrisma } from "../src/config/database";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import {
  describeNcsAccess,
  NCS_ACCESS_MODE,
  resolveNcsAccessMode,
} from "../src/modules/ingestion/sources/ncs-access";
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
  observedAt: string;
  ingestedAt: string;
  referenceTime: string;
};

type FixtureFile = {
  sourceCode?: string;
  acquisition?: string;
  accessClass?: string;
  note?: string;
  records?: unknown[];
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    mode: process.env.NCS_ACQUISITION_MODE ?? "disabled",
    dryRun: false,
    observedAt: "2026-09-08T10:00:00.000Z",
    ingestedAt: "2026-09-08T10:05:00.000Z",
    referenceTime: "2026-09-15T00:00:00.000Z",
  };

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
    } else if (flag === "--expire-missing") {
      args.expireMissing = true;
    } else if (flag === "--observed-at" && next) {
      args.observedAt = next;
      i += 1;
    } else if (flag === "--ingested-at" && next) {
      args.ingestedAt = next;
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
  return args;
}

function defaultSyntheticPath(): string {
  return resolve(
    __dirname,
    "../../../data/sample/ingestion/ncs-maharashtra.sample.json",
  );
}

function loadFixture(path: string): FixtureFile {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as FixtureFile;
}

function filterRecords(
  records: Record<string, unknown>[],
  args: CliArgs,
): Record<string, unknown>[] {
  let filtered = records.filter((row) => {
    const stateOk =
      !args.state ||
      (typeof row.state === "string" &&
        row.state.trim().toLowerCase() === args.state.trim().toLowerCase());
    const districtOk =
      !args.district ||
      (typeof row.district === "string" &&
        row.district.trim().toLowerCase() === args.district.trim().toLowerCase());
    const cityOk =
      !args.city ||
      (typeof row.city === "string" &&
        row.city.trim().toLowerCase() === args.city.trim().toLowerCase());
    return stateOk && districtOk && cityOk;
  });
  if (typeof args.limit === "number" && Number.isFinite(args.limit) && args.limit >= 0) {
    filtered = filtered.slice(0, Math.floor(args.limit));
  }
  return filtered;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
  unresolvedPreview: string[];
}> {
  let valid = 0;
  let review = 0;
  let rejected = 0;
  let failed = 0;
  const unresolved = new Set<string>();

  for (const record of records) {
    try {
      const mapped = ncsAdapter.parse({
        ...record,
        observedAt,
        ingestedAt,
      } as never);
      const validation = validateJobIngestion(mapped);
      if (validation.status === "REJECTED") {
        rejected += 1;
      } else if (validation.status === "REVIEW") {
        review += 1;
      } else {
        valid += 1;
      }
      const skills = mapped.payload.sourceMetadata?.skills;
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

    const inputPath =
      mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE
        ? (args.input ?? defaultSyntheticPath())
        : args.input;
    if (!inputPath) {
      console.error("--input is required for AUTHORIZED_FILE mode");
      process.exitCode = 1;
      return;
    }

    const fixture = loadFixture(inputPath);
    if (
      mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE &&
      fixture.acquisition !== "synthetic-fixture"
    ) {
      console.error("Synthetic mode requires acquisition=synthetic-fixture");
      process.exitCode = 1;
      return;
    }
    if (!Array.isArray(fixture.records)) {
      console.error("Fixture must contain a records array");
      process.exitCode = 1;
      return;
    }

    const preview = await dryRunIngest(
      filterRecords(fixture.records.filter(isPlainObject), args),
      args.observedAt,
      args.ingestedAt,
    );
    console.log(
      JSON.stringify(
        {
          source: "sp.source.ncs",
          mode,
          state: args.state ?? null,
          district: args.district ?? null,
          durationMs: Date.now() - started,
          ...preview,
          note: "dry-run: no snapshot or canonical Job writes",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await runNcsAcquisition({
    mode,
    observedAt: args.observedAt,
    ingestedAt: args.ingestedAt,
    referenceTime: new Date(args.referenceTime),
    inputPath:
      mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE
        ? (args.input ?? defaultSyntheticPath())
        : args.input,
    state: args.state,
    district: args.district,
    city: args.city,
    limit: args.limit,
    expireMissing: args.expireMissing,
    processDownstream: true,
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
        realNcsDataIngested: false,
        note:
          mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE
            ? "SYNTHETIC_FIXTURE is not real NCS labour-market data"
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
