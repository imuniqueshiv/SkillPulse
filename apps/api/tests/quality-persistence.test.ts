import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { buildJobQualityAssessment } from "../src/modules/quality/assessment";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";
import { persistJobQualityAssessment } from "../src/modules/quality/persistence";
import { assessJobQuality } from "../src/modules/quality/pipeline";
import { AppError } from "../src/utils/errors";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";

const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];
const referenceTime = new Date("2026-09-01T00:00:00.000Z");

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobQualityAssessment.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
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

test("quality persistence is idempotent, versioned, preserves PROCESSED, and does not mutate Job", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-quality-${stamp}`,
      name: `[TEST] Quality ${stamp}`,
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
    select: { id: true },
  });
  const job = await prisma.job.create({
    data: {
      title: "Software Developers",
      description: "Python is required",
      companyName: "Quality Co",
      sourceId: source.id,
      externalId: `quality-${stamp}`,
      postedAt: new Date("2026-08-20T00:00:00.000Z"),
      isDemo: true,
      skills: { create: [{ skillId: python.id }] },
    },
    include: { skills: true },
  });
  createdJobIds.push(job.id);

  const originalTitle = job.title;
  const originalSkillIds = job.skills.map((row) => row.skillId).sort();

  const intel: JobIntelligenceResult = {
    jobId: job.id,
    processorVersion: "phase6-v1",
    text: { title: job.title, analysisText: job.title },
    skills: [
      {
        rawTerm: "Python",
        contributingTerms: ["Python"],
        canonicalName: "python",
        skillId: python.id,
        status: "RESOLVED",
        extractionMethod: "EXPLICIT_SKILL_FIELD",
        extractionMethods: ["EXPLICIT_SKILL_FIELD"],
        confidenceTier: "HIGH",
        requirementLevel: "REQUIRED",
        requirementMethod: "LOCAL_SIGNAL",
        requirementConfidenceTier: "HIGH",
      },
    ],
    occupation: {
      status: "CLASSIFIED",
      code: "2512",
      method: "TITLE_EXACT",
      confidenceTier: "HIGH",
      evidence: "exact",
    },
    sector: {
      status: "CLASSIFIED",
      code: "sp.sector.it-ites",
      method: "OCCUPATION_SECTOR",
      confidenceTier: "HIGH",
      evidence: "occ",
    },
    experience: {
      status: "UNKNOWN",
      rawText: null,
      extractionMethod: "UNAVAILABLE",
      confidenceTier: "LOW",
    },
    qualifications: [
      {
        rawText: "",
        status: "UNKNOWN",
        extractionMethod: "UNAVAILABLE",
        confidenceTier: "LOW",
      },
    ],
  };
  await prisma.jobIntelligence.create({
    data: {
      jobId: job.id,
      processorVersion: "phase6-v1",
      status: "PROCESSED",
      result: intel as object,
    },
  });

  const first = await assessJobQuality({
    jobId: job.id,
    referenceTime,
    persist: true,
    provenanceOverride: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });
  const second = await assessJobQuality({
    jobId: job.id,
    referenceTime,
    persist: true,
    provenanceOverride: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });

  assert.equal(first.persistence?.created, true);
  assert.equal(second.persistence?.created, false);
  assert.deepEqual(first.assessment, second.assessment);
  assert.equal(
    await prisma.jobQualityAssessment.count({
      where: { jobId: job.id, assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION },
    }),
    1,
  );

  const other = await persistJobQualityAssessment({
    ...first.assessment,
    assessmentVersion: "quality-test-other",
  });
  assert.equal(other.created, true);
  assert.equal(await prisma.jobQualityAssessment.count({ where: { jobId: job.id } }), 2);

  const failed = await persistJobQualityAssessment(
    {
      ...first.assessment,
      reasons: [{ code: "INVALID_RECORD", message: "should not overwrite" }],
    },
    "FAILED",
  );
  assert.equal(failed.preserved, true);
  assert.equal(failed.status, "PROCESSED");
  assert.deepEqual(failed.result.reasons, first.assessment.reasons);

  const reloaded = await prisma.job.findUniqueOrThrow({
    where: { id: job.id },
    include: { skills: true, intelligenceRecords: true },
  });
  assert.equal(reloaded.title, originalTitle);
  assert.deepEqual(reloaded.skills.map((row) => row.skillId).sort(), originalSkillIds);
  assert.equal(reloaded.intelligenceRecords.length, 1);
  assert.equal(
    (reloaded.intelligenceRecords[0]?.result as JobIntelligenceResult).processorVersion,
    "phase6-v1",
  );

  await assert.rejects(
    () =>
      persistJobQualityAssessment({
        ...first.assessment,
        jobId: "missing-job",
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );

  const built = buildJobQualityAssessment({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      companyName: job.companyName,
      sourceId: job.sourceId,
      externalId: job.externalId,
      locationId: job.locationId,
      postedAt: job.postedAt,
      expiresAt: job.expiresAt,
      sourceUrl: job.sourceUrl,
      skillCount: 1,
    },
    source: {
      id: source.id,
      code: source.code,
      name: source.name,
      active: true,
      reliability: null,
      type: "OTHER",
      geographicScope: "INDIA",
    },
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: intel,
    referenceTime,
  });
  assert.equal(JSON.stringify(built).includes('"payload"'), false);
});
