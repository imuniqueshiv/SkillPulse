import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeDemand } from "../src/modules/demand";
import {
  getJobSourceAdapter,
  resetJobSourceAdapters,
} from "../src/modules/ingestion/adapter";
import {
  ingestSourceDataset,
  registerBuiltinJobSourceAdapters,
} from "../src/modules/ingestion/ingest-dataset";
import {
  NCS_SOURCE_CODE,
} from "../src/modules/ingestion/sources/ncs-access";
import {
  NCS_ADAPTER_NAME,
  ncsAdapter,
} from "../src/modules/ingestion/sources/ncs";
import { processJobIntelligenceById } from "../src/modules/intelligence/pipeline";
import { assessJobQuality } from "../src/modules/quality/pipeline";

const OBSERVED_AT = "2026-09-08T10:00:00.000Z";
const INGESTED_AT = "2026-09-08T10:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");
const stamp = Date.now();

const createdJobIds: string[] = [];
const createdRawIds: string[] = [];
const createdEvidenceIds: string[] = [];

const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/ncs-maharashtra.sample.json",
);
const ingestionDir = resolve(__dirname, "../src/modules/ingestion");

after(async () => {
  resetJobSourceAdapters();
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    const ncsJobs = await prisma.job.findMany({
      where: {
        source: { code: NCS_SOURCE_CODE },
        externalId: { startsWith: "NCS-MH-" },
      },
      select: { id: true },
    });
    const jobIds = [
      ...new Set([...createdJobIds, ...ncsJobs.map((row) => row.id)]),
    ];
    if (jobIds.length > 0) {
      await prisma.jobQualityAssessment.deleteMany({
        where: { jobId: { in: jobIds } },
      });
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: jobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    }
    if (createdEvidenceIds.length > 0 || createdRawIds.length > 0) {
      await prisma.evidence.deleteMany({
        where: {
          OR: [
            { id: { in: createdEvidenceIds } },
            {
              reference: {
                in: createdRawIds.map((id) => `raw-ingestion:${id}`),
              },
            },
          ],
        },
      });
    }
    if (createdRawIds.length > 0) {
      await prisma.rawIngestionRecord.deleteMany({
        where: { id: { in: createdRawIds } },
      });
    }
  }
  await disconnectPrisma();
});

test("NCS adapter is builtin and core ingestion modules stay state-agnostic", () => {
  resetJobSourceAdapters();
  registerBuiltinJobSourceAdapters();
  const adapter = getJobSourceAdapter(NCS_SOURCE_CODE);
  assert.equal(adapter.name, NCS_ADAPTER_NAME);
  assert.equal(adapter.sourceCode, NCS_SOURCE_CODE);

  for (const file of readdirSync(ingestionDir).filter((name) => name.endsWith(".ts"))) {
    if (file === "ingest-dataset.ts") {
      continue;
    }
    const source = readFileSync(resolve(ingestionDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("NCS synthetic fixture ingests through Phase 5 with provenance and idempotency", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition: string;
    records: Record<string, unknown>[];
  };
  assert.equal(sample.acquisition, "synthetic-fixture");

  // Reset prior NCS-MH rows so jobsCreated counts are meaningful on shared Neon.
  const prior = await prisma.job.findMany({
    where: {
      source: { code: NCS_SOURCE_CODE },
      externalId: { startsWith: "NCS-MH-" },
    },
    select: { id: true },
  });
  if (prior.length > 0) {
    await prisma.jobQualityAssessment.deleteMany({
      where: { jobId: { in: prior.map((row) => row.id) } },
    });
    await prisma.jobIntelligence.deleteMany({
      where: { jobId: { in: prior.map((row) => row.id) } },
    });
    await prisma.job.deleteMany({
      where: { id: { in: prior.map((row) => row.id) } },
    });
  }

  const mhRecords = sample.records.filter(
    (row) => row.state === "Maharashtra" || !row.state,
  );

  const first = await ingestSourceDataset({
    adapter: ncsAdapter,
    records: mhRecords,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
  });

  for (const outcome of first.outcomes) {
    if (outcome.observationId) {
      createdRawIds.push(outcome.observationId);
    }
    if (outcome.jobId) {
      createdJobIds.push(outcome.jobId);
    }
  }

  assert.equal(first.sourceCode, NCS_SOURCE_CODE);
  assert.ok(first.accepted >= 8);
  assert.ok(first.rejected + first.failed >= 1);
  assert.ok(first.jobsCreated >= 8);
  assert.ok(first.unresolvedSkillTerms.includes("java scriptt"));

  const developer = await prisma.job.findFirst({
    where: { source: { code: NCS_SOURCE_CODE }, externalId: "NCS-MH-1001" },
    include: { skills: { include: { skill: true } }, source: true },
  });
  assert.ok(developer);
  assert.equal(developer.title, "Software Developer");
  assert.equal(developer.postedAt?.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(developer.source?.code, NCS_SOURCE_CODE);
  assert.ok(developer.skills.some((row) => row.skill.code === "sp.skill.react"));
  assert.ok(developer.skills.some((row) => row.skill.code === "sp.skill.sql"));

  const rawId = first.outcomes.find(
    (row) => row.jobId === developer.id && row.status === "ACCEPTED",
  )?.observationId;
  assert.ok(rawId);
  const evidence = await prisma.evidence.findFirst({
    where: { reference: `raw-ingestion:${rawId}` },
    include: { source: true },
  });
  assert.ok(evidence);
  createdEvidenceIds.push(evidence.id);
  assert.equal(evidence.source.code, NCS_SOURCE_CODE);

  const second = await ingestSourceDataset({
    adapter: ncsAdapter,
    records: [
      mhRecords.find((row) => row.job_id === "NCS-MH-1001")!,
    ],
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
  });
  for (const outcome of second.outcomes) {
    if (outcome.observationId) {
      createdRawIds.push(outcome.observationId);
    }
  }
  assert.equal(second.accepted, 1);
  assert.equal(second.jobsCreated, 0);
  assert.equal(second.jobsReused, 1);
  assert.equal(second.outcomes[0]?.jobId, developer.id);
});

test("NCS-shaped job flows Phase 5 → 6 → 7 → 8 demand", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition: string;
    records: Record<string, unknown>[];
  };
  assert.equal(sample.acquisition, "synthetic-fixture");

  const record = sample.records.find((row) => row.job_id === "NCS-MH-1010");
  assert.ok(record);

  const ingest = await ingestSourceDataset({
    adapter: ncsAdapter,
    records: [record],
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    referenceTime: REFERENCE,
  });
  assert.equal(ingest.accepted, 1);
  const jobId = ingest.outcomes[0]?.jobId;
  const observationId = ingest.outcomes[0]?.observationId;
  assert.ok(jobId);
  assert.ok(observationId);
  createdJobIds.push(jobId);
  createdRawIds.push(observationId);

  const intelligence = await processJobIntelligenceById(jobId, {
    persist: true,
  });
  assert.equal(intelligence.persistence?.status, "PROCESSED");
  assert.equal(intelligence.intelligence.jobId, jobId);

  const quality = await assessJobQuality({
    jobId,
    referenceTime: REFERENCE,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: INGESTED_AT,
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });
  assert.equal(quality.persistence?.status, "PROCESSED");
  assert.ok(
    quality.assessment.eligibility === "INCLUDE" ||
      quality.assessment.eligibility === "INCLUDE_WITH_CAUTION" ||
      quality.assessment.eligibility === "EXCLUDE",
  );

  const jobBefore = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { sourceId: true, postedAt: true },
  });
  assert.ok(jobBefore.sourceId);
  assert.equal(jobBefore.postedAt?.toISOString(), "2026-09-05T00:00:00.000Z");

  const location = await prisma.location.create({
    data: {
      country: "IN",
      state: "Maharashtra",
      district: "Kolhapur",
      city: "Kolhapur",
    },
  });
  await prisma.job.update({
    where: { id: jobId },
    data: { locationId: location.id },
  });

  const from = new Date("2026-07-01T00:00:00.000Z");
  const to = new Date("2026-09-16T00:00:00.000Z");
  const demand = await summarizeDemand({
    from,
    to,
    sourceId: jobBefore.sourceId,
    geography: { state: "Maharashtra" },
  });
  assert.equal(demand.demandVersion, "demand-v1");
  assert.ok(Array.isArray(demand.skills));

  const reactSkill = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.react" },
    select: { id: true },
  });
  const react = demand.skills.find((row) => row.skillId === reactSkill.id);
  if (quality.assessment.eligibility !== "EXCLUDE") {
    assert.ok(react, "expected React demand from NCS-shaped observation");
    assert.ok(react.weightedDemand > 0 || react.jobCount > 0);
  }

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { source: true, skills: { include: { skill: true } } },
  });
  assert.equal(job.source?.code, NCS_SOURCE_CODE);
  assert.equal(job.externalId, "NCS-MH-1010");
  assert.equal(job.postedAt?.toISOString(), "2026-09-05T00:00:00.000Z");
  assert.ok(job.skills.some((row) => row.skill.code === "sp.skill.react"));
  assert.equal(
    job.skills.some((row) => row.skill.code === "sp.skill.javascript"),
    false,
  );

  await prisma.job.update({
    where: { id: jobId },
    data: { locationId: null },
  });
  await prisma.location.delete({ where: { id: location.id } });
});
