import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  buildDecisionEvaluationCase,
  checkDecisionEvaluationCase,
  isDecisionEvaluationDataset,
  DECISION_EVALUATION_DATA_CLASSIFICATION,
  type DecisionEvaluationDataset,
} from "../src/modules/decision/evaluate";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/decision-intelligence.json",
);

test("decision evaluation dataset is synthetic and cases pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isDecisionEvaluationDataset(raw));
  const dataset = raw as DecisionEvaluationDataset;
  assert.match(dataset.classification, /SYNTHETIC/i);
  assert.match(dataset.note, /Not government decision evidence/i);
  assert.equal(
    dataset.classification,
    DECISION_EVALUATION_DATA_CLASSIFICATION,
  );

  let passed = 0;
  const failures: string[] = [];
  for (const c of dataset.cases) {
    const built = buildDecisionEvaluationCase(c);
    const caseFailures = checkDecisionEvaluationCase(c, built);
    if (caseFailures.length === 0) {
      passed += 1;
    } else {
      failures.push(`${c.id}: ${caseFailures.join("; ")}`);
    }
  }

  console.log(
    "DECISION_EVALUATION_METRICS",
    JSON.stringify({
      caseCount: dataset.cases.length,
      passed,
      failed: failures.length,
      failures,
    }),
  );
  assert.equal(failures.length, 0, failures.join("\n"));
  assert.equal(passed, dataset.cases.length);
});
