import { createJobSourceAdapter } from "../adapter";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../contract";
import { AppError } from "../../../utils/errors";
import { NCS_SOURCE_CODE } from "./ncs-access";

/**
 * SkillPulse NCS-shaped record for file / synthetic fixtures.
 *
 * This is NOT an official NCS API schema. Field names follow a SkillPulse
 * sample export designed to exercise Phase 5 mapping. Live NCS access is
 * unverified — see ncs-access.ts.
 *
 * Source-provided fields (functional_role, sector, education, experience,
 * skills) stay in the observation / sourceMetadata. Phase 6 derived
 * occupation/skills are separate evidence.
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
};

export const NCS_ADAPTER_NAME = "skillpulse-ncs";
export const NCS_ADAPTER_VERSION = "0.1.0";
export { NCS_SOURCE_CODE };

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
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

    const location = {
      raw: [text(record.city), text(record.district), text(record.state)]
        .filter((part): part is string => Boolean(part))
        .join(", "),
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
