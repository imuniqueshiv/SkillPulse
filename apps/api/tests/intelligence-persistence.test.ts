import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  type JobIntelligenceResult,
} from "../src/modules/intelligence/contract";
import { persistJobIntelligence } from "../src/modules/intelligence/persistence";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";
import { AppError } from "../src/utils/errors";

const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

async function createJob() {
  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-persist-intel-${stamp}-${createdSourceIds.length}`,
      name: `[TEST] Persist intel ${stamp} ${createdSourceIds.length}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);
  const python = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.python" },
    select: { id: true, name: true },
  });
  const job = await prisma.job.create({
    data: {
      title: "Software Developer",
      description: "Python is required.",
      companyName: "Persist Co",
      sourceId: source.id,
      externalId: `persist-intel-${stamp}-${createdJobIds.length}`,
      isDemo: true,
      skills: { create: [{ skillId: python.id }] },
    },
    include: { skills: { include: { skill: true } } },
  });
  createdJobIds.push(job.id);
  return job;
}

function failedMarker(result: JobIntelligenceResult): JobIntelligenceResult {
  return {
    ...result,
    text: { ...result.text, analysisText: "FAILED_OVERWRITE_MARKER" },
  };
}

test("intelligence persistence is idempotent, versioned, and preserves PROCESSED on FAILED", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const job = await createJob();
  const originalTitle = job.title;
  const originalDescription = job.description;
  const originalOccupationId = job.occupationId;
  const originalSkillCount = job.skills.length;
  const originalSkillIds = job.skills.map((row) => row.skillId).sort();

  const first = await processJobIntelligence({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: job.skills.map((row) => ({ skillId: row.skill.id, name: row.skill.name })),
    },
    persist: true,
  });
  const second = await processJobIntelligence({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: job.skills.map((row) => ({ skillId: row.skill.id, name: row.skill.name })),
    },
    persist: true,
  });

  assert.equal(first.persistence?.created, true);
  assert.equal(first.persistence?.preserved, false);
  assert.equal(second.persistence?.created, false);
  assert.equal(second.persistence?.preserved, false);
  assert.deepEqual(first.intelligence, second.intelligence);
  assert.equal(
    await prisma.jobIntelligence.count({
      where: { jobId: job.id, processorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION },
    }),
    1,
  );

  const otherVersion = await persistJobIntelligence({
    ...first.intelligence,
    processorVersion: "phase6-test-other",
  });
  assert.equal(otherVersion.created, true);
  assert.equal(otherVersion.processorVersion, "phase6-test-other");
  assert.equal(await prisma.jobIntelligence.count({ where: { jobId: job.id } }), 2);
  assert.equal(
    await prisma.jobIntelligence.count({
      where: { jobId: job.id, processorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION },
    }),
    1,
  );

  const beforeFail = await prisma.jobIntelligence.findUniqueOrThrow({
    where: {
      jobId_processorVersion: {
        jobId: job.id,
        processorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION,
      },
    },
  });
  const failed = await persistJobIntelligence(
    failedMarker(first.intelligence),
    "FAILED",
  );
  assert.equal(failed.preserved, true);
  assert.equal(failed.status, "PROCESSED");
  assert.equal(failed.created, false);
  assert.notEqual(
    (failed.result as JobIntelligenceResult).text.analysisText,
    "FAILED_OVERWRITE_MARKER",
  );

  const afterFail = await prisma.jobIntelligence.findUniqueOrThrow({
    where: {
      jobId_processorVersion: {
        jobId: job.id,
        processorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION,
      },
    },
  });
  assert.equal(afterFail.status, "PROCESSED");
  assert.deepEqual(afterFail.result, beforeFail.result);
  assert.equal(afterFail.id, beforeFail.id);

  const reloaded = await prisma.job.findUniqueOrThrow({
    where: { id: job.id },
    include: { skills: true },
  });
  assert.equal(reloaded.title, originalTitle);
  assert.equal(reloaded.description, originalDescription);
  assert.equal(reloaded.occupationId, originalOccupationId);
  assert.equal(reloaded.skills.length, originalSkillCount);
  assert.deepEqual(reloaded.skills.map((row) => row.skillId).sort(), originalSkillIds);

  await assert.rejects(
    () => persistJobIntelligence({ ...first.intelligence, jobId: "missing-job" }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});
