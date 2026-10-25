
import app from "./app";
import { disconnectPrisma } from "./config/database";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const server = app.listen(env.API_PORT, () => {
  logger.info("API started", {
    service: "skillpulse-api",
    port: env.API_PORT,
    env: env.NODE_ENV,
  });
});

function shutdown(signal: string): void {
  logger.info("API shutting down", { signal });
  server.close(() => {
    void disconnectPrisma().finally(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { message: error.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : "Unhandled rejection";
  logger.error("Unhandled rejection", { message });
  process.exit(1);
});
