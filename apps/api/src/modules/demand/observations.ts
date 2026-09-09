import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  type JobIntelligenceResult,
} from "../intelligence/contract";
import {
  JOB_QUALITY_ASSESSMENT_VERSION,
  QUALITY_ELIGIBILITY,
  type QualityEligibility,
} from "../quality/contract";
import type {
  DemandFilters,
  DemandJobObservation,
  DemandLocationRef,
  DemandQualityCoverage,
} from "./contract";
import { resolveFilters, previousPeriodOfEqualDuration } from "./period";
import { MAX_DEMAND_JOB_LIMIT, qualityWeight } from "./policy";
import { buildSkillsFromIntelligence } from "./skills-util";

export type LoadDemandObservationsResult = {
  observations: DemandJobObservation[];
  qualityCoverage: DemandQualityCoverage;
  assessmentVersion: string;
  intelligenceProcessorVersion: string;
  scannedJobs: number;
};

function asEligibility(value: string): QualityEligibility {
  if (
    value === QUALITY_ELIGIBILITY.INCLUDE ||
    value === QUALITY_ELIGIBILITY.INCLUDE_WITH_CAUTION ||
    value === QUALITY_ELIGIBILITY.EXCLUDE
  ) {
    return value;
  }
  throw new AppError(500, "Unexpected quality eligibility value");
}

function locationFromJob(job: {
  locationId: string | null;
  location: {
    id: string;
    country: string;
    state: string;
    district: string | null;
    city: string | null;
  } | null;
}): DemandLocationRef {
  if (!job.locationId || !job.location) {
    return {
      locationId: null,
      country: null,
      state: null,
      district: null,
      city: null,
      known: false,
    };
  }
  return {
    locationId: job.location.id,
    country: job.location.country,
    state: job.location.state,
    district: job.location.district,
    city: job.location.city,
    known: true,
  };
}

function matchesGeography(
  location: DemandLocationRef,
  geography: DemandFilters["geography"],
): boolean {
  if (!geography) {
    return true;
  }
  if (geography.locationId) {
    return location.locationId === geography.locationId;
  }
  // Explicit geo filters require a known location.
  const needsKnown =
    geography.country || geography.state || geography.district || geography.city;
  if (needsKnown && !location.known) {
    return false;
  }
  if (geography.country && location.country !== geography.country) {
    return false;
  }
  if (geography.state && location.state !== geography.state) {
    return false;
  }
  if (geography.district && location.district !== geography.district) {
    return false;
  }
  if (geography.city && location.city !== geography.city) {
    return false;
  }
  return true;
}

/**
 * Load bounded demand observations from Job + Phase 7 + Phase 6.
 * Event time = postedAt (Phase 5 freshness semantics). Does not mutate source data.
 * Dynamic aggregation — no DemandSnapshot persistence.
 */
export async function loadDemandObservations(
  input: DemandFilters,
): Promise<LoadDemandObservationsResult> {
  const filters = resolveFilters(input);
  const assessmentVersion =
    filters.assessmentVersion?.trim() || JOB_QUALITY_ASSESSMENT_VERSION;
  const intelligenceProcessorVersion =
    filters.intelligenceProcessorVersion?.trim() ||
    JOB_INTELLIGENCE_PROCESSOR_VERSION;

  const prisma = getPrisma();
  const jobWhere = buildJobWhere(filters);

  const jobs = await prisma.job.findMany({
    where: jobWhere,
    select: demandJobSelect(assessmentVersion, intelligenceProcessorVersion),
    orderBy: [{ postedAt: "asc" }, { id: "asc" }],
    skip: filters.offset,
    take: filters.limit,
  });

  return observationsFromLoadedJobs({
    jobs,
    filters,
    assessmentVersion,
    intelligenceProcessorVersion,
  });
}

/**
 * One Job round-trip for current + previous windows. Same eligibility/skill
 * rules as loadDemandObservations — split in memory, no formula change.
 */
export async function loadDemandObservationPair(input: DemandFilters): Promise<{
  current: LoadDemandObservationsResult;
  previous: LoadDemandObservationsResult;
}> {
  const filters = resolveFilters(input);
  const previous = previousPeriodOfEqualDuration(filters.from, filters.to);
  const assessmentVersion =
    filters.assessmentVersion?.trim() || JOB_QUALITY_ASSESSMENT_VERSION;
  const intelligenceProcessorVersion =
    filters.intelligenceProcessorVersion?.trim() ||
    JOB_INTELLIGENCE_PROCESSOR_VERSION;

  const prisma = getPrisma();
  const jobs = await prisma.job.findMany({
    where: buildJobWhere({ ...filters, from: previous.from, to: filters.to }),
    select: demandJobSelect(assessmentVersion, intelligenceProcessorVersion),
    orderBy: [{ postedAt: "asc" }, { id: "asc" }],
    take: Math.min(Math.max(filters.limit * 2, filters.limit), MAX_DEMAND_JOB_LIMIT),
  });

  const currentJobs = jobs.filter((job) => {
    const t = job.postedAt?.getTime();
    return t != null && t >= filters.from.getTime() && t < filters.to.getTime();
  });
  const previousJobs = jobs.filter((job) => {
    const t = job.postedAt?.getTime();
    return t != null && t >= previous.from.getTime() && t < previous.to.getTime();
  });

  return {
    current: observationsFromLoadedJobs({
      jobs: currentJobs,
      filters,
      assessmentVersion,
      intelligenceProcessorVersion,
    }),
    previous: observationsFromLoadedJobs({
      jobs: previousJobs,
      filters: { ...filters, from: previous.from, to: previous.to },
      assessmentVersion,
      intelligenceProcessorVersion,
    }),
  };
}

function buildJobWhere(filters: DemandFilters): Prisma.JobWhereInput {
  const jobWhere: Prisma.JobWhereInput = {
    postedAt: {
      gte: filters.from,
      lt: filters.to,
    },
    isDemo: false,
  };
  if (filters.sourceId) {
    jobWhere.sourceId = filters.sourceId;
  }
  if (filters.occupationId) {
    jobWhere.occupationId = filters.occupationId;
  }
  if (filters.sectorId) {
    jobWhere.sectorId = filters.sectorId;
  }
  if (filters.geography?.locationId) {
    jobWhere.locationId = filters.geography.locationId;
  } else if (filters.geography) {
    const locationFilter: Prisma.LocationWhereInput = {};
    if (filters.geography.country) {
      locationFilter.country = filters.geography.country;
    }
    if (filters.geography.state) {
      locationFilter.state = filters.geography.state;
    }
    if (filters.geography.district) {
      locationFilter.district = filters.geography.district;
    }
    if (filters.geography.city) {
      locationFilter.city = filters.geography.city;
    }
    if (Object.keys(locationFilter).length > 0) {
      jobWhere.location = locationFilter;
    }
  }
  return jobWhere;
}

function demandJobSelect(
  assessmentVersion: string,
  intelligenceProcessorVersion: string,
) {
  return {
    id: true,
    postedAt: true,
    sourceId: true,
    locationId: true,
    location: {
      select: {
        id: true,
        country: true,
        state: true,
        district: true,
        city: true,
      },
    },
    qualityAssessments: {
      where: { assessmentVersion, status: "PROCESSED" as const },
      select: { eligibility: true },
      take: 1,
    },
    intelligenceRecords: {
      where: {
        processorVersion: intelligenceProcessorVersion,
        status: "PROCESSED" as const,
      },
      select: { result: true },
      take: 1,
    },
  };
}

type LoadedDemandJob = {
  id: string;
  postedAt: Date | null;
  sourceId: string | null;
  locationId: string | null;
  location: {
    id: string;
    country: string;
    state: string;
    district: string | null;
    city: string | null;
  } | null;
  qualityAssessments: Array<{ eligibility: string }>;
  intelligenceRecords: Array<{ result: unknown }>;
};

function observationsFromLoadedJobs(input: {
  jobs: LoadedDemandJob[];
  filters: DemandFilters;
  assessmentVersion: string;
  intelligenceProcessorVersion: string;
}): LoadDemandObservationsResult {
  const { jobs, filters, assessmentVersion, intelligenceProcessorVersion } =
    input;
  const qualityCoverage: DemandQualityCoverage = {
    totalObservations: jobs.length,
    included: 0,
    caution: 0,
    excluded: 0,
    analyzed: 0,
    missingQuality: 0,
    missingIntelligence: 0,
    weightedEligibleJobs: 0,
  };

  if (jobs.length === 0) {
    return {
      observations: [],
      qualityCoverage,
      assessmentVersion,
      intelligenceProcessorVersion,
      scannedJobs: 0,
    };
  }

  const observations: DemandJobObservation[] = [];

  for (const job of jobs) {
    const location = locationFromJob(job);
    if (!matchesGeography(location, filters.geography)) {
      continue;
    }

    const eligibilityRaw = job.qualityAssessments[0]?.eligibility;
    if (!eligibilityRaw) {
      qualityCoverage.missingQuality += 1;
      continue;
    }
    const eligibility = asEligibility(eligibilityRaw);

    const qWeight = qualityWeight(eligibility);
    const intelligence =
      (job.intelligenceRecords[0]?.result as JobIntelligenceResult | undefined) ??
      null;
    const skillsAll =
      qWeight > 0 ? buildSkillsFromIntelligence(intelligence, eligibility) : [];

    if (
      qWeight > 0 &&
      filters.skillId &&
      !skillsAll.some((s) => s.skillId === filters.skillId)
    ) {
      // Job is outside this skill-filtered demand scope.
      continue;
    }

    qualityCoverage.analyzed += 1;
    if (eligibility === QUALITY_ELIGIBILITY.INCLUDE) {
      qualityCoverage.included += 1;
    } else if (eligibility === QUALITY_ELIGIBILITY.INCLUDE_WITH_CAUTION) {
      qualityCoverage.caution += 1;
    } else {
      qualityCoverage.excluded += 1;
    }

    if (qWeight <= 0) {
      continue;
    }

    if (!intelligence) {
      qualityCoverage.missingIntelligence += 1;
    }

    const skills = filters.skillId
      ? skillsAll.filter((s) => s.skillId === filters.skillId)
      : skillsAll;

    qualityCoverage.weightedEligibleJobs += qWeight;

    observations.push({
      jobId: job.id,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      sourceId: job.sourceId,
      eligibility,
      qualityWeight: qWeight,
      location,
      skills,
      occupation: intelligence?.occupation
        ? {
            status: intelligence.occupation.status,
            occupationId: intelligence.occupation.occupationId ?? null,
            code: intelligence.occupation.code ?? null,
            name: intelligence.occupation.name ?? null,
          }
        : {
            status: "UNCLASSIFIED",
            occupationId: null,
            code: null,
            name: null,
          },
      sector: intelligence?.sector
        ? {
            status: intelligence.sector.status,
            sectorId: intelligence.sector.sectorId ?? null,
            code: intelligence.sector.code ?? null,
            name: intelligence.sector.name ?? null,
          }
        : {
            status: "UNCLASSIFIED",
            sectorId: null,
            code: null,
            name: null,
          },
      experience: intelligence?.experience
        ? {
            status: intelligence.experience.status,
            minYears: intelligence.experience.minYears,
            maxYears: intelligence.experience.maxYears,
            freshersAccepted: intelligence.experience.freshersAccepted,
            confidenceTier: intelligence.experience.confidenceTier,
          }
        : {
            status: "UNKNOWN",
            confidenceTier: "LOW",
          },
      qualifications: (intelligence?.qualifications ?? []).map((row) => ({
        status: row.status,
        normalized: row.normalized,
        type: row.type,
        confidenceTier: row.confidenceTier,
      })),
    });
  }

  observations.sort((a, b) => {
    const at = a.postedAt ?? "";
    const bt = b.postedAt ?? "";
    if (at !== bt) {
      return at.localeCompare(bt);
    }
    return a.jobId.localeCompare(b.jobId);
  });

  return {
    observations,
    qualityCoverage,
    assessmentVersion,
    intelligenceProcessorVersion,
    scannedJobs: jobs.length,
  };
}

/**
 * Pure builder for tests / evaluation — no I/O.
 */
export function observationFromParts(
  observation: DemandJobObservation,
): DemandJobObservation {
  return observation;
}
