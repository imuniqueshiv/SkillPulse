import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withPrismaUrlParams(url: string): string {
  const params: string[] = [];
  if (!/[?&]connect_timeout=/i.test(url)) {
    params.push("connect_timeout=20");
  }
  if (!/[?&]pool_timeout=/i.test(url)) {
    params.push("pool_timeout=20");
  }
  if (url.includes("-pooler.") && !/[?&]pgbouncer=/i.test(url)) {
    params.push("pgbouncer=true");
  }
  if (url.includes("-pooler.") && !/[?&]connection_limit=/i.test(url)) {
    params.push("connection_limit=5");
  }
  if (params.length === 0) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}${params.join("&")}`;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    errorFormat: "minimal",
    log: [],
    datasources: env.DATABASE_URL
      ? { db: { url: withPrismaUrlParams(env.DATABASE_URL) } }
      : undefined,
  });
}

export function getPrisma(): PrismaClient {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    await disconnectPrisma();
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export async function disconnectPrisma(): Promise<void> {
  if (!globalForPrisma.prisma) {
    return;
  }

  await globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}
