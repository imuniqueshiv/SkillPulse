import type { IngestionAccessMethod } from "@prisma/client";
import type { NcsAccessMode } from "../ingestion/sources/ncs-access";
import type {
  GovernmentAcquireRequest,
  GovernmentAcquiredBatch,
  GovernmentSourceConnector,
} from "./government-connector";

export type AcquireRequest = GovernmentAcquireRequest & {
  /** @deprecated use district/city/limit on GovernmentAcquireRequest */
};

export type AcquiredBatch = GovernmentAcquiredBatch;

/**
 * NCS acquisition connector. Extends the provider-neutral government contract.
 * Implementations must not scrape ncs.gov.in or reverse-engineer private envelopes.
 */
export interface NcsAcquisitionConnector extends GovernmentSourceConnector {
  readonly mode: NcsAccessMode;
  readonly accessMethod: IngestionAccessMethod;
  acquire(request: AcquireRequest): Promise<AcquiredBatch>;
}
