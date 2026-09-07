import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  buildInstituteEvaluationCase,
  checkInstituteEvaluationCase,
  isInstituteEvaluationDataset,
  INSTITUTE_EVALUATION_DATA_CLASSIFICATION,
  type InstituteEvaluationDataset,
} from "../src/modules/institute/evaluate";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/institute-intelligence.json",
);

test("institute evaluation dataset is synthetic and cases pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isInstituteEvaluationDataset(raw));
  const dataset = raw as InstituteEvaluationDataset;
  assert.match(dataset.classification, /SYNTHETIC/i);
  assert.match(dataset.note, /NOT REAL/i);
  assert.equal(
    dataset.classification,
    INSTITUTE_EVALUATION_DATA_CLASSIFICATION,
  );

  let passed = 0;
  const failures: string[] = [];
  for (const c of dataset.cases) {
    const built = buildInstituteEvaluationCase(c);
    const caseFailures = checkInstituteEvaluationCase(c, built);
    if (caseFailures.length === 0) {
      passed += 1;
    } else {
      failures.push(`${c.id}: ${caseFailures.join("; ")}`);
    }
  }

  console.log(
    "INSTITUTE_EVALUATION_METRICS",
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
