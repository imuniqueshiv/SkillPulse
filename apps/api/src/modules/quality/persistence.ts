import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_QUALITY_ASSESSMENT_VERSION,
  type JobQualityAssessmentResult,
  type QualityChangeDetection,
  type QualityEligibility,
} from "./contract";
import {
  detectQualityChange,
  stripNestedHistory,
  toHistorySnapshot,
} from "./fingerprint";

export type PersistedJobQualityAssessment = {
  id: string;
  jobId: string;
  assessmentVersion: string;
  status: "PROCESSED" | "FAILED";
  eligibility: QualityEligibility;
  created: boolean;
  preserved: boolean;
  /** True when fingerprint matched existing PROCESSED row and no write occurred. */
  unchanged: boolean;
  changeDetection: QualityChangeDetection | null;
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
  flags: {
    created: boolean;
    preserved: boolean;
    unchanged: boolean;
    changeDetection: QualityChangeDetection | null;
  },
): PersistedJobQualityAssessment {
  return {
    id: row.id,
    jobId: row.jobId,
    assessmentVersion: row.assessmentVersion,
    status: row.status,
    eligibility: row.eligibility,
    created: flags.created,
    preserved: flags.preserved,
    unchanged: flags.unchanged,
    changeDetection: flags.changeDetection,
    result: row.result as JobQualityAssessmentResult,
  };
}

/**
 * Idempotent write for (jobId, assessmentVersion).
 * - Identical fingerprint → no unnecessary update (unchanged).
 * - Changed fingerprint → nest prior success in previousAssessment, then update.
 * - FAILED never overwrites PROCESSED.
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
  if (!result.fingerprint?.trim()) {
    throw new AppError(400, "fingerprint is required");
  }

  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });
  if (!job) {
    throw new AppError(404, "Job not found");
  }

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
      return asRow(existing, {
        created: false,
        preserved: true,
        unchanged: false,
        changeDetection: null,
      });
    }

    const previous = existing.result as JobQualityAssessmentResult;
    const changeDetection = detectQualityChange({
      previous: existing.status === "PROCESSED" ? previous : null,
      current: result,
    });

    if (
      status === "PROCESSED" &&
      existing.status === "PROCESSED" &&
      !changeDetection.changed
    ) {
      return asRow(existing, {
        created: false,
        preserved: false,
        unchanged: true,
        changeDetection,
      });
    }

    let toPersist = stripNestedHistory(result);
    if (
      status === "PROCESSED" &&
      existing.status === "PROCESSED" &&
      changeDetection.changed
    ) {
      toPersist = {
        ...toPersist,
        previousAssessment: toHistorySnapshot(previous),
      };
    }

    const updated = await prisma.jobQualityAssessment.update({
      where: { id: existing.id },
      data: {
        status,
        eligibility: toPersist.eligibility,
        result: toPersist as unknown as Prisma.InputJsonValue,
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
    return asRow(updated, {
      created: false,
      preserved: false,
      unchanged: false,
      changeDetection,
    });
  }

  const createdPayload = stripNestedHistory(result);
  try {
    const created = await prisma.jobQualityAssessment.create({
      data: {
        jobId,
        assessmentVersion,
        status,
        eligibility: createdPayload.eligibility,
        result: createdPayload as unknown as Prisma.InputJsonValue,
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
    return asRow(created, {
      created: true,
      preserved: false,
      unchanged: false,
      changeDetection: detectQualityChange({ previous: null, current: createdPayload }),
    });
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
        return asRow(raced, {
          created: false,
          preserved: true,
          unchanged: false,
          changeDetection: null,
        });
      }
      const racedResult = raced.result as JobQualityAssessmentResult;
      const changeDetection = detectQualityChange({
        previous: raced.status === "PROCESSED" ? racedResult : null,
        current: result,
      });
      return asRow(raced, {
        created: false,
        preserved: false,
        unchanged: !changeDetection.changed && raced.status === "PROCESSED",
        changeDetection,
      });
    }
    throw error;
  }
}

export function defaultAssessmentVersion(): string {
  return JOB_QUALITY_ASSESSMENT_VERSION;
}
