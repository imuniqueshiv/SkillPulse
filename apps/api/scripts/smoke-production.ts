/**
 * Deterministic Phase 15 smoke checks against a running API.
 *
 * Usage (API already listening, e.g. pnpm --filter api start):
 *   API_BASE_URL=http://127.0.0.1:4000 npx tsx apps/api/scripts/smoke-production.ts
 *
 * Optional auth smoke (Clerk bearer):
 *   SMOKE_BEARER_TOKEN=... npx tsx apps/api/scripts/smoke-production.ts
 *
 * Does not invent intelligence — only verifies liveness, readiness, and
 * Phase 14 route wiring when a token is provided.
 */
const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
const token = process.env.SMOKE_BEARER_TOKEN?.trim();

type Check = { name: string; ok: boolean; detail: string };

async function check(
  name: string,
  path: string,
  expectStatus: number | number[],
  init?: RequestInit,
): Promise<Check> {
  const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  try {
    const res = await fetch(`${base}${path}`, init);
    const ok = expected.includes(res.status);
    const requestId = res.headers.get("x-request-id") ?? "";
    return {
      name,
      ok,
      detail: `HTTP ${res.status}${requestId ? ` requestId=${requestId}` : ""}`,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: err instanceof Error ? err.message : "request failed",
    };
  }
}

async function main(): Promise<void> {
  const results: Check[] = [];
  results.push(await check("liveness", "/health", 200));
  results.push(await check("readiness", "/ready", [200, 503]));
  results.push(await check("db health", "/health/db", [200, 503]));
  results.push(
    await check("anonymous intelligence blocked", "/api/v1/intelligence/overview", 401),
  );

  if (token) {
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    results.push(
      await check("overview", "/api/v1/intelligence/overview?limit=5", [200, 403], auth),
    );
    results.push(
      await check("quality", "/api/v1/intelligence/quality", [200, 403], auth),
    );
    results.push(
      await check("decisions", "/api/v1/intelligence/decisions?limit=5", [200, 403], auth),
    );
  } else {
    results.push({
      name: "authenticated Phase 14 smoke",
      ok: true,
      detail: "skipped (set SMOKE_BEARER_TOKEN to exercise overview/quality/decisions)",
    });
  }

  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} — ${r.detail}`);
  }

  if (results.some((r) => !r.ok)) {
    process.exitCode = 1;
  }
}

void main();
