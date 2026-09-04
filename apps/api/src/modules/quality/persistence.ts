import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_QUALITY_ASSESSMENT_VERSION,
  type JobQualityAssessmentResult,
  type QualityEligibility,
} from "./contract";

export type PersistedJobQualityAssessment = {
  id: string;
  jobId: string;
  assessmentVersion: string;
  status: "PROCESSED" | "FAILED";
  eligibility: QualityEligibility;
  created: boolean;
  preserved: boolean;
  result: JobQualityAssessmentResult;
};

function asRow(
  row: {
    id: string;
    jobId: string;
    assessmentVersion: string;
    status: "PROCESSED" | "FAILED";
    eligibility: QualityEligibility;
    result: unknown;
  },
  created: boolean,
  preserved: boolean,
): PersistedJobQualityAssessment {
  return {
    id: row.id,
    jobId: row.jobId,
    assessmentVersion: row.assessmentVersion,
    status: row.status,
    eligibility: row.eligibility,
    created,
    preserved,
    result: row.result as JobQualityAssessmentResult,
  };
}

/**
 * Idempotent write for (jobId, assessmentVersion).
 * FAILED never overwrites PROCESSED.
 */
export async function persistJobQualityAssessment(
  result: JobQualityAssessmentResult,
  status: "PROCESSED" | "FAILED" = "PROCESSED",
): Promise<PersistedJobQualityAssessment> {
  const jobId = result.jobId.trim();
  const assessmentVersion = result.assessmentVersion.trim();
  if (!jobId) {
    throw new AppError(400, "jobId is required");
  }
  if (!assessmentVersion) {
    throw new AppError(400, "assessmentVersion is required");
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
  const assessedAt = new Date(result.assessedAt);
  if (Number.isNaN(assessedAt.getTime())) {
    throw new AppError(400, "assessedAt must be a valid instant");
  }

  const existing = await prisma.jobQualityAssessment.findUnique({
    where: {
      jobId_assessmentVersion: { jobId, assessmentVersion },
    },
    select: {
      id: true,
      jobId: true,
      assessmentVersion: true,
      status: true,
      eligibility: true,
      result: true,
    },
  });

  if (existing) {
    if (status === "FAILED" && existing.status === "PROCESSED") {
      return asRow(existing, false, true);
    }
    const updated = await prisma.jobQualityAssessment.update({
      where: { id: existing.id },
      data: {
        status,
        eligibility: result.eligibility,
        result: payload,
        assessedAt,
      },
      select: {
        id: true,
        jobId: true,
        assessmentVersion: true,
        status: true,
        eligibility: true,
        result: true,
      },
    });
    return asRow(updated, false, false);
  }

  try {
    const created = await prisma.jobQualityAssessment.create({
      data: {
        jobId,
        assessmentVersion,
        status,
        eligibility: result.eligibility,
        result: payload,
        assessedAt,
      },
      select: {
        id: true,
        jobId: true,
        assessmentVersion: true,
        status: true,
        eligibility: true,
        result: true,
      },
    });
    return asRow(created, true, false);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.jobQualityAssessment.findUnique({
        where: {
          jobId_assessmentVersion: { jobId, assessmentVersion },
        },
        select: {
          id: true,
          jobId: true,
          assessmentVersion: true,
          status: true,
          eligibility: true,
          result: true,
        },
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

export function defaultAssessmentVersion(): string {
  return JOB_QUALITY_ASSESSMENT_VERSION;
}
