import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { router } from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(requestId());
  app.use(
    helmet({
      contentSecurityPolicy: false, // API JSON — CSP belongs on the Next.js web app
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: env.NODE_ENV === "production",
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
      xContentTypeOptions: true,
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigins,
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(requestLogger());

  app.use(router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
