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
  result: JobIntelligenceResult;
};

/**
 * Idempotent upsert of derived Job Intelligence for (jobId, processorVersion).
 * Does not mutate Job, JobSkill, or taxonomy.
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
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.jobIntelligence.update({
      where: { id: existing.id },
      data: { status, result: payload },
      select: { id: true, jobId: true, processorVersion: true, status: true, result: true },
    });
    return {
      id: updated.id,
      jobId: updated.jobId,
      processorVersion: updated.processorVersion,
      status: updated.status,
      created: false,
      result: updated.result as unknown as JobIntelligenceResult,
    };
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
    return {
      id: created.id,
      jobId: created.jobId,
      processorVersion: created.processorVersion,
      status: created.status,
      created: true,
      result: created.result as unknown as JobIntelligenceResult,
    };
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
      return {
        id: raced.id,
        jobId: raced.jobId,
        processorVersion: raced.processorVersion,
        status: raced.status,
        created: false,
        result: raced.result as unknown as JobIntelligenceResult,
      };
    }
    throw error;
  }
}

export function defaultProcessorVersion(): string {
  return JOB_INTELLIGENCE_PROCESSOR_VERSION;
}
