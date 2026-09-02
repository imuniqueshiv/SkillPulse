import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { createApp } from "../src/app";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  resetClerkTokenVerifier,
  setClerkTokenVerifier,
} from "../src/integrations/clerk/verify-token";
import { AppError } from "../src/utils/errors";
import { seedDataSources } from "../prisma/seed-data-sources";

const app = createApp();
const server = app.listen(0);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("Failed to bind test server");
}

const baseUrl = `http://127.0.0.1:${address.port}`;
const createdClerkIds: string[] = [];
const createdSourceIds: string[] = [];
const stamp = Date.now();

afterEach(() => {
  resetClerkTokenVerifier();
});

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
    if (createdClerkIds.length > 0) {
      await prisma.user.deleteMany({
        where: { clerkUserId: { in: createdClerkIds } },
      });
    }
  }

  resetClerkTokenVerifier();
  await disconnectPrisma();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

function mockToken(clerkUserId: string, token = `tok_${clerkUserId}`): string {
  setClerkTokenVerifier(async (value) => {
    if (value !== token) {
      throw new AppError(401, "Unauthorized");
    }
    return { clerkUserId };
  });
  return token;
}

async function json(
  path: string,
  auth?: { clerkUserId: string; token: string },
  init?: RequestInit,
) {
  if (auth) {
    mockToken(auth.clerkUserId, auth.token);
  }
  const headers = new Headers(init?.headers);
  if (auth) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}

async function learnerAuth(): Promise<{ clerkUserId: string; token: string }> {
  const clerkUserId = `user_ds_${stamp}_${createdClerkIds.length}`;
  createdClerkIds.push(clerkUserId);
  const token = `tok_${clerkUserId}`;
  mockToken(clerkUserId, token);
  return { clerkUserId, token };
}

async function adminAuth(): Promise<{ clerkUserId: string; token: string }> {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  const clerkUserId = `user_ds_admin_${stamp}_${createdClerkIds.length}`;
  createdClerkIds.push(clerkUserId);
  await getPrisma().user.create({
    data: { clerkUserId, role: "PLATFORM_ADMIN" },
  });
  const token = `tok_${clerkUserId}`;
  mockToken(clerkUserId, token);
  return { clerkUserId, token };
}

test("GET /api/v1/data-sources without auth returns 401", async () => {
  const { response } = await json("/api/v1/data-sources");
  assert.equal(response.status, 401);
});

test("data-source registry read, write RBAC, validation and seed idempotence", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const learner = await learnerAuth();
  const admin = await adminAuth();

  const unauth = await json("/api/v1/data-sources");
  assert.equal(unauth.response.status, 401);

  const list = await json("/api/v1/data-sources?isDemo=false", learner);
  assert.equal(list.response.status, 200);
  assert.ok(typeof list.body.total === "number");

  const missing = await json(
    "/api/v1/data-sources/00000000-0000-4000-8000-000000000099",
    learner,
  );
  assert.equal(missing.response.status, 404);

  const forbidden = await json("/api/v1/data-sources", learner, {
    method: "POST",
    body: JSON.stringify({
      code: `sp.source.test-${stamp}`,
      name: `[TEST] Source ${stamp}`,
      type: "GOVERNMENT",
    }),
  });
  assert.equal(forbidden.response.status, 403);

  const invalidType = await json("/api/v1/data-sources", admin, {
    method: "POST",
    body: JSON.stringify({
      code: `sp.source.test-bad-type-${stamp}`,
      name: `[TEST] Bad type ${stamp}`,
      type: "SCRAPER",
    }),
  });
  assert.equal(invalidType.response.status, 400);

  const invalidUrl = await json("/api/v1/data-sources", admin, {
    method: "POST",
    body: JSON.stringify({
      code: `sp.source.test-bad-url-${stamp}`,
      name: `[TEST] Bad URL ${stamp}`,
      type: "GOVERNMENT",
      url: "not-a-url",
    }),
  });
  assert.equal(invalidUrl.response.status, 400);

  const created = await json("/api/v1/data-sources", admin, {
    method: "POST",
    body: JSON.stringify({
      code: `sp.source.test-${stamp}`,
      name: `[TEST] Source ${stamp}`,
      type: "GOVERNMENT",
      url: "https://www.ncs.gov.in/",
      accessMethod: "WEB_REFERENCE",
      domain: "JOBS",
      geographicScope: "INDIA",
    }),
  });
  assert.equal(created.response.status, 201);
  const source = created.body.source as { id: string; code: string };
  createdSourceIds.push(source.id);

  const duplicate = await json("/api/v1/data-sources", admin, {
    method: "POST",
    body: JSON.stringify({
      code: `sp.source.test-${stamp}`,
      name: `[TEST] Source duplicate ${stamp}`,
      type: "GOVERNMENT",
    }),
  });
  assert.equal(duplicate.response.status, 409);

  const byCode = await json(`/api/v1/data-sources/${source.code}`, learner);
  assert.equal(byCode.response.status, 200);
  assert.equal((byCode.body.source as { id: string }).id, source.id);

  const deactivated = await json(`/api/v1/data-sources/${source.id}`, admin, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
  assert.equal(deactivated.response.status, 200);
  assert.equal((deactivated.body.source as { active: boolean }).active, false);

  await seedDataSources(prisma);
  await seedDataSources(prisma);
  const ncsCount = await prisma.dataSource.count({
    where: { code: "sp.source.ncs" },
  });
  assert.equal(ncsCount, 1);
});
