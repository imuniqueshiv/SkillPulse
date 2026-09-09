/**
 * Fast demo enrichment for real NCS Maharashtra jobs.
 * 1) Resolve single-city MH locations
 * 2) Sync JobSkills via resolveTerm (cached)
 * 3) Re-run Phase 6 + 7
 *
 * Flags: --skip-locations | --skip-skills | --intel-only
 * Skips demo jobs and NCS-ACQ-* leftovers.
 */

import { readFileSync } from "node:fs";
import { getPrisma, disconnectPrisma } from "../src/config/database";
import { NCS_SOURCE_CODE } from "../src/modules/ingestion/sources/ncs";
import {
  canonicalMaharashtraCityName,
  resolveMaharashtraLocationId,
} from "../src/modules/ingestion/location-resolution";
import { resolveTerm } from "../src/modules/taxonomy/taxonomy.service";
import { processJobIntelligenceById } from "../src/modules/intelligence/pipeline";
import { assessJobQuality } from "../src/modules/quality/pipeline";
import { defaultMaharashtraRawSnapshotPath } from "../src/modules/acquisition/connectors";

const OBSERVED_AT = "2026-09-08T12:00:00.000Z";
const INGESTED_AT = "2026-09-08T12:05:00.000Z";
const REFERENCE = new Date("2026-09-15T00:00:00.000Z");

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 8,
): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[retry ${i}/${attempts}] ${label}: ${msg.slice(0, 140)}`);
      await sleep(Math.min(20_000, 1500 * i));
    }
  }
  throw last;
}

async function main(): Promise<void> {
  const onlyIntel = process.argv.includes("--intel-only");
  const skipLoc = process.argv.includes("--skip-locations") || onlyIntel;
  const skipSkills = process.argv.includes("--skip-skills") || onlyIntel;

  const prisma = getPrisma();
  await withRetry("ping", () => prisma.$queryRaw`SELECT 1`, 12);

  const source = await prisma.dataSource.findUniqueOrThrow({
    where: { code: NCS_SOURCE_CODE },
    select: { id: true },
  });

  const raw = JSON.parse(
    readFileSync(defaultMaharashtraRawSnapshotPath(), "utf8"),
  ) as {
    jobs: Array<{
      id: number;
      skills?: string[];
      locations?: string[];
    }>;
  };
  const cards = new Map(raw.jobs.map((j) => [String(j.id), j]));

  const jobs = await prisma.job.findMany({
    where: {
      sourceId: source.id,
      isDemo: false,
      externalId: { not: { startsWith: "NCS-ACQ" } },
    },
    select: { id: true, externalId: true },
    orderBy: { externalId: "asc" },
  });

  console.log(
    JSON.stringify({
      phase: "fast-enrich",
      jobs: jobs.length,
      skipLoc,
      skipSkills,
      onlyIntel,
    }),
  );

  let locResolved = 0;
  if (!skipLoc) {
    for (const job of jobs) {
      const card = cards.get(job.externalId ?? "");
      if (!card) continue;
      const locs = card.locations ?? [];
      if (locs.length !== 1) continue;
      const cityName = canonicalMaharashtraCityName(locs[0]);
      if (!cityName) continue;
      try {
        await withRetry(`loc ${job.externalId}`, async () => {
          const locationId = await resolveMaharashtraLocationId(prisma, {
            city: cityName,
            state: "Maharashtra",
            sourceLocations: locs,
          });
          if (locationId) {
            await prisma.job.update({
              where: { id: job.id },
              data: { locationId },
            });
            locResolved += 1;
          }
        });
      } catch {
        /* continue */
      }
    }
    console.log(JSON.stringify({ locationsResolved: locResolved }));
  }

  const skillCache = new Map<string, string | null>();
  async function skillIdFor(term: string): Promise<string | null> {
    if (skillCache.has(term)) return skillCache.get(term) ?? null;
    try {
      const resolved = await withRetry(`skill ${term}`, () => resolveTerm(term));
      const id =
        resolved.status === "resolved" && resolved.skill
          ? resolved.skill.id
          : null;
      skillCache.set(term, id);
      return id;
    } catch {
      return null;
    }
  }

  let jobsWithSkills = 0;
  let skillLinks = 0;
  if (!skipSkills) {
    for (const job of jobs) {
      const card = cards.get(job.externalId ?? "");
      if (!card?.skills?.length) continue;
      const ids: string[] = [];
      for (const term of card.skills) {
        const id = await skillIdFor(term);
        if (id && !ids.includes(id)) ids.push(id);
      }
      if (ids.length === 0) continue;
      try {
        await withRetry(`jobskills ${job.externalId}`, async () => {
          await prisma.jobSkill.createMany({
            data: ids.map((skillId) => ({ jobId: job.id, skillId })),
            skipDuplicates: true,
          });
        });
        jobsWithSkills += 1;
        skillLinks += ids.length;
      } catch {
        /* continue */
      }
    }
    console.log(
      JSON.stringify({
        jobsWithSkills,
        skillLinks,
        uniqueTermsResolved: [...skillCache.values()].filter(Boolean).length,
      }),
    );
  }

  let intelOk = 0;
  let intelFail = 0;
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    try {
      await withRetry(`intel ${job.externalId}`, async () => {
        await processJobIntelligenceById(job.id, { persist: true });
        await assessJobQuality({
          jobId: job.id,
          referenceTime: REFERENCE,
          persist: true,
          provenanceOverride: {
            observedAt: new Date(OBSERVED_AT),
            ingestedAt: INGESTED_AT,
            validationStatus: "VALID",
            dedupStatus: "UNIQUE",
          },
        });
      });
      intelOk += 1;
    } catch {
      intelFail += 1;
    }
    if ((i + 1) % 20 === 0 || i + 1 === jobs.length) {
      console.log(
        JSON.stringify({ intelProgress: i + 1, intelOk, intelFail }),
      );
    }
  }

  console.log(
    JSON.stringify({
      done: true,
      locResolved,
      jobsWithSkills,
      skillLinks,
      intelOk,
      intelFail,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
