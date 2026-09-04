import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  type JobIntelligenceResult,
} from "../intelligence/contract";
import { RAW_INGESTION_REFERENCE_PREFIX } from "../ingestion/job-provenance";
import { buildJobQualityAssessment } from "./assessment";
import {
  DEFAULT_INTELLIGENCE_PROCESSOR_VERSION,
  JOB_QUALITY_ASSESSMENT_VERSION,
  type JobQualityAssessmentResult,
  type QualityJobInput,
  type QualityProvenanceInput,
  type QualitySourceInput,
} from "./contract";
import {
  persistJobQualityAssessment,
  type PersistedJobQualityAssessment,
} from "./persistence";

export type AssessJobQualityInput = {
  jobId: string;
  referenceTime: Date;
  persist?: boolean;
  assessmentVersion?: string;
  intelligenceProcessorVersion?: string;
  /** Optional override for tests; when set, skips Evidence lookup for these fields. */
  provenanceOverride?: QualityProvenanceInput | null;
  assessedAt?: Date;
};

export type AssessJobQualityResult = {
  assessment: JobQualityAssessmentResult;
  persistence: PersistedJobQualityAssessment | null;
};

function asProvenance(metadata: unknown, observedAt: Date | null): QualityProvenanceInput {
  const meta =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {};
  const validationStatus =
    meta.validationStatus === "VALID" || meta.validationStatus === "REVIEW"
      ? meta.validationStatus
      : null;
  const dedupStatus =
    meta.dedupStatus === "UNIQUE" ||
    meta.dedupStatus === "POSSIBLE_DUPLICATE" ||
    meta.dedupStatus === "DUPLICATE"
      ? meta.dedupStatus
      : null;
  const freshnessStatus =
    meta.freshnessStatus === "FRESH" ||
    meta.freshnessStatus === "AGING" ||
    meta.freshnessStatus === "STALE" ||
    meta.freshnessStatus === "UNKNOWN"
      ? meta.freshnessStatus
      : null;
  const ingestedAt = typeof meta.ingestedAt === "string" ? meta.ingestedAt : null;

  return {
    observedAt,
    validationStatus,
    dedupStatus,
    freshnessStatus,
    ingestedAt,
  };
}

async function loadProvenanceForJob(
  jobId: string,
  sourceId: string | null,
  externalId: string | null,
): Promise<QualityProvenanceInput | null> {
  const prisma = getPrisma();

  if (sourceId && externalId) {
    const raw = await prisma.rawIngestionRecord.findFirst({
      where: { sourceId, externalId },
      orderBy: [{ observedAt: "desc" }, { id: "desc" }],
      select: { id: true, observedAt: true },
    });
    if (raw) {
      const evidence = await prisma.evidence.findFirst({
        where: {
          type: "JOB_POSTING",
          sourceId,
          reference: `${RAW_INGESTION_REFERENCE_PREFIX}${raw.id}`,
        },
        orderBy: { createdAt: "desc" },
        select: { observedAt: true, metadata: true },
      });
      if (evidence) {
        return asProvenance(evidence.metadata, evidence.observedAt ?? raw.observedAt);
      }
      return {
        observedAt: raw.observedAt,
        validationStatus: null,
        dedupStatus: null,
        freshnessStatus: null,
        ingestedAt: null,
      };
    }
  }

  if (sourceId) {
    const evidence = await prisma.evidence.findFirst({
      where: { type: "JOB_POSTING", sourceId },
      orderBy: { createdAt: "desc" },
      select: { observedAt: true, metadata: true },
    });
    if (evidence) {
      const meta = evidence.metadata as Record<string, unknown> | null;
      if (
        meta &&
        typeof meta.externalId === "string" &&
        externalId &&
        meta.externalId !== externalId
      ) {
        return null;
      }
      return asProvenance(evidence.metadata, evidence.observedAt);
    }
  }

  return null;
}

/**
 * Thin Phase 7 orchestrator. Does not mutate Job / JobSkill / JobIntelligence.
 */
export async function assessJobQuality(
  input: AssessJobQualityInput,
): Promise<AssessJobQualityResult> {
  if (!input.jobId?.trim()) {
    throw new AppError(400, "jobId is required");
  }
  if (!(input.referenceTime instanceof Date) || Number.isNaN(input.referenceTime.getTime())) {
    throw new AppError(400, "referenceTime must be a valid instant");
  }

  const assessmentVersion = input.assessmentVersion ?? JOB_QUALITY_ASSESSMENT_VERSION;
  const intelligenceProcessorVersion =
    input.intelligenceProcessorVersion ?? DEFAULT_INTELLIGENCE_PROCESSOR_VERSION;

  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: input.jobId },
    select: {
      id: true,
      title: true,
      description: true,
      companyName: true,
      sourceId: true,
      externalId: true,
      locationId: true,
      postedAt: true,
      expiresAt: true,
      sourceUrl: true,
      _count: { select: { skills: true } },
      source: {
        select: {
          id: true,
          code: true,
          name: true,
          active: true,
          reliability: true,
          type: true,
          geographicScope: true,
        },
      },
    },
  });
  if (!job) {
    throw new AppError(404, "Job not found");
  }

  const intelligenceRow = await prisma.jobIntelligence.findUnique({
    where: {
      jobId_processorVersion: {
        jobId: job.id,
        processorVersion: intelligenceProcessorVersion,
      },
    },
    select: { status: true, result: true, processorVersion: true },
  });

  let intelligence: JobIntelligenceResult | null = null;
  if (intelligenceRow?.status === "PROCESSED") {
    intelligence = intelligenceRow.result as JobIntelligenceResult;
    if (intelligence.processorVersion !== intelligenceProcessorVersion) {
      intelligence = null;
    }
  }

  const provenance =
    input.provenanceOverride !== undefined
      ? input.provenanceOverride
      : await loadProvenanceForJob(job.id, job.sourceId, job.externalId);

  const qualityJob: QualityJobInput = {
    id: job.id,
    title: job.title,
    description: job.description,
    companyName: job.companyName,
    sourceId: job.sourceId,
    externalId: job.externalId,
    locationId: job.locationId,
    postedAt: job.postedAt,
    expiresAt: job.expiresAt,
    sourceUrl: job.sourceUrl,
    skillCount: job._count.skills,
  };

  const source: QualitySourceInput | null = job.source
    ? {
        id: job.source.id,
        code: job.source.code,
        name: job.source.name,
        active: job.source.active,
        reliability: job.source.reliability,
        type: job.source.type,
        geographicScope: job.source.geographicScope,
      }
    : null;

  const assessment = buildJobQualityAssessment({
    job: qualityJob,
    source,
    provenance,
    intelligence,
    referenceTime: input.referenceTime,
    assessmentVersion,
    intelligenceProcessorVersion,
    assessedAt: input.assessedAt ?? input.referenceTime,
  });

  if (!input.persist) {
    return { assessment, persistence: null };
  }

  try {
    const persistence = await persistJobQualityAssessment(assessment, "PROCESSED");
    return { assessment, persistence };
  } catch (error) {
    await persistJobQualityAssessment(assessment, "FAILED").catch(() => undefined);
    throw error;
  }
}

export { JOB_QUALITY_ASSESSMENT_VERSION, JOB_INTELLIGENCE_PROCESSOR_VERSION };
