import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../utils/errors";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, "Unauthorized"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, "Forbidden"));
      return;
    }

    next();
  };
}
