import assert from "node:assert/strict";
import { test } from "node:test";
import { assessSourceTrust } from "../src/modules/quality/source-trust";

test("source trust: known active, unverified, and missing", () => {
  const known = assessSourceTrust({
    sourceId: "src-1",
    source: {
      id: "src-1",
      code: "sp.source.demo",
      name: "Demo",
      active: true,
      reliability: null,
      type: "OTHER",
      geographicScope: "INDIA",
    },
  });
  assert.equal(known.assessment.trustLevel, "STANDARD");
  assert.equal(known.assessment.method, "SOURCE_REGISTRY");
  assert.match(known.assessment.reason, /No explicit verification/i);

  const unresolved = assessSourceTrust({
    sourceId: "missing",
    source: null,
  });
  assert.equal(unresolved.assessment.trustLevel, "UNVERIFIED");

  const none = assessSourceTrust({ sourceId: null, source: null });
  assert.equal(none.assessment.trustLevel, "UNVERIFIED");
  assert.equal(none.assessment.method, "NO_SOURCE");
  assert.equal(none.checks[0]?.status, "FAIL");

  const inactive = assessSourceTrust({
    sourceId: "src-2",
    source: {
      id: "src-2",
      code: "sp.source.old",
      name: "Old",
      active: false,
      reliability: null,
      type: "OTHER",
      geographicScope: "STATE",
    },
  });
  assert.equal(inactive.assessment.trustLevel, "UNVERIFIED");
});
