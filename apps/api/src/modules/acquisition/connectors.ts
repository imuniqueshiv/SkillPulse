import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NcsAcquisitionConnector, AcquireRequest, AcquiredBatch } from "./connector";
import { AcquisitionError, ACQUISITION_FAILURE } from "./errors";
import { computeBatchChecksum } from "./hash";
import {
  NCS_ACCESS_MODE,
  type NcsAccessMode,
} from "../ingestion/sources/ncs-access";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function filterByState(
  records: Record<string, unknown>[],
  state?: string,
): Record<string, unknown>[] {
  if (!state || state.trim() === "") {
    return records;
  }
  const needle = state.trim().toLowerCase();
  return records.filter((row) => {
    const value = row.state;
    return typeof value === "string" && value.trim().toLowerCase() === needle;
  });
}

function parseNcsShapedFile(path: string): {
  records: Record<string, unknown>[];
  acquisition?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SCHEMA_CHANGED,
      "NCS-shaped file is not valid JSON",
    );
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.records)) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SCHEMA_CHANGED,
      "NCS-shaped file must contain a records array",
    );
  }
  return {
    records: parsed.records.filter(isPlainObject),
    acquisition:
      typeof parsed.acquisition === "string" ? parsed.acquisition : undefined,
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

export function createSyntheticFixtureConnector(): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.SYNTHETIC_FIXTURE,
    async acquire(request: AcquireRequest): Promise<AcquiredBatch> {
      const path = request.inputPath ?? defaultSyntheticFixturePath();
      const file = parseNcsShapedFile(path);
      if (file.acquisition !== "synthetic-fixture") {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SCHEMA_CHANGED,
          "Synthetic mode requires acquisition=synthetic-fixture",
        );
      }
      const records = filterByState(file.records, request.state);
      return {
        records,
        sourceReference: path,
        retrievalTime: new Date(request.observedAt),
        accessMethod: "SYNTHETIC_FIXTURE",
        checksum: computeBatchChecksum(records),
      };
    },
  };
}

export function createAuthorizedFileConnector(): NcsAcquisitionConnector {
  return {
    mode: NCS_ACCESS_MODE.AUTHORIZED_FILE,
    async acquire(request: AcquireRequest): Promise<AcquiredBatch> {
      if (!request.inputPath) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.ACCESS_DENIED,
          "AUTHORIZED_FILE requires --input path to an operator-supplied dataset",
        );
      }
      const file = parseNcsShapedFile(request.inputPath);
      const records = filterByState(file.records, request.state);
      return {
        records,
        sourceReference: request.inputPath,
        retrievalTime: new Date(request.observedAt),
        accessMethod: "AUTHORIZED_FILE",
        checksum: computeBatchChecksum(records),
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
          : null;
      if (!recordsRaw) {
        throw new AcquisitionError(
          ACQUISITION_FAILURE.SCHEMA_CHANGED,
          "Authorized NCS feed schema must be an array or { records: [] }",
        );
      }

      const records = filterByState(recordsRaw.filter(isPlainObject), request.state);
      return {
        records,
        sourceReference: baseUrl,
        retrievalTime: new Date(request.observedAt),
        accessMethod: "AUTHORIZED_API",
        checksum: computeBatchChecksum(records),
      };
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
  throw new AcquisitionError(
    ACQUISITION_FAILURE.ACCESS_DENIED,
    "ACCESS_NOT_CONFIGURED: NCS acquisition mode is DISABLED",
  );
}
