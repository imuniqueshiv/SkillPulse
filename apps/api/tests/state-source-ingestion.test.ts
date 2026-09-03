import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, describe, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  getJobSourceAdapter,
  resetJobSourceAdapters,
} from "../src/modules/ingestion/adapter";
import {
  ingestSourceDataset,
  registerBuiltinJobSourceAdapters,
} from "../src/modules/ingestion/ingest-dataset";
import {
  MAHASWAYAM_ROJGAR_ADAPTER_NAME,
  MAHASWAYAM_ROJGAR_SOURCE_CODE,
  mahaswayamRojgarAdapter,
} from "../src/modules/ingestion/sources/mahaswayam-rojgar";
import { AppError } from "../src/utils/errors";
import { createGujaratEmploymentFixtureAdapter } from "./fixtures/gujarat-employment-adapter";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");
const stamp = Date.now();
const createdSourceIds: string[] = [];
const createdJobIds: string[] = [];
const createdRawIds: string[] = [];
const createdEvidenceIds: string[] = [];

const CORE_PIPELINE_FILES = [
  "job-ingestion-pipeline.ts",
  "job-validation.ts",
  "job-deduplication.ts",
  "job-freshness.ts",
  "job-provenance.ts",
  "job-skill-normalization.ts",
  "job-persistence.ts",
];

type SampleFile = {
  records: Record<string, unknown>[];
};

const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/mahaswayam-rojgar.sample.json",
);
const sample = JSON.parse(readFileSync(samplePath, "utf8")) as SampleFile;

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    const leftoverRaw = await prisma.rawIngestionRecord.findMany({
      where: {
        OR: [
          { id: { in: createdRawIds } },
          {
            adapterName: MAHASWAYAM_ROJGAR_ADAPTER_NAME,
            observedAt: new Date(OBSERVED_AT),
          },
          { sourceId: { in: createdSourceIds } },
        ],
      },
      select: { id: true },
    });
    const rawIds = [
      ...new Set([...createdRawIds, ...leftoverRaw.map((row) => row.id)]),
    ];
    const leftoverJobs = await prisma.job.findMany({
      where: {
        OR: [
          { id: { in: createdJobIds } },
          {
            source: { code: MAHASWAYAM_ROJGAR_SOURCE_CODE },
            externalId: { startsWith: "MH-ROJ-" },
          },
          {
            source: { code: MAHASWAYAM_ROJGAR_SOURCE_CODE },
            externalId: "SHARED-EXT-1",
          },
          { sourceId: { in: createdSourceIds } },
        ],
      },
      select: { id: true },
    });
    const jobIds = [
      ...new Set([...createdJobIds, ...leftoverJobs.map((row) => row.id)]),
    ];

    if (jobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
    }
    if (rawIds.length > 0 || createdEvidenceIds.length > 0) {
      await prisma.evidence.deleteMany({
        where: {
          OR: [
            { id: { in: createdEvidenceIds } },
            {
              reference: {
                in: rawIds.map((id) => `raw-ingestion:${id}`),
              },
            },
          ],
        },
      });
    }
    if (rawIds.length > 0) {
      await prisma.rawIngestionRecord.deleteMany({
        where: { id: { in: rawIds } },
      });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  resetJobSourceAdapters();
  await disconnectPrisma();
});

function trackDataset(result: Awaited<ReturnType<typeof ingestSourceDataset>>) {
  for (const outcome of result.outcomes) {
    if (outcome.observationId) {
      createdRawIds.push(outcome.observationId);
    }
    if (outcome.jobId) {
      createdJobIds.push(outcome.jobId);
    }
  }
  return result;
}

const datasetOptions = {
  observedAt: OBSERVED_AT,
  ingestedAt: INGESTED_AT,
  referenceTime: REFERENCE,
};

describe("Phase 5.12 state-source ingestion", { concurrency: false }, () => {
  test("Maharashtra adapter maps sample fields without mutating input", () => {
    const record = {
      vacancy_id: "MH-ROJ-MAP",
      post_name: "Machine Operator",
      employer_name: "Pune Industrial Works",
      job_description: "Shop floor",
      city: "Pune",
      district: "Pune",
      state: "Maharashtra",
      posted_on: "2026-08-01T00:00:00.000Z",
      valid_upto: "2026-11-01T00:00:00.000Z",
      notice_url: "https://rojgar.mahaswayam.gov.in/notices/MH-ROJ-MAP",
      skills: ["Python"],
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    };
    Object.freeze(record);
    Object.freeze(record.skills);

    const first = mahaswayamRojgarAdapter.parse(record);
    const second = mahaswayamRojgarAdapter.parse({ ...record, skills: [...record.skills] });

    assert.equal(first.payload.sourceCode, MAHASWAYAM_ROJGAR_SOURCE_CODE);
    assert.equal(first.payload.externalId, "MH-ROJ-MAP");
    assert.equal(first.payload.title, "Machine Operator");
    assert.equal(first.payload.employerName, "Pune Industrial Works");
    assert.equal(first.payload.description, "Shop floor");
    assert.equal(first.payload.location?.city, "Pune");
    assert.equal(first.payload.location?.district, "Pune");
    assert.equal(first.payload.location?.state, "Maharashtra");
    assert.equal(
      first.payload.sourceUrl,
      "https://rojgar.mahaswayam.gov.in/notices/MH-ROJ-MAP",
    );
    assert.equal(first.payload.postedAt?.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(first.payload.expiresAt?.toISOString(), "2026-11-01T00:00:00.000Z");
    assert.deepEqual(first.payload.sourceMetadata?.skills, ["Python"]);
    assert.equal(record.post_name, "Machine Operator");
    assert.equal(record.vacancy_id, "MH-ROJ-MAP");
    assert.equal(first.payload.title, second.payload.title);
    assert.equal(first.payload.externalId, second.payload.externalId);
    assert.deepEqual(first.payload.sourceMetadata, second.payload.sourceMetadata);
  });

  test("builtin adapter registry uses the registered Mahaswayam DataSource code", () => {
    resetJobSourceAdapters();
    registerBuiltinJobSourceAdapters();
    const adapter = getJobSourceAdapter(MAHASWAYAM_ROJGAR_SOURCE_CODE);
    assert.equal(adapter.sourceCode, MAHASWAYAM_ROJGAR_SOURCE_CODE);
    assert.equal(adapter.name, MAHASWAYAM_ROJGAR_ADAPTER_NAME);
    resetJobSourceAdapters();
  });

  test("core pipeline modules have no Maharashtra branching", () => {
    for (const file of CORE_PIPELINE_FILES) {
      const source = readFileSync(
        resolve(__dirname, "../src/modules/ingestion", file),
        "utf8",
      );
      assert.equal(
        /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
        false,
        file,
      );
    }
  });

  test("unknown adapter sourceCode fails at source level", async () => {
    resetJobSourceAdapters();
    await assert.rejects(
      () =>
        ingestSourceDataset({
          sourceCode: "sp.source.does-not-exist",
          records: [{ vacancy_id: "x", post_name: "X" }],
          ...datasetOptions,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.message === "Unknown source adapter",
    );
  });

  test("Maharashtra sample, Gujarat fixture, partial failure, and source separation", async (t) => {
    if (!env.DATABASE_URL) {
      t.skip("DATABASE_URL is not configured");
      return;
    }

    const prisma = getPrisma();
    const maharashtra = await prisma.dataSource.findUnique({
      where: { code: MAHASWAYAM_ROJGAR_SOURCE_CODE },
    });
    assert.ok(maharashtra);
    assert.equal(maharashtra.geographicScope, "STATE");

    assert.equal(sample.records.length, 12);
    const ingestRecords = [
      sample.records[0],
      sample.records[1],
      sample.records[2],
      sample.records[10],
      sample.records[11],
    ];
    const originalFirst = structuredClone(sample.records[0]);
    Object.freeze(sample.records[0]);

    const first = trackDataset(
      await ingestSourceDataset({
        adapter: mahaswayamRojgarAdapter,
        records: ingestRecords,
        ...datasetOptions,
      }),
    );

    assert.deepEqual(sample.records[0], originalFirst);
    assert.equal(first.sourceCode, MAHASWAYAM_ROJGAR_SOURCE_CODE);
    assert.equal(first.geographicScope, "STATE");
    assert.equal(first.total, 5);
    assert.equal(first.accepted, 3);
    assert.equal(first.rejected, 1);
    assert.equal(first.failed, 1);
    assert.equal(first.jobsCreated, 3);
    assert.equal(first.jobsReused, 0);
    assert.deepEqual(first.unresolvedSkillTerms, ["java scriptt"]);

    const operator = await prisma.job.findFirst({
      where: { sourceId: maharashtra.id, externalId: "MH-ROJ-1001" },
      include: { skills: { include: { skill: true } } },
    });
    assert.ok(operator);
    assert.equal(operator.title, "Machine Operator");
    assert.equal(operator.companyName, "Pune Industrial Works");
    assert.equal(operator.locationId, null);
    assert.ok(operator.skills.some((row) => row.skill.code === "sp.skill.python"));
    assert.ok(operator.skills.some((row) => row.skill.code === "sp.skill.sql"));

    const nurse = await prisma.job.findFirst({
      where: { sourceId: maharashtra.id, externalId: "MH-ROJ-1002" },
      include: { skills: true },
    });
    assert.ok(nurse);
    assert.equal(nurse.skills.length, 0);

    const developer = await prisma.job.findFirst({
      where: { sourceId: maharashtra.id, externalId: "MH-ROJ-1003" },
      include: { skills: { include: { skill: true } } },
    });
    assert.ok(developer);
    assert.ok(developer.skills.some((row) => row.skill.code === "sp.skill.react"));
    assert.equal(
      developer.skills.some((row) => row.skill.code === "sp.skill.javascript"),
      false,
    );

    const firstRawId = first.outcomes[0]?.observationId;
    assert.ok(firstRawId);
    const raw = await prisma.rawIngestionRecord.findUniqueOrThrow({
      where: { id: firstRawId },
    });
    assert.equal((raw.payload as { vacancy_id?: string }).vacancy_id, "MH-ROJ-1001");
    assert.equal((raw.payload as { post_name?: string }).post_name, "Machine Operator");
    assert.equal((raw.payload as { kind?: string }).kind, undefined);

    const evidence = await prisma.evidence.findFirst({
      where: { reference: `raw-ingestion:${raw.id}` },
    });
    assert.ok(evidence);
    createdEvidenceIds.push(evidence.id);

    const rejected = first.outcomes.find((row) => row.status === "REJECTED");
    assert.ok(rejected?.observationId);
    assert.equal(rejected.jobId, null);

    const failed = first.outcomes.find((row) => row.status === "FAILED");
    assert.ok(failed);
    assert.equal(failed.message, "Canonical job identity requires externalId");

    const repeat = trackDataset(
      await ingestSourceDataset({
        adapter: mahaswayamRojgarAdapter,
        records: ingestRecords,
        ...datasetOptions,
      }),
    );
    assert.equal(repeat.jobsCreated, 0);
    assert.equal(repeat.jobsReused, 3);
    assert.equal(repeat.accepted, 3);
    assert.equal(repeat.rejected, 1);
    assert.equal(repeat.failed, 1);
    assert.equal(
      await prisma.job.count({
        where: {
          sourceId: maharashtra.id,
          externalId: { in: ["MH-ROJ-1001", "MH-ROJ-1002", "MH-ROJ-1003"] },
        },
      }),
      3,
    );

    const gujarat = await prisma.dataSource.create({
      data: {
        code: `sp.source.fixture-gujarat-employment-${stamp}`,
        name: `[TEST] Gujarat fixture ${stamp}`,
        type: "OTHER",
        accessMethod: "MANUAL_IMPORT",
        domain: "JOBS",
        geographicScope: "STATE",
        isDemo: true,
      },
    });
    createdSourceIds.push(gujarat.id);
    const gujaratAdapter = createGujaratEmploymentFixtureAdapter(gujarat.code);

    const sharedId = "SHARED-EXT-1";
    const mhShared = trackDataset(
      await ingestSourceDataset({
        adapter: mahaswayamRojgarAdapter,
        records: [
          {
            vacancy_id: sharedId,
            post_name: "Clerk",
            employer_name: "Pune Office",
            city: "Pune",
            state: "Maharashtra",
          },
        ],
        ...datasetOptions,
      }),
    );
    const gjShared = trackDataset(
      await ingestSourceDataset({
        adapter: gujaratAdapter,
        records: [
          {
            jobId: sharedId,
            title: "Clerk",
            company: "Ahmedabad Office",
            city: "Ahmedabad",
            state: "Gujarat",
            skills: ["SQL"],
          },
        ],
        ...datasetOptions,
      }),
    );
    assert.equal(mhShared.accepted, 1);
    assert.equal(mhShared.geographicScope, "STATE");
    assert.equal(gjShared.accepted, 1);
    assert.equal(gjShared.sourceCode, gujarat.code);
    assert.equal(gjShared.geographicScope, "STATE");
    assert.ok(mhShared.outcomes[0]?.jobId);
    assert.ok(gjShared.outcomes[0]?.jobId);
    assert.notEqual(mhShared.outcomes[0]?.jobId, gjShared.outcomes[0]?.jobId);

    const gjJob = await prisma.job.findFirst({
      where: { sourceId: gujarat.id, externalId: sharedId },
      include: { skills: { include: { skill: true } } },
    });
    assert.ok(gjJob);
    assert.equal(gjJob.title, "Clerk");
    assert.equal(gjJob.companyName, "Ahmedabad Office");
    assert.ok(gjJob.skills.some((row) => row.skill.code === "sp.skill.sql"));

    await assert.rejects(
      () =>
        ingestSourceDataset({
          adapter: createGujaratEmploymentFixtureAdapter(
            "sp.source.not-registered-anywhere",
          ),
          records: [{ jobId: "x", title: "X" }],
          ...datasetOptions,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.message === "Data source not found",
    );
  });
});
