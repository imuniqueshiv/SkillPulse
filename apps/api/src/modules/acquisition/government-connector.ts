/**
 * Provider-neutral government source connector contract.
 *
 * Responsibility ends at producing source observations + snapshot metadata.
 * Business intelligence (Phases 6–13) must not live here.
 *
 * Implementations must not scrape unauthorized sites, reverse-engineer private
 * envelopes, bypass CAPTCHA/auth, or invent API endpoints/credentials.
 */

import type { IngestionAccessMethod } from "@prisma/client";

export type GovernmentSourceIdentity = {
  sourceCode: string;
  sourceName: string;
  sourceUrl?: string | null;
};

export type GovernmentAcquireRequest = {
  inputPath?: string;
  state?: string;
  district?: string;
  city?: string;
  limit?: number;
  observedAt: string;
  ingestedAt: string;
};

export type GovernmentAcquiredBatch = {
  records: Record<string, unknown>[];
  sourceReference: string;
  retrievalTime: Date;
  accessMethod: IngestionAccessMethod;
  checksum: string;
  parserVersion?: string;
};

export interface GovernmentSourceConnector {
  readonly identity: GovernmentSourceIdentity;
  readonly accessMethod: IngestionAccessMethod;
  acquire(request: GovernmentAcquireRequest): Promise<GovernmentAcquiredBatch>;
}
