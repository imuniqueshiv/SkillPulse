import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareJobText, tidyJobText } from "../src/modules/intelligence/job-text";

test("prepareJobText handles normal, title-only, description-only, and nulls", () => {
  const job = {
    id: "job-1",
    title: "  Software Developer  ",
    description: "Build\n\n\nReact.js apps.",
  };
  const frozen = Object.freeze({ ...job });
  const prepared = prepareJobText(frozen);

  assert.equal(frozen.title, "  Software Developer  ");
  assert.equal(frozen.description, "Build\n\n\nReact.js apps.");
  assert.equal(prepared.title, "  Software Developer  ");
  assert.equal(prepared.titlePrepared, "Software Developer");
  assert.equal(prepared.descriptionPrepared, "Build\n\nReact.js apps.");
  assert.match(prepared.analysisText, /Software Developer/);
  assert.match(prepared.analysisText, /React\.js/);

  const titleOnly = prepareJobText({ id: "job-2", title: "Nurse", description: null });
  assert.equal(titleOnly.description, null);
  assert.equal(titleOnly.analysisText, "Nurse");

  const emptyDescription = prepareJobText({ id: "job-3", title: "Clerk", description: undefined });
  assert.equal(emptyDescription.description, null);

  const descriptionOnly = prepareJobText({ id: "job-4", title: "", description: "Warehouse duty" });
  assert.equal(descriptionOnly.analysisText, "Warehouse duty");
});

test("tidyJobText preserves technical punctuation and does not lowercase", () => {
  assert.equal(tidyJobText("C++  and  C# / .NET"), "C++ and C# / .NET");
  assert.equal(tidyJobText("Node.js, React.js, REST APIs"), "Node.js, React.js, REST APIs");
  assert.equal(tidyJobText("AWS   platform"), "AWS platform");
  assert.equal(tidyJobText(null), "");
  assert.equal(tidyJobText(undefined), "");
});
