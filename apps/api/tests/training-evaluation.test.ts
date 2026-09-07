import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  TRAINING_EVALUATION_DATA_CLASSIFICATION,
  TRAINING_EVALUATION_DATA_NOT_MARKET,
  buildTrainingEvaluationCase,
  evaluateTrainingCase,
  isTrainingEvaluationDataset,
  type TrainingEvaluationCase,
} from "../src/modules/training/evaluate";
import { summarizeTrainingIntelligence } from "../src/modules/training";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/training-intelligence.json",
);

test("training evaluation dataset is synthetic and cases pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isTrainingEvaluationDataset(raw));
  assert.equal(raw.classification, TRAINING_EVALUATION_DATA_CLASSIFICATION);
  assert.match(raw.note, new RegExp(TRAINING_EVALUATION_DATA_NOT_MARKET, "i"));

  const outcomes = raw.cases.map((meta) => {
    const built = buildTrainingEvaluationCase(meta as TrainingEvaluationCase);
    const summary = summarizeTrainingIntelligence({
      gapSummary: built.gapSummary,
      programs: built.programs,
      trainingCapacityBySkill: built.capacity,
    });
    return evaluateTrainingCase({
      id: built.id,
      summary,
      expected: built.expected,
    });
  });

  console.log(
    "TRAINING_EVALUATION_METRICS",
    JSON.stringify({
      caseCount: outcomes.length,
      passed: outcomes.filter((o) => o.pass).length,
      failed: outcomes.filter((o) => !o.pass).length,
      failures: outcomes.filter((o) => !o.pass),
    }),
  );
  assert.equal(outcomes.every((o) => o.pass), true);
});
