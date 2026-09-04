import assert from "node:assert/strict";
import { test } from "node:test";
import { assessFreshness } from "../src/modules/quality/freshness";
import { assessDuplication, assessValidationSignal } from "../src/modules/quality/duplication";
import type { QualityJobInput } from "../src/modules/quality/contract";

const job: QualityJobInput = {
  id: "j1",
  title: "Role",
  description: "Desc",
  companyName: "Co",
  sourceId: "src",
  externalId: "e1",
  locationId: "loc",
  postedAt: new Date("2026-08-20T00:00:00.000Z"),
  expiresAt: null,
  sourceUrl: null,
  skillCount: 0,
};

const referenceTime = new Date("2026-09-01T00:00:00.000Z");

test("freshness FRESH AGING STALE UNKNOWN via Phase 5 policy", () => {
  const fresh = assessFreshness({
    job,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
    },
    referenceTime,
  });
  assert.equal(fresh.assessment.status, "FRESH");
  assert.equal(fresh.assessment.method, "PHASE5_EVALUATE");

  const aging = assessFreshness({
    job: { ...job, postedAt: new Date("2026-08-10T00:00:00.000Z") },
    provenance: {
      observedAt: new Date("2026-08-10T00:00:00.000Z"),
      ingestedAt: "2026-08-10T01:00:00.000Z",
    },
    referenceTime,
  });
  assert.equal(aging.assessment.status, "AGING");

  const stale = assessFreshness({
    job: { ...job, postedAt: new Date("2026-06-01T00:00:00.000Z") },
    provenance: {
      observedAt: new Date("2026-06-01T00:00:00.000Z"),
      ingestedAt: "2026-06-01T01:00:00.000Z",
    },
    referenceTime,
  });
  assert.equal(stale.assessment.status, "STALE");

  const unknown = assessFreshness({
    job: { ...job, postedAt: null, expiresAt: null },
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
    },
    referenceTime,
  });
  assert.equal(unknown.assessment.status, "UNKNOWN");

  const first = assessFreshness({
    job,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
    },
    referenceTime,
  });
  const second = assessFreshness({
    job,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
    },
    referenceTime,
  });
  assert.deepEqual(first.assessment, second.assessment);
});

test("duplication and validation consume Evidence metadata or UNKNOWN", () => {
  assert.equal(
    assessDuplication({
      provenance: { observedAt: new Date(), dedupStatus: "UNIQUE" },
    }).assessment.status,
    "UNIQUE",
  );
  assert.equal(
    assessDuplication({
      provenance: { observedAt: new Date(), dedupStatus: "POSSIBLE_DUPLICATE" },
    }).assessment.status,
    "POSSIBLE_DUPLICATE",
  );
  assert.equal(
    assessDuplication({
      provenance: { observedAt: new Date(), dedupStatus: "DUPLICATE" },
    }).assessment.status,
    "DUPLICATE",
  );
  assert.equal(assessDuplication({ provenance: null }).assessment.status, "UNKNOWN");

  assert.equal(
    assessValidationSignal({
      provenance: { observedAt: new Date(), validationStatus: "VALID" },
    }).assessment.status,
    "VALID",
  );
  assert.equal(
    assessValidationSignal({
      provenance: { observedAt: new Date(), validationStatus: "REVIEW" },
    }).assessment.status,
    "REVIEW",
  );
  assert.equal(assessValidationSignal({ provenance: null }).assessment.status, "UNKNOWN");
});
