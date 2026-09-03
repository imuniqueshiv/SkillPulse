import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import {
  JOB_VALIDATION_REASON,
  JOB_VALIDATION_STATUS,
  validateJobIngestion,
} from "../src/modules/ingestion/job-validation";

const OBSERVED_AT = "2026-09-02T10:00:00.000Z";
const INGESTED_AT = "2026-09-02T10:05:00.000Z";
const SOURCE_ID = "11111111-1111-4111-8111-111111111111";

function envelope(
  payload: Record<string, unknown>,
  extra?: Record<string, unknown>,
) {
  return {
    kind: INGESTION_RECORD_KIND.JOB,
    contractVersion: INGESTION_CONTRACT_VERSION,
    adapterName: "skillpulse-test-fixture",
    adapterVersion: "0.0.1",
    payload,
    ...extra,
  };
}

function hasCode(result: ReturnType<typeof validateJobIngestion>, code: string) {
  return result.reasons.some((reason) => reason.code === code);
}

test("valid record with optional fields absent is VALID", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.VALID);
  assert.equal(result.reasons.length, 0);
  assert.equal(result.record?.payload.title, "Machine Operator");
  assert.equal(result.record?.payload.description, undefined);
  assert.equal(result.record?.payload.employerName, undefined);
  assert.equal(result.record?.payload.qualification, undefined);
  assert.equal(result.record?.payload.salary, undefined);
  assert.equal(result.record?.payload.location, undefined);
});

test("valid complete record is VALID and preserves raw title text", () => {
  const result = validateJobIngestion(
    envelope({
      sourceId: SOURCE_ID,
      sourceCode: "sp.source.demo-seed",
      title: "React.js / React JS Developer",
      description: "Uses React.js / React JS",
      employerName: "Example Works",
      location: { city: "Pune" },
      qualification: "ITI",
      salary: { min: 18000, max: 22000, currency: "INR" },
      sourceUrl: "https://example.com/jobs/1",
      postedAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-30T18:30:00+05:30",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.VALID);
  assert.equal(result.record?.payload.title, "React.js / React JS Developer");
});

test("missing title is REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.equal(result.record, null);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.TITLE_MISSING));
});

test("invalid title type is REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: 123,
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.TITLE_INVALID_TYPE));
});

test("invalid source identity is REJECTED", () => {
  const missing = validateJobIngestion(
    envelope({
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );
  const badId = validateJobIngestion(
    envelope({
      sourceId: "not-a-uuid",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(missing.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(missing, JOB_VALIDATION_REASON.SOURCE_IDENTITY_MISSING));
  assert.equal(badId.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(badId, JOB_VALIDATION_REASON.INVALID_SOURCE_ID));
});

test("malformed URL is REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
      sourceUrl: "ftp://example.com/job",
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.INVALID_SOURCE_URL));
});

test("malformed timestamp is REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "Machine Operator",
      observedAt: "not-a-date",
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.INVALID_OBSERVED_AT));
});

test("impossible timestamp relationship is REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "Machine Operator",
      postedAt: "2026-09-10T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.IMPOSSIBLE_TIMESTAMP_RANGE));
  assert.ok(result.record);
});

test("placeholder title is REVIEW not REJECTED", () => {
  const result = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "N/A",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REVIEW);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.TITLE_PLACEHOLDER));
  assert.equal(result.record?.payload.title, "N/A");
});

test("multiple validation reasons are returned together", () => {
  const result = validateJobIngestion(
    envelope({
      title: 123,
      sourceUrl: "not-a-url",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.status, JOB_VALIDATION_STATUS.REJECTED);
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.TITLE_INVALID_TYPE));
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.INVALID_SOURCE_URL));
  assert.ok(hasCode(result, JOB_VALIDATION_REASON.SOURCE_IDENTITY_MISSING));
});

test("repeated validation is deterministic", () => {
  const input = envelope({
    sourceCode: "sp.source.demo-seed",
    title: "A",
    postedAt: "2026-09-03T00:00:00.000Z",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  const first = validateJobIngestion(input);
  const second = validateJobIngestion(input);

  assert.equal(first.status, JOB_VALIDATION_STATUS.REVIEW);
  assert.deepEqual(first.status, second.status);
  assert.deepEqual(first.reasons, second.reasons);
  assert.equal(
    first.record?.payload.postedAt?.toISOString(),
    second.record?.payload.postedAt?.toISOString(),
  );
  assert.ok(hasCode(first, JOB_VALIDATION_REASON.TITLE_TOO_SHORT));
  assert.ok(hasCode(first, JOB_VALIDATION_REASON.POSTED_AFTER_OBSERVED));
});
