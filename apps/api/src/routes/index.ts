import { Router } from "express";
import { getPrisma } from "../config/database";
import { env } from "../config/env";
import { authRouter } from "../modules/auth/auth.routes";
import { dataSourceRouter } from "../modules/data-sources/data-source.routes";
import { taxonomyRouter } from "../modules/taxonomy/taxonomy.routes";
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

const v1 = Router();
v1.use("/auth", authRouter);
v1.use("/data-sources", dataSourceRouter);
v1.use(taxonomyRouter);
router.use("/api/v1", v1);
