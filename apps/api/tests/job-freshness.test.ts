import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import { JOB_DEDUP_STATUS } from "../src/modules/ingestion/job-deduplication";
import {
  DEFAULT_JOB_FRESHNESS_POLICY,
  evaluateJobFreshness,
  JOB_FRESHNESS_REASON,
  JOB_FRESHNESS_STATUS,
} from "../src/modules/ingestion/job-freshness";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");
const POLICY = { agingAfterMs: 1_000, staleAfterMs: 2_000 };

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

test("clearly fresh observation", () => {
  const postedAt = new Date(REFERENCE.getTime() - 500);
  const result = evaluateJobFreshness({
    validation: validated(basePayload({ postedAt: postedAt.toISOString() })),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.ok(result.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.WITHIN_FRESH_WINDOW));
  assert.equal(result.ageMs, 500);
});

test("clearly stale observation by postedAt age", () => {
  const postedAt = new Date(REFERENCE.getTime() - 5_000);
  const result = evaluateJobFreshness({
    validation: validated(basePayload({ postedAt: postedAt.toISOString() })),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.STALE);
  assert.ok(result.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.AGE_STALE));
});

test("unknown freshness when postedAt and expiresAt are missing", () => {
  const result = evaluateJobFreshness({
    validation: validated(basePayload()),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.UNKNOWN);
  assert.ok(result.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.MISSING_EVENT_TIME));
  assert.equal(result.ageMs, null);
});

test("exact aging and stale boundaries", () => {
  const aging = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 1_000).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  const justFresh = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 999).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  const stale = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 2_000).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  const justAging = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 1_999).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });

  assert.equal(aging.status, JOB_FRESHNESS_STATUS.AGING);
  assert.equal(justFresh.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(stale.status, JOB_FRESHNESS_STATUS.STALE);
  assert.equal(justAging.status, JOB_FRESHNESS_STATUS.AGING);
});

test("explicit reference time is used instead of wall clock", () => {
  const postedAt = "2026-01-01T00:00:00.000Z";
  const times = {
    observedAt: "2026-01-01T00:00:00.000Z",
    ingestedAt: "2026-01-01T00:00:00.200Z",
  };
  const early = evaluateJobFreshness({
    validation: validated(basePayload({ postedAt, ...times })),
    referenceTime: new Date("2026-01-01T00:00:00.500Z"),
    policy: POLICY,
  });
  const late = evaluateJobFreshness({
    validation: validated(basePayload({ postedAt, ...times })),
    referenceTime: new Date("2026-03-01T00:00:00.000Z"),
    policy: DEFAULT_JOB_FRESHNESS_POLICY,
  });
  assert.equal(early.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(late.status, JOB_FRESHNESS_STATUS.STALE);
});

test("observedAt in the future relative to reference time is UNKNOWN unless already expired", () => {
  const result = evaluateJobFreshness({
    validation: validated(
      basePayload({
        postedAt: new Date(REFERENCE.getTime() - 100).toISOString(),
        observedAt: "2026-09-16T00:00:00.000Z",
        ingestedAt: "2026-09-16T00:05:00.000Z",
      }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.UNKNOWN);
  assert.ok(result.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.OBSERVED_IN_FUTURE));
});

test("ingestedAt before observedAt is owned by Phase 5.5, not reclassified here", () => {
  const validation = validated(
    basePayload({
      observedAt: "2026-09-02T10:00:00.000Z",
      ingestedAt: "2026-09-01T10:00:00.000Z",
    }),
  );
  assert.equal(validation.status, "REJECTED");
  assert.throws(
    () =>
      evaluateJobFreshness({
        validation,
        referenceTime: REFERENCE,
        policy: POLICY,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Job observation is not eligible for freshness evaluation",
  );
});

test("explicit lastSeenAt before ingestedAt is reported without deleting data", () => {
  const validation = validated(
    basePayload({ postedAt: new Date(REFERENCE.getTime() - 500).toISOString() }),
  );
  const result = evaluateJobFreshness({
    validation,
    referenceTime: REFERENCE,
    policy: POLICY,
    lastSeenAt: new Date("2026-08-01T00:00:00.000Z"),
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.ok(
    result.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.LAST_SEEN_BEFORE_INGESTED),
  );
  assert.equal(validation.record?.payload.ingestedAt.toISOString(), INGESTED_AT);
});

test("expiresAt at reference time is STALE; one second later is not expired", () => {
  const expired = evaluateJobFreshness({
    validation: validated(
      basePayload({
        postedAt: new Date(REFERENCE.getTime() - 100).toISOString(),
        expiresAt: REFERENCE.toISOString(),
      }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  const open = evaluateJobFreshness({
    validation: validated(
      basePayload({
        postedAt: new Date(REFERENCE.getTime() - 100).toISOString(),
        expiresAt: new Date(REFERENCE.getTime() + 1_000).toISOString(),
      }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(expired.status, JOB_FRESHNESS_STATUS.STALE);
  assert.ok(expired.reasons.some((item) => item.code === JOB_FRESHNESS_REASON.EXPIRED));
  assert.equal(open.status, JOB_FRESHNESS_STATUS.FRESH);
});

test("timezone offsets are compared as instants", () => {
  const result = evaluateJobFreshness({
    validation: validated(
      basePayload({
        postedAt: "2026-09-14T05:30:00+05:30",
        expiresAt: "2026-09-16T05:30:00+05:30",
      }),
    ),
    referenceTime: new Date("2026-09-14T00:00:00.000Z"),
    policy: POLICY,
  });
  assert.equal(result.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(result.ageMs, 0);
});

test("missing optional timestamps besides required observedAt and ingestedAt", () => {
  const result = evaluateJobFreshness({
    validation: validated(basePayload()),
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.equal(result.postedAt, null);
  assert.equal(result.expiresAt, null);
  assert.equal(result.lastSeenAt.toISOString(), INGESTED_AT);
});

test("repeated evaluation is deterministic", () => {
  const validation = validated(
    basePayload({ postedAt: new Date(REFERENCE.getTime() - 1_500).toISOString() }),
  );
  const first = evaluateJobFreshness({
    validation,
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  const second = evaluateJobFreshness({
    validation,
    referenceTime: REFERENCE,
    policy: POLICY,
  });
  assert.deepEqual(first, second);
  assert.equal(first.status, JOB_FRESHNESS_STATUS.AGING);
});

test("duplicate status does not imply stale; unique does not imply fresh", () => {
  const freshDuplicate = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 100).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
  });
  const staleDuplicate = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 9_000).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
  });
  const staleUnique = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 9_000).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
  });
  const freshUnique = evaluateJobFreshness({
    validation: validated(
      basePayload({ postedAt: new Date(REFERENCE.getTime() - 100).toISOString() }),
    ),
    referenceTime: REFERENCE,
    policy: POLICY,
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
  });

  assert.equal(freshDuplicate.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(freshDuplicate.dedupStatus, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(staleDuplicate.status, JOB_FRESHNESS_STATUS.STALE);
  assert.equal(staleDuplicate.dedupStatus, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(staleUnique.status, JOB_FRESHNESS_STATUS.STALE);
  assert.equal(staleUnique.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(freshUnique.status, JOB_FRESHNESS_STATUS.FRESH);
  assert.equal(freshUnique.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
});

test("related observations derive lastSeenAt without mutating or merging inputs", () => {
  const candidate = validated(
    basePayload({ postedAt: new Date(REFERENCE.getTime() - 100).toISOString() }),
  );
  const later = validated(
    basePayload({
      postedAt: new Date(REFERENCE.getTime() - 100).toISOString(),
      ingestedAt: "2026-09-10T12:00:00.000Z",
      observedAt: "2026-09-10T11:00:00.000Z",
    }),
  );
  const originalIngested = candidate.record!.payload.ingestedAt.toISOString();
  const laterIngested = later.record!.payload.ingestedAt.toISOString();

  Object.freeze(candidate);
  Object.freeze(candidate.record);
  Object.freeze(candidate.record!.payload);

  const result = evaluateJobFreshness({
    validation: candidate,
    referenceTime: REFERENCE,
    policy: POLICY,
    relatedObservations: [later.record!],
  });

  assert.equal(result.lastSeenAt.toISOString(), "2026-09-10T12:00:00.000Z");
  assert.equal(candidate.record!.payload.ingestedAt.toISOString(), originalIngested);
  assert.equal(later.record!.payload.ingestedAt.toISOString(), laterIngested);
  assert.equal(result.ingestedAt.toISOString(), originalIngested);
  assert.notEqual(result.lastSeenAt.toISOString(), result.ingestedAt.toISOString());
});
