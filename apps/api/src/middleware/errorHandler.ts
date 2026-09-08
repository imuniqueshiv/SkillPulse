import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

function redact(value: string): string {
  return value
    .replace(/[a-z]+:\/\/\S+/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function isPrismaError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    String((err as { name: string }).name).startsWith("Prisma")
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isProduction = env.NODE_ENV === "production";
  const rawMessage = err instanceof Error ? err.message : "Unexpected error";

  let message: string;
  if (isPrismaError(err)) {
    message = "A database error occurred";
  } else if (isAppError || !isProduction) {
    message = redact(rawMessage);
  } else {
    message = "Internal Server Error";
  }

  const code = isAppError
    ? `APP_${statusCode}`
    : isPrismaError(err)
      ? "DATABASE_ERROR"
      : "INTERNAL_ERROR";

  logger.error("Request failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl?.split("?")[0] ?? req.path,
    statusCode,
    code,
    message: redact(rawMessage),
    name: err instanceof Error ? err.name : undefined,
  });

  if (!res.getHeader("x-request-id") && req.requestId) {
    res.setHeader("x-request-id", req.requestId);
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      code,
      requestId: req.requestId,
      ...(isProduction ||
      !(err instanceof Error) ||
      isPrismaError(err) ||
      isAppError
        ? {}
        : { stack: redact(err.stack ?? "") }),
    },
  });
}
