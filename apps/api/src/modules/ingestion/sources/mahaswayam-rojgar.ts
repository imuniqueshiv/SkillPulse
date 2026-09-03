import { createJobSourceAdapter } from "../adapter";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../contract";
import { AppError } from "../../../utils/errors";

/**
 * SkillPulse sample export shape for Mahaswayam Rojgar.
 * This is NOT an official portal API schema. Live API/file access is unverified.
 */
export type MahaswayamRojgarRecord = {
  vacancy_id?: string;
  post_name?: string;
  employer_name?: string;
  job_description?: string;
  city?: string;
  district?: string;
  state?: string;
  posted_on?: string;
  valid_upto?: string;
  notice_url?: string;
  skills?: string[];
  observedAt: string;
  ingestedAt: string;
};

export const MAHASWAYAM_ROJGAR_ADAPTER_NAME = "skillpulse-mahaswayam-rojgar";
export const MAHASWAYAM_ROJGAR_ADAPTER_VERSION = "0.1.0";
export const MAHASWAYAM_ROJGAR_SOURCE_CODE = "sp.source.mahaswayam-rojgar";

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

export const mahaswayamRojgarAdapter = createJobSourceAdapter<MahaswayamRojgarRecord>(
  {
    name: MAHASWAYAM_ROJGAR_ADAPTER_NAME,
    version: MAHASWAYAM_ROJGAR_ADAPTER_VERSION,
    sourceCode: MAHASWAYAM_ROJGAR_SOURCE_CODE,
    map(record) {
      if (!record || typeof record !== "object") {
        throw new AppError(400, "Invalid Mahaswayam Rojgar record");
      }

      const skills = skillTerms(record.skills);
      const location = {
        raw: [text(record.city), text(record.district), text(record.state)]
          .filter((part): part is string => Boolean(part))
          .join(", "),
        city: text(record.city),
        district: text(record.district),
        state: text(record.state),
      };

      return {
        kind: INGESTION_RECORD_KIND.JOB,
        contractVersion: INGESTION_CONTRACT_VERSION,
        adapterName: MAHASWAYAM_ROJGAR_ADAPTER_NAME,
        adapterVersion: MAHASWAYAM_ROJGAR_ADAPTER_VERSION,
        payload: {
          sourceCode: MAHASWAYAM_ROJGAR_SOURCE_CODE,
          externalId: text(record.vacancy_id),
          title: typeof record.post_name === "string" ? record.post_name : "",
          description: text(record.job_description),
          employerName: text(record.employer_name),
          location: location.raw || location.city || location.state ? location : undefined,
          sourceUrl: text(record.notice_url),
          postedAt: text(record.posted_on),
          expiresAt: text(record.valid_upto),
          observedAt: record.observedAt,
          ingestedAt: record.ingestedAt,
          sourceMetadata: skills ? { skills } : undefined,
        },
      };
    },
  },
);
