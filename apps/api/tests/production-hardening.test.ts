import assert from "node:assert/strict";
import { after, test } from "node:test";
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

after(async () => {
  resetClerkTokenVerifier();
  if (env.DATABASE_URL && createdClerkIds.length > 0) {
    await getPrisma().user.deleteMany({
      where: { clerkUserId: { in: createdClerkIds } },
    });
  }
  await disconnectPrisma();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function mockToken(clerkUserId: string, token = `tok_${clerkUserId}`): string {
  setClerkTokenVerifier(async (value) => {
    if (value !== token) throw new AppError(401, "Unauthorized");
    return { clerkUserId };
  });
  return token;
}

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}

test("GET /ready reflects database readiness", async () => {
  const { response, body } = await json("/ready");
  if (!env.DATABASE_URL) {
    assert.equal(response.status, 503);
    assert.equal(body.status, "not_ready");
    return;
  }
  assert.equal(response.status, 200);
  assert.equal(body.status, "ready");
  assert.equal((body.checks as { database: string }).database, "ok");
});

test("responses include X-Request-Id and errors stay production-safe", async () => {
  const { response, body } = await json("/api/v1/intelligence/overview");
  assert.equal(response.status, 401);
  const requestId = response.headers.get("x-request-id");
  assert.ok(requestId && requestId.length >= 8);
  const err = body.error as {
    message: string;
    statusCode: number;
    requestId?: string;
    stack?: string;
  };
  assert.equal(err.statusCode, 401);
  assert.equal(err.requestId, requestId);
  assert.equal(err.stack, undefined);
  assert.equal(/prisma|select |password|postgresql/i.test(err.message), false);
});

test("client-supplied X-Request-Id is echoed when safe", async () => {
  const custom = "phase15-smoke-request-id";
  const response = await fetch(`${baseUrl}/health`, {
    headers: { "X-Request-Id": custom },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-request-id"), custom);
});

test("production error path never returns Prisma internals for unknown routes", async () => {
  const { response, body } = await json("/api/v1/does-not-exist");
  assert.equal(response.status, 404);
  const err = body.error as { message: string; stack?: string };
  assert.ok(err.message);
  assert.equal(err.stack, undefined);
});

test("Phase 15 security: anonymous intelligence is 401; learner decisions 403", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const anon = await json("/api/v1/intelligence/decisions");
  assert.equal(anon.response.status, 401);

  const clerkUserId = `user_p15_learner_${Date.now()}`;
  createdClerkIds.push(clerkUserId);
  const token = mockToken(clerkUserId);
  await getPrisma().user.create({
    data: { clerkUserId, role: "LEARNER" },
  });

  const forbidden = await fetch(`${baseUrl}/api/v1/intelligence/decisions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(forbidden.status, 403);
  const body = (await forbidden.json()) as {
    error: { message: string; stack?: string };
  };
  assert.equal(body.error.stack, undefined);
  assert.equal(/prisma|sql/i.test(body.error.message), false);
});
