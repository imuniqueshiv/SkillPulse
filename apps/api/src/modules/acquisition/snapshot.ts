import type {
  IngestionAccessMethod,
  IngestionSnapshotStatus,
  Prisma,
} from "@prisma/client";
import { getPrisma } from "../../config/database";
import type { AcquisitionFailureCode } from "./errors";

export type PersistSnapshotInput = {
  sourceId: string;
  retrievalTime: Date;
  sourceReference: string;
  accessMethod: IngestionAccessMethod;
  recordCount: number;
  checksum: string;
  parserVersion?: string | null;
  status: IngestionSnapshotStatus;
  failureCode?: AcquisitionFailureCode | null;
  failureMessage?: string | null;
  createdCount?: number;
  changedCount?: number;
  skippedCount?: number;
  duplicateCount?: number;
  acceptedCount?: number;
  expiredCount?: number;
  withdrawnCount?: number;
  rejectedCount?: number;
  failedCount?: number;
  metadata?: Prisma.InputJsonValue | null;
};

export async function persistIngestionSnapshot(input: PersistSnapshotInput) {
  const prisma = getPrisma();
  return prisma.ingestionSnapshot.create({
    data: {
      sourceId: input.sourceId,
      retrievalTime: input.retrievalTime,
      sourceReference: input.sourceReference,
      accessMethod: input.accessMethod,
      recordCount: input.recordCount,
      checksum: input.checksum,
      parserVersion: input.parserVersion ?? null,
      status: input.status,
      failureCode: input.failureCode ?? null,
      failureMessage: input.failureMessage ?? null,
      createdCount: input.createdCount ?? 0,
      changedCount: input.changedCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      duplicateCount: input.duplicateCount ?? 0,
      acceptedCount: input.acceptedCount ?? 0,
      expiredCount: input.expiredCount ?? 0,
      withdrawnCount: input.withdrawnCount ?? 0,
      rejectedCount: input.rejectedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      metadata: input.metadata ?? undefined,
    },
  });
}
