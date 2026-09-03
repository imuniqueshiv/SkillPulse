import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createJobSourceAdapter,
  getJobSourceAdapter,
  listJobSourceAdapters,
  registerJobSourceAdapter,
  resetJobSourceAdapters,
} from "../src/modules/ingestion/adapter";
import { INGESTION_CONTRACT_VERSION } from "../src/modules/ingestion/contract";
import { IngestionContractError } from "../src/modules/ingestion/validate";
import { AppError } from "../src/utils/errors";
import {
  FIXTURE_ADAPTER_NAME,
  FIXTURE_ADAPTER_VERSION,
  FIXTURE_SOURCE_CODE,
  fixtureJobAdapter,
  type FixtureJobPosting,
} from "./fixtures/fixture-job-adapter";

const OBSERVED_AT = "2026-09-02T10:00:00.000Z";
const INGESTED_AT = "2026-09-02T10:05:00.000Z";

const validFixture: FixtureJobPosting = {
  listingId: "fix-1",
  jobTitle: "Machine Operator",
  summary: "Shop floor role. React.js / React JS",
  skillsText: "React.js / React JS",
  company: "Fixture Works",
  locationText: "Pune",
  applyUrl: "https://example.com/jobs/fix-1",
  listedAt: "2026-08-15T00:00:00.000Z",
  observedAt: OBSERVED_AT,
  ingestedAt: INGESTED_AT,
};

afterEach(() => {
  resetJobSourceAdapters();
});

test("fixture adapter registration and lookup", () => {
  registerJobSourceAdapter(fixtureJobAdapter);
  const found = getJobSourceAdapter(FIXTURE_SOURCE_CODE);
  assert.equal(found.name, FIXTURE_ADAPTER_NAME);
  assert.equal(found.version, FIXTURE_ADAPTER_VERSION);
  assert.equal(found.sourceCode, FIXTURE_SOURCE_CODE);
  assert.deepEqual(listJobSourceAdapters(), [
    {
      name: FIXTURE_ADAPTER_NAME,
      version: FIXTURE_ADAPTER_VERSION,
      sourceCode: FIXTURE_SOURCE_CODE,
    },
  ]);
});

test("duplicate adapter registration is rejected", () => {
  registerJobSourceAdapter(fixtureJobAdapter);
  assert.throws(
    () => registerJobSourceAdapter(fixtureJobAdapter),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.message === "Adapter already registered for source",
  );
});

test("unknown adapter is rejected", () => {
  registerJobSourceAdapter(fixtureJobAdapter);
  assert.throws(
    () => getJobSourceAdapter("sp.source.ncs"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.message === "Unknown source adapter",
  );
});

test("fixture mapping produces a valid Phase 5.2 contract", () => {
  const record = fixtureJobAdapter.parse(validFixture);

  assert.equal(record.kind, "JOB");
  assert.equal(record.contractVersion, INGESTION_CONTRACT_VERSION);
  assert.equal(record.adapterName, FIXTURE_ADAPTER_NAME);
  assert.equal(record.adapterVersion, FIXTURE_ADAPTER_VERSION);
  assert.equal(record.payload.sourceCode, FIXTURE_SOURCE_CODE);
  assert.equal(record.payload.externalId, "fix-1");
  assert.equal(record.payload.title, "Machine Operator");
  assert.equal(record.payload.description, "Shop floor role. React.js / React JS");
  assert.equal(record.payload.sourceMetadata?.skillsText, "React.js / React JS");
  assert.equal(record.payload.employerName, "Fixture Works");
});

test("invalid fixture is rejected", () => {
  assert.throws(
    () =>
      fixtureJobAdapter.parse({
        jobTitle: "  ",
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "Invalid fixture record",
  );
});

test("malformed mapping is rejected by the Phase 5.2 parser", () => {
  const broken = createJobSourceAdapter({
    name: "broken-fixture",
    version: "0.0.1",
    sourceCode: FIXTURE_SOURCE_CODE,
    map() {
      return {
        kind: "JOB",
        contractVersion: INGESTION_CONTRACT_VERSION,
        adapterName: "broken-fixture",
        adapterVersion: "0.0.1",
        payload: {
          sourceCode: FIXTURE_SOURCE_CODE,
          title: 123,
          observedAt: OBSERVED_AT,
          ingestedAt: INGESTED_AT,
        },
      };
    },
  });

  assert.throws(() => broken.parse({}), IngestionContractError);
});
