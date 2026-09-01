import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isProduction = env.NODE_ENV === "production";

  const message =
    isAppError || !isProduction
      ? err instanceof Error
        ? err.message
        : "Unexpected error"
      : "Internal Server Error";

  logger.error("Request failed", {
    statusCode,
    message: err instanceof Error ? err.message : "Unknown error",
    name: err instanceof Error ? err.name : undefined,
  });

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(isProduction || !(err instanceof Error)
        ? {}
        : { stack: err.stack }),
    },
  });
}
