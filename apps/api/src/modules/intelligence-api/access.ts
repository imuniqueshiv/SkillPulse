import type { Request } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../../utils/errors";
import { resolveOrganizationScope } from "../../middleware/organizationScope";
import {
  DEFAULT_INTELLIGENCE_LIMIT,
  INTELLIGENCE_DECISION_ROLES,
  INTELLIGENCE_GOVERNMENT_ROLES,
  INTELLIGENCE_SCOPED_ROLES,
  MAX_INTELLIGENCE_LIMIT,
  PRODUCT_API_VERSION,
} from "./policy";

export function requireIntelligenceUser(req: Request): {
  role: UserRole;
  organizationId: string | null;
  userId: string;
} {
  if (!req.user) {
    throw new AppError(401, "Unauthorized");
  }
  return {
    role: req.user.role,
    organizationId: req.user.organizationId,
    userId: req.user.id,
  };
}

export function assertCanReadIntelligence(role: UserRole): void {
  const allowed = new Set<string>([
    ...INTELLIGENCE_GOVERNMENT_ROLES,
    ...INTELLIGENCE_SCOPED_ROLES,
  ]);
  if (!allowed.has(role)) {
    throw new AppError(403, "Forbidden");
  }
}

export function assertCanReadDecisions(role: UserRole): void {
  if (!(INTELLIGENCE_DECISION_ROLES as readonly string[]).includes(role)) {
    throw new AppError(403, "Forbidden");
  }
}

export function assertCanReadQuality(role: UserRole): void {
  if (
    !(INTELLIGENCE_GOVERNMENT_ROLES as readonly string[]).includes(role) &&
    role !== "INSTITUTE_ADMIN"
  ) {
    throw new AppError(403, "Forbidden");
  }
}

/** Institute/program access — scoped users only see their organization. */
export function resolveInstituteScope(
  req: Request,
  requestedOrganizationId?: string,
): string | null {
  return resolveOrganizationScope(req, requestedOrganizationId);
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_INTELLIGENCE_LIMIT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new AppError(400, "Invalid limit");
  }
  return Math.min(Math.floor(n), MAX_INTELLIGENCE_LIMIT);
}

export function parseOptionalIsoDate(
  raw: unknown,
  field: string,
): Date | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") {
    throw new AppError(400, `Invalid ${field}`);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(400, `Invalid ${field}`);
  }
  return d;
}

export function resolveAnalysisWindow(query: {
  from?: unknown;
  to?: unknown;
}): { from: Date; to: Date } {
  const to = parseOptionalIsoDate(query.to, "to") ?? new Date("2026-09-15T00:00:00.000Z");
  const from =
    parseOptionalIsoDate(query.from, "from") ??
    new Date(to.getTime() - 45 * 24 * 60 * 60 * 1000);
  if (from.getTime() > to.getTime()) {
    throw new AppError(400, "from must be before to");
  }
  return { from, to };
}

export function metaEnvelope(input: {
  period: { from: string; to: string; dateField: string };
  phaseVersions?: Record<string, string | null | undefined>;
  limitations?: string[];
  dataQuality?: string | null;
}): {
  productVersion: string;
  period: { from: string; to: string; dateField: string };
  generatedAt: string;
  phaseVersions: Record<string, string | null>;
  limitations: string[];
  dataQuality: string | null;
} {
  const phaseVersions: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(input.phaseVersions ?? {})) {
    phaseVersions[k] = v ?? null;
  }
  return {
    productVersion: PRODUCT_API_VERSION,
    period: input.period,
    generatedAt: new Date().toISOString(),
    phaseVersions,
    limitations: input.limitations ?? [],
    dataQuality: input.dataQuality ?? null,
  };
}

export function parseUuidLike(id: string, label: string): string {
  const v = id?.trim();
  if (!v || v.length < 8) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return v;
}

/** Decision signal IDs are deterministic composite keys (category::skill::program::from::to). */
export function parseSignalId(id: string): string {
  const v = decodeURIComponent(id?.trim() ?? "");
  if (!v || v.length < 8 || !v.includes("::")) {
    throw new AppError(400, "Invalid signalId");
  }
  return v;
}
