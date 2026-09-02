import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import {
  getCurrentUser,
  getOrganizationScope,
  getPrivilegedProbe,
} from "./auth.controller";

export const authRouter = Router();

authRouter.get("/me", requireAuth(), getCurrentUser);
authRouter.get("/scope", requireAuth(), getOrganizationScope);
authRouter.get(
  "/privileged",
  requireAuth(),
  requireRole("PLATFORM_ADMIN"),
  getPrivilegedProbe,
);
