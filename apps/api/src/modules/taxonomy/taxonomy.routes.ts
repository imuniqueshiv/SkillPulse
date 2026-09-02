import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  getNormalizedTerm,
  getOccupationById,
  getOccupations,
  getSectorById,
  getSectors,
  getSkillById,
  getSkills,
} from "./taxonomy.controller";

export const taxonomyRouter = Router();

taxonomyRouter.get("/skills", requireAuth(), asyncHandler(getSkills));
taxonomyRouter.get("/skills/:id", requireAuth(), asyncHandler(getSkillById));
taxonomyRouter.get(
  "/occupations",
  requireAuth(),
  asyncHandler(getOccupations),
);
taxonomyRouter.get(
  "/occupations/:id",
  requireAuth(),
  asyncHandler(getOccupationById),
);
taxonomyRouter.get("/sectors", requireAuth(), asyncHandler(getSectors));
taxonomyRouter.get("/sectors/:id", requireAuth(), asyncHandler(getSectorById));
taxonomyRouter.get(
  "/taxonomy/normalize",
  requireAuth(),
  asyncHandler(getNormalizedTerm),
);
