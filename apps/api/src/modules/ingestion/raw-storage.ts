import {
  Prisma,
  RawIngestionPayloadFormat,
  RawIngestionRecordKind,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SOURCE_CODE_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const FORBIDDEN_KEY =
  /^(api[_-]?key|password|secret|token|cookie|authorization|bearer|access[_-]?token)$/i;

const instant = z.union([
  z.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: "Invalid datetime",
  }),
  z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
]);

const storeSchema = z
  .object({
    sourceId: z.string().trim().regex(UUID_RE, "Invalid source id").optional(),
    sourceCode: z
      .string()
      .trim()
      .regex(SOURCE_CODE_RE, "Invalid source code")
      .optional(),
    kind: z.nativeEnum(RawIngestionRecordKind).default("JOB"),
    externalId: z.string().trim().min(1).max(200).optional(),
    payload: z.unknown().optional(),
    payloadFormat: z.nativeEnum(RawIngestionPayloadFormat).optional(),
    payloadRef: z.string().trim().min(1).max(2000).optional(),
    observedAt: instant,
    adapterName: z.string().trim().min(1).max(80).optional(),
    adapterVersion: z.string().trim().min(1).max(40).optional(),
  })
  .refine((value) => Boolean(value.sourceId || value.sourceCode), {
    message: "Source identity is required (sourceId or sourceCode)",
    path: ["sourceCode"],
  })
  .refine(
    (value) => value.payload !== undefined || Boolean(value.payloadRef),
    {
      message: "payload or payloadRef is required",
      path: ["payload"],
    },
  );

const recordSelect = {
  id: true,
  sourceId: true,
  kind: true,
  externalId: true,
  payload: true,
  payloadFormat: true,
  payloadRef: true,
  checksum: true,
  observedAt: true,
  receivedAt: true,
  status: true,
  adapterName: true,
  adapterVersion: true,
  createdAt: true,
  updatedAt: true,
  source: {
    select: { id: true, code: true, name: true },
  },
} as const;

function parsedOr400<T>(parsed: z.SafeParseReturnType<unknown, T>): T {
  if (!parsed.success) {
    throw new AppError(400, "Invalid input");
  }
  return parsed.data;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function assertNoCredentialKeys(value: unknown, depth = 0): void {
  if (depth > 8 || value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoCredentialKeys(item, depth + 1);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      throw new AppError(400, "Raw payload must not contain credentials");
    }
    assertNoCredentialKeys(nested, depth + 1);
  }
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const nested = (value as Record<string, unknown>)[key];
    if (nested === undefined) {
      continue;
    }
    sorted[key] = sortKeys(nested);
  }
  return sorted;
}

/** Canonical JSON used for checksums: UTF-8 JSON with object keys sorted recursively. Array order is preserved. */
export function canonicalPayloadJson(payload: unknown): string {
  return JSON.stringify(sortKeys(payload));
}

/**
 * SHA-256 hex digest of the raw payload.
 * Inline payload: hash of canonical JSON.
 * Reference-only: hash of `payloadRef:` + the reference string.
 * Identical payloads produce the same digest; this is not job deduplication.
 */
export function computeRawPayloadChecksum(input: {
  payload?: unknown;
  payloadRef?: string;
}): string {
  const material =
    input.payload !== undefined
      ? canonicalPayloadJson(input.payload)
      : `payloadRef:${input.payloadRef ?? ""}`;

  return createHash("sha256").update(material, "utf8").digest("hex");
}

function toJsonValue(payload: unknown): Prisma.InputJsonValue {
  let serialized: string;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    throw new AppError(400, "Payload is not JSON-serializable");
  }

  if (serialized === undefined) {
    throw new AppError(400, "Payload is not JSON-serializable");
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function resolveFormat(input: {
  payload?: unknown;
  payloadRef?: string;
  payloadFormat?: RawIngestionPayloadFormat;
}): RawIngestionPayloadFormat {
  if (input.payloadFormat) {
    return input.payloadFormat;
  }
  if (input.payload === undefined && input.payloadRef) {
    return "EXTERNAL_REF";
  }
  if (typeof input.payload === "string") {
    return "TEXT";
  }
  return "JSON";
}

async function resolveSource(sourceId?: string, sourceCode?: string) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.findFirst({
    where: sourceId && isUuid(sourceId) ? { id: sourceId } : { code: sourceCode },
    select: { id: true, code: true, name: true },
  });

  if (!source) {
    throw new AppError(404, "Data source not found");
  }

  if (sourceId && sourceCode && source.code !== sourceCode) {
    throw new AppError(400, "Source id and source code do not match");
  }

  return source;
}

/**
 * Persist a source observation as received.
 * Does not map, validate as a Job contract, deduplicate jobs, or write Job rows.
 */
export async function storeRawObservation(input: unknown) {
  const data = parsedOr400(storeSchema.safeParse(input));
  const source = await resolveSource(data.sourceId, data.sourceCode);
  const payloadFormat = resolveFormat(data);

  if (payloadFormat === "EXTERNAL_REF" && !data.payloadRef) {
    throw new AppError(400, "payloadRef is required for EXTERNAL_REF");
  }

  if (payloadFormat !== "EXTERNAL_REF" && data.payload === undefined) {
    throw new AppError(400, "payload is required");
  }

  if (payloadFormat === "TEXT" && data.payload !== undefined && typeof data.payload !== "string") {
    throw new AppError(400, "TEXT payload must be a string");
  }

  if (data.payload !== undefined) {
    assertNoCredentialKeys(data.payload);
  }

  const jsonPayload =
    data.payload === undefined ? null : toJsonValue(data.payload);
  const checksum = computeRawPayloadChecksum({
    payload: jsonPayload === null ? undefined : jsonPayload,
    payloadRef: data.payloadRef,
  });
  const receivedAt = new Date();
  const prisma = getPrisma();

  const record = await prisma.rawIngestionRecord.create({
    data: {
      sourceId: source.id,
      kind: data.kind,
      externalId: data.externalId ?? null,
      payload: jsonPayload === null ? Prisma.DbNull : jsonPayload,
      payloadFormat,
      payloadRef: data.payloadRef ?? null,
      checksum,
      observedAt: data.observedAt,
      receivedAt,
      status: "RECEIVED",
      adapterName: data.adapterName ?? null,
      adapterVersion: data.adapterVersion ?? null,
    },
    select: recordSelect,
  });

  return { record };
}
