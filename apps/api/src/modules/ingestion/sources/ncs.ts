import { createJobSourceAdapter } from "../adapter";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../contract";
import { AppError } from "../../../utils/errors";
import { NCS_SOURCE_CODE } from "./ncs-access";

/**
 * SkillPulse NCS adapter input.
 *
 * Supports:
 * - skillpulse-ncs-sample-v1 synthetic/authorized shaped records (job_id, …)
 * - normalized public job-listing cards (via ncs-public-listing.ts)
 *
 * This is NOT an official NCS API schema. Live scraping is out of scope.
 */

export type NcsSourceRecord = {
  job_id?: string;
  title?: string;
  description?: string;
  employer_name?: string;
  city?: string;
  district?: string;
  state?: string;
  sector?: string;
  functional_role?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  experience?: string;
  education?: string;
  salary_raw?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  posted_on?: string;
  notice_url?: string;
  observedAt: string;
  ingestedAt: string;
  _listing?: {
    source_file?: string;
    posted_raw?: string;
    applicants?: string;
    employment_type?: string;
    category?: string;
    subcategory?: string;
    locations?: string[];
    logo?: string;
    reported_total_on_page?: number | null;
  };
};

export const NCS_ADAPTER_NAME = "skillpulse-ncs";
export const NCS_ADAPTER_VERSION = "0.2.0";
export { NCS_SOURCE_CODE };

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function clampText(value: string | undefined, max: number): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function skillTerms(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const terms = value.filter((item): item is string => typeof item === "string");
  return terms.length > 0 ? terms : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export const ncsAdapter = createJobSourceAdapter<NcsSourceRecord>({
  name: NCS_ADAPTER_NAME,
  version: NCS_ADAPTER_VERSION,
  sourceCode: NCS_SOURCE_CODE,
  map(record) {
    if (!record || typeof record !== "object") {
      throw new AppError(400, "Invalid NCS source record");
    }

    const required = skillTerms(record.required_skills);
    const preferred = skillTerms(record.preferred_skills);
    const skills = [...(required ?? []), ...(preferred ?? [])];
    const uniqueSkills = skills.length > 0 ? [...new Set(skills)] : undefined;

    const listingLocations = record._listing?.locations;
    const locationRaw = clampText(
      Array.isArray(listingLocations) && listingLocations.length > 0
        ? listingLocations.join(", ")
        : text(record.city) || text(record.district) || text(record.state)
          ? [text(record.city), text(record.district), text(record.state)]
              .filter((part): part is string => Boolean(part))
              .join(", ")
          : undefined,
      500,
    );

    const location = {
      raw: locationRaw,
      city: text(record.city),
      district: text(record.district),
      state: text(record.state),
    };

    const salaryRaw = text(record.salary_raw);
    const salaryMin = optionalNumber(record.salary_min);
    const salaryMax = optionalNumber(record.salary_max);
    const salaryCurrency = text(record.salary_currency);
    const salary =
      salaryRaw || salaryMin !== undefined || salaryMax !== undefined
        ? {
            raw: salaryRaw,
            min: salaryMin,
            max: salaryMax,
            currency: salaryCurrency,
          }
        : undefined;

    const sourceMetadata: Record<string, unknown> = {};
    if (uniqueSkills) {
      sourceMetadata.skills = uniqueSkills;
    }
    if (required) {
      sourceMetadata.requiredSkills = required;
    }
    if (preferred) {
      sourceMetadata.preferredSkills = preferred;
    }
    const sector = text(record.sector);
    const functionalRole = text(record.functional_role);
    if (sector) {
      sourceMetadata.sourceSector = sector;
    }
    if (functionalRole) {
      sourceMetadata.sourceFunctionalRole = functionalRole;
    }

    const listing = record._listing;
    if (listing) {
      if (listing.source_file) {
        sourceMetadata.sourceFile = listing.source_file;
      }
      if (listing.posted_raw) {
        sourceMetadata.postedRaw = listing.posted_raw;
      }
      if (listing.applicants) {
        // Applicants are observation metadata only — never demand quantity.
        sourceMetadata.applicantsLabel = listing.applicants;
      }
      if (listing.employment_type) {
        sourceMetadata.employmentType = listing.employment_type;
      }
      if (listing.category) {
        sourceMetadata.sourceCategory = listing.category;
      }
      if (listing.subcategory) {
        sourceMetadata.sourceSubcategory = listing.subcategory;
      }
      if (Array.isArray(listing.locations) && listing.locations.length > 0) {
        sourceMetadata.sourceLocations = listing.locations;
      }
      if (listing.logo) {
        sourceMetadata.logo = listing.logo;
      }
      if (
        typeof listing.reported_total_on_page === "number" &&
        Number.isFinite(listing.reported_total_on_page)
      ) {
        sourceMetadata.reportedTotalOnPage = listing.reported_total_on_page;
      }
      sourceMetadata.captureKind = "public-job-listing-snapshot";
    }

    return {
      kind: INGESTION_RECORD_KIND.JOB,
      contractVersion: INGESTION_CONTRACT_VERSION,
      adapterName: NCS_ADAPTER_NAME,
      adapterVersion: NCS_ADAPTER_VERSION,
      payload: {
        sourceCode: NCS_SOURCE_CODE,
        externalId: text(record.job_id),
        title: typeof record.title === "string" ? record.title : "",
        description: text(record.description),
        employerName: text(record.employer_name),
        location:
          location.raw || location.city || location.state ? location : undefined,
        experience: text(record.experience),
        qualification: text(record.education),
        salary,
        sourceUrl: text(record.notice_url),
        postedAt: text(record.posted_on),
        observedAt: record.observedAt,
        ingestedAt: record.ingestedAt,
        sourceMetadata:
          Object.keys(sourceMetadata).length > 0 ? sourceMetadata : undefined,
      },
    };
  },
});
