import { AppError } from "../../utils/errors";
import type { JobIngestionRecord } from "./contract";
import { parseJobIngestionRecord } from "./validate";

/**
 * Executable source adapter. Maps a source-specific record into the Phase 5.2
 * job ingestion contract. Adapters do not persist Job rows, fetch remote
 * sources, or store raw observations.
 */
export type JobSourceAdapter<TSourceRecord = unknown> = {
  readonly name: string;
  readonly version: string;
  readonly sourceCode: string;
  map(record: TSourceRecord): unknown;
  parse(record: TSourceRecord): JobIngestionRecord;
};

export type JobSourceAdapterMeta = {
  name: string;
  version: string;
  sourceCode: string;
};

const adapters = new Map<string, JobSourceAdapter<unknown>>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates adapter-stamped metadata, then runs Phase 5.2 contract parsing.
 */
export function parseMappedJobRecord(
  adapter: JobSourceAdapterMeta,
  mapped: unknown,
): JobIngestionRecord {
  if (!isPlainObject(mapped)) {
    throw new AppError(400, "Adapter produced an invalid mapping");
  }

  if (
    mapped.adapterName !== adapter.name ||
    mapped.adapterVersion !== adapter.version
  ) {
    throw new AppError(400, "Adapter metadata mismatch");
  }

  const parsed = parseJobIngestionRecord(mapped);
  if (
    parsed.payload.sourceCode &&
    parsed.payload.sourceCode !== adapter.sourceCode
  ) {
    throw new AppError(400, "Adapter source identity mismatch");
  }

  return parsed;
}

export function createJobSourceAdapter<TSourceRecord>(spec: {
  name: string;
  version: string;
  sourceCode: string;
  map(record: TSourceRecord): unknown;
}): JobSourceAdapter<TSourceRecord> {
  return {
    name: spec.name,
    version: spec.version,
    sourceCode: spec.sourceCode,
    map: spec.map.bind(spec),
    parse(record: TSourceRecord) {
      return parseMappedJobRecord(
        {
          name: spec.name,
          version: spec.version,
          sourceCode: spec.sourceCode,
        },
        spec.map(record),
      );
    },
  };
}

export function registerJobSourceAdapter<TSourceRecord>(
  adapter: JobSourceAdapter<TSourceRecord>,
): void {
  if (adapters.has(adapter.sourceCode)) {
    throw new AppError(409, "Adapter already registered for source");
  }
  adapters.set(adapter.sourceCode, adapter as JobSourceAdapter<unknown>);
}

export function getJobSourceAdapter(sourceCode: string): JobSourceAdapter<unknown> {
  const adapter = adapters.get(sourceCode);
  if (!adapter) {
    throw new AppError(404, "Unknown source adapter");
  }
  return adapter;
}

export function listJobSourceAdapters(): JobSourceAdapterMeta[] {
  return [...adapters.values()].map((adapter) => ({
    name: adapter.name,
    version: adapter.version,
    sourceCode: adapter.sourceCode,
  }));
}

export function resetJobSourceAdapters(): void {
  adapters.clear();
}
