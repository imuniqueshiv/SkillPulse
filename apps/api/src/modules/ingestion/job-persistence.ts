import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import type { JobIngestionRecord } from "./contract";
import {
  JOB_VALIDATION_STATUS,
  type JobValidationResult,
} from "./job-validation";
import type { JobSkillNormalizationResult } from "./job-skill-normalization";

export type CanonicalJobPersistenceInput = {
  observationId: string;
  validation: JobValidationResult;
  /** Phase 5.9 result. Unresolved terms are ignored. */
  skills?: JobSkillNormalizationResult | null;
};

export type CanonicalJobPlan = {
  observationId: string;
  validationStatus: "VALID" | "REVIEW";
  title: string;
  description: string | null;
  companyName: string | null;
  externalId: string;
  sourceId: string | null;
  sourceCode: string | null;
  postedAt: Date | null;
  expiresAt: Date | null;
  sourceUrl: string | null;
  skillIds: string[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jobSelect = {
  id: true,
  title: true,
  description: true,
  companyName: true,
  sourceId: true,
  externalId: true,
  locationId: true,
  occupationId: true,
  sectorId: true,
  postedAt: true,
  expiresAt: true,
  sourceUrl: true,
  isDemo: true,
  createdAt: true,
  updatedAt: true,
  source: { select: { id: true, code: true, name: true, isDemo: true } },
  skills: {
    select: {
      id: true,
      skillId: true,
      importance: true,
      proficiency: true,
      skill: {
        select: {
          id: true,
          code: true,
          name: true,
          canonicalName: true,
          status: true,
        },
      },
    },
    orderBy: { skillId: "asc" as const },
  },
} as const;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function copyInstant(value: Date | undefined): Date | null {
  return value ? new Date(value.getTime()) : null;
}

function requireEligibleRecord(validation: JobValidationResult): JobIngestionRecord {
  if (validation.status === JOB_VALIDATION_STATUS.REJECTED || !validation.record) {
    throw new AppError(400, "Job observation is not eligible for canonical persistence");
  }
  return validation.record;
}

function uniqueSkillIds(skills: JobSkillNormalizationResult | null | undefined): string[] {
  if (!skills) {
    return [];
  }
  const ids: string[] = [];
  for (const row of skills.resolvedSkills) {
    if (!ids.includes(row.skillId)) {
      ids.push(row.skillId);
    }
  }
  return ids;
}

/**
 * Pure mapping from validated observation + Phase 5.9 skills to a Job plan.
 * Does not resolve DataSource, write Prisma, or invent location/occupation/sector.
 */
export function planCanonicalJobPersistence(
  input: CanonicalJobPersistenceInput,
): CanonicalJobPlan {
  const observationId = input.observationId.trim();
  if (!observationId) {
    throw new AppError(400, "observationId is required");
  }

  const record = requireEligibleRecord(input.validation);
  const payload = record.payload;
  const externalId = payload.externalId?.trim() ?? "";
  if (!externalId) {
    throw new AppError(400, "Canonical job identity requires externalId");
  }

  if (input.skills && input.skills.observationId !== observationId) {
    throw new AppError(400, "Skill normalization observationId does not match");
  }

  return {
    observationId,
    validationStatus: input.validation.status as "VALID" | "REVIEW",
    title: payload.title,
    description: payload.description ?? null,
    companyName: payload.employerName ?? null,
    externalId,
    sourceId: payload.sourceId ?? null,
    sourceCode: payload.sourceCode ?? null,
    postedAt: copyInstant(payload.postedAt),
    expiresAt: copyInstant(payload.expiresAt),
    sourceUrl: payload.sourceUrl ?? null,
    skillIds: uniqueSkillIds(input.skills),
  };
}

async function resolveSource(sourceId?: string | null, sourceCode?: string | null) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.findFirst({
    where: sourceId && isUuid(sourceId) ? { id: sourceId } : { code: sourceCode ?? undefined },
    select: { id: true, code: true, name: true, isDemo: true },
  });

  if (!source) {
    throw new AppError(404, "Data source not found");
  }

  if (sourceId && sourceCode && source.code !== sourceCode) {
    throw new AppError(400, "Source id and source code do not match");
  }

  return source;
}

async function syncJobSkills(
  tx: Prisma.TransactionClient,
  jobId: string,
  skillIds: string[],
) {
  if (skillIds.length === 0) {
    return;
  }

  await tx.jobSkill.createMany({
    data: skillIds.map((skillId) => ({ jobId, skillId })),
    skipDuplicates: true,
  });
}

async function loadJob(tx: Prisma.TransactionClient, id: string) {
  return tx.job.findUniqueOrThrow({
    where: { id },
    select: jobSelect,
  });
}

/**
 * Persist a canonical Job and JobSkill rows. Idempotent on (sourceId, externalId).
 * First write wins for Job fields. Missing JobSkills are added. Does not write Evidence.
 */
export async function persistCanonicalJob(input: CanonicalJobPersistenceInput) {
  const plan = planCanonicalJobPersistence(input);
  const source = await resolveSource(plan.sourceId, plan.sourceCode);
  const prisma = getPrisma();

  if (plan.skillIds.length > 0) {
    const found = await prisma.skill.findMany({
      where: { id: { in: plan.skillIds } },
      select: { id: true },
    });
    if (found.length !== plan.skillIds.length) {
      throw new AppError(400, "Resolved skill does not exist");
    }
  }

  // Neon remote latency can exceed Prisma's default 5s interactive timeout.
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.job.findFirst({
        where: { sourceId: source.id, externalId: plan.externalId },
        select: { id: true },
      });

      if (existing) {
        await syncJobSkills(tx, existing.id, plan.skillIds);
        return {
          job: await loadJob(tx, existing.id),
          created: false,
          observationId: plan.observationId,
        };
      }

      try {
        const created = await tx.job.create({
          data: {
            title: plan.title,
            description: plan.description,
            companyName: plan.companyName,
            sourceId: source.id,
            externalId: plan.externalId,
            postedAt: plan.postedAt,
            expiresAt: plan.expiresAt,
            sourceUrl: plan.sourceUrl,
            isDemo: source.isDemo,
          },
          select: { id: true },
        });
        await syncJobSkills(tx, created.id, plan.skillIds);
        return {
          job: await loadJob(tx, created.id),
          created: true,
          observationId: plan.observationId,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const raced = await tx.job.findFirst({
            where: { sourceId: source.id, externalId: plan.externalId },
            select: { id: true },
          });
          if (!raced) {
            throw error;
          }
          await syncJobSkills(tx, raced.id, plan.skillIds);
          return {
            job: await loadJob(tx, raced.id),
            created: false,
            observationId: plan.observationId,
          };
        }
        throw error;
      }
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
