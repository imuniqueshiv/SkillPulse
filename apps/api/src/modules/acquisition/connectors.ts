import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NcsAcquisitionConnector, AcquireRequest, AcquiredBatch } from "./connector";
import { AcquisitionError, ACQUISITION_FAILURE } from "./errors";
import { computeBatchChecksum } from "./hash";
import {
  NCS_ACCESS_MODE,
  NCS_SOURCE_CODE,
  NCS_SOURCE_URL,
  isPublicPagePermitted,
  type NcsAccessMode,
} from "../ingestion/sources/ncs-access";
import { NCS_ADAPTER_VERSION } from "../ingestion/sources/ncs";
import {
  isPublicListingJobCard,
  normalizePublicListingJob,
  recordMatchesGeoFilter,
} from "../ingestion/sources/ncs-public-listing";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function filterRecords(
  records: Record<string, unknown>[],
  request: AcquireRequest,
): Record<string, unknown>[] {
  let filtered = records.filter((row) =>
    recordMatchesGeoFilter(row, {
      state: request.state,
      district: request.district,
      city: request.city,
    }),
  );
  if (
    typeof request.limit === "number" &&
    Number.isFinite(request.limit) &&
    request.limit >= 0
  ) {
    filtered = filtered.slice(0, Math.floor(request.limit));
  }
  return filtered;
}

export type ParsedNcsFile = {
  records: Record<string, unknown>[];
  acquisition?: string;
  sourceFile?: string;
  reportedTotalOnPage?: number | null;
  extractedCount?: number | null;
};

/**
 * Load an NCS-shaped file.
 * Supports:
 * - { records: [...] } skillpulse sample / authorized shaped export
 * - { jobs: [...] } captured public job-listing snapshot
 */
export function parseNcsShapedFile(
  path: string,
  retrievalTime: Date,
): ParsedNcsFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SCHEMA_CHANGED,
      "NCS-shaped file is not valid JSON",
    );
  }
  if (!isPlainObject(parsed)) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SCHEMA_CHANGED,
      "NCS-shaped file must be a JSON object",
    );
  }

  const sourceFile =
    typeof parsed.source_file === "string" ? parsed.source_file : undefined;
  const reportedTotalOnPage =
    typeof parsed.total_jobs_reported_by_source === "number"
      ? parsed.total_jobs_reported_by_source
      : null;
  const extractedCount =
    typeof parsed.job_cards_extracted_from_provided_content === "number"
      ? parsed.job_cards_extracted_from_provided_content
      : null;

  if (Array.isArray(parsed.jobs)) {
    const records: Record<string, unknown>[] = [];
    for (const row of parsed.jobs) {
      if (!isPlainObject(row) || !isPublicListingJobCard(row)) {
        continue;
      }
      const normalized = normalizePublicListingJob(row, {
        retrievalTime,
        sourceFile: sourceFile ?? "https://ncs.gov.in/job-listing",
        reportedTotalOnPage,
      });
      if (normalized) {
        records.push(normalized as unknown as Record<string, unknown>);
      }
    }
    if (records.length === 0) {
      throw new AcquisitionError(
        ACQUISITION_FAILURE.SCHEMA_CHANGED,
        "NCS public-listing file has a jobs array but no mappable job cards",
      );
    }
    return {
      records,
      acquisition:
        typeof parsed.acquisition === "string"
          ? parsed.acquisition
          : "public-listing-snapshot",
      sourceFile,
      reportedTotalOnPage,
      extractedCount,
    };
  }

  if (!Array.isArray(parsed.records)) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SCHEMA_CHANGED,
      "NCS-shaped file must contain a records or jobs array",
    );
  }

  return {
    records: parsed.records.filter(isPlainObject),
    acquisition:
      typeof parsed.acquisition === "string" ? parsed.acquisition : undefined,
    sourceFile,
    reportedTotalOnPage,
    extractedCount,
  };
}

function ncsIdentity() {
  return {
    sourceCode: NCS_SOURCE_CODE,
    sourceName: "National Career Service",
    sourceUrl: NCS_SOURCE_URL,
  };
}

export function defaultSyntheticFixturePath(): string {
  const relative = "data/sample/ingestion/ncs-maharashtra.sample.json";
  const candidates = [
    resolve(process.cwd(), relative),
    resolve(process.cwd(), "../../", relative),
    resolve(__dirname, "../../../../../", relative),
    resolve(__dirname, "../../../../", relative),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
      "Synthetic NCS fixture file was not found",
    );
  }
  return found;
}

export function defaultMaharashtraRawSnapshotPath(): string {
  const relative = "data/raw/ncs/maharashtra/ncs-maharashtra-2026-09-08.json";
  const candidates = [
    resolve(process.cwd(), relative),
    resolve(process.cwd(), "../../", relative),
    resolve(__dirname, "../../../../../", relative),
    resolve(__dirname, "../../../../", relative),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
      "Maharashtra NCS raw snapshot was not found",
    );
  }
  return found;
}

export function createSyntheticFixtureConnector(): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
    accessMethod: "SYNTHETIC_FIXTURE",
    identity: ncsIdentity(),
    async acquire(request: AcquireRequest): Promise<AcquiredBatch> {
      const path = request.inputPath ?? defaultSyntheticFixturePath();
      const retrievalTime = new Date(request.observedAt);
      const file = parseNcsShapedFile(path, retrievalTime);
      if (file.acquisition !== "synthetic-fixture") {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SCHEMA_CHANGED,
          "Synthetic mode requires acquisition=synthetic-fixture",
        );
      }
      const records = filterRecords(file.records, request);
      return {
        records,
        sourceReference: path,
        retrievalTime,
        accessMethod: "SYNTHETIC_FIXTURE",
        checksum: computeBatchChecksum(records),
        parserVersion: NCS_ADAPTER_VERSION,
      };
    },
  };
}

export function createAuthorizedFileConnector(): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.AUTHORIZED_FILE,
    accessMethod: "AUTHORIZED_FILE",
    identity: ncsIdentity(),
    async acquire(request: AcquireRequest): Promise<AcquiredBatch> {
      if (!request.inputPath) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.ACCESS_DENIED,
          "AUTHORIZED_FILE requires --input path to an operator-supplied dataset",
        );
      }
      const retrievalTime = new Date(request.observedAt);
      const file = parseNcsShapedFile(request.inputPath, retrievalTime);
      const records = filterRecords(file.records, request);
      const sourceReference = file.sourceFile
        ? `${file.sourceFile} :: ${request.inputPath}`
        : request.inputPath;
      return {
        records,
        sourceReference,
        retrievalTime,
        accessMethod: "AUTHORIZED_FILE",
        checksum: computeBatchChecksum(records),
        parserVersion: NCS_ADAPTER_VERSION,
      };
    },
  };
}

/**
 * Official authorized HTTP feed. Calls only the configured base URL.
 * Does not default to ncs.gov.in and does not scrape the public SPA.
 */
export function createAuthorizedApiConnector(config: {
  baseUrl?: string | null;
  token?: string | null;
}): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.AUTHORIZED_API,
    accessMethod: "AUTHORIZED_API",
    identity: ncsIdentity(),
    async acquire(request: AcquireRequest): Promise<AcquiredBatch> {
      const baseUrl = config.baseUrl?.trim();
      const token = config.token?.trim();
      if (!baseUrl || !token) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.ACCESS_DENIED,
          "AUTHORIZED_API requires NCS_API_BASE_URL and NCS_API_TOKEN from an official feed",
        );
      }

      let response: Response;
      try {
        response = await fetch(baseUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
          "Authorized NCS feed is unreachable",
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.ACCESS_DENIED,
          "Authorized NCS feed denied access",
        );
      }
      if (!response.ok) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
          `Authorized NCS feed returned HTTP ${response.status}`,
        );
      }

      let parsed: unknown;
      try {
        parsed = await response.json();
      } catch {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SCHEMA_CHANGED,
          "Authorized NCS feed did not return JSON",
        );
      }

      const recordsRaw = Array.isArray(parsed)
        ? parsed
        : isPlainObject(parsed) && Array.isArray(parsed.records)
          ? parsed.records
          : isPlainObject(parsed) && Array.isArray(parsed.jobs)
            ? parsed.jobs
            : null;
      if (!recordsRaw) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SCHEMA_CHANGED,
          "Authorized NCS feed schema must be an array or { records|jobs: [] }",
        );
      }

      const retrievalTime = new Date(request.observedAt);
      const normalized = recordsRaw.filter(isPlainObject).map((row) => {
        if (!isPublicListingJobCard(row)) {
          return row;
        }
        return (
          normalizePublicListingJob(row, {
            retrievalTime,
            sourceFile: baseUrl,
          }) ?? row
        );
      });
      const records = filterRecords(
        normalized.filter(isPlainObject) as Record<string, unknown>[],
        request,
      );
      return {
        records,
        sourceReference: baseUrl,
        retrievalTime,
        accessMethod: "AUTHORIZED_API",
        checksum: computeBatchChecksum(records),
        parserVersion: NCS_ADAPTER_VERSION,
      };
    },
  };
}

/**
 * PUBLIC_PAGE connector — permission-gated stub.
 * Never scrapes ncs.gov.in, never calls undocumented APIs, never bypasses controls.
 * Local captured snapshots are ingested via AUTHORIZED_FILE.
 */
export function createPublicPageConnector(): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.PUBLIC_PAGE,
    accessMethod: "PUBLIC_PAGE",
    identity: ncsIdentity(),
    async acquire(_request: AcquireRequest): Promise<AcquiredBatch> {
      if (!isPublicPagePermitted()) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.ACCESS_DENIED,
          "PUBLIC_PAGE requires documented terms review and NCS_PUBLIC_PAGE_PERMITTED=true",
        );
      }
      throw new AcquisitionError(
        ACQUISITION_FAILURE.ACCESS_DENIED,
        "PUBLIC_PAGE live collector is not implemented. Ingest a local captured snapshot with --mode file --input data/raw/ncs/...",
      );
    },
  };
}

export function connectorForMode(
  mode: NcsAccessMode,
  config?: { baseUrl?: string | null; token?: string | null },
): NcsAcquisitionConnector {
  if (mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE) {
    return createSyntheticFixtureConnector();
  }
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_FILE) {
    return createAuthorizedFileConnector();
  }
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_API) {
    return createAuthorizedApiConnector(config ?? {});
  }
  if (mode === NCS_ACCESS_MODE.PUBLIC_PAGE) {
    return createPublicPageConnector();
  }
  throw new AcquisitionError(
    ACQUISITION_FAILURE.ACCESS_DENIED,
    "ACCESS_NOT_CONFIGURED: NCS acquisition mode is DISABLED",
  );
}
