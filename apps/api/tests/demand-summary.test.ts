import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeDemand } from "../src/modules/demand";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";

const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];
const createdLocationIds: string[] = [];
const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-09-01T00:00:00.000Z");

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
    if (createdLocationIds.length > 0) {
      await prisma.location.deleteMany({
        where: { id: { in: createdLocationIds } },
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

test("demand summary: DB aggregation, geo filter, no source mutation, date filter", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-demand-${stamp}`,
      name: `[TEST] Demand ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const location = await prisma.location.create({
    data: {
      country: "IN",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    },
  });
  createdLocationIds.push(location.id);

  const python = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.python" },
  });
  const java = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.java" },
  });
  const javascript = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.javascript" },
  });
  const occupation = await prisma.occupation.findUniqueOrThrow({
    where: { code: "2512" },
  });
  const sector = occupation.sectorId
    ? await prisma.sector.findUniqueOrThrow({ where: { id: occupation.sectorId } })
    : await prisma.sector.findFirstOrThrow({
        where: { code: "sp.sector.it-ites" },
      });

  async function seedJob(input: {
    suffix: string;
    postedAt: string;
    eligibility: "INCLUDE" | "INCLUDE_WITH_CAUTION" | "EXCLUDE";
    locationId: string | null;
    skills: Array<{
      skillId: string;
      canonicalName: string;
      requirementLevel: "REQUIRED" | "PREFERRED" | "OPTIONAL" | "MENTIONED";
    }>;
    classified: boolean;
  }) {
    const job = await prisma.job.create({
      data: {
        title: input.classified ? "Software Developers" : "Mystery Role",
        description: "demand test",
        companyName: "Demand Co",
        sourceId: source.id,
        externalId: `demand-${stamp}-${input.suffix}`,
        postedAt: new Date(input.postedAt),
        locationId: input.locationId,
        occupationId: input.classified ? occupation.id : null,
        sectorId: input.classified ? sector.id : null,
        isDemo: true,
        skills: {
          create: input.skills.map((s) => ({ skillId: s.skillId })),
        },
      },
    });
    createdJobIds.push(job.id);

    const intel: JobIntelligenceResult = {
      jobId: job.id,
      processorVersion: "phase6-v1",
      text: { title: job.title, analysisText: job.title },
      skills: input.skills.map((s) => ({
        rawTerm: s.canonicalName,
        contributingTerms: [s.canonicalName],
        skillId: s.skillId,
        canonicalName: s.canonicalName,
        status: "RESOLVED" as const,
        extractionMethod: "EXPLICIT_SKILL_FIELD" as const,
        extractionMethods: ["EXPLICIT_SKILL_FIELD" as const],
        confidenceTier: "HIGH" as const,
        requirementLevel: s.requirementLevel,
        requirementMethod: "LOCAL_SIGNAL" as const,
        requirementConfidenceTier: "HIGH" as const,
      })),
      occupation: input.classified
        ? {
            status: "CLASSIFIED",
            occupationId: occupation.id,
            code: occupation.code,
            name: occupation.name,
            method: "TITLE_EXACT",
            confidenceTier: "HIGH",
            evidence: "title",
          }
        : {
            status: "UNCLASSIFIED",
            method: "UNCLASSIFIED",
          },
      sector: input.classified
        ? {
            status: "CLASSIFIED",
            sectorId: sector.id,
            code: sector.code,
            name: sector.name,
            method: "OCCUPATION_SECTOR",
            confidenceTier: "HIGH",
            evidence: "occ",
          }
        : {
            status: "UNCLASSIFIED",
            method: "UNCLASSIFIED",
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
    await prisma.jobQualityAssessment.create({
      data: {
        jobId: job.id,
        assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
        status: "PROCESSED",
        eligibility: input.eligibility,
        assessedAt: to,
        result: {
          jobId: job.id,
          assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
          eligibility: input.eligibility,
          fingerprint: `fp-${input.suffix}`,
        },
      },
    });
    return job;
  }

  const jobMh = await seedJob({
    suffix: "mh",
    postedAt: "2026-08-10T00:00:00.000Z",
    eligibility: "INCLUDE",
    locationId: location.id,
    classified: true,
    skills: [
      {
        skillId: python.id,
        canonicalName: python.canonicalName,
        requirementLevel: "REQUIRED",
      },
      {
        skillId: java.id,
        canonicalName: java.canonicalName,
        requirementLevel: "REQUIRED",
      },
    ],
  });
  await seedJob({
    suffix: "caution",
    postedAt: "2026-08-12T00:00:00.000Z",
    eligibility: "INCLUDE_WITH_CAUTION",
    locationId: location.id,
    classified: true,
    skills: [
      {
        skillId: python.id,
        canonicalName: python.canonicalName,
        requirementLevel: "PREFERRED",
      },
      {
        skillId: javascript.id,
        canonicalName: javascript.canonicalName,
        requirementLevel: "MENTIONED",
      },
    ],
  });
  await seedJob({
    suffix: "exclude",
    postedAt: "2026-08-13T00:00:00.000Z",
    eligibility: "EXCLUDE",
    locationId: location.id,
    classified: true,
    skills: [
      {
        skillId: python.id,
        canonicalName: python.canonicalName,
        requirementLevel: "REQUIRED",
      },
    ],
  });
  await seedJob({
    suffix: "unknown-geo",
    postedAt: "2026-08-14T00:00:00.000Z",
    eligibility: "INCLUDE",
    locationId: null,
    classified: false,
    skills: [
      {
        skillId: java.id,
        canonicalName: java.canonicalName,
        requirementLevel: "OPTIONAL",
      },
    ],
  });
  await seedJob({
    suffix: "out-of-window",
    postedAt: "2026-06-01T00:00:00.000Z",
    eligibility: "INCLUDE",
    locationId: location.id,
    classified: true,
    skills: [
      {
        skillId: python.id,
        canonicalName: python.canonicalName,
        requirementLevel: "REQUIRED",
      },
    ],
  });

  const beforeTitle = jobMh.title;
  const summary = await summarizeDemand({
    from,
    to,
    sourceId: source.id,
    geography: { state: "Maharashtra" },
    rankLimit: 20,
  });

  assert.equal(summary.demandVersion, "demand-v1");
  assert.ok(summary.qualityCoverage.included >= 1);
  assert.ok(summary.qualityCoverage.caution >= 1);
  assert.ok(summary.qualityCoverage.excluded >= 1);
  assert.ok(summary.skills.some((s) => s.skillId === python.id));
  assert.ok(summary.skills.some((s) => s.skillId === java.id));
  assert.ok(summary.skills.some((s) => s.skillId === javascript.id));
  assert.notEqual(
    summary.skills.find((s) => s.skillId === java.id)?.skillId,
    summary.skills.find((s) => s.skillId === javascript.id)?.skillId,
  );
  assert.ok(summary.occupations.some((o) => o.occupationId === occupation.id));
  assert.ok(summary.geography.every((g) => g.state === "Maharashtra" || !g.known));
  // state filter excludes unknown location jobs
  assert.ok(summary.geography.every((g) => g.known && g.state === "Maharashtra"));

  const unfiltered = await summarizeDemand({
    from,
    to,
    sourceId: source.id,
  });
  assert.ok(unfiltered.geography.some((g) => !g.known));

  const after = await prisma.job.findUniqueOrThrow({ where: { id: jobMh.id } });
  assert.equal(after.title, beforeTitle);
  assert.equal(
    await prisma.jobQualityAssessment.count({
      where: { jobId: { in: createdJobIds } },
    }),
    createdJobIds.length,
  );
});
