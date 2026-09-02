import type { Request, Response } from "express";
import { resolveOrganizationScope } from "../../middleware/organizationScope";

export function getCurrentUser(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({
      error: { message: "Unauthorized", statusCode: 401 },
    });
    return;
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      clerkUserId: req.user.clerkUserId,
      role: req.user.role,
      organizationId: req.user.organizationId,
    },
  });
}

export function getOrganizationScope(req: Request, res: Response): void {
  const requested =
    typeof req.query.organizationId === "string"
      ? req.query.organizationId
      : typeof req.body?.organizationId === "string"
        ? req.body.organizationId
        : undefined;

  const organizationId = resolveOrganizationScope(req, requested);

  res.status(200).json({ organizationId });
}

export function getPrivilegedProbe(_req: Request, res: Response): void {
  res.status(200).json({ ok: true });
}
