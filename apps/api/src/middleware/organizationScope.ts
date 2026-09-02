import type { UserRole } from "@prisma/client";
import type { Request } from "express";
import { AppError } from "../utils/errors";

const CROSS_ORG_ROLES: UserRole[] = ["PLATFORM_ADMIN", "GOVERNMENT_MANAGER"];

export function resolveOrganizationScope(
  req: Request,
  requestedOrganizationId?: string,
): string | null {
  if (!req.user) {
    throw new AppError(401, "Unauthorized");
  }

  const membership = req.user.organizationId;
  const requested = requestedOrganizationId?.trim() || undefined;

  if (!requested) {
    return membership;
  }

  if (CROSS_ORG_ROLES.includes(req.user.role)) {
    return requested;
  }

  if (!membership || membership !== requested) {
    throw new AppError(403, "Forbidden");
  }

  return membership;
}
