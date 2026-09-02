import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  getDataSourceById,
  getDataSources,
  patchDataSource,
  postDataSource,
} from "./data-source.controller";

export const dataSourceRouter = Router();

dataSourceRouter.get("/", requireAuth(), asyncHandler(getDataSources));
dataSourceRouter.get("/:id", requireAuth(), asyncHandler(getDataSourceById));
dataSourceRouter.post(
  "/",
  requireAuth(),
  requireRole("PLATFORM_ADMIN"),
  asyncHandler(postDataSource),
);
dataSourceRouter.patch(
  "/:id",
  requireAuth(),
  requireRole("PLATFORM_ADMIN"),
  asyncHandler(patchDataSource),
);
