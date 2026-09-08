import type { IngestionAccessMethod } from "@prisma/client";
import type { NcsAccessMode } from "../ingestion/sources/ncs-access";

export type AcquireRequest = {
  inputPath?: string;
  state?: string;
  observedAt: string;
  ingestedAt: string;
};

export type AcquiredBatch = {
  records: Record<string, unknown>[];
  sourceReference: string;
  retrievalTime: Date;
  accessMethod: IngestionAccessMethod;
  checksum: string;
};

/**
 * Future official NCS API/feed/file connector.
 * Implementations must not scrape ncs.gov.in or reverse-engineer private envelopes.
 */
export interface NcsAcquisitionConnector {
  readonly mode: NcsAccessMode;
  acquire(request: AcquireRequest): Promise<AcquiredBatch>;
}
