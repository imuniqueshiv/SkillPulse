import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  ACQUISITION_FAILURE,
  AcquisitionError,
  computeRecordContentHash,
  connectorForMode,
  isAuthorizedLiveScheduleMode,
  runNcsAcquisition,
  runScheduledNcsAcquisition,
} from "../src/modules/acquisition";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  NCS_ACCESS_MODE,
  NCS_SOURCE_CODE,
  resolveNcsAccessMode,
} from "../src/modules/ingestion/sources/ncs-access";

const OBSERVED_AT = "2026-09-08T10:00:00.000Z";
const INGESTED_AT = "2026-09-08T10:05:00.000Z";
const OBSERVED_LATER = "2026-09-09T10:00:00.000Z";
const INGESTED_LATER = "2026-09-09T10:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");
const stamp = Date.now();
const PREFIX = `NCS-ACQ-${stamp}-`;

const tempDirs: string[] = [];
const snapshotIds: string[] = [];
const createdJobIds: string[] = [];
const createdRawIds: string[] = [];

function ncsRecord(
  suffix: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    job_id: `${PREFIX}${suffix}`,
    title: "CNC Operator",
    description: "Operate CNC machines",
    employer_name: "Pune Precision Works",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    sector: "Manufacturing",
    required_skills: ["CNC"],
    posted_on: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function writeFixture(
  records: Record<string, unknown>[],
  extra: Record<string, unknown> = {},
): string {
  const dir = mkdtempSync(join(tmpdir(), "skillpulse-ncs-acq-"));
  tempDirs.push(dir);
  const path = join(dir, "batch.json");
  writeFileSync(
    path,
    JSON.stringify({
      sourceCode: NCS_SOURCE_CODE,
      acquisition: "synthetic-fixture",
      accessClass: "SYNTHETIC_FIXTURE",
      note: "SYNTHETIC — NOT REAL NCS DATA — acquisition-layer test fixture",
      records,
      ...extra,
    }),
    "utf8",
  );
  return path;
}

function track(result: {
  snapshotId: string;
  records: Array<{ jobId?: string | null; observationId?: string }>;
}) {
  snapshotIds.push(result.snapshotId);
  for (const row of result.records) {
    if (row.jobId) {
      createdJobIds.push(row.jobId);
    }
    if (row.observationId) {
      createdRawIds.push(row.observationId);
    }
  }
}

after(async () => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    const jobs = await prisma.job.findMany({
      where: {
        source: { code: NCS_SOURCE_CODE },
        externalId: { startsWith: PREFIX },
      },
      select: { id: true },
    });
    const jobIds = [...new Set([...createdJobIds, ...jobs.map((row) => row.id)])];
    if (jobIds.length > 0) {
      await prisma.jobQualityAssessment.deleteMany({
        where: { jobId: { in: jobIds } },
      });
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: jobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    }
    if (createdRawIds.length > 0) {
      await prisma.evidence.deleteMany({
        where: {
          reference: { in: createdRawIds.map((id) => `raw-ingestion:${id}`) },
        },
      });
      await prisma.rawIngestionRecord.deleteMany({
        where: { id: { in: createdRawIds } },
      });
    }
    if (snapshotIds.length > 0) {
      await prisma.ingestionSnapshot.deleteMany({
        where: { id: { in: snapshotIds } },
      });
    }
  }
  await disconnectPrisma();
});

test("content hash ignores observation clocks", () => {
  const a = ncsRecord("HASH", { observedAt: OBSERVED_AT, ingestedAt: INGESTED_AT });
  const b = ncsRecord("HASH", {
    observedAt: OBSERVED_LATER,
    ingestedAt: INGESTED_LATER,
  });
  assert.equal(computeRecordContentHash(a), computeRecordContentHash(b));
  assert.notEqual(
    computeRecordContentHash(ncsRecord("HASH", { title: "Welder" })),
    computeRecordContentHash(a),
  );
});

test("unauthorized live NCS execution is rejected before any connector runs", async () => {
  assert.throws(() => resolveNcsAccessMode({ mode: "live" }));
  assert.throws(() => resolveNcsAccessMode({ mode: "scrape" }));
  assert.throws(() => resolveNcsAccessMode({ liveEnabled: "true" }));
  assert.equal(isAuthorizedLiveScheduleMode(NCS_ACCESS_MODE.SYNTHETIC_FIXTURE), false);
  assert.equal(isAuthorizedLiveScheduleMode(NCS_ACCESS_MODE.DISABLED), false);
  assert.equal(isAuthorizedLiveScheduleMode(NCS_ACCESS_MODE.AUTHORIZED_API), true);
  assert.equal(isAuthorizedLiveScheduleMode(NCS_ACCESS_MODE.AUTHORIZED_FILE), true);

  await assert.rejects(
    () =>
      connectorForMode(NCS_ACCESS_MODE.AUTHORIZED_API, {
        baseUrl: "",
        token: "",
      }).acquire({
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      }),
    (error: unknown) =>
      error instanceof AcquisitionError &&
      error.code === ACQUISITION_FAILURE.ACCESS_DENIED,
  );
});

test("synthetic NCS acquisition persists snapshot checksum and skips unchanged jobs", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const path = writeFixture([ncsRecord("A"), ncsRecord("B")]);
  const first = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
    inputPath: path,
    expireMissing: false,
    processDownstream: false,
  });
  track(first);

  assert.equal(first.status, "COMPLETED");
  assert.equal(first.created, 2);
  assert.equal(first.skipped, 0);
  assert.equal(first.checksum.length, 64);
  assert.equal(first.accessMethod, "SYNTHETIC_FIXTURE");

  const prisma = getPrisma();
  const snapshot = await prisma.ingestionSnapshot.findUnique({
    where: { id: first.snapshotId },
  });
  assert.ok(snapshot);
  assert.equal(snapshot.checksum, first.checksum);
  assert.equal(snapshot.recordCount, 2);
  assert.equal(snapshot.accessMethod, "SYNTHETIC_FIXTURE");
  assert.ok(snapshot.sourceReference.includes("batch.json"));
  assert.ok(snapshot.retrievalTime);

  const second = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
    observedAt: OBSERVED_LATER,
    ingestedAt: INGESTED_LATER,
    referenceTime: REFERENCE,
    inputPath: path,
    expireMissing: false,
    processDownstream: false,
  });
  track(second);

  assert.equal(second.created, 0);
  assert.equal(second.changed, 0);
  assert.equal(second.skipped, 2);
  assert.equal(second.checksum, first.checksum);
  assert.equal(second.status, "COMPLETED");

  const jobA = await prisma.job.findFirst({
    where: { source: { code: NCS_SOURCE_CODE }, externalId: `${PREFIX}A` },
  });
  assert.ok(jobA);
  assert.equal(jobA.lifecycleStatus, "ACTIVE");
  assert.equal(jobA.lastObservedAt?.toISOString(), OBSERVED_LATER);
  assert.ok(jobA.contentHash);

  const rawCount = await prisma.rawIngestionRecord.count({
    where: { externalId: { in: [`${PREFIX}A`, `${PREFIX}B`] } },
  });
  assert.equal(rawCount, 2);
});

test("changed NCS records are reprocessed and historical jobs are retained", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const firstPath = writeFixture([
    ncsRecord("C", { title: "CNC Operator" }),
    ncsRecord("D", { title: "Quality Inspector" }),
  ]);
  const first = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.AUTHORIZED_FILE,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
    inputPath: firstPath,
    expireMissing: false,
    processDownstream: false,
  });
  track(first);
  assert.equal(first.created, 2);

  const changedPath = writeFixture(
    [ncsRecord("C", { title: "Senior CNC Operator" })],
    { acquisition: "authorized-file", accessClass: "AUTHORIZED_FILE" },
  );
  const second = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.AUTHORIZED_FILE,
    observedAt: OBSERVED_LATER,
    ingestedAt: INGESTED_LATER,
    referenceTime: REFERENCE,
    inputPath: changedPath,
    expireMissing: true,
    processDownstream: false,
  });
  track(second);

  assert.equal(second.created, 0);
  assert.equal(second.changed, 1);
  assert.equal(second.skipped, 0);
  assert.ok(second.expired >= 1);

  const jobC = await prisma.job.findFirst({
    where: { source: { code: NCS_SOURCE_CODE }, externalId: `${PREFIX}C` },
  });
  const jobD = await prisma.job.findFirst({
    where: { source: { code: NCS_SOURCE_CODE }, externalId: `${PREFIX}D` },
  });
  assert.ok(jobC);
  assert.ok(jobD);
  assert.equal(jobC.title, "Senior CNC Operator");
  assert.equal(jobC.lifecycleStatus, "ACTIVE");
  assert.equal(jobD.title, "Quality Inspector");
  assert.equal(jobD.lifecycleStatus, "EXPIRED");

  const rawForC = await prisma.rawIngestionRecord.count({
    where: { externalId: `${PREFIX}C` },
  });
  const rawForD = await prisma.rawIngestionRecord.count({
    where: { externalId: `${PREFIX}D` },
  });
  assert.equal(rawForC, 2);
  assert.equal(rawForD, 1);
});

test("failure states are persisted and unauthorized API execution does not invent data", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const denied = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.AUTHORIZED_API,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
    apiBaseUrl: "",
    apiToken: "",
    processDownstream: false,
  });
  snapshotIds.push(denied.snapshotId);
  assert.equal(denied.status, "ACCESS_DENIED");
  assert.equal(denied.failureCode, ACQUISITION_FAILURE.ACCESS_DENIED);
  assert.equal(denied.created, 0);

  const disabled = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.DISABLED,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
    processDownstream: false,
  });
  snapshotIds.push(disabled.snapshotId);
  assert.equal(disabled.status, "ACCESS_DENIED");

  const badDir = mkdtempSync(join(tmpdir(), "skillpulse-ncs-bad-"));
  tempDirs.push(badDir);
  const badPath = join(badDir, "invalid.json");
  writeFileSync(badPath, "{\"no_records\":true}", "utf8");
  const schema = await runNcsAcquisition({
    mode: NCS_ACCESS_MODE.AUTHORIZED_FILE,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
    inputPath: badPath,
    processDownstream: false,
  });
  snapshotIds.push(schema.snapshotId);
  assert.equal(schema.status, "SCHEMA_CHANGED");
  assert.equal(schema.failureCode, ACQUISITION_FAILURE.SCHEMA_CHANGED);

  const source = await prisma.dataSource.findUniqueOrThrow({
    where: { code: NCS_SOURCE_CODE },
    select: { id: true },
  });
  const scheduledAt = new Date("2026-09-08T11:11:11.000Z");
  const scheduled = await runScheduledNcsAcquisition({
    now: scheduledAt,
    mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
    sourceId: source.id,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
  });
  assert.equal(scheduled.ran, false);
  assert.equal(scheduled.reason, "LIVE_EXECUTION_NOT_AUTHORIZED");
  const schedulerSnap = await prisma.ingestionSnapshot.findFirst({
    where: {
      sourceId: source.id,
      checksum: "scheduler-rejected",
      retrievalTime: scheduledAt,
    },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(schedulerSnap);
  snapshotIds.push(schedulerSnap.id);
  assert.equal(schedulerSnap.status, "ACCESS_DENIED");
});

test("repeated synthetic acquisition is idempotent", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const path = writeFixture([ncsRecord("E")]);
  const runs = [];
  for (const observedAt of [OBSERVED_AT, OBSERVED_LATER, "2026-09-10T10:00:00.000Z"]) {
    const result = await runNcsAcquisition({
      mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
      observedAt,
      ingestedAt: INGESTED_AT,
      referenceTime: REFERENCE,
      inputPath: path,
      expireMissing: false,
      processDownstream: false,
    });
    track(result);
    runs.push(result);
  }

  assert.equal(runs[0]?.created, 1);
  assert.equal(runs[1]?.skipped, 1);
  assert.equal(runs[2]?.skipped, 1);
  assert.equal(runs[1]?.created, 0);
  assert.equal(runs[2]?.created, 0);
  assert.equal(runs[0]?.checksum, runs[1]?.checksum);
  assert.equal(runs[1]?.checksum, runs[2]?.checksum);

  const prisma = getPrisma();
  const jobs = await prisma.job.findMany({
    where: { source: { code: NCS_SOURCE_CODE }, externalId: `${PREFIX}E` },
  });
  assert.equal(jobs.length, 1);
  const raw = await prisma.rawIngestionRecord.count({
    where: { externalId: `${PREFIX}E` },
  });
  assert.equal(raw, 1);
});
