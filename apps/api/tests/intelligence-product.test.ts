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
import { DEMAND_METHODOLOGY_VERSION } from "../src/modules/demand/policy";
import { GAP_METHODOLOGY_VERSION } from "../src/modules/gaps/policy";
import { DECISION_METHODOLOGY_VERSION } from "../src/modules/decision/policy";
import { PRODUCT_API_VERSION } from "../src/modules/intelligence-api/policy";

const app = createApp();
const server = app.listen(0);
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Failed to bind test server");
}
const baseUrl = `http://127.0.0.1:${address.port}`;
const createdClerkIds: string[] = [];
const createdOrgIds: string[] = [];

afterEach(() => {
  resetClerkTokenVerifier();
});

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdClerkIds.length > 0) {
      await prisma.user.deleteMany({
        where: { clerkUserId: { in: createdClerkIds } },
      });
    }
    if (createdOrgIds.length > 0) {
      await prisma.organization.deleteMany({
        where: { id: { in: createdOrgIds } },
      });
    }
  }
  resetClerkTokenVerifier();
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

async function json(path: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}

async function provisionUser(
  role: "PLATFORM_ADMIN" | "GOVERNMENT_MANAGER" | "INSTITUTE_ADMIN" | "LEARNER" | "EMPLOYER" | "TRAINER",
  organizationId?: string | null,
) {
  const clerkUserId = `user_p14_${role}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  createdClerkIds.push(clerkUserId);
  await getPrisma().user.create({
    data: {
      clerkUserId,
      role,
      organizationId: organizationId ?? null,
    },
  });
  return { clerkUserId, token: mockToken(clerkUserId) };
}

test("GET /api/v1/intelligence/overview requires auth", async () => {
  const { response, body } = await json("/api/v1/intelligence/overview");
  assert.equal(response.status, 401);
  assert.equal((body.error as { statusCode: number }).statusCode, 401);
});

test("LEARNER cannot read intelligence overview", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const { token } = await provisionUser("LEARNER");
  const { response } = await json("/api/v1/intelligence/overview", token);
  assert.equal(response.status, 403);
});

test("PLATFORM_ADMIN overview returns bounded adapter envelope", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const { token } = await provisionUser("PLATFORM_ADMIN");
  const { response, body } = await json(
    "/api/v1/intelligence/overview?limit=5",
    token,
  );
  assert.equal(response.status, 200);
  assert.ok(body.data);
  assert.ok(body.meta);
  const meta = body.meta as {
    productVersion: string;
    generatedAt: string;
    phaseVersions: Record<string, string | null>;
    limitations: string[];
  };
  assert.equal(meta.productVersion, PRODUCT_API_VERSION);
  assert.ok(typeof meta.generatedAt === "string");
  assert.equal(meta.phaseVersions.demand, DEMAND_METHODOLOGY_VERSION);
  assert.equal(meta.phaseVersions.gap, GAP_METHODOLOGY_VERSION);
  assert.equal(meta.phaseVersions.decision, DECISION_METHODOLOGY_VERSION);
  assert.ok(Array.isArray(meta.limitations));

  const data = body.data as {
    employment: { status: string; trainingToEmployment: { status: string } };
    demand: { topSkills: unknown[] };
  };
  assert.equal(data.employment.status, "INSUFFICIENT_DATA");
  assert.equal(data.employment.trainingToEmployment.status, "INSUFFICIENT_DATA");
  assert.ok(data.demand.topSkills.length <= 10);
});

test("invalid query parameters are rejected", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const { token } = await provisionUser("GOVERNMENT_MANAGER");
  const badLimit = await json("/api/v1/intelligence/overview?limit=0", token);
  assert.equal(badLimit.response.status, 400);

  const badFrom = await json(
    "/api/v1/intelligence/overview?from=not-a-date",
    token,
  );
  assert.equal(badFrom.response.status, 400);

  const badPriority = await json(
    "/api/v1/intelligence/decisions?priority=BEST",
    token,
  );
  assert.equal(badPriority.response.status, 400);

  const badOffset = await json(
    "/api/v1/intelligence/decisions?offset=-1",
    token,
  );
  assert.equal(badOffset.response.status, 400);

  const oversized = await json(
    "/api/v1/intelligence/decisions?limit=999",
    token,
  );
  assert.equal(oversized.response.status, 200);
  const page = oversized.body.data as { pagination: { limit: number } };
  assert.ok(page.pagination.limit <= 50);
});

test("decisions require government roles and are bounded", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const employer = await provisionUser("EMPLOYER");
  const forbidden = await json("/api/v1/intelligence/decisions", employer.token);
  assert.equal(forbidden.response.status, 403);

  const admin = await provisionUser("PLATFORM_ADMIN");
  const ok = await json(
    "/api/v1/intelligence/decisions?limit=3&offset=0",
    admin.token,
  );
  assert.equal(ok.response.status, 200);
  const data = ok.body.data as {
    signals: unknown[];
    pagination: { limit: number; total: number };
  };
  assert.ok(data.signals.length <= 3);
  assert.equal(data.pagination.limit, 3);
});

test("skill intelligence rejects invalid id and returns 404 for missing skill", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const { token } = await provisionUser("PLATFORM_ADMIN");
  const bad = await json("/api/v1/intelligence/skills/abc", token);
  assert.equal(bad.response.status, 400);

  const missing = await json(
    "/api/v1/intelligence/skills/11111111-1111-4111-8111-111111111111",
    token,
  );
  assert.equal(missing.response.status, 404);
});

test("institute resource-scope authorization blocks cross-org access", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const prisma = getPrisma();
  const ownOrg = await prisma.organization.create({
    data: {
      name: `P14 Own Org ${Date.now()}`,
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
  });
  const otherOrg = await prisma.organization.create({
    data: {
      name: `P14 Other Org ${Date.now()}`,
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
  });
  createdOrgIds.push(ownOrg.id, otherOrg.id);

  const instituteAdmin = await provisionUser("INSTITUTE_ADMIN", ownOrg.id);
  const cross = await json(
    `/api/v1/intelligence/institutes/${otherOrg.id}`,
    instituteAdmin.token,
  );
  assert.equal(cross.response.status, 403);

  const own = await json(
    `/api/v1/intelligence/institutes/${ownOrg.id}`,
    instituteAdmin.token,
  );
  assert.equal(own.response.status, 200);
  const ownData = own.body.data as {
    institute: { id: string; location: { status: string } };
    employmentOutcomes: { status: string };
  };
  assert.equal(ownData.institute.id, ownOrg.id);
  assert.equal(ownData.institute.location.status, "UNKNOWN");
  assert.equal(ownData.employmentOutcomes.status, "INSUFFICIENT_DATA");
});

test("program intelligence enforces institute scope", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const prisma = getPrisma();
  const orgA = await prisma.organization.create({
    data: {
      name: `P14 Prog Org A ${Date.now()}`,
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: `P14 Prog Org B ${Date.now()}`,
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
  });
  createdOrgIds.push(orgA.id, orgB.id);

  const courseB = await prisma.course.create({
    data: {
      name: `P14 Course B ${Date.now()}`,
      organizationId: orgB.id,
      status: "ACTIVE",
      isDemo: true,
    },
  });

  const adminA = await provisionUser("INSTITUTE_ADMIN", orgA.id);
  const forbidden = await json(
    `/api/v1/intelligence/programs/${courseB.id}`,
    adminA.token,
  );
  assert.equal(forbidden.response.status, 403);

  const gov = await provisionUser("GOVERNMENT_MANAGER");
  const allowed = await json(
    `/api/v1/intelligence/programs/${courseB.id}`,
    gov.token,
  );
  assert.equal(allowed.response.status, 200);
  const data = allowed.body.data as {
    program: { location: { status: string } };
    employmentOutcomes: { status: string };
  };
  assert.equal(data.program.location.status, "UNKNOWN");
  assert.equal(data.employmentOutcomes.status, "INSUFFICIENT_DATA");

  await prisma.course.delete({ where: { id: courseB.id } });
});

test("decision detail invalid signal id returns 400; missing returns 404", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const { token } = await provisionUser("PLATFORM_ADMIN");
  const bad = await json("/api/v1/intelligence/decisions/nosep", token);
  assert.equal(bad.response.status, 400);

  const missing = await json(
    `/api/v1/intelligence/decisions/${encodeURIComponent("SKILL_SHORTAGE::-::-::2020-01-01::2020-01-02")}`,
    token,
  );
  assert.equal(missing.response.status, 404);
});

test("quality endpoint is available to government and institute admin", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }
  const learner = await provisionUser("LEARNER");
  assert.equal(
    (await json("/api/v1/intelligence/quality", learner.token)).response.status,
    403,
  );

  const admin = await provisionUser("PLATFORM_ADMIN");
  const ok = await json("/api/v1/intelligence/quality", admin.token);
  assert.equal(ok.response.status, 200);
  const data = ok.body.data as { status: string };
  assert.ok(data.status === "AVAILABLE" || data.status === "INSUFFICIENT_DATA");
});

test("Phase 14 does not alter Phase 8/9 methodology versions", async () => {
  assert.equal(DEMAND_METHODOLOGY_VERSION, "demand-v1");
  assert.equal(GAP_METHODOLOGY_VERSION, "gap-v1");
  assert.equal(DECISION_METHODOLOGY_VERSION, "decision-v1");
  assert.equal(PRODUCT_API_VERSION, "product-v1");
});
