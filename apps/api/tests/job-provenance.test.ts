import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import { JOB_DEDUP_STATUS } from "../src/modules/ingestion/job-deduplication";
import { JOB_FRESHNESS_STATUS } from "../src/modules/ingestion/job-freshness";
import {
  buildJobPostingProvenance,
  rawIngestionReference,
  recordJobPostingEvidence,
} from "../src/modules/ingestion/job-provenance";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import { storeRawObservation } from "../src/modules/ingestion/raw-storage";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const SOURCE_URL = "https://example.com/jobs/ncs-12345";
const stamp = Date.now();
const createdSourceIds: string[] = [];
const createdEvidenceIds: string[] = [];
const createdRawIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
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

function validated(payload: Record<string, unknown>) {
  return validateJobIngestion(envelope(payload));
}

function basePayload(extra: Record<string, unknown> = {}) {
  return {
    sourceCode: "sp.source.demo-seed",
    title: "Machine Operator",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    ...extra,
  };
}

test("valid and review observations produce provenance without copying payloads", () => {
  const valid = validated(
    basePayload({
      sourceId: "11111111-1111-4111-8111-111111111111",
      externalId: "NCS-12345",
      sourceUrl: SOURCE_URL,
      description: "React.js / React JS must not appear in evidence metadata",
    }),
  );
  const review = validated(basePayload({ title: "N/A" }));

  const provenance = buildJobPostingProvenance({
    observationId: "obs-valid",
    validation: valid,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
    freshnessStatus: JOB_FRESHNESS_STATUS.FRESH,
  });
  const reviewed = buildJobPostingProvenance({
    observationId: "obs-review",
    validation: review,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });

  assert.equal(provenance.type, "JOB_POSTING");
  assert.equal(provenance.reference, rawIngestionReference("obs-valid"));
  assert.equal(provenance.sourceCode, "sp.source.demo-seed");
  assert.equal(provenance.sourceId, "11111111-1111-4111-8111-111111111111");
  assert.equal(provenance.metadata.externalId, "NCS-12345");
  assert.equal(provenance.metadata.sourceUrl, SOURCE_URL);
  assert.equal(provenance.metadata.observationId, "obs-valid");
  assert.equal(provenance.observedAt.toISOString(), OBSERVED_AT);
  assert.equal(provenance.metadata.ingestedAt, INGESTED_AT);
  assert.notEqual(provenance.observedAt.toISOString(), provenance.metadata.ingestedAt);
  assert.equal(provenance.confidence, null);
  assert.equal(provenance.metadata.validationStatus, "VALID");
  assert.equal("payload" in provenance.metadata, false);
  assert.equal("description" in provenance.metadata, false);
  assert.equal("title" in provenance.metadata, false);

  assert.equal(reviewed.metadata.validationStatus, "REVIEW");
  assert.equal(reviewed.metadata.freshnessStatus, JOB_FRESHNESS_STATUS.STALE);
});

test("rejected observations do not produce accepted provenance", () => {
  const rejected = validated({
    sourceCode: "sp.source.demo-seed",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  assert.equal(rejected.status, "REJECTED");
  assert.throws(
    () =>
      buildJobPostingProvenance({
        observationId: "obs-rejected",
        validation: rejected,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Job observation is not eligible for provenance",
  );
});

test("missing optional provenance fields stay absent; inputs are not mutated", () => {
  const validation = validated(basePayload());
  Object.freeze(validation);
  Object.freeze(validation.record);
  Object.freeze(validation.record!.payload);

  const provenance = buildJobPostingProvenance({
    observationId: "obs-minimal",
    validation,
  });

  assert.equal(provenance.metadata.externalId, undefined);
  assert.equal(provenance.metadata.sourceUrl, undefined);
  assert.equal(provenance.metadata.dedupStatus, undefined);
  assert.equal(validation.record!.payload.observedAt.toISOString(), OBSERVED_AT);
});

test("same externalId from different sources remains source-scoped", () => {
  const ncs = buildJobPostingProvenance({
    observationId: "obs-ncs",
    validation: validated(
      basePayload({ sourceCode: "sp.source.ncs", externalId: "12345" }),
    ),
  });
  const maha = buildJobPostingProvenance({
    observationId: "obs-maha",
    validation: validated(
      basePayload({
        sourceCode: "sp.source.mahaswayam-rojgar",
        externalId: "12345",
      }),
    ),
  });

  assert.equal(ncs.metadata.externalId, maha.metadata.externalId);
  assert.notEqual(ncs.sourceCode, maha.sourceCode);
  assert.notEqual(ncs.reference, maha.reference);
});

test("duplicate and unique observations both keep provenance; generation is deterministic", () => {
  const first = validated(basePayload({ externalId: "ext-1" }));
  const second = validated(basePayload({ externalId: "ext-1" }));
  const a = buildJobPostingProvenance({
    observationId: "raw-1",
    validation: first,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
    freshnessStatus: JOB_FRESHNESS_STATUS.FRESH,
  });
  const b = buildJobPostingProvenance({
    observationId: "raw-2",
    validation: second,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });
  const again = buildJobPostingProvenance({
    observationId: "raw-1",
    validation: first,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
    freshnessStatus: JOB_FRESHNESS_STATUS.FRESH,
  });

  assert.notEqual(a.reference, b.reference);
  assert.equal(a.metadata.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(b.metadata.dedupStatus, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(a.metadata.freshnessStatus, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(b.metadata.freshnessStatus, JOB_FRESHNESS_STATUS.STALE);
  assert.deepEqual(a, again);
});

test("persisted Evidence links DataSource, is idempotent, and does not create Jobs", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-prov-${stamp}`,
      name: `[TEST] Provenance ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const rawPayload = {
    heading: "Machine Operator",
    description: "must not copy into Evidence.metadata",
  };
  const raw = await storeRawObservation({
    sourceCode: source.code,
    externalId: "ext-persist",
    payload: rawPayload,
    observedAt: OBSERVED_AT,
  });
  createdRawIds.push(raw.record.id);

  const validation = validated(
    basePayload({
      sourceId: source.id,
      sourceCode: source.code,
      externalId: "ext-persist",
      sourceUrl: SOURCE_URL,
    }),
  );

  const first = await recordJobPostingEvidence({
    observationId: raw.record.id,
    validation,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
    freshnessStatus: JOB_FRESHNESS_STATUS.FRESH,
  });
  createdEvidenceIds.push(first.evidence.id);

  const repeat = await recordJobPostingEvidence({
    observationId: raw.record.id,
    validation,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });

  const sibling = await recordJobPostingEvidence({
    observationId: `${raw.record.id}-later`,
    validation,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });
  createdEvidenceIds.push(sibling.evidence.id);

  const unchangedRaw = await prisma.rawIngestionRecord.findUniqueOrThrow({
    where: { id: raw.record.id },
  });

  assert.equal(first.created, true);
  assert.equal(repeat.created, false);
  assert.equal(repeat.evidence.id, first.evidence.id);
  assert.equal(first.evidence.sourceId, source.id);
  assert.equal(first.evidence.source.code, source.code);
  assert.equal(first.evidence.type, "JOB_POSTING");
  assert.equal(first.evidence.reference, `raw-ingestion:${raw.record.id}`);
  assert.equal(first.evidence.observedAt?.toISOString(), OBSERVED_AT);
  assert.equal(first.evidence.confidence, null);
  assert.notEqual(sibling.evidence.id, first.evidence.id);
  assert.equal(
    sibling.evidence.reference,
    `raw-ingestion:${raw.record.id}-later`,
  );

  const metadata = first.evidence.metadata as Record<string, unknown>;
  const repeatMetadata = repeat.evidence.metadata as Record<string, unknown>;
  assert.equal(metadata.sourceCode, source.code);
  assert.equal(metadata.externalId, "ext-persist");
  assert.equal(metadata.sourceUrl, SOURCE_URL);
  assert.equal(metadata.observationId, raw.record.id);
  assert.equal(metadata.ingestedAt, INGESTED_AT);
  assert.equal(metadata.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(repeatMetadata.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(metadata.payload, undefined);
  assert.equal(metadata.description, undefined);
  assert.deepEqual(unchangedRaw.payload, rawPayload);
  assert.equal(await prisma.job.count({ where: { sourceId: source.id } }), 0);
  assert.equal(
    await prisma.jobSkill.count({ where: { job: { sourceId: source.id } } }),
    0,
  );
  assert.equal(await prisma.evidence.count({ where: { sourceId: source.id } }), 2);

  await assert.rejects(
    () =>
      recordJobPostingEvidence({
        observationId: "obs-rejected",
        validation: validated({
          sourceCode: source.code,
          observedAt: OBSERVED_AT,
          ingestedAt: INGESTED_AT,
        }),
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "Job observation is not eligible for provenance",
  );
  assert.equal(await prisma.evidence.count({ where: { sourceId: source.id } }), 2);

  await assert.rejects(
    () =>
      recordJobPostingEvidence({
        observationId: "obs-missing-source",
        validation: validated(
          basePayload({ sourceCode: "sp.source.does-not-exist" }),
        ),
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );

  await assert.rejects(
    () =>
      recordJobPostingEvidence({
        observationId: "obs-mismatch",
        validation: validated(
          basePayload({
            sourceId: source.id,
            sourceCode: "sp.source.demo-seed",
          }),
        ),
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});
