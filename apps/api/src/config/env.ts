import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

loadDotenv({ path: resolve(__dirname, "../../../../.env") });
loadDotenv();

const emptyToUndefined = (v: unknown) =>
  v === "" || v === undefined || v === null ? undefined : v;

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DIRECT_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    CLERK_SECRET_KEY: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
    /**
     * Comma-separated browser origins allowed for CORS.
     * Production should list the deployed web origin(s), not "*".
     */
    CORS_ORIGINS: z.string().min(1).default("http://localhost:3000"),
    /** Express JSON body size limit (e.g. 100kb, 1mb). */
    JSON_BODY_LIMIT: z.string().min(1).default("100kb"),
    /**
     * When true (default in production), trust X-Forwarded-* from a reverse proxy.
     */
    TRUST_PROXY: z
      .enum(["true", "false", "1", "0"])
      .optional()
      .transform((v) => v === "true" || v === "1"),
    /** Phase 17.2 NCS acquisition. Never defaults to scraping ncs.gov.in. */
    NCS_ACQUISITION_MODE: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    NCS_API_BASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    NCS_API_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    NCS_RAW_RETENTION_DAYS: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? 90 : v),
      z.coerce.number().int().min(1).max(3650),
    ),
    NCS_SCHEDULE_INTERVAL_HOURS: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? 24 : v),
      z.coerce.number().int().min(1).max(168),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;
    if (!data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production",
      });
    }
    if (!data.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLERK_SECRET_KEY"],
        message: "CLERK_SECRET_KEY is required in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment: ${issues}`);
}

const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  throw new Error("Invalid environment: CORS_ORIGINS must list at least one origin");
}

if (parsed.data.NODE_ENV === "production" && corsOrigins.includes("*")) {
  throw new Error(
    "Invalid environment: CORS_ORIGINS must not use wildcard * in production",
  );
}

export const env = {
  ...parsed.data,
  corsOrigins,
  trustProxy:
    parsed.data.TRUST_PROXY ?? parsed.data.NODE_ENV === "production",
};
