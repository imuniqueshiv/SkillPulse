import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../../src/modules/ingestion/contract";
import { createJobSourceAdapter } from "../../src/modules/ingestion/adapter";
import { AppError } from "../../src/utils/errors";

/**
 * Test-only synthetic posting shape. Not an NCS/Mahaswayam/data.gov.in record.
 */
export type FixtureJobPosting = {
  listingId?: string;
  jobTitle: string;
  summary?: string;
  skillsText?: string;
  company?: string;
  locationText?: string;
  applyUrl?: string;
  listedAt?: string;
  observedAt: string;
  ingestedAt: string;
};

export const FIXTURE_ADAPTER_NAME = "skillpulse-test-fixture";
export const FIXTURE_ADAPTER_VERSION = "0.0.1";
export const FIXTURE_SOURCE_CODE = "sp.source.demo-seed";

export const fixtureJobAdapter = createJobSourceAdapter<FixtureJobPosting>({
  name: FIXTURE_ADAPTER_NAME,
  version: FIXTURE_ADAPTER_VERSION,
  sourceCode: FIXTURE_SOURCE_CODE,
  map(record) {
    if (!record || typeof record !== "object") {
      throw new AppError(400, "Invalid fixture record");
    }

    if (typeof record.jobTitle !== "string" || record.jobTitle.trim() === "") {
      throw new AppError(400, "Invalid fixture record");
    }

    return {
      kind: INGESTION_RECORD_KIND.JOB,
      contractVersion: INGESTION_CONTRACT_VERSION,
      adapterName: FIXTURE_ADAPTER_NAME,
      adapterVersion: FIXTURE_ADAPTER_VERSION,
      payload: {
        sourceCode: FIXTURE_SOURCE_CODE,
        externalId: record.listingId,
        title: record.jobTitle,
        description: record.summary,
        employerName: record.company,
        location: record.locationText ? { raw: record.locationText } : undefined,
        sourceUrl: record.applyUrl,
        postedAt: record.listedAt,
        observedAt: record.observedAt,
        ingestedAt: record.ingestedAt,
        sourceMetadata:
          record.skillsText !== undefined
            ? { skillsText: record.skillsText }
            : undefined,
      },
    };
  },
});
