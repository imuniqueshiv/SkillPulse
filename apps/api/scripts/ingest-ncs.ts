/**
 * Phase 17 — NCS-shaped job ingestion CLI.
 *
 * Usage (from repo root or apps/api):
 *   npx tsx apps/api/scripts/ingest-ncs.ts --mode synthetic --dry-run
 *   npx tsx apps/api/scripts/ingest-ncs.ts --mode file --input path/to/file.json
 *   npx tsx apps/api/scripts/ingest-ncs.ts --mode synthetic --state Maharashtra
 *
 * Modes:
 *   disabled   — refuse (ACCESS_NOT_CONFIGURED)
 *   synthetic  — SYNTHETIC_FIXTURE (default sample under data/sample/ingestion/)
 *   file       — AUTHORIZED_FILE (operator-supplied NCS-shaped JSON)
 *   live       — refused (no authorized live client)
 *
 * Does not print secrets. Dry-run does not write canonical Jobs.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { disconnectPrisma } from "../src/config/database";
import { ingestSourceDataset } from "../src/modules/ingestion/ingest-dataset";
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
  dryRun: boolean;
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
    mode: "disabled",
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
    } else if (flag === "--dry-run") {
      args.dryRun = true;
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
        "Usage: ingest-ncs.ts --mode synthetic|file|disabled [--input file] [--state Name] [--dry-run]",
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

function filterByState(
  records: Record<string, unknown>[],
  state?: string,
): Record<string, unknown>[] {
  if (!state || state.trim() === "") {
    return records;
  }
  const needle = state.trim().toLowerCase();
  return records.filter((row) => {
    const value = row.state;
    return typeof value === "string" && value.trim().toLowerCase() === needle;
  });
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
        phase: 17,
        access,
        dryRun: args.dryRun,
        stateFilter: args.state ?? null,
      },
      null,
      2,
    ),
  );

  if (mode === NCS_ACCESS_MODE.DISABLED) {
    console.error("ACCESS_NOT_CONFIGURED: pass --mode synthetic or --mode file");
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
  if (mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE) {
    if (fixture.acquisition !== "synthetic-fixture") {
      console.error("Synthetic mode requires acquisition=synthetic-fixture");
      process.exitCode = 1;
      return;
    }
  }

  if (!Array.isArray(fixture.records)) {
    console.error("Fixture must contain a records array");
    process.exitCode = 1;
    return;
  }

  const plainRecords = fixture.records.filter(isPlainObject);
  const records = filterByState(plainRecords, args.state);

  if (args.dryRun) {
    const preview = await dryRunIngest(
      records,
      args.observedAt,
      args.ingestedAt,
    );
    console.log(
      JSON.stringify(
        {
          mode,
          inputPath,
          acquisition: fixture.acquisition ?? null,
          accessClass: fixture.accessClass ?? null,
          durationMs: Date.now() - started,
          ...preview,
          note: "dry-run: no canonical Job writes",
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await ingestSourceDataset({
    adapter: ncsAdapter,
    records,
    observedAt: args.observedAt,
    ingestedAt: args.ingestedAt,
    referenceTime: new Date(args.referenceTime),
  });

  console.log(
    JSON.stringify(
      {
        mode,
        inputPath,
        acquisition: fixture.acquisition ?? null,
        accessClass: fixture.accessClass ?? null,
        durationMs: Date.now() - started,
        sourceCode: result.sourceCode,
        geographicScope: result.geographicScope,
        total: result.total,
        accepted: result.accepted,
        rejected: result.rejected,
        failed: result.failed,
        jobsCreated: result.jobsCreated,
        jobsReused: result.jobsReused,
        unresolvedSkillTerms: result.unresolvedSkillTerms,
        realNcsDataIngested: false,
      },
      null,
      2,
    ),
  );

  if (result.failed > 0 && result.accepted === 0 && result.rejected === 0) {
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
