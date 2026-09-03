import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import { ingestJobObservation } from "../src/modules/ingestion/job-ingestion-pipeline";
import { JOB_DEDUP_STATUS } from "../src/modules/ingestion/job-deduplication";
import { JOB_FRESHNESS_STATUS } from "../src/modules/ingestion/job-freshness";
import {
  JOB_VALIDATION_STATUS,
  validateJobIngestion,
} from "../src/modules/ingestion/job-validation";
import { persistCanonicalJob } from "../src/modules/ingestion/job-persistence";
import { AppError } from "../src/utils/errors";
import { fixtureJobAdapter } from "./fixtures/fixture-job-adapter";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");
const stamp = Date.now();
const createdSourceIds: string[] = [];
const createdJobIds: string[] = [];
const createdRawIds: string[] = [];
const createdEvidenceIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdEvidenceIds.length > 0) {
      await prisma.evidence.deleteMany({
        where: { id: { in: createdEvidenceIds } },
      });
    }
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

function envelope(payload: Record<string, unknown>) {
  return {
    kind: INGESTION_RECORD_KIND.JOB,
    contractVersion: INGESTION_CONTRACT_VERSION,
    adapterName: "skillpulse-test-fixture",
    adapterVersion: "0.0.1",
    payload,
  };
}

async function createSource(suffix: string) {
  const source = await getPrisma().dataSource.create({
    data: {
      code: `sp.source.test-pipe-${suffix}-${stamp}`,
      name: `[TEST] Pipeline ${suffix} ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);
  return source;
}

function track(result: { observationId: string; jobId: string | null; evidenceId: string | null }) {
  createdRawIds.push(result.observationId);
  if (result.jobId) {
    createdJobIds.push(result.jobId);
  }
  if (result.evidenceId) {
    createdEvidenceIds.push(result.evidenceId);
  }
  return result;
}

test("happy path, skills, stale persist, review, and retry reuse Job", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await createSource("happy");
  const rawBlob = { heading: "source payload", note: "must stay in raw only" };
  const record = envelope({
    sourceCode: source.code,
    externalId: `pipe-${stamp}-a`,
    title: "Machine Operator",
    description: "Canonical operator description",
    employerName: "Acme Tools",
    location: { raw: "Pune" },
    sourceUrl: "https://example.com/jobs/a",
    postedAt: "2020-01-01T00:00:00.000Z",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    sourceMetadata: { nested: rawBlob },
  });
  Object.freeze(record);
  Object.freeze(record.payload);

  const first = track(
    await ingestJobObservation({
      record,
      rawPayload: rawBlob,
      referenceTime: REFERENCE,
      skills: ["Python", "python", "React.js", "java scriptt"],
    }),
  );

  assert.equal(first.validationStatus, JOB_VALIDATION_STATUS.VALID);
  assert.equal(first.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(first.freshnessStatus, JOB_FRESHNESS_STATUS.STALE);
  assert.equal(first.jobCreated, true);
  assert.ok(first.jobId);
  assert.ok(first.evidenceId);
  assert.equal(first.evidenceCreated, true);
  assert.deepEqual(first.unresolvedTerms, ["java scriptt"]);
  assert.equal(first.resolvedSkillIds.length, 2);

  const raw = await prisma.rawIngestionRecord.findUniqueOrThrow({
    where: { id: first.observationId },
  });
  assert.deepEqual(raw.payload, rawBlob);
  assert.equal(raw.externalId, `pipe-${stamp}-a`);

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: first.jobId! },
    include: { skills: { include: { skill: true } } },
  });
  assert.equal(job.title, "Machine Operator");
  assert.equal(job.description, "Canonical operator description");
  assert.equal(job.locationId, null);
  assert.equal(job.skills.length, 2);
  assert.ok(job.skills.some((row) => row.skill.code === "sp.skill.python"));
  assert.ok(job.skills.some((row) => row.skill.code === "sp.skill.react"));
  assert.equal(JSON.stringify(job).includes("must stay in raw only"), false);

  const evidence = await prisma.evidence.findUniqueOrThrow({
    where: { id: first.evidenceId! },
  });
  assert.equal(evidence.reference, `raw-ingestion:${first.observationId}`);
  assert.equal(
    JSON.stringify(evidence.metadata).includes("must stay in raw only"),
    false,
  );

  const related = [
    {
      observationId: first.observationId,
      validation: validateJobIngestion(record),
      contentChecksum: raw.checksum,
    },
  ];

  const duplicate = track(
    await ingestJobObservation({
      record,
      rawPayload: rawBlob,
      referenceTime: REFERENCE,
      skills: ["Python", "React.js"],
      relatedObservations: related,
    }),
  );
  assert.equal(duplicate.dedupStatus, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(duplicate.jobId, first.jobId);
  assert.equal(duplicate.jobCreated, false);
  assert.notEqual(duplicate.observationId, first.observationId);
  assert.notEqual(duplicate.evidenceId, first.evidenceId);
  assert.equal(
    await prisma.job.count({
      where: { sourceId: source.id, externalId: `pipe-${stamp}-a` },
    }),
    1,
  );
  assert.equal(
    await prisma.jobSkill.count({ where: { jobId: first.jobId! } }),
    2,
  );

  const otherId = track(
    await ingestJobObservation({
      record: envelope({
        sourceCode: source.code,
        externalId: `pipe-${stamp}-b`,
        title: "Machine Operator",
        employerName: "Acme Tools",
        location: { raw: "Nagpur" },
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      }),
      referenceTime: REFERENCE,
      relatedObservations: related,
    }),
  );
  assert.equal(otherId.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.notEqual(otherId.jobId, first.jobId);

  const possibleRecord = envelope({
    sourceCode: source.code,
    title: "Machine Operator",
    employerName: "Acme Tools",
    location: { raw: "Nagpur" },
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  await assert.rejects(
    () =>
      ingestJobObservation({
        record: possibleRecord,
        referenceTime: REFERENCE,
        relatedObservations: related,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Canonical job identity requires externalId",
  );
  const possibleRaw = await prisma.rawIngestionRecord.findMany({
    where: { sourceId: source.id, externalId: null },
  });
  assert.equal(possibleRaw.length, 1);
  createdRawIds.push(possibleRaw[0]!.id);
  const possibleEvidence = await prisma.evidence.findMany({
    where: {
      sourceId: source.id,
      reference: `raw-ingestion:${possibleRaw[0]!.id}`,
    },
  });
  assert.equal(possibleEvidence.length, 1);
  createdEvidenceIds.push(possibleEvidence[0]!.id);
  assert.equal(
    await prisma.job.count({
      where: { sourceId: source.id, externalId: null },
    }),
    0,
  );

  const review = track(
    await ingestJobObservation({
      record: envelope({
        sourceCode: source.code,
        externalId: `pipe-${stamp}-review`,
        title: "N/A",
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      }),
      referenceTime: REFERENCE,
    }),
  );
  assert.equal(review.validationStatus, JOB_VALIDATION_STATUS.REVIEW);
  assert.equal(review.jobCreated, true);
  assert.ok(review.jobId);
});

test("REJECTED keeps raw storage and does not create Job, Evidence, or JobSkill", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await createSource("rej");
  const result = track(
    await ingestJobObservation({
      record: envelope({
        sourceCode: source.code,
        externalId: `pipe-${stamp}-rej`,
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      }),
      rawPayload: { title: "missing on contract" },
      referenceTime: REFERENCE,
      skills: ["Python"],
    }),
  );

  assert.equal(result.validationStatus, JOB_VALIDATION_STATUS.REJECTED);
  assert.equal(result.jobId, null);
  assert.equal(result.jobCreated, false);
  assert.equal(result.evidenceId, null);
  assert.equal(result.dedupStatus, null);
  assert.ok(
    await prisma.rawIngestionRecord.findUnique({
      where: { id: result.observationId },
    }),
  );
  assert.equal(await prisma.job.count({ where: { sourceId: source.id } }), 0);
  assert.equal(await prisma.evidence.count({ where: { sourceId: source.id } }), 0);
});

test("unknown source and persist failure do not leave orphan Jobs", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await createSource("err");

  await assert.rejects(
    () =>
      ingestJobObservation({
        record: envelope({
          sourceCode: "sp.source.does-not-exist",
          externalId: `pipe-${stamp}-unknown`,
          title: "Machine Operator",
          observedAt: OBSERVED_AT,
          ingestedAt: INGESTED_AT,
        }),
        referenceTime: REFERENCE,
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  assert.equal(await prisma.job.count({ where: { sourceId: source.id } }), 0);

  await assert.rejects(
    () =>
      ingestJobObservation({
        record: envelope({
          sourceId: source.id,
          sourceCode: "sp.source.demo-seed",
          externalId: `pipe-${stamp}-mismatch`,
          title: "Machine Operator",
          observedAt: OBSERVED_AT,
          ingestedAt: INGESTED_AT,
        }),
        referenceTime: REFERENCE,
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );

  const missingId = envelope({
    sourceCode: source.code,
    title: "Machine Operator",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  await assert.rejects(
    () =>
      ingestJobObservation({
        record: missingId,
        referenceTime: REFERENCE,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Canonical job identity requires externalId",
  );
  const strayRaw = await prisma.rawIngestionRecord.findMany({
    where: { sourceId: source.id, externalId: null },
  });
  assert.equal(strayRaw.length, 1);
  createdRawIds.push(strayRaw[0]!.id);
  const strayEvidence = await prisma.evidence.findMany({
    where: { sourceId: source.id },
  });
  assert.equal(strayEvidence.length, 1);
  createdEvidenceIds.push(strayEvidence[0]!.id);
  assert.equal(await prisma.job.count({ where: { sourceId: source.id } }), 0);

  const fakeExternalId = `pipe-${stamp}-fake-skill`;
  await assert.rejects(
    () =>
      persistCanonicalJob({
        observationId: strayRaw[0]!.id,
        validation: validateJobIngestion(
          envelope({
            sourceCode: source.code,
            externalId: fakeExternalId,
            title: "Machine Operator",
            observedAt: OBSERVED_AT,
            ingestedAt: INGESTED_AT,
          }),
        ),
        skills: {
          observationId: strayRaw[0]!.id,
          terms: [],
          resolvedSkills: [
            {
              skillId: "00000000-0000-4000-8000-000000000099",
              canonicalName: "missing",
              skillName: "Missing",
              skillCode: "sp.skill.missing",
              skillStatus: "ACTIVE",
              inputTerms: ["missing"],
              matchTypes: ["canonical"],
            },
          ],
          unresolvedTerms: [],
          dedupStatus: null,
          freshnessStatus: null,
        },
      }),
    (error: unknown) =>
      error instanceof AppError && error.message === "Resolved skill does not exist",
  );
  assert.equal(
    await prisma.job.count({
      where: { sourceId: source.id, externalId: fakeExternalId },
    }),
    0,
  );
});

test("adapter mapping and frozen input; same referenceTime stays deterministic", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const sourceRecord = {
    listingId: `pipe-fix-${stamp}`,
    jobTitle: "Machine Operator",
    summary: "Shop floor role",
    company: "Fixture Works",
    observedAt: "2026-09-14T12:00:00.000Z",
    ingestedAt: "2026-09-14T12:05:00.000Z",
    listedAt: "2026-09-14T00:00:00.000Z",
  };
  Object.freeze(sourceRecord);

  const first = track(
    await ingestJobObservation({
      adapter: {
        parse(record: unknown) {
          return fixtureJobAdapter.parse(record as typeof sourceRecord);
        },
      },
      sourceRecord,
      referenceTime: REFERENCE,
      skills: ["SQL"],
    }),
  );
  assert.equal(first.validationStatus, JOB_VALIDATION_STATUS.VALID);
  assert.equal(first.freshnessStatus, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(sourceRecord.jobTitle, "Machine Operator");

  const second = track(
    await ingestJobObservation({
      adapter: {
        parse(record: unknown) {
          return fixtureJobAdapter.parse(record as typeof sourceRecord);
        },
      },
      sourceRecord,
      referenceTime: REFERENCE,
      skills: ["SQL"],
    }),
  );
  assert.equal(second.jobId, first.jobId);
  assert.equal(second.jobCreated, false);
  assert.equal(second.validationStatus, first.validationStatus);
  assert.equal(second.freshnessStatus, first.freshnessStatus);
  assert.deepEqual(second.resolvedSkillIds, first.resolvedSkillIds);
});
