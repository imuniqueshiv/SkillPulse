import { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { getPrisma } from "../../config/database";
import { NCS_SOURCE_CODE } from "../ingestion/sources/ncs-access";

/**
 * Strip bulky raw payloads past retention while keeping the latest observation
 * per externalId. Never deletes Jobs, DemandObservation, or Evidence.
 */
export async function cleanupRawSnapshots(input: {
  sourceId: string;
  retentionDays?: number;
  referenceTime: Date;
}): Promise<{ cleaned: number; retainedLatest: number }> {
  const retentionDays = input.retentionDays ?? env.NCS_RAW_RETENTION_DAYS;
  const cutoff = new Date(
    input.referenceTime.getTime() - retentionDays * 24 * 60 * 60 * 1000,
  );
  const prisma = getPrisma();

  const latest = await prisma.rawIngestionRecord.groupBy({
    by: ["externalId"],
    where: { sourceId: input.sourceId, externalId: { not: null } },
    _max: { observedAt: true },
  });
  const latestKeys = new Set(
    latest.map((row) => `${row.externalId}:${row._max.observedAt?.toISOString() ?? ""}`),
  );

  const stale = await prisma.rawIngestionRecord.findMany({
    where: {
      sourceId: input.sourceId,
      observedAt: { lt: cutoff },
    },
    select: { id: true, externalId: true, observedAt: true },
  });

  const stripable = stale.filter((row) => {
    if (!row.externalId) {
      return true;
    }
    return !latestKeys.has(`${row.externalId}:${row.observedAt.toISOString()}`);
  });

  if (stripable.length > 0) {
    await prisma.rawIngestionRecord.updateMany({
      where: { id: { in: stripable.map((row) => row.id) } },
      data: { payload: Prisma.JsonNull },
    });
  }

  return {
    cleaned: stripable.length,
    retainedLatest: latest.length,
  };
}

export async function cleanupNcsRawSnapshots(input: {
  retentionDays?: number;
  referenceTime: Date;
}) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.findUnique({
    where: { code: NCS_SOURCE_CODE },
    select: { id: true },
  });
  if (!source) {
    return { cleaned: 0, retainedLatest: 0 };
  }
  return cleanupRawSnapshots({
    sourceId: source.id,
    retentionDays: input.retentionDays,
    referenceTime: input.referenceTime,
  });
}
