import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { mahaswayamRojgarAdapter } from "../src/modules/ingestion/sources/mahaswayam-rojgar";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";
import { assessJobQuality } from "../src/modules/quality/pipeline";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";

const OBSERVED_AT = "2026-08-20T10:00:00.000Z";
const INGESTED_AT = "2026-08-20T10:05:00.000Z";
const REFERENCE = new Date("2026-09-01T00:00:00.000Z");
const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];

const qualityDir = resolve(__dirname, "../src/modules/quality");
const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/mahaswayam-rojgar.sample.json",
);

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

test("quality modules stay state-agnostic and Maharashtra fixture is synthetic", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition?: string;
    note?: string;
  };
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);

  for (const file of readdirSync(qualityDir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(resolve(qualityDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("Maharashtra synthetic jobs flow through Phase 6 then Phase 7", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    records: Record<string, unknown>[];
  };
  const developer = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1003");
  assert.ok(developer);

  const mapped = mahaswayamRojgarAdapter.parse({
    ...developer,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-mh-quality-${stamp}`,
      name: `[TEST] MH quality ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const react = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.react" },
    select: { id: true },
  });
  const job = await prisma.job.create({
    data: {
      title: mapped.payload.title,
      description: mapped.payload.description ?? null,
      companyName: mapped.payload.employerName ?? null,
      sourceId: source.id,
      externalId: `MH-Q-${stamp}-1003`,
      postedAt: mapped.payload.postedAt ?? new Date("2026-09-01T00:00:00.000Z"),
      isDemo: true,
      skills: { create: [{ skillId: react.id }] },
    },
  });
  createdJobIds.push(job.id);

  await processJobIntelligence({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: [{ skillId: react.id, name: "React" }],
    },
    explicitSkills: ["React.js", "java scriptt"],
    persist: true,
  });

  const first = await assessJobQuality({
    jobId: job.id,
    referenceTime: REFERENCE,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: INGESTED_AT,
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });
  const second = await assessJobQuality({
    jobId: job.id,
    referenceTime: REFERENCE,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: INGESTED_AT,
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });

  assert.deepEqual(first.assessment, second.assessment);
  assert.equal(first.persistence?.created, true);
  assert.equal(second.persistence?.created, false);
  assert.equal(first.assessment.assessmentVersion, JOB_QUALITY_ASSESSMENT_VERSION);
  assert.ok(
    ["INCLUDE", "INCLUDE_WITH_CAUTION", "EXCLUDE"].includes(first.assessment.eligibility),
  );
  assert.equal(first.assessment.sourceTrust.trustLevel, "STANDARD");
  assert.ok(first.assessment.intelligenceConfidence.available);
  assert.equal(first.assessment.duplication.status, "UNIQUE");
  if (first.assessment.eligibility !== "INCLUDE") {
    assert.ok(first.assessment.reasons.length > 0);
  }
  assert.equal(JSON.stringify(first.assessment).includes('"payload"'), false);
});
