import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  MAX_QUALITY_BULK_LIMIT,
  assessJobsQuality,
} from "../src/modules/quality/bulk";
import { summarizeQualityAssessments } from "../src/modules/quality/summary";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";
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

test("bulk assessment bounds, partial failure, idempotency; summary counts without double-count", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-bulk-q-${stamp}`,
      name: `[TEST] Bulk quality ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const python = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.python" },
    select: { id: true },
  });

  async function createJob(suffix: string, postedAt: string) {
    const job = await prisma.job.create({
      data: {
        title: "Software Developers",
        description: "Python is required",
        companyName: "Bulk Co",
        sourceId: source.id,
        externalId: `bulk-q-${stamp}-${suffix}`,
        postedAt: new Date(postedAt),
        isDemo: true,
        skills: { create: [{ skillId: python.id }] },
      },
    });
    createdJobIds.push(job.id);
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
    return job.id;
  }

  const jobA = await createJob("a", "2026-08-20T00:00:00.000Z");
  const jobB = await createJob("b", "2026-08-20T00:00:00.000Z");
  const missing = "missing-job-id-bulk";

  const unordered = [jobB, missing, jobA, jobA];
  const first = await assessJobsQuality({
    jobIds: unordered,
    referenceTime,
    persist: true,
    limit: MAX_QUALITY_BULK_LIMIT,
  });

  assert.equal(first.processed, 3);
  assert.equal(first.succeeded, 2);
  assert.equal(first.failed, 1);
  assert.equal(first.created, 2);
  assert.deepEqual(
    first.results.map((row) => row.jobId),
    [jobA, jobB, missing].sort((a, b) => a.localeCompare(b)),
  );
  assert.ok(first.results.some((row) => row.status === "FAILED" && row.jobId === missing));

  const second = await assessJobsQuality({
    jobIds: [jobA, jobB],
    referenceTime,
    persist: true,
  });
  assert.equal(second.succeeded, 2);
  assert.equal(second.unchanged, 2);
  assert.equal(second.created, 0);

  const oversize = await assessJobsQuality({
    jobIds: Array.from({ length: 150 }, (_, index) => `id-${index}`),
    referenceTime,
    persist: false,
    limit: 1000,
  });
  assert.equal(oversize.limit, MAX_QUALITY_BULK_LIMIT);
  assert.equal(oversize.processed, MAX_QUALITY_BULK_LIMIT);

  const summary = await summarizeQualityAssessments({
    assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
    sourceId: source.id,
  });
  assert.equal(summary.total, 2);
  assert.equal(
    summary.eligibility.INCLUDE +
      summary.eligibility.INCLUDE_WITH_CAUTION +
      summary.eligibility.EXCLUDE,
    2,
  );
  assert.ok(summary.notes.some((note) => /previousAssessment/i.test(note)));

  const jobAOk = second.results.find(
    (row) => row.status === "OK" && row.jobId === jobA,
  );
  assert.ok(jobAOk && jobAOk.status === "OK");
  await prisma.jobQualityAssessment.create({
    data: {
      jobId: jobA,
      assessmentVersion: "quality-v2",
      status: "PROCESSED",
      eligibility: "EXCLUDE",
      assessedAt: referenceTime,
      result: {
        ...jobAOk.result.assessment,
        assessmentVersion: "quality-v2",
        eligibility: "EXCLUDE",
        fingerprint: "v2-synthetic",
        previousAssessment: undefined,
      },
    },
  });

  const filtered = await summarizeQualityAssessments({
    assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
    sourceId: source.id,
  });
  assert.equal(filtered.total, 2);

  const v2Only = await summarizeQualityAssessments({
    assessmentVersion: "quality-v2",
    sourceId: source.id,
  });
  assert.equal(v2Only.total, 1);
  assert.equal(v2Only.eligibility.EXCLUDE, 1);

  const scoped = await summarizeQualityAssessments({
    assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
    geographicScope: "STATE",
  });
  assert.ok(scoped.total >= 2);
});
