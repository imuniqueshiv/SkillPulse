import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import {
  computeJobContentFingerprint,
  deduplicateJobObservation,
  JOB_DEDUP_REASON,
  JOB_DEDUP_STATUS,
  JOB_DEDUP_STRATEGY,
  normalizeDedupText,
  type JobDedupObservation,
} from "../src/modules/ingestion/job-deduplication";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-02T10:00:00.000Z";
const INGESTED_AT = "2026-09-02T10:05:00.000Z";

function envelope(payload: Record<string, unknown>) {
  return {
    kind: INGESTION_RECORD_KIND.JOB,
    contractVersion: INGESTION_CONTRACT_VERSION,
    adapterName: "skillpulse-test-fixture",
    adapterVersion: "0.0.1",
    payload,
  };
}

function observation(
  observationId: string,
  payload: Record<string, unknown>,
  contentChecksum?: string,
): JobDedupObservation {
  return {
    observationId,
    validation: validateJobIngestion(envelope(payload)),
    contentChecksum,
  };
}

const complete = {
  sourceCode: "sp.source.demo-seed",
  title: "Machine Operator",
  employerName: "Example Works",
  location: { city: "Pune", state: "Maharashtra" },
  observedAt: OBSERVED_AT,
  ingestedAt: INGESTED_AT,
};

test("same source and external ID is DUPLICATE", () => {
  const prior = observation("obs-a", { ...complete, externalId: "ext-100" });
  const candidate = observation("obs-b", {
    ...complete,
    title: "Updated title",
    externalId: "ext-100",
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(result.strategy, JOB_DEDUP_STRATEGY.SOURCE_EXTERNAL_ID);
  assert.equal(result.reason, JOB_DEDUP_REASON.SOURCE_EXTERNAL_ID_MATCH);
  assert.equal(result.matchedObservationId, "obs-a");
});

test("same external ID from different sources is not DUPLICATE", () => {
  const prior = observation("obs-ncs", {
    ...complete,
    sourceCode: "sp.source.ncs",
    externalId: "12345",
  });
  const candidate = observation("obs-maha", {
    ...complete,
    sourceCode: "sp.source.mahaswayam-rojgar",
    externalId: "12345",
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(result.reason, JOB_DEDUP_REASON.CROSS_SOURCE_EXTERNAL_ID);
  assert.equal(result.matchedObservationId, null);
});

test("different external IDs from the same source are not DUPLICATE", () => {
  const prior = observation("obs-100", { ...complete, externalId: "100" });
  const candidate = observation("obs-101", { ...complete, externalId: "101" });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(result.reason, JOB_DEDUP_REASON.DIFFERENT_EXTERNAL_ID);
});

test("same title and different employer is not an exact duplicate", () => {
  const prior = observation("obs-a", {
    ...complete,
    employerName: "Works A",
  });
  const candidate = observation("obs-b", {
    ...complete,
    employerName: "Works B",
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(result.reason, JOB_DEDUP_REASON.TITLE_EMPLOYER_MISMATCH);
});

test("same title and employer with different location is POSSIBLE_DUPLICATE", () => {
  const prior = observation("obs-a", {
    ...complete,
    location: { city: "Pune", state: "Maharashtra" },
  });
  const candidate = observation("obs-b", {
    ...complete,
    location: { city: "Nagpur", state: "Maharashtra" },
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.POSSIBLE_DUPLICATE);
  assert.equal(result.reason, JOB_DEDUP_REASON.TITLE_EMPLOYER_LOCATION_CONFLICT);
  assert.equal(result.matchedObservationId, "obs-a");
});

test("missing external ID with incomplete identity is POSSIBLE_DUPLICATE", () => {
  const prior = observation("obs-a", {
    sourceCode: "sp.source.demo-seed",
    title: "Welder",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  const candidate = observation("obs-b", {
    sourceCode: "sp.source.demo-seed",
    title: "Fitter",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.POSSIBLE_DUPLICATE);
  assert.equal(result.strategy, JOB_DEDUP_STRATEGY.INSUFFICIENT_IDENTITY);
  assert.equal(result.reason, JOB_DEDUP_REASON.INSUFFICIENT_IDENTITY);
});

test("repeated observations are classified without deleting either id", () => {
  const first = observation("raw-1", { ...complete, externalId: "keep-me" });
  const second = observation("raw-2", { ...complete, externalId: "keep-me" });

  const result = deduplicateJobObservation(second, [first]);
  assert.equal(result.status, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(first.observationId, "raw-1");
  assert.equal(second.observationId, "raw-2");
  assert.equal(first.validation.record?.payload.title, complete.title);
  assert.equal(second.validation.record?.payload.title, complete.title);
});

test("matching content checksum is not treated as job identity", () => {
  const prior = observation(
    "obs-a",
    { ...complete, sourceCode: "sp.source.ncs", externalId: "100" },
    "abc123",
  );
  const candidate = observation(
    "obs-b",
    { ...complete, sourceCode: "sp.source.demo-seed", externalId: "100" },
    "abc123",
  );

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.UNIQUE);
  assert.deepEqual(result.sameContentChecksumObservationIds, ["obs-a"]);
});

test("different content with the same source and external ID is still DUPLICATE", () => {
  const prior = observation("obs-a", {
    ...complete,
    description: "First snapshot",
    externalId: "ext-9",
  });
  const candidate = observation("obs-b", {
    ...complete,
    description: "Later snapshot with React.js / React JS",
    employerName: "Renamed Works",
    externalId: "ext-9",
  });

  const result = deduplicateJobObservation(candidate, [prior]);
  assert.equal(result.status, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(result.reason, JOB_DEDUP_REASON.SOURCE_EXTERNAL_ID_MATCH);
});

test("fingerprint is deterministic across whitespace and case", () => {
  const compact = observation("obs-a", complete);
  const spaced = observation("obs-b", {
    ...complete,
    title: "  MACHINE   operator ",
    employerName: "example   WORKS",
    location: { city: " pune ", state: "MAHARASHTRA" },
  });

  const first = computeJobContentFingerprint(compact.validation.record!);
  const second = computeJobContentFingerprint(spaced.validation.record!);
  assert.equal(first.digest, second.digest);
  assert.equal(first.complete, true);
  assert.equal(normalizeDedupText("  MACHINE   operator "), "machine operator");
  assert.equal(normalizeDedupText(undefined), null);
  assert.equal(normalizeDedupText("   "), null);

  const result = deduplicateJobObservation(spaced, [compact]);
  assert.equal(result.status, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(result.strategy, JOB_DEDUP_STRATEGY.CONTENT_FINGERPRINT);
});

test("multiple Level 1 matches pick the smallest observationId", () => {
  const later = observation("obs-z", { ...complete, externalId: "ext-1" });
  const earlier = observation("obs-m", { ...complete, externalId: "ext-1" });
  const candidate = observation("obs-new", { ...complete, externalId: "ext-1" });

  const result = deduplicateJobObservation(candidate, [later, earlier]);
  assert.equal(result.matchedObservationId, "obs-m");
});

test("repeated execution returns the same classification", () => {
  const prior = observation("obs-a", { ...complete, externalId: "ext-2" });
  const candidate = observation("obs-b", { ...complete, externalId: "ext-2" });

  const first = deduplicateJobObservation(candidate, [prior]);
  const second = deduplicateJobObservation(candidate, [prior]);
  assert.deepEqual(first, second);
});

test("deduplication does not reimplement Phase 5.5 validation", () => {
  const rejected = observation("bad", {
    sourceCode: "sp.source.demo-seed",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  assert.equal(rejected.validation.record, null);

  assert.throws(
    () => deduplicateJobObservation(rejected, []),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "Job observation is not eligible for deduplication",
  );

  const candidate = observation("obs-b", {
    sourceCode: "sp.source.demo-seed",
    title: "Machine Operator",
    employerName: "Example Works",
    location: { city: "Pune", state: "Maharashtra" },
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  const result = deduplicateJobObservation(candidate, []);
  assert.equal(result.status, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(candidate.validation.status, "VALID");
});
