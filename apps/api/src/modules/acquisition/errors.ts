/**
 * Phase 17.2 acquisition contracts.
 *
 * Provider-neutral. Does not invent an NCS HTTP API or scrape ncs.gov.in.
 */

export const ACQUISITION_FAILURE = {
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  ACCESS_DENIED: "ACCESS_DENIED",
  SCHEMA_CHANGED: "SCHEMA_CHANGED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  DUPLICATE: "DUPLICATE",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  PARTIAL_SYNC: "PARTIAL_SYNC",
} as const;

export type AcquisitionFailureCode =
  (typeof ACQUISITION_FAILURE)[keyof typeof ACQUISITION_FAILURE];

export const RECORD_OUTCOME = {
  CREATED: "CREATED",
  CHANGED: "CHANGED",
  UNCHANGED: "UNCHANGED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  DUPLICATE: "DUPLICATE",
} as const;

export type AcquisitionRecordOutcomeStatus =
  (typeof RECORD_OUTCOME)[keyof typeof RECORD_OUTCOME];

export class AcquisitionError extends Error {
  readonly code: AcquisitionFailureCode;

  constructor(code: AcquisitionFailureCode, message: string) {
    super(message);
    this.name = "AcquisitionError";
    this.code = code;
  }
}
