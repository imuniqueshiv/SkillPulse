import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
  type SourceAdapter,
} from "../src/modules/ingestion/contract";
import {
  IngestionContractError,
  parseJobIngestionRecord,
  safeParseJobIngestionRecord,
} from "../src/modules/ingestion/validate";

const OBSERVED_AT = "2026-09-02T10:00:00.000Z";
const INGESTED_AT = "2026-09-02T10:05:00.000Z";
const SOURCE_ID = "11111111-1111-4111-8111-111111111111";

type FixturePosting = {
  heading: string;
  sourceJobId?: string;
  body?: string;
  company?: string;
  place?: string;
  pay?: string;
  listingUrl?: string;
  listedAt?: string;
};

const fixtureAdapter: SourceAdapter<FixturePosting> = {
  name: "in-memory-fixture",
  version: "0.0.1",
  toContract(source) {
    return {
      kind: INGESTION_RECORD_KIND.JOB,
      contractVersion: INGESTION_CONTRACT_VERSION,
      adapterName: this.name,
      adapterVersion: this.version,
      payload: {
        sourceCode: "sp.source.demo-seed",
        externalId: source.sourceJobId,
        title: source.heading,
        description: source.body,
        employerName: source.company,
        location: source.place ? { raw: source.place } : undefined,
        salary: source.pay ? { raw: source.pay } : undefined,
        sourceUrl: source.listingUrl,
        postedAt: source.listedAt,
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
        rawRef: "fixture:memory:1",
      },
    };
  },
};

function envelope(
  payload: Record<string, unknown>,
  extra?: Record<string, unknown>,
) {
  return {
    kind: INGESTION_RECORD_KIND.JOB,
    contractVersion: INGESTION_CONTRACT_VERSION,
    adapterName: "in-memory-fixture",
    adapterVersion: "0.0.1",
    payload,
    ...extra,
  };
}

test("valid complete job record", () => {
  const record = parseJobIngestionRecord(
    envelope({
      sourceId: SOURCE_ID,
      sourceCode: "sp.source.ncs",
      externalId: "ncs-obs-1",
      title: "Machine Operator",
      description: "Operate CNC equipment. React.js / React JS mentioned as-is.",
      employerName: "Example Works",
      location: {
        raw: "Pune, Maharashtra",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
      },
      employmentType: "Full-time",
      experience: "2-3 years",
      qualification: "ITI Fitter",
      salary: { raw: "INR 18000-22000", min: 18000, max: 22000, currency: "INR" },
      sourceUrl: "https://www.ncs.gov.in/",
      postedAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-09-30T18:30:00+05:30",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
      sourceMetadata: { listingPage: "search-results" },
      rawRef: "ncs:listing:ncs-obs-1",
    }),
  );

  assert.equal(record.kind, "JOB");
  assert.equal(record.contractVersion, "1");
  assert.equal(record.payload.title, "Machine Operator");
  assert.match(
    record.payload.description ?? "",
    /React\.js \/ React JS/,
  );
  assert.equal(record.payload.externalId, "ncs-obs-1");
  assert.ok(record.payload.observedAt instanceof Date);
  assert.ok(record.payload.ingestedAt instanceof Date);
  assert.ok(record.payload.postedAt instanceof Date);
  assert.ok(record.payload.expiresAt instanceof Date);
  assert.equal(record.payload.sourceCode, "sp.source.ncs");
  assert.equal(record.payload.sourceId, SOURCE_ID);
});

test("valid minimal job record", () => {
  const record = parseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(record.payload.title, "Machine Operator");
  assert.equal(record.payload.description, undefined);
  assert.equal(record.payload.employerName, undefined);
  assert.equal(record.payload.salary, undefined);
  assert.equal(record.payload.externalId, undefined);
  assert.equal(record.payload.postedAt, undefined);
  assert.equal(record.payload.sourceUrl, undefined);
});

test("missing source identity", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("Source identity is required"),
    ),
  );
});

test("missing title", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(result.error.issues.some((issue) => issue.path === "payload.title"));
});

test("invalid title type", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      title: 123,
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.success, false);
});

test("invalid observedAt", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      title: "Machine Operator",
      observedAt: "not-a-date",
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(
    result.error.issues.some((issue) => issue.path === "payload.observedAt"),
  );
});

test("invalid ingestedAt", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: "yesterday",
    }),
  );

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(
    result.error.issues.some((issue) => issue.path === "payload.ingestedAt"),
  );
});

test("invalid source URL", () => {
  const result = safeParseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.ncs",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
      sourceUrl: "ftp://example.com/job",
    }),
  );

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(
    result.error.issues.some((issue) => issue.path === "payload.sourceUrl"),
  );
});

test("optional externalId accepted", () => {
  const withId = parseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.data-gov-in",
      title: "Field Enumerator",
      externalId: "ext-99",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );
  const withoutId = parseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.data-gov-in",
      title: "Field Enumerator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(withId.payload.externalId, "ext-99");
  assert.equal(withoutId.payload.externalId, undefined);
});

test("optional salary, description, employer, and location accepted", () => {
  const record = parseJobIngestionRecord(
    envelope({
      sourceId: SOURCE_ID,
      title: "Welder",
      description: "Shop-floor welding",
      employerName: "Local Fabricators",
      location: { city: "Nagpur", state: "Maharashtra" },
      salary: { min: 15000, currency: "INR" },
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: new Date(INGESTED_AT),
    }),
  );

  assert.equal(record.payload.employerName, "Local Fabricators");
  assert.equal(record.payload.location?.city, "Nagpur");
  assert.equal(record.payload.salary?.min, 15000);
  assert.equal(record.payload.qualification, undefined);
  assert.equal(record.payload.experience, undefined);
});

test("provenance is preserved from registered source identity", () => {
  const record = parseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.mahaswayam-rojgar",
      title: "Data Entry Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
      rawRef: "mahaswayam:notice:42",
    }),
  );

  assert.equal(record.payload.sourceCode, "sp.source.mahaswayam-rojgar");
  assert.equal(record.payload.rawRef, "mahaswayam:notice:42");
  assert.equal(record.payload.sourceId, undefined);
});

test("contractVersion and adapterVersion are recorded and unknown contract is rejected", () => {
  const record = parseJobIngestionRecord(
    envelope({
      sourceCode: "sp.source.dgt",
      title: "ITI Instructor",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );

  assert.equal(record.contractVersion, INGESTION_CONTRACT_VERSION);
  assert.equal(record.adapterName, "in-memory-fixture");
  assert.equal(record.adapterVersion, "0.0.1");

  const unknownVersion = safeParseJobIngestionRecord(
    envelope(
      {
        sourceCode: "sp.source.dgt",
        title: "ITI Instructor",
        observedAt: OBSERVED_AT,
        ingestedAt: INGESTED_AT,
      },
      { contractVersion: "2" },
    ),
  );

  assert.equal(unknownVersion.success, false);
});

test("in-memory fixture adapter maps into a validated contract", () => {
  const mapped = fixtureAdapter.toContract({
    heading: "Machine Operator",
    sourceJobId: "fix-1",
    body: "React.js / React JS",
    company: "Fixture Co",
    place: "Mumbai",
    pay: "Not disclosed",
    listingUrl: "https://example.com/jobs/fix-1",
    listedAt: "2026-08-15T00:00:00.000Z",
  });

  const record = parseJobIngestionRecord(mapped);
  assert.equal(record.adapterName, fixtureAdapter.name);
  assert.equal(record.adapterVersion, fixtureAdapter.version);
  assert.equal(record.payload.title, "Machine Operator");
  assert.equal(record.payload.description, "React.js / React JS");
  assert.equal(record.payload.externalId, "fix-1");
  assert.equal(record.payload.sourceCode, "sp.source.demo-seed");
});

test("parseJobIngestionRecord throws IngestionContractError", () => {
  assert.throws(
    () =>
      parseJobIngestionRecord(
        envelope({
          sourceCode: "sp.source.ncs",
          title: "",
          observedAt: OBSERVED_AT,
          ingestedAt: INGESTED_AT,
        }),
      ),
    IngestionContractError,
  );
});
