import { z } from "zod";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
  type JobIngestionRecord,
} from "./contract";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SOURCE_CODE_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const FORBIDDEN_METADATA_KEY =
  /^(api[_-]?key|password|secret|token|cookie|authorization|bearer|access[_-]?token)$/i;

const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).optional();

const instant = z.union([
  z.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "Invalid datetime",
  }),
  z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
]);

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    { message: "URL must use http or https" },
  );

const locationSchema = z.object({
  raw: optionalText(500),
  city: optionalText(120),
  district: optionalText(120),
  state: optionalText(120),
  country: optionalText(120),
});

const salarySchema = z
  .object({
    raw: optionalText(200),
    min: z.number().finite().nonnegative().optional(),
    max: z.number().finite().nonnegative().optional(),
    currency: optionalText(8),
  })
  .refine(
    (value) =>
      value.min === undefined ||
      value.max === undefined ||
      value.min <= value.max,
    { message: "salary.min must be less than or equal to salary.max" },
  );

const sourceMetadataSchema = z
  .record(z.unknown())
  .refine(
    (value) =>
      Object.keys(value).every((key) => !FORBIDDEN_METADATA_KEY.test(key)),
    { message: "sourceMetadata must not contain credentials" },
  );

const jobObservationSchema = z
  .object({
    sourceId: z.string().trim().regex(UUID_RE, "Invalid source id").optional(),
    sourceCode: z
      .string()
      .trim()
      .regex(SOURCE_CODE_RE, "Invalid source code")
      .optional(),
    externalId: optionalText(200),
    title: z.string().trim().min(1).max(500),
    description: optionalText(20000),
    employerName: optionalText(300),
    location: locationSchema.optional(),
    employmentType: optionalText(80),
    experience: optionalText(500),
    qualification: optionalText(500),
    salary: salarySchema.optional(),
    sourceUrl: httpUrl.optional(),
    postedAt: instant.optional(),
    expiresAt: instant.optional(),
    observedAt: instant,
    ingestedAt: instant,
    sourceMetadata: sourceMetadataSchema.optional(),
    rawRef: optionalText(2000),
  })
  .refine((value) => Boolean(value.sourceId || value.sourceCode), {
    message: "Source identity is required (sourceId or sourceCode)",
    path: ["sourceCode"],
  });

export const jobIngestionRecordSchema = z.object({
  kind: z.literal(INGESTION_RECORD_KIND.JOB),
  contractVersion: z.literal(INGESTION_CONTRACT_VERSION),
  adapterName: z.string().trim().min(1).max(80),
  adapterVersion: z.string().trim().min(1).max(40),
  payload: jobObservationSchema,
});

/** Discriminated union hook for later record kinds. Only JOB is implemented. */
export const ingestionRecordSchema = z.discriminatedUnion("kind", [
  jobIngestionRecordSchema,
]);

export class IngestionContractError extends Error {
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(issues: z.ZodIssue[]) {
    super("Invalid ingestion record");
    this.name = "IngestionContractError";
    this.issues = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
}

export function parseJobIngestionRecord(input: unknown): JobIngestionRecord {
  const parsed = jobIngestionRecordSchema.safeParse(input);
  if (!parsed.success) {
    throw new IngestionContractError(parsed.error.issues);
  }
  return parsed.data;
}

export function safeParseJobIngestionRecord(
  input: unknown,
):
  | { success: true; data: JobIngestionRecord }
  | { success: false; error: IngestionContractError } {
  const parsed = jobIngestionRecordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: new IngestionContractError(parsed.error.issues),
    };
  }
  return { success: true, data: parsed.data };
}
