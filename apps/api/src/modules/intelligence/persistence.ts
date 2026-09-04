import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  type JobIntelligenceResult,
} from "./contract";

export type PersistedJobIntelligence = {
  id: string;
  jobId: string;
  processorVersion: string;
  status: "PROCESSED" | "FAILED";
  created: boolean;
  preserved: boolean;
  result: JobIntelligenceResult;
};

function asRow(row: {
  id: string;
  jobId: string;
  processorVersion: string;
  status: "PROCESSED" | "FAILED";
  result: unknown;
}, created: boolean, preserved: boolean): PersistedJobIntelligence {
  return {
    id: row.id,
    jobId: row.jobId,
    processorVersion: row.processorVersion,
    status: row.status,
    created,
    preserved,
    result: row.result as JobIntelligenceResult,
  };
}

/**
 * Idempotent write of derived Job Intelligence for (jobId, processorVersion).
 * A FAILED write never overwrites a PROCESSED result.
 */
export async function persistJobIntelligence(
  result: JobIntelligenceResult,
  status: "PROCESSED" | "FAILED" = "PROCESSED",
): Promise<PersistedJobIntelligence> {
  const jobId = result.jobId.trim();
  const processorVersion = result.processorVersion.trim();
  if (!jobId) {
    throw new AppError(400, "jobId is required");
  }
  if (!processorVersion) {
    throw new AppError(400, "processorVersion is required");
  }

  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });
  if (!job) {
    throw new AppError(404, "Job not found");
  }

  const payload = result as unknown as Prisma.InputJsonValue;
  const existing = await prisma.jobIntelligence.findUnique({
    where: {
      jobId_processorVersion: { jobId, processorVersion },
    },
    select: { id: true, jobId: true, processorVersion: true, status: true, result: true },
  });

  if (existing) {
    if (status === "FAILED" && existing.status === "PROCESSED") {
      return asRow(existing, false, true);
    }
    const updated = await prisma.jobIntelligence.update({
      where: { id: existing.id },
      data: { status, result: payload },
      select: { id: true, jobId: true, processorVersion: true, status: true, result: true },
    });
    return asRow(updated, false, false);
  }

  try {
    const created = await prisma.jobIntelligence.create({
      data: {
        jobId,
        processorVersion,
        status,
        result: payload,
      },
      select: { id: true, jobId: true, processorVersion: true, status: true, result: true },
    });
    return asRow(created, true, false);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.jobIntelligence.findUnique({
        where: {
          jobId_processorVersion: { jobId, processorVersion },
        },
        select: { id: true, jobId: true, processorVersion: true, status: true, result: true },
      });
      if (!raced) {
        throw error;
      }
      if (status === "FAILED" && raced.status === "PROCESSED") {
        return asRow(raced, false, true);
      }
      return asRow(raced, false, false);
    }
    throw error;
  }
}

export function defaultProcessorVersion(): string {
  return JOB_INTELLIGENCE_PROCESSOR_VERSION;
}
