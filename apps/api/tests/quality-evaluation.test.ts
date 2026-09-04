import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  QUALITY_EVALUATION_DATA_CLASSIFICATION,
  QUALITY_EVALUATION_DATA_NOT_MARKET,
  isQualityEvaluationDataset,
  runQualityEvaluationDataset,
} from "../src/modules/quality/evaluate";
import { hydrateQualityEvaluationDataset } from "../src/modules/quality/evaluation-hydrate";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/quality.json",
);

test("quality evaluation dataset loads, is deterministic, and reports actual metrics", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8"));
  const frozen = structuredClone(raw);
  assert.equal(isQualityEvaluationDataset(raw), true);
  assert.equal(raw.classification, QUALITY_EVALUATION_DATA_CLASSIFICATION);
  assert.match(raw.note, new RegExp(QUALITY_EVALUATION_DATA_NOT_MARKET));
  assert.ok(raw.cases.length >= 15);

  const dataset = hydrateQualityEvaluationDataset(raw);
  const first = runQualityEvaluationDataset(dataset);
  const second = runQualityEvaluationDataset(dataset);

  assert.deepEqual(raw, frozen);
  assert.deepEqual(
    {
      eligibilityAccuracy: first.eligibilityAccuracy,
      reasonCodeAccuracy: first.reasonCodeAccuracy,
      freshnessAccuracy: first.freshnessAccuracy,
      duplicationAccuracy: first.duplicationAccuracy,
      sourceTrustAccuracy: first.sourceTrustAccuracy,
      intelligenceAccuracy: first.intelligenceAccuracy,
      completenessAccuracy: first.completenessAccuracy,
    },
    {
      eligibilityAccuracy: second.eligibilityAccuracy,
      reasonCodeAccuracy: second.reasonCodeAccuracy,
      freshnessAccuracy: second.freshnessAccuracy,
      duplicationAccuracy: second.duplicationAccuracy,
      sourceTrustAccuracy: second.sourceTrustAccuracy,
      intelligenceAccuracy: second.intelligenceAccuracy,
      completenessAccuracy: second.completenessAccuracy,
    },
  );

  const mismatches = first.outcomes
    .filter(
      (row) =>
        !row.eligibilityMatch ||
        row.reasonCodesMatch === false ||
        row.freshnessMatch === false ||
        row.duplicationMatch === false ||
        row.sourceTrustMatch === false ||
        row.intelligenceMatch === false ||
        row.completenessMatch === false,
    )
    .map((row) => row.id);

  console.log(
    "QUALITY_EVALUATION_METRICS",
    JSON.stringify({
      caseCount: first.caseCount,
      eligibilityAccuracy: first.eligibilityAccuracy,
      reasonCodeAccuracy: first.reasonCodeAccuracy,
      freshnessAccuracy: first.freshnessAccuracy,
      duplicationAccuracy: first.duplicationAccuracy,
      sourceTrustAccuracy: first.sourceTrustAccuracy,
      intelligenceAccuracy: first.intelligenceAccuracy,
      completenessAccuracy: first.completenessAccuracy,
      limitation: first.limitation,
      mismatchIds: mismatches,
    }),
  );

  assert.equal(mismatches.length, 0, `mismatches: ${mismatches.join(",")}`);
});
