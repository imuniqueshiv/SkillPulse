/**
 * SkillPulse ingestion contract (Phase 5.2).
 *
 * DataSource Registry describes sources.
 * Ingestion Contract standardizes records coming from those sources.
 * Neither one performs ingestion.
 *
 * This is an observation entering SkillPulse, not a Prisma Job row.
 * Adapters map source-specific data into this shape. This module does not
 * fetch, scrape, parse files, persist, deduplicate, or extract skills.
 */

export const INGESTION_CONTRACT_VERSION = "1" as const;

export type IngestionContractVersion = typeof INGESTION_CONTRACT_VERSION;

/** Implemented record kind. Further kinds can join a discriminated union later. */
export const INGESTION_RECORD_KIND = {
  JOB: "JOB",
} as const;

export type IngestionRecordKind =
  (typeof INGESTION_RECORD_KIND)[keyof typeof INGESTION_RECORD_KIND];

export type JobObservationLocation = {
  raw?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
};

export type JobObservationSalary = {
  raw?: string;
  min?: number;
  max?: number;
  currency?: string;
};

/**
 * Source-reported job observation. Raw strings are preserved as given
 * (no alias resolution, NLP, or occupation classification).
 */
export type JobObservation = {
  sourceId?: string;
  sourceCode?: string;
  externalId?: string;
  title: string;
  description?: string;
  employerName?: string;
  location?: JobObservationLocation;
  employmentType?: string;
  experience?: string;
  qualification?: string;
  salary?: JobObservationSalary;
  sourceUrl?: string;
  postedAt?: Date;
  expiresAt?: Date;
  observedAt: Date;
  ingestedAt: Date;
  sourceMetadata?: Record<string, unknown>;
  rawRef?: string;
};

export type JobIngestionRecord = {
  kind: typeof INGESTION_RECORD_KIND.JOB;
  contractVersion: IngestionContractVersion;
  adapterName: string;
  adapterVersion: string;
  payload: JobObservation;
};

/**
 * Future contract-layer mapping. Executable adapters (name, version,
 * sourceCode, map, parse) live in `adapter.ts` and must call
 * `parseJobIngestionRecord`. This type does not persist Jobs or fetch sources.
 */
export type SourceAdapter<TSource = unknown> = {
  readonly name: string;
  readonly version: string;
  toContract(source: TSource): unknown;
};
