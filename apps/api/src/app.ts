import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { router } from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      strictTransportSecurity: env.NODE_ENV === "production",
    }),
  );
  app.use(
    cors({
      origin: ["http://localhost:3000"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json());

  app.use(router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
