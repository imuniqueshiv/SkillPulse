import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../utils/logger";

/**
 * Lightweight access log — method, path, status, duration, requestId.
 * Does not log Authorization, cookies, or bodies.
 */
export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on("finish", () => {
      const path = req.originalUrl?.split("?")[0] ?? req.path;
      // Skip noisy health probes at info level in production? Keep info for MVP observability.
      logger.info("HTTP request", {
        requestId: req.requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Date.now() - started,
      });
    });
    next();
  };
}
