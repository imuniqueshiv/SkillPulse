import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createApp } from "../src/app";
import { disconnectPrisma } from "../src/config/database";
import { env } from "../src/config/env";

const app = createApp();
const server = app.listen(0);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("Failed to bind test server");
}

const baseUrl = `http://127.0.0.1:${address.port}`;

after(async () => {
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

test("GET /health reports API process health", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = (await response.json()) as {
    status: string;
    service: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "skillpulse-api");
});

test("GET /health/db reflects real database configuration", async () => {
  const response = await fetch(`${baseUrl}/health/db`);
  const body = (await response.json()) as {
    status: string;
    service: string;
    database: string;
  };

  assert.equal(body.service, "skillpulse-api");

  if (!env.DATABASE_URL) {
    assert.equal(response.status, 503);
    assert.equal(body.status, "error");
    assert.equal(body.database, "disconnected");
    return;
  }

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.database, "connected");
});
