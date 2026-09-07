import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  buildEmploymentEvaluationCase,
  checkEmploymentEvaluationCase,
  isEmploymentEvaluationDataset,
  EMPLOYMENT_EVALUATION_DATA_CLASSIFICATION,
  type EmploymentEvaluationDataset,
} from "../src/modules/employment/evaluate";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/employment-intelligence.json",
);

test("employment evaluation dataset is synthetic and cases pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isEmploymentEvaluationDataset(raw));
  const dataset = raw as EmploymentEvaluationDataset;
  assert.match(dataset.classification, /SYNTHETIC/i);
  assert.match(dataset.note, /NOT REAL/i);
  assert.equal(
    dataset.classification,
    EMPLOYMENT_EVALUATION_DATA_CLASSIFICATION,
  );

  let passed = 0;
  const failures: string[] = [];
  for (const c of dataset.cases) {
    const built = buildEmploymentEvaluationCase(c);
    const caseFailures = checkEmploymentEvaluationCase(c, built);
    if (caseFailures.length === 0) {
      passed += 1;
    } else {
      failures.push(`${c.id}: ${caseFailures.join("; ")}`);
    }
  }

  console.log(
    "EMPLOYMENT_EVALUATION_METRICS",
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
