import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/env";
import { syncApplicationUser } from "../modules/users/users.service";
import { verifyClerkAccessToken } from "../integrations/clerk/verify-token";
import { AppError } from "../utils/errors";

function readBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return undefined;
  }

  return token;
}

export function requireAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    void (async () => {
      const token = readBearerToken(req.headers.authorization);

      if (!token) {
        throw new AppError(401, "Unauthorized");
      }

      const identity =
        env.devAuthToken && token === env.devAuthToken
          ? {
              clerkUserId:
                env.devClerkUserId ?? "skillpulse_local_gov_manager",
            }
          : await verifyClerkAccessToken(token);
      const user = await syncApplicationUser(identity.clerkUserId);

      req.auth = { clerkUserId: identity.clerkUserId };
      req.user = user;
    })()
      .then(() => next())
      .catch(next);
  };
}
