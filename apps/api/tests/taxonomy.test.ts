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
import { normalizeTerm } from "../src/modules/taxonomy/normalize";

const app = createApp();
const server = app.listen(0);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("Failed to bind test server");
}

const baseUrl = `http://127.0.0.1:${address.port}`;
const createdClerkIds: string[] = [];
const createdSkillIds: string[] = [];
const createdOccupationIds: string[] = [];
const createdSectorIds: string[] = [];
const stamp = Date.now();

afterEach(() => {
  resetClerkTokenVerifier();
});

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdSkillIds.length > 0) {
      await prisma.skill.deleteMany({ where: { id: { in: createdSkillIds } } });
    }
    if (createdOccupationIds.length > 0) {
      await prisma.occupation.deleteMany({
        where: { id: { in: createdOccupationIds } },
      });
    }
    if (createdSectorIds.length > 0) {
      await prisma.sector.deleteMany({ where: { id: { in: createdSectorIds } } });
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

async function json(path: string, token?: string) {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}

async function authToken(): Promise<string> {
  const clerkUserId = `user_tax_${stamp}_${createdClerkIds.length}`;
  createdClerkIds.push(clerkUserId);
  return mockToken(clerkUserId);
}

test("GET /api/v1/skills without auth returns 401", async () => {
  const { response } = await json("/api/v1/skills");
  assert.equal(response.status, 401);
});

test("taxonomy search, aliases, relationships and unresolved terms", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const token = await authToken();

  const sector = await prisma.sector.create({
    data: {
      code: `sp.sector.test-${stamp}`,
      name: `[TEST] Taxonomy Sector ${stamp}`,
      status: "ACTIVE",
    },
  });
  createdSectorIds.push(sector.id);

  const occupation = await prisma.occupation.create({
    data: {
      code: `T${stamp}`,
      name: `[TEST] Taxonomy Occupation ${stamp}`,
      sectorId: sector.id,
      status: "ACTIVE",
    },
  });
  createdOccupationIds.push(occupation.id);

  const javaCanonical = normalizeTerm(`Java ${stamp}`);
  const javascriptCanonical = normalizeTerm(`JavaScript ${stamp}`);

  const java = await prisma.skill.create({
    data: {
      code: `sp.skill.test-java-${stamp}`,
      name: "Java",
      canonicalName: javaCanonical,
      category: "information-technology",
      skillType: "TECHNICAL",
      status: "ACTIVE",
    },
  });
  const javascript = await prisma.skill.create({
    data: {
      code: `sp.skill.test-javascript-${stamp}`,
      name: "JavaScript",
      canonicalName: javascriptCanonical,
      category: "information-technology",
      skillType: "TECHNICAL",
      status: "ACTIVE",
    },
  });
  createdSkillIds.push(java.id, javascript.id);

  const aliasRaw = `JS ${stamp}`;
  const aliasNormalized = normalizeTerm(aliasRaw);

  await prisma.skillAlias.create({
    data: {
      skillId: javascript.id,
      rawTerm: aliasRaw,
      normalizedTerm: aliasNormalized,
      confidence: 0.95,
      authority: "SKILLPULSE",
    },
  });

  await prisma.skillOccupation.create({
    data: {
      skillId: javascript.id,
      occupationId: occupation.id,
      relation: "CORE",
      confidence: 0.9,
      authority: "SKILLPULSE",
    },
  });

  const search = await json(
    `/api/v1/skills?q=${encodeURIComponent(aliasRaw)}`,
    token,
  );
  assert.equal(search.response.status, 200);
  const searchItems = search.body.items as Array<{ id: string }>;
  assert.equal(searchItems.length, 1);
  assert.equal(searchItems[0]?.id, javascript.id);

  const occupationFilter = await json(
    `/api/v1/skills?occupationId=${occupation.id}`,
    token,
  );
  assert.equal(occupationFilter.response.status, 200);
  const linked = occupationFilter.body.items as Array<{ id: string }>;
  assert.equal(linked.length, 1);
  assert.equal(linked[0]?.id, javascript.id);

  const detail = await json(`/api/v1/skills/${javascript.code}`, token);
  assert.equal(detail.response.status, 200);
  const skill = detail.body.skill as {
    aliases: Array<{ rawTerm: string }>;
    occupationLinks: Array<{ occupation: { id: string } }>;
  };
  assert.equal(skill.aliases.length, 1);
  assert.equal(skill.occupationLinks[0]?.occupation.id, occupation.id);

  const occDetail = await json(`/api/v1/occupations/${occupation.code}`, token);
  assert.equal(occDetail.response.status, 200);
  const occ = occDetail.body.occupation as {
    skillLinks: Array<{ skill: { id: string } }>;
  };
  assert.equal(occ.skillLinks[0]?.skill.id, javascript.id);

  const canonical = await json(
    `/api/v1/taxonomy/normalize?term=${encodeURIComponent(`JavaScript ${stamp}`)}`,
    token,
  );
  assert.equal(canonical.response.status, 200);
  assert.equal(canonical.body.status, "resolved");
  assert.equal(canonical.body.matchType, "canonical");
  assert.equal((canonical.body.skill as { id: string }).id, javascript.id);

  const aliasHit = await json(
    `/api/v1/taxonomy/normalize?term=${encodeURIComponent(aliasRaw)}`,
    token,
  );
  assert.equal(aliasHit.body.status, "resolved");
  assert.equal(aliasHit.body.matchType, "alias");
  assert.equal((aliasHit.body.skill as { id: string }).id, javascript.id);

  const javaOnly = await json(
    `/api/v1/taxonomy/normalize?term=${encodeURIComponent(`Java ${stamp}`)}`,
    token,
  );
  assert.equal(javaOnly.body.status, "resolved");
  assert.equal((javaOnly.body.skill as { id: string }).id, java.id);

  const unresolved = await json(
    "/api/v1/taxonomy/normalize?term=quantum%20blockchain%20ninja",
    token,
  );
  assert.equal(unresolved.response.status, 200);
  assert.equal(unresolved.body.status, "unresolved");
  assert.equal(unresolved.body.skill, undefined);

  const typo = await json(
    "/api/v1/taxonomy/normalize?term=java%20scriptt",
    token,
  );
  assert.equal(typo.body.status, "unresolved");

  const missing = await json(
    "/api/v1/skills/00000000-0000-4000-8000-000000000099",
    token,
  );
  assert.equal(missing.response.status, 404);
});
