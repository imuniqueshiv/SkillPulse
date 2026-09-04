import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";
import { persistJobQualityAssessment } from "../src/modules/quality/persistence";
import { reassessJobQuality } from "../src/modules/quality/reassess";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";

const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];
const referenceFresh = new Date("2026-09-01T00:00:00.000Z");
const referenceStale = new Date("2026-12-01T00:00:00.000Z");

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

test("reassessment: created → unchanged → changed with history; FAILED preserves success", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-reassess-${stamp}`,
      name: `[TEST] Reassess ${stamp}`,
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
      companyName: "Reassess Co",
      sourceId: source.id,
      externalId: `reassess-${stamp}`,
      postedAt: new Date("2026-08-20T00:00:00.000Z"),
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

  const provenance = {
    observedAt: new Date("2026-08-20T00:00:00.000Z"),
    ingestedAt: "2026-08-20T01:00:00.000Z",
    validationStatus: "VALID" as const,
    dedupStatus: "UNIQUE" as const,
    evidenceId: `ev-${stamp}`,
    observationId: `obs-${stamp}`,
  };

  const created = await reassessJobQuality({
    jobId: job.id,
    referenceTime: referenceFresh,
    persist: true,
    provenanceOverride: provenance,
  });
  assert.equal(created.outcome, "created");
  assert.equal(created.persistence?.created, true);
  assert.ok(created.assessment.fingerprint);

  const unchanged = await reassessJobQuality({
    jobId: job.id,
    referenceTime: referenceFresh,
    persist: true,
    provenanceOverride: provenance,
  });
  assert.equal(unchanged.outcome, "unchanged");
  assert.equal(unchanged.persistence?.unchanged, true);
  assert.equal(unchanged.changeDetection?.changed, false);
  assert.equal(
    await prisma.jobQualityAssessment.count({
      where: { jobId: job.id, assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION },
    }),
    1,
  );

  await prisma.job.update({
    where: { id: job.id },
    data: { postedAt: new Date("2026-06-01T00:00:00.000Z") },
  });

  const changed = await reassessJobQuality({
    jobId: job.id,
    referenceTime: referenceStale,
    persist: true,
    provenanceOverride: {
      ...provenance,
      observedAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  assert.equal(changed.outcome, "changed");
  assert.equal(changed.changeDetection?.changed, true);
  assert.ok(changed.changeDetection?.changedComponents.includes("freshness"));
  assert.ok(changed.assessment.previousAssessment);
  assert.equal(
    changed.assessment.previousAssessment?.fingerprint,
    created.assessment.fingerprint,
  );
  assert.equal(changed.assessment.eligibility, "EXCLUDE");

  const beforeFail = await prisma.jobQualityAssessment.findUniqueOrThrow({
    where: {
      jobId_assessmentVersion: {
        jobId: job.id,
        assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
      },
    },
  });
  const failed = await persistJobQualityAssessment(
    {
      ...changed.assessment,
      fingerprint: "deadbeef",
      eligibility: "INCLUDE",
    },
    "FAILED",
  );
  assert.equal(failed.preserved, true);
  assert.equal(failed.status, "PROCESSED");
  assert.equal(failed.result.fingerprint, beforeFail.result && (beforeFail.result as { fingerprint: string }).fingerprint);

  const v2 = await reassessJobQuality({
    jobId: job.id,
    referenceTime: referenceStale,
    persist: true,
    assessmentVersion: "quality-v2",
    provenanceOverride: {
      ...provenance,
      observedAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  assert.equal(v2.outcome, "created");
  assert.equal(v2.assessment.assessmentVersion, "quality-v2");
  assert.equal(await prisma.jobQualityAssessment.count({ where: { jobId: job.id } }), 2);
});
