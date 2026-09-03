import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  type JobIntelligenceJobInput,
  type JobIntelligenceResult,
} from "./contract";
import { extractExperience } from "./experience-extraction";
import { prepareJobText } from "./job-text";
import {
  classifyOccupation,
  type OccupationClassificationRecord,
} from "./occupation-classification";
import { persistJobIntelligence, type PersistedJobIntelligence } from "./persistence";
import { extractQualifications } from "./qualification-extraction";
import { classifySector } from "./sector-classification";
import {
  extractSkillCandidates,
  type SkillMatchSurface,
} from "./skill-extraction";
import { SKILL_EXTRACTION_METHOD } from "./contract";
import { normalizeExtractedSkills } from "./skill-normalization";

export type ProcessJobIntelligenceInput = {
  job: JobIntelligenceJobInput;
  explicitSkills?: readonly string[] | null;
  experienceText?: string | null;
  qualificationText?: string | null;
  persist?: boolean;
  processorVersion?: string;
};

export type ProcessJobIntelligenceResult = {
  intelligence: JobIntelligenceResult;
  persistence: PersistedJobIntelligence | null;
};

async function loadSkillSurfaces(): Promise<SkillMatchSurface[]> {
  const prisma = getPrisma();
  const skills = await prisma.skill.findMany({
    where: { status: { in: ["ACTIVE", "DEPRECATED"] } },
    select: {
      id: true,
      name: true,
      canonicalName: true,
      aliases: { select: { rawTerm: true } },
    },
    orderBy: { id: "asc" },
  });

  const surfaces: SkillMatchSurface[] = [];
  for (const skill of skills) {
    surfaces.push({
      surface: skill.name,
      method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH,
    });
    if (skill.canonicalName !== skill.name.toLowerCase()) {
      surfaces.push({
        surface: skill.canonicalName,
        method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH,
      });
    }
    for (const alias of skill.aliases) {
      surfaces.push({
        surface: alias.rawTerm,
        method: SKILL_EXTRACTION_METHOD.ALIAS_MATCH,
      });
    }
  }
  return surfaces;
}

async function loadOccupations(): Promise<
  Array<OccupationClassificationRecord & { sector: { id: string; code: string | null; name: string; status: string } | null }>
> {
  const prisma = getPrisma();
  const occupations = await prisma.occupation.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      sector: { select: { id: true, code: true, name: true, status: true } },
      skillLinks: { select: { skillId: true, relation: true } },
    },
    orderBy: { id: "asc" },
  });
  return occupations;
}

/**
 * Thin Phase 6 orchestrator. Algorithms live in sibling modules.
 */
export async function processJobIntelligence(
  input: ProcessJobIntelligenceInput,
): Promise<ProcessJobIntelligenceResult> {
  if (!input.job?.id?.trim()) {
    throw new AppError(400, "job.id is required");
  }
  if (typeof input.job.title !== "string") {
    throw new AppError(400, "job.title is required");
  }

  const processorVersion = input.processorVersion ?? JOB_INTELLIGENCE_PROCESSOR_VERSION;
  const text = prepareJobText(input.job);
  const [surfaces, occupations] = await Promise.all([
    loadSkillSurfaces(),
    loadOccupations(),
  ]);
  const candidates = extractSkillCandidates({
    text,
    explicitSkills: input.explicitSkills,
    jobSkillNames: (input.job.skills ?? []).map((row) => row.name),
    surfaces,
  });
  const skills = await normalizeExtractedSkills(candidates);
  const occupation = classifyOccupation({
    title: text.titlePrepared || input.job.title,
    skills,
    occupations,
  });
  const occupationRow = occupations.find((row) => row.id === occupation.occupationId);
  const sector = classifySector({
    occupation,
    sector: occupationRow?.sector ?? null,
  });
  const experience = extractExperience(input.experienceText);
  const qualifications = extractQualifications(input.qualificationText);

  const intelligence: JobIntelligenceResult = {
    jobId: input.job.id,
    processorVersion,
    text: {
      title: text.title,
      analysisText: text.analysisText,
    },
    skills,
    occupation,
    sector,
    experience,
    qualifications,
  };

  if (!input.persist) {
    return { intelligence, persistence: null };
  }

  const persistence = await persistJobIntelligence(intelligence, "PROCESSED");
  return { intelligence, persistence };
}

export async function processJobIntelligenceById(
  jobId: string,
  options: Omit<ProcessJobIntelligenceInput, "job"> = {},
): Promise<ProcessJobIntelligenceResult> {
  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      description: true,
      skills: {
        select: {
          skill: { select: { id: true, name: true } },
        },
        orderBy: { skillId: "asc" },
      },
    },
  });
  if (!job) {
    throw new AppError(404, "Job not found");
  }

  return processJobIntelligence({
    ...options,
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: job.skills.map((row) => ({
        skillId: row.skill.id,
        name: row.skill.name,
      })),
    },
  });
}
