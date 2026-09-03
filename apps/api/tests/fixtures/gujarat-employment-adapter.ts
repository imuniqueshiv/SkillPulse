import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../../src/modules/ingestion/contract";
import { createJobSourceAdapter } from "../../src/modules/ingestion/adapter";
import { AppError } from "../../src/utils/errors";

/**
 * Test-only second-state fixture. Not a real Gujarat employment feed.
 * Proves a new adapter can use the same Phase 5.11 pipeline.
 */
export type GujaratFixtureRecord = {
  jobId?: string;
  title?: string;
  company?: string;
  city?: string;
  state?: string;
  skills?: string[];
  observedAt: string;
  ingestedAt: string;
};

export const GUJARAT_FIXTURE_ADAPTER_NAME = "skillpulse-test-gujarat-employment";
export const GUJARAT_FIXTURE_ADAPTER_VERSION = "0.0.1";
export const GUJARAT_FIXTURE_SOURCE_CODE = "sp.source.fixture-gujarat-employment";

export function createGujaratEmploymentFixtureAdapter(sourceCode: string) {
  return createJobSourceAdapter<GujaratFixtureRecord>({
    name: GUJARAT_FIXTURE_ADAPTER_NAME,
    version: GUJARAT_FIXTURE_ADAPTER_VERSION,
    sourceCode,
    map(record) {
      if (!record || typeof record !== "object") {
        throw new AppError(400, "Invalid Gujarat fixture record");
      }

      const skills = Array.isArray(record.skills)
        ? record.skills.filter((item): item is string => typeof item === "string")
        : [];

      return {
        kind: INGESTION_RECORD_KIND.JOB,
        contractVersion: INGESTION_CONTRACT_VERSION,
        adapterName: GUJARAT_FIXTURE_ADAPTER_NAME,
        adapterVersion: GUJARAT_FIXTURE_ADAPTER_VERSION,
        payload: {
          sourceCode,
          externalId: record.jobId,
          title: typeof record.title === "string" ? record.title : "",
          employerName: record.company,
          location: {
            city: record.city,
            state: record.state,
            raw: [record.city, record.state].filter(Boolean).join(", "),
          },
          observedAt: record.observedAt,
          ingestedAt: record.ingestedAt,
          sourceMetadata: skills.length > 0 ? { skills } : undefined,
        },
      };
    },
  });
}

export const gujaratEmploymentFixtureAdapter =
  createGujaratEmploymentFixtureAdapter(GUJARAT_FIXTURE_SOURCE_CODE);
