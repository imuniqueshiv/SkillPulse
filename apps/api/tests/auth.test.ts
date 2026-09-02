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

const app = createApp();
const server = app.listen(0);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("Failed to bind test server");
}

const baseUrl = `http://127.0.0.1:${address.port}`;
const createdClerkIds: string[] = [];

afterEach(() => {
  resetClerkTokenVerifier();
});

after(async () => {
  if (env.DATABASE_URL && createdClerkIds.length > 0) {
    await getPrisma().user.deleteMany({
      where: { clerkUserId: { in: createdClerkIds } },
    });
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

async function json(path: string, token?: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}

test("GET /api/v1/auth/me without auth returns 401", async () => {
  const { response, body } = await json("/api/v1/auth/me");
  assert.equal(response.status, 401);
  assert.equal((body.error as { statusCode: number }).statusCode, 401);
});

test("GET /api/v1/auth/me with malformed auth returns 401", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: "Basic abc" },
  });
  assert.equal(response.status, 401);
});

test("GET /api/v1/auth/me with invalid token returns 401", async () => {
  mockToken("user_never", "valid-token");
  const { response } = await json("/api/v1/auth/me", "invalid-token");
  assert.equal(response.status, 401);
});

test("GET /health and /health/db remain public", async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);

  const db = await fetch(`${baseUrl}/health/db`);
  assert.ok(db.status === 200 || db.status === 503);
});

test("authenticated Clerk user is provisioned as LEARNER and mapped to SkillPulse user", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const clerkUserId = `user_phase3_${Date.now()}`;
  createdClerkIds.push(clerkUserId);
  const token = mockToken(clerkUserId);

  const first = await json("/api/v1/auth/me?role=PLATFORM_ADMIN&userId=impersonated", token);
  assert.equal(first.response.status, 200);
  const user = first.body.user as {
    id: string;
    clerkUserId: string;
    role: string;
    organizationId: string | null;
  };
  assert.equal(user.clerkUserId, clerkUserId);
  assert.equal(user.role, "LEARNER");
  assert.equal(user.organizationId, null);

  const second = await json("/api/v1/auth/me", token);
  assert.equal(second.response.status, 200);
  const again = second.body.user as { id: string };
  assert.equal(again.id, user.id);

  const count = await getPrisma().user.count({ where: { clerkUserId } });
  assert.equal(count, 1);
});

test("insufficient role returns 403 and PLATFORM_ADMIN is allowed", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const learnerId = `user_phase3_learner_${Date.now()}`;
  const adminId = `user_phase3_admin_${Date.now()}`;
  createdClerkIds.push(learnerId, adminId);

  const learnerToken = mockToken(learnerId, `tok_${learnerId}`);
  await json("/api/v1/auth/me", learnerToken);
  const learnerPrivileged = await json("/api/v1/auth/privileged", learnerToken);
  assert.equal(learnerPrivileged.response.status, 403);

  await getPrisma().user.create({
    data: {
      clerkUserId: adminId,
      role: "PLATFORM_ADMIN",
    },
  });
  const adminToken = mockToken(adminId, `tok_${adminId}`);
  const adminPrivileged = await json("/api/v1/auth/privileged", adminToken);
  assert.equal(adminPrivileged.response.status, 200);
});

test("client cannot select another organization to bypass scope", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const clerkUserId = `user_phase3_org_${Date.now()}`;
  createdClerkIds.push(clerkUserId);
  const token = mockToken(clerkUserId);
  await json("/api/v1/auth/me", token);

  const { response } = await json(
    "/api/v1/auth/scope?organizationId=22222222-2222-4222-8222-222222222222",
    token,
  );
  assert.equal(response.status, 403);
});

test("GET /health stays unauthenticated while auth/me requires a token", async () => {
  const health = await json("/health");
  assert.equal(health.response.status, 200);
  const me = await json("/api/v1/auth/me");
  assert.equal(me.response.status, 401);
});
