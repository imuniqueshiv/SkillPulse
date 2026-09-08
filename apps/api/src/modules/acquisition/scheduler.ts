import { env } from "../../config/env";
import {
  NCS_ACCESS_MODE,
  type NcsAccessMode,
} from "../ingestion/sources/ncs-access";
import { persistIngestionSnapshot } from "./snapshot";
import { runNcsAcquisition, type NcsAcquisitionResult } from "./pipeline";

export const DEFAULT_SCHEDULE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function isAuthorizedLiveScheduleMode(mode: NcsAccessMode): boolean {
  return (
    mode === NCS_ACCESS_MODE.AUTHORIZED_API ||
    mode === NCS_ACCESS_MODE.AUTHORIZED_FILE
  );
}

export type ScheduledAcquisitionResult = {
  ran: boolean;
  reason?: "LIVE_EXECUTION_NOT_AUTHORIZED" | "INTERVAL_NOT_ELAPSED";
  acquisition?: NcsAcquisitionResult;
};

/**
 * 24-hour tick. Never executes live NCS acquisition unless the mode is an
 * authorized API or authorized file. Does not scrape.
 */
export async function runScheduledNcsAcquisition(input: {
  now: Date;
  mode: NcsAccessMode;
  lastRetrievalTime?: Date | null;
  intervalMs?: number;
  sourceId: string;
  observedAt: string;
  ingestedAt: string;
  referenceTime: Date;
  inputPath?: string;
  state?: string;
  district?: string;
  city?: string;
  limit?: number;
  expireMissing?: boolean;
}): Promise<ScheduledAcquisitionResult> {
  if (!isAuthorizedLiveScheduleMode(input.mode)) {
    await persistIngestionSnapshot({
      sourceId: input.sourceId,
      retrievalTime: input.now,
      sourceReference: "scheduler",
      accessMethod: "SYNTHETIC_FIXTURE",
      recordCount: 0,
      checksum: "scheduler-rejected",
      status: "ACCESS_DENIED",
      failureCode: "ACCESS_DENIED",
      failureMessage:
        "Scheduled live NCS execution requires AUTHORIZED_API or AUTHORIZED_FILE (PUBLIC_PAGE and synthetic are never auto-scheduled)",
    });
    return { ran: false, reason: "LIVE_EXECUTION_NOT_AUTHORIZED" };
  }

  const interval =
    input.intervalMs ?? env.NCS_SCHEDULE_INTERVAL_HOURS * 60 * 60 * 1000;
  if (
    input.lastRetrievalTime &&
    input.now.getTime() - input.lastRetrievalTime.getTime() < interval
  ) {
    return { ran: false, reason: "INTERVAL_NOT_ELAPSED" };
  }

  const acquisition = await runNcsAcquisition({
    mode: input.mode,
    observedAt: input.observedAt,
    ingestedAt: input.ingestedAt,
    referenceTime: input.referenceTime,
    retrievalTime: input.now,
    inputPath: input.inputPath,
    state: input.state,
    district: input.district,
    city: input.city,
    limit: input.limit,
    expireMissing: input.expireMissing ?? true,
  });
  return { ran: true, acquisition };
}
