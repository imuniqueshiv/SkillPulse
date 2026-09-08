import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { INGESTION_CONTRACT_VERSION } from "../src/modules/ingestion/contract";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import {
  describeNcsAccess,
  NCS_ACCESS_MODE,
  NCS_SOURCE_CODE,
  resolveNcsAccessMode,
} from "../src/modules/ingestion/sources/ncs-access";
import {
  NCS_ADAPTER_NAME,
  NCS_ADAPTER_VERSION,
  ncsAdapter,
} from "../src/modules/ingestion/sources/ncs";

const OBSERVED_AT = "2026-09-08T10:00:00.000Z";
const INGESTED_AT = "2026-09-08T10:05:00.000Z";

const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/ncs-maharashtra.sample.json",
);

test("NCS access modes distinguish source availability from live access", () => {
  assert.equal(resolveNcsAccessMode({ mode: "disabled" }), NCS_ACCESS_MODE.DISABLED);
  assert.equal(
    resolveNcsAccessMode({ mode: "synthetic" }),
    NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
  );
  assert.equal(
    resolveNcsAccessMode({ mode: "file" }),
    NCS_ACCESS_MODE.AUTHORIZED_FILE,
  );
  assert.equal(
    resolveNcsAccessMode({ mode: "api" }),
    NCS_ACCESS_MODE.AUTHORIZED_API,
  );
  assert.equal(
    resolveNcsAccessMode({ mode: "public" }),
    NCS_ACCESS_MODE.PUBLIC_PAGE,
  );
  assert.throws(() => resolveNcsAccessMode({ mode: "live" }));
  assert.throws(() => resolveNcsAccessMode({ liveEnabled: "true" }));

  const disabled = describeNcsAccess(NCS_ACCESS_MODE.DISABLED);
  assert.equal(disabled.sourceAvailable, true);
  assert.equal(disabled.accessConfigured, false);
  assert.equal(disabled.liveAccessImplemented, false);
  assert.equal(disabled.realNcsDataIngested, false);
  assert.equal(disabled.publicPageCollectorImplemented, false);

  const synthetic = describeNcsAccess(NCS_ACCESS_MODE.SYNTHETIC_FIXTURE);
  assert.equal(synthetic.accessConfigured, true);
  assert.equal(synthetic.liveAccessImplemented, false);
  assert.match(synthetic.notes.join(" "), /SYNTHETIC/i);

  const api = describeNcsAccess(NCS_ACCESS_MODE.AUTHORIZED_API);
  assert.equal(api.accessConfigured, true);
  assert.equal(api.liveAccessImplemented, false);
  assert.match(api.notes.join(" "), /AUTHORIZED_API/);

  const publicPage = describeNcsAccess(NCS_ACCESS_MODE.PUBLIC_PAGE);
  assert.equal(publicPage.accessConfigured, true);
  assert.equal(publicPage.publicPageCollectorImplemented, false);
  assert.match(publicPage.notes.join(" "), /PUBLIC_PAGE/);
  assert.match(publicPage.notes.join(" "), /scrape/i);
});

test("synthetic NCS fixture is labelled and is not real NCS data", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    sourceCode: string;
    acquisition: string;
    accessClass: string;
    note: string;
    records: unknown[];
  };
  assert.equal(sample.sourceCode, NCS_SOURCE_CODE);
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.equal(sample.accessClass, "SYNTHETIC_FIXTURE");
  assert.match(sample.note, /NOT REAL NCS DATA/i);
  assert.match(sample.note, /SYNTHETIC/i);
  assert.ok(sample.records.length >= 10);
  assert.ok(sample.records.length <= 20);
});

test("NCS adapter maps source fields without inventing missing values", () => {
  const mapped = ncsAdapter.parse({
    job_id: "NCS-MH-1001",
    title: "Software Developer",
    description: "Build apps",
    employer_name: "Pune Software Labs",
    city: "Pune",
    district: "Pune",
    state: "Maharashtra",
    sector: "Information Technology",
    functional_role: "Software Development",
    required_skills: ["React.js"],
    preferred_skills: ["TypeScript"],
    experience: "2-4 years",
    education: "B.E.",
    salary_min: 600000,
    salary_max: 900000,
    salary_currency: "INR",
    posted_on: "2026-08-01T00:00:00.000Z",
    notice_url: "https://www.ncs.gov.in/example/notices/NCS-MH-1001",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  assert.equal(mapped.kind, "JOB");
  assert.equal(mapped.contractVersion, INGESTION_CONTRACT_VERSION);
  assert.equal(mapped.adapterName, NCS_ADAPTER_NAME);
  assert.equal(mapped.adapterVersion, NCS_ADAPTER_VERSION);
  assert.equal(mapped.payload.sourceCode, NCS_SOURCE_CODE);
  assert.equal(mapped.payload.externalId, "NCS-MH-1001");
  assert.equal(mapped.payload.title, "Software Developer");
  assert.equal(mapped.payload.employerName, "Pune Software Labs");
  assert.equal(mapped.payload.location?.state, "Maharashtra");
  assert.equal(mapped.payload.location?.district, "Pune");
  assert.equal(mapped.payload.experience, "2-4 years");
  assert.equal(mapped.payload.qualification, "B.E.");
  assert.equal(mapped.payload.salary?.min, 600000);
  assert.equal(mapped.payload.postedAt?.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.deepEqual(mapped.payload.sourceMetadata?.skills, [
    "React.js",
    "TypeScript",
  ]);
  assert.equal(
    mapped.payload.sourceMetadata?.sourceFunctionalRole,
    "Software Development",
  );
  assert.equal(
    mapped.payload.sourceMetadata?.sourceSector,
    "Information Technology",
  );
});

test("missing optional NCS fields stay undefined; postedAt not invented", () => {
  const mapped = ncsAdapter.parse({
    job_id: "NCS-MH-MIN",
    title: "Store Associate",
    state: "Maharashtra",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  assert.equal(mapped.payload.description, undefined);
  assert.equal(mapped.payload.employerName, undefined);
  assert.equal(mapped.payload.experience, undefined);
  assert.equal(mapped.payload.qualification, undefined);
  assert.equal(mapped.payload.salary, undefined);
  assert.equal(mapped.payload.postedAt, undefined);
  assert.equal(mapped.payload.sourceUrl, undefined);
  assert.equal(mapped.payload.location?.district, undefined);
  assert.equal(mapped.payload.location?.state, "Maharashtra");
  assert.equal(mapped.payload.sourceMetadata, undefined);
});

test("malformed postedAt is rejected by Phase 5 validation, not invented", () => {
  const mapped = ncsAdapter.map({
    job_id: "NCS-MH-BAD-DATE",
    title: "Quality Inspector",
    state: "Maharashtra",
    posted_on: "not-a-valid-date",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  const validation = validateJobIngestion(mapped);
  assert.equal(validation.status, "REJECTED");
  assert.equal(validation.record, null);
});

test("source functional_role is not copied as derived occupation", () => {
  const mapped = ncsAdapter.parse({
    job_id: "NCS-MH-ROLE",
    title: "Software Developer",
    functional_role: "Software Development",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  assert.equal(
    mapped.payload.sourceMetadata?.sourceFunctionalRole,
    "Software Development",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(mapped.payload, "occupation"),
    false,
  );
});

test("Maharashtra filter leaves Gujarat records distinguishable in fixture", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    records: Array<{ job_id?: string; state?: string }>;
  };
  const mh = sample.records.filter((row) => row.state === "Maharashtra");
  const gj = sample.records.filter((row) => row.state === "Gujarat");
  assert.ok(mh.length >= 8);
  assert.equal(gj.length, 1);
  assert.equal(gj[0]?.job_id, "NCS-GJ-9001");
});
