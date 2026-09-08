import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";
import {
  assertCanReadDecisions,
  assertCanReadIntelligence,
  assertCanReadQuality,
  parseLimit,
  parseOptionalIsoDate,
  parseUuidLike,
  parseSignalId,
  requireIntelligenceUser,
  resolveAnalysisWindow,
  resolveInstituteScope,
} from "./access";
import {
  getDecisionSignalDetail,
  getInstituteIntelligence,
  getOverviewIntelligence,
  getProgramIntelligence,
  getQualityIntelligence,
  getSkillIntelligence,
  listDecisionSignals,
  parseDecisionCategory,
  parseDecisionConfidence,
  parseDecisionPriority,
  parseOffset,
  type IntelligenceQueryFilters,
} from "./service";
import { INTELLIGENCE_GOVERNMENT_ROLES } from "./policy";

export const intelligenceRouter = Router();

function parseCommonFilters(req: Request): IntelligenceQueryFilters {
  const { from, to } = resolveAnalysisWindow(req.query);
  const rankLimit = parseLimit(req.query.limit);
  const geography =
    req.query.state || req.query.district || req.query.country
      ? {
          country:
            typeof req.query.country === "string" ? req.query.country : undefined,
          state: typeof req.query.state === "string" ? req.query.state : undefined,
          district:
            typeof req.query.district === "string"
              ? req.query.district
              : undefined,
        }
      : undefined;

  const skillId =
    typeof req.query.skillId === "string" && req.query.skillId.trim()
      ? req.query.skillId.trim()
      : undefined;
  const occupationId =
    typeof req.query.occupationId === "string" && req.query.occupationId.trim()
      ? req.query.occupationId.trim()
      : undefined;
  const sectorId =
    typeof req.query.sectorId === "string" && req.query.sectorId.trim()
      ? req.query.sectorId.trim()
      : undefined;

  // Reject unknown expensive knobs early
  if (req.query.offset !== undefined && req.path.endsWith("/overview")) {
    throw new AppError(400, "offset is not supported on overview");
  }

  void parseOptionalIsoDate(req.query.referenceTime, "referenceTime");

  return {
    from,
    to,
    geography,
    skillId,
    occupationId,
    sectorId,
    rankLimit,
  };
}

function isGovernmentWide(role: string): boolean {
  return (INTELLIGENCE_GOVERNMENT_ROLES as readonly string[]).includes(role);
}

intelligenceRouter.get(
  "/overview",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadIntelligence(user.role);
    const filters = parseCommonFilters(req);
    const result = await getOverviewIntelligence(filters);
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/quality",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadQuality(user.role);
    const result = await getQualityIntelligence();
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/skills/:skillId",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadIntelligence(user.role);
    const skillId = parseUuidLike(String(req.params.skillId ?? ""), "skillId");
    const filters = parseCommonFilters(req);
    const result = await getSkillIntelligence(skillId, filters);
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/programs/:courseId",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadIntelligence(user.role);
    const courseId = parseUuidLike(String(req.params.courseId ?? ""), "courseId");
    const filters = parseCommonFilters(req);
    const scopedOrg = isGovernmentWide(user.role)
      ? null
      : resolveInstituteScope(req, user.organizationId ?? undefined);
    if (!isGovernmentWide(user.role) && !scopedOrg) {
      throw new AppError(403, "Forbidden");
    }
    const result = await getProgramIntelligence(courseId, filters, scopedOrg);
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/institutes/:organizationId",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadIntelligence(user.role);
    const organizationId = parseUuidLike(
      String(req.params.organizationId ?? ""),
      "organizationId",
    );
    const filters = parseCommonFilters(req);
    // Always resolve scope — URL org id is not trusted for scoped roles.
    const authorizedOrgId = resolveInstituteScope(req, organizationId);
    if (!isGovernmentWide(user.role)) {
      if (!authorizedOrgId || authorizedOrgId !== organizationId) {
        throw new AppError(403, "Forbidden");
      }
    }
    const scopedForService = isGovernmentWide(user.role)
      ? null
      : authorizedOrgId;
    const result = await getInstituteIntelligence(
      organizationId,
      filters,
      scopedForService,
    );
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/decisions",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadDecisions(user.role);
    const filters = parseCommonFilters(req);
    const result = await listDecisionSignals({
      ...filters,
      priority: parseDecisionPriority(req.query.priority),
      category: parseDecisionCategory(req.query.category),
      confidence: parseDecisionConfidence(req.query.confidence),
      state:
        typeof req.query.state === "string" ? req.query.state : undefined,
      district:
        typeof req.query.district === "string" ? req.query.district : undefined,
      offset: parseOffset(req.query.offset),
    });
    res.status(200).json(result);
  }),
);

intelligenceRouter.get(
  "/decisions/:signalId",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireIntelligenceUser(req);
    assertCanReadDecisions(user.role);
    const signalId = parseSignalId(String(req.params.signalId ?? ""));
    const filters = parseCommonFilters(req);
    const result = await getDecisionSignalDetail(signalId, filters);
    res.status(200).json(result);
  }),
);
