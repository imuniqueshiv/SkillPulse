import { Router } from "express";
import { getPrisma } from "../config/database";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "skillpulse-api",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/db", async (_req, res) => {
  if (!env.DATABASE_URL) {
    res.status(503).json({
      status: "error",
      service: "skillpulse-api",
      database: "disconnected",
    });
    return;
  }

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      service: "skillpulse-api",
      database: "connected",
    });
  } catch {
    logger.error("Database health check failed");
    res.status(503).json({
      status: "error",
      service: "skillpulse-api",
      database: "disconnected",
    });
  }
});
