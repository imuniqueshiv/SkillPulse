import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  computeRawPayloadChecksum,
  storeRawObservation,
} from "../src/modules/ingestion/raw-storage";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-02T10:00:00.000Z";
const stamp = Date.now();
const createdSourceIds: string[] = [];
const createdRawIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdRawIds.length > 0) {
      await prisma.rawIngestionRecord.deleteMany({
        where: { id: { in: createdRawIds } },
      });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

async function createTestSource() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const source = await getPrisma().dataSource.create({
    data: {
      code: `sp.source.test-raw-${stamp}-${createdSourceIds.length}`,
      name: `[TEST] Raw ingestion ${stamp}-${createdSourceIds.length}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      active: true,
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);
  return source;
}

async function trackStore(input: unknown) {
  const { record } = await storeRawObservation(input);
  createdRawIds.push(record.id);
  return record;
}

test("raw observation storage, provenance, checksum and no Job writes", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await createTestSource();
  const jobsBefore = await prisma.job.count();
  const payload = {
    heading: "Machine Operator",
    skills: "React.js / React JS",
    nested: { note: "keep as-is" },
  };

  const beforeReceived = Date.now();
  const record = await trackStore({
    sourceCode: source.code,
    externalId: "fix-obs-1",
    payload,
    observedAt: OBSERVED_AT,
    adapterName: "skillpulse-test-fixture",
    adapterVersion: "0.0.1",
  });

  assert.equal(record.sourceId, source.id);
  assert.equal(record.source.code, source.code);
  assert.equal(record.externalId, "fix-obs-1");
  assert.deepEqual(record.payload, payload);
  assert.equal(
    (record.payload as { skills: string }).skills,
    "React.js / React JS",
  );
  assert.equal(record.observedAt.toISOString(), OBSERVED_AT);
  assert.ok(record.receivedAt.getTime() >= beforeReceived - 1000);
  assert.notEqual(record.receivedAt.toISOString(), OBSERVED_AT);
  assert.equal(record.status, "RECEIVED");
  assert.equal(record.adapterName, "skillpulse-test-fixture");
  assert.equal(record.adapterVersion, "0.0.1");
  assert.equal(record.kind, "JOB");
  assert.equal(record.payloadFormat, "JSON");
  assert.equal(
    record.checksum,
    computeRawPayloadChecksum({ payload }),
  );

  const sameChecksum = computeRawPayloadChecksum({ payload });
  const reorderedChecksum = computeRawPayloadChecksum({
    payload: {
      nested: { note: "keep as-is" },
      skills: "React.js / React JS",
      heading: "Machine Operator",
    },
  });
  const differentChecksum = computeRawPayloadChecksum({
    payload: { ...payload, heading: "Welder" },
  });
  assert.equal(record.checksum, sameChecksum);
  assert.equal(record.checksum, reorderedChecksum);
  assert.notEqual(record.checksum, differentChecksum);

  const repeat = await trackStore({
    sourceId: source.id,
    payload,
    observedAt: "2026-09-02T11:00:00.000Z",
  });
  assert.notEqual(repeat.id, record.id);
  assert.equal(repeat.checksum, record.checksum);
  assert.equal(repeat.externalId, null);
  assert.equal(repeat.status, "RECEIVED");

  const jobsAfter = await prisma.job.count();
  assert.equal(jobsAfter, jobsBefore);

  await assert.rejects(
    () =>
      storeRawObservation({
        sourceCode: "sp.source.does-not-exist",
        payload: { title: "X" },
        observedAt: OBSERVED_AT,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.message === "Data source not found",
  );

  await assert.rejects(
    () =>
      storeRawObservation({
        payload: { title: "X" },
        observedAt: OBSERVED_AT,
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test("raw payloadRef storage hashes the reference, not a job identity", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const source = await createTestSource();
  const record = await trackStore({
    sourceCode: source.code,
    payloadRef: "memory:fixture:raw-1",
    observedAt: OBSERVED_AT,
  });

  assert.equal(record.payload, null);
  assert.equal(record.payloadFormat, "EXTERNAL_REF");
  assert.equal(record.payloadRef, "memory:fixture:raw-1");
  assert.equal(
    record.checksum,
    computeRawPayloadChecksum({ payloadRef: "memory:fixture:raw-1" }),
  );
});
