type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitize(meta),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function sanitize(meta?: LogMeta): LogMeta {
  if (!meta) {
    return {};
  }

  const blocked = new Set([
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
    "apiKey",
    "apikey",
  ]);

  const cleaned: LogMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    if (blocked.has(key.toLowerCase())) {
      continue;
    }
    cleaned[key] = value;
  }

  return cleaned;
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
