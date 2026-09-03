import { z } from "zod";
import type { JobIngestionRecord } from "./contract";
import { jobIngestionRecordSchema } from "./validate";

export const JOB_VALIDATION_STATUS = {
  VALID: "VALID",
  REJECTED: "REJECTED",
  REVIEW: "REVIEW",
} as const;

export type JobValidationStatus =
  (typeof JOB_VALIDATION_STATUS)[keyof typeof JOB_VALIDATION_STATUS];

export const JOB_VALIDATION_REASON = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_CONTRACT_KIND: "INVALID_CONTRACT_KIND",
  INVALID_CONTRACT_VERSION: "INVALID_CONTRACT_VERSION",
  INVALID_ADAPTER_NAME: "INVALID_ADAPTER_NAME",
  INVALID_ADAPTER_VERSION: "INVALID_ADAPTER_VERSION",
  SOURCE_IDENTITY_MISSING: "SOURCE_IDENTITY_MISSING",
  INVALID_SOURCE_ID: "INVALID_SOURCE_ID",
  INVALID_SOURCE_CODE: "INVALID_SOURCE_CODE",
  TITLE_MISSING: "TITLE_MISSING",
  TITLE_INVALID_TYPE: "TITLE_INVALID_TYPE",
  TITLE_TOO_SHORT: "TITLE_TOO_SHORT",
  TITLE_PLACEHOLDER: "TITLE_PLACEHOLDER",
  INVALID_SOURCE_URL: "INVALID_SOURCE_URL",
  INVALID_POSTED_AT: "INVALID_POSTED_AT",
  INVALID_EXPIRES_AT: "INVALID_EXPIRES_AT",
  INVALID_OBSERVED_AT: "INVALID_OBSERVED_AT",
  INVALID_INGESTED_AT: "INVALID_INGESTED_AT",
  IMPOSSIBLE_TIMESTAMP_RANGE: "IMPOSSIBLE_TIMESTAMP_RANGE",
  INVALID_SALARY_RANGE: "INVALID_SALARY_RANGE",
  INVALID_SOURCE_METADATA: "INVALID_SOURCE_METADATA",
  INVALID_FIELD: "INVALID_FIELD",
  POSTED_AFTER_OBSERVED: "POSTED_AFTER_OBSERVED",
} as const;

export type JobValidationReasonCode =
  (typeof JOB_VALIDATION_REASON)[keyof typeof JOB_VALIDATION_REASON];

export type JobValidationIssue = {
  severity: typeof JOB_VALIDATION_STATUS.REJECTED | typeof JOB_VALIDATION_STATUS.REVIEW;
  code: JobValidationReasonCode;
  path: string;
  message: string;
};

export type JobValidationResult = {
  status: JobValidationStatus;
  reasons: JobValidationIssue[];
  record: JobIngestionRecord | null;
};

const PLACEHOLDER_TITLES = new Set([
  "n/a",
  "na",
  "n.a.",
  "none",
  "unknown",
  "untitled",
  "null",
  "undefined",
  "tbd",
]);

function issue(
  severity: JobValidationIssue["severity"],
  code: JobValidationReasonCode,
  path: string,
  message: string,
): JobValidationIssue {
  return { severity, code, path, message };
}

function compareIssues(a: JobValidationIssue, b: JobValidationIssue): number {
  if (a.severity !== b.severity) {
    return a.severity === JOB_VALIDATION_STATUS.REJECTED ? -1 : 1;
  }
  if (a.code !== b.code) {
    return a.code < b.code ? -1 : 1;
  }
  if (a.path !== b.path) {
    return a.path < b.path ? -1 : 1;
  }
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}

function dedupeIssues(issues: JobValidationIssue[]): JobValidationIssue[] {
  const seen = new Set<string>();
  const unique: JobValidationIssue[] = [];
  for (const item of issues) {
    const key = `${item.severity}:${item.code}:${item.path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  unique.sort(compareIssues);
  return unique;
}

function mapZodIssue(zodIssue: z.ZodIssue): JobValidationIssue {
  const path = zodIssue.path.join(".");
  const field = String(zodIssue.path[zodIssue.path.length - 1] ?? "");

  if (path === "" || path === undefined) {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_INPUT,
      "",
      "Ingestion input is not a job contract object",
    );
  }

  if (field === "kind" || path === "kind") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_CONTRACT_KIND,
      path,
      "kind must be JOB",
    );
  }

  if (field === "contractVersion") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_CONTRACT_VERSION,
      path,
      "contractVersion must be 1",
    );
  }

  if (field === "adapterName") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_ADAPTER_NAME,
      path,
      "adapterName is required",
    );
  }

  if (field === "adapterVersion") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_ADAPTER_VERSION,
      path,
      "adapterVersion is required",
    );
  }

  if (field === "title") {
    if (zodIssue.code === "invalid_type" && "received" in zodIssue) {
      if (zodIssue.received !== "undefined" && zodIssue.received !== "null") {
        return issue(
          JOB_VALIDATION_STATUS.REJECTED,
          JOB_VALIDATION_REASON.TITLE_INVALID_TYPE,
          path,
          "title must be a string",
        );
      }
    }
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.TITLE_MISSING,
      path,
      "title is required",
    );
  }

  if (field === "sourceId") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_SOURCE_ID,
      path,
      "sourceId must be a UUID",
    );
  }

  if (field === "sourceCode") {
    if (zodIssue.code === "custom") {
      return issue(
        JOB_VALIDATION_STATUS.REJECTED,
        JOB_VALIDATION_REASON.SOURCE_IDENTITY_MISSING,
        path,
        "sourceId or sourceCode is required",
      );
    }
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_SOURCE_CODE,
      path,
      "sourceCode format is invalid",
    );
  }

  if (field === "sourceUrl") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_SOURCE_URL,
      path,
      "sourceUrl must be an http or https URL",
    );
  }

  if (field === "postedAt") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_POSTED_AT,
      path,
      "postedAt must be a timezone-aware instant",
    );
  }

  if (field === "expiresAt") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_EXPIRES_AT,
      path,
      "expiresAt must be a timezone-aware instant",
    );
  }

  if (field === "observedAt") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_OBSERVED_AT,
      path,
      "observedAt must be a timezone-aware instant",
    );
  }

  if (field === "ingestedAt") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_INGESTED_AT,
      path,
      "ingestedAt must be a timezone-aware instant",
    );
  }

  if (path.startsWith("payload.salary") || field === "min" || field === "max") {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_SALARY_RANGE,
      path,
      "salary range is invalid",
    );
  }

  if (field === "sourceMetadata" || path.startsWith("payload.sourceMetadata")) {
    return issue(
      JOB_VALIDATION_STATUS.REJECTED,
      JOB_VALIDATION_REASON.INVALID_SOURCE_METADATA,
      path,
      "sourceMetadata is invalid",
    );
  }

  return issue(
    JOB_VALIDATION_STATUS.REJECTED,
    JOB_VALIDATION_REASON.INVALID_FIELD,
    path,
    "Field failed contract validation",
  );
}

function policyIssues(record: JobIngestionRecord): JobValidationIssue[] {
  const issues: JobValidationIssue[] = [];
  const { payload } = record;
  const title = payload.title;

  if (title.length <= 2) {
    issues.push(
      issue(
        JOB_VALIDATION_STATUS.REVIEW,
        JOB_VALIDATION_REASON.TITLE_TOO_SHORT,
        "payload.title",
        "title is structurally present but unusually short",
      ),
    );
  }

  if (PLACEHOLDER_TITLES.has(title.toLowerCase())) {
    issues.push(
      issue(
        JOB_VALIDATION_STATUS.REVIEW,
        JOB_VALIDATION_REASON.TITLE_PLACEHOLDER,
        "payload.title",
        "title looks like a placeholder rather than a job title",
      ),
    );
  }

  if (
    payload.postedAt &&
    payload.expiresAt &&
    payload.expiresAt.getTime() < payload.postedAt.getTime()
  ) {
    issues.push(
      issue(
        JOB_VALIDATION_STATUS.REJECTED,
        JOB_VALIDATION_REASON.IMPOSSIBLE_TIMESTAMP_RANGE,
        "payload.expiresAt",
        "expiresAt is earlier than postedAt",
      ),
    );
  }

  if (payload.ingestedAt.getTime() < payload.observedAt.getTime()) {
    issues.push(
      issue(
        JOB_VALIDATION_STATUS.REJECTED,
        JOB_VALIDATION_REASON.IMPOSSIBLE_TIMESTAMP_RANGE,
        "payload.ingestedAt",
        "ingestedAt is earlier than observedAt",
      ),
    );
  }

  if (
    payload.postedAt &&
    payload.postedAt.getTime() > payload.observedAt.getTime()
  ) {
    issues.push(
      issue(
        JOB_VALIDATION_STATUS.REVIEW,
        JOB_VALIDATION_REASON.POSTED_AFTER_OBSERVED,
        "payload.postedAt",
        "postedAt is later than observedAt",
      ),
    );
  }

  return issues;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rawSourceIdentityIssue(input: unknown): JobValidationIssue | undefined {
  if (!isPlainObject(input) || !isPlainObject(input.payload)) {
    return undefined;
  }

  const { sourceId, sourceCode } = input.payload;
  if (sourceId !== undefined || sourceCode !== undefined) {
    return undefined;
  }

  return issue(
    JOB_VALIDATION_STATUS.REJECTED,
    JOB_VALIDATION_REASON.SOURCE_IDENTITY_MISSING,
    "payload.sourceCode",
    "sourceId or sourceCode is required",
  );
}

function statusFromReasons(reasons: JobValidationIssue[]): JobValidationStatus {
  if (reasons.some((item) => item.severity === JOB_VALIDATION_STATUS.REJECTED)) {
    return JOB_VALIDATION_STATUS.REJECTED;
  }
  if (reasons.some((item) => item.severity === JOB_VALIDATION_STATUS.REVIEW)) {
    return JOB_VALIDATION_STATUS.REVIEW;
  }
  return JOB_VALIDATION_STATUS.VALID;
}

/**
 * Phase 5.5 job-ingestion validation.
 *
 * Structural parsing reuses the Phase 5.2 Zod contract. Policy checks run
 * only after a record parses. This function does not persist Jobs, mutate
 * raw observations, deduplicate, score freshness, or look up DataSource rows.
 */
export function validateJobIngestion(input: unknown): JobValidationResult {
  if (input === null || input === undefined || typeof input !== "object") {
    return {
      status: JOB_VALIDATION_STATUS.REJECTED,
      reasons: [
        issue(
          JOB_VALIDATION_STATUS.REJECTED,
          JOB_VALIDATION_REASON.INVALID_INPUT,
          "",
          "Ingestion input is not a job contract object",
        ),
      ],
      record: null,
    };
  }

  const parsed = jobIngestionRecordSchema.safeParse(input);
  if (!parsed.success) {
    const extra = rawSourceIdentityIssue(input);
    const reasons = dedupeIssues([
      ...parsed.error.issues.map(mapZodIssue),
      ...(extra ? [extra] : []),
    ]);
    return {
      status: JOB_VALIDATION_STATUS.REJECTED,
      reasons,
      record: null,
    };
  }

  const reasons = dedupeIssues(policyIssues(parsed.data));
  return {
    status: statusFromReasons(reasons),
    reasons,
    record: parsed.data,
  };
}
