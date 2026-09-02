import {
  PrismaClient,
  SkillOccupationRelation,
  SkillType,
  TaxonomyAuthority,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeTerm } from "../src/modules/taxonomy/normalize";

type SectorSeed = {
  code: string;
  name: string;
  description: string;
};

type OccupationSeed = {
  id?: string;
  code: string;
  name: string;
  sectorCode: string;
  description: string;
};

type SkillSeed = {
  id?: string;
  code: string;
  name: string;
  canonicalName: string;
  category: string;
  skillType: SkillType;
  description: string;
};

type AliasSeed = {
  skillCode: string;
  rawTerm: string;
  confidence: number;
  notes?: string;
};

type SkillOccupationSeed = {
  skillCode: string;
  occupationCode: string;
  relation: SkillOccupationRelation;
  confidence: number;
  notes?: string;
};

type MappingSeed = {
  skillCode?: string;
  occupationCode?: string;
  sectorCode?: string;
  authority: TaxonomyAuthority;
  externalCode: string;
  externalName?: string;
  url?: string;
  confidence: number;
  notes?: string;
};

function readJson<T>(fileName: string): T {
  const filePath = resolve(__dirname, "../../../data/taxonomy", fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export async function seedTaxonomy(prisma: PrismaClient): Promise<{
  sectorByCode: Map<string, string>;
  occupationByCode: Map<string, string>;
  skillByCode: Map<string, string>;
}> {
  const sectors = readJson<SectorSeed[]>("sectors.json");
  const occupations = readJson<OccupationSeed[]>("occupations.json");
  const skills = readJson<SkillSeed[]>("skills.json");
  const aliases = readJson<AliasSeed[]>("aliases.json");
  const skillOccupations = readJson<SkillOccupationSeed[]>("skill-occupations.json");
  const mappings = readJson<MappingSeed[]>("external-mappings.json");

  const sectorByCode = new Map<string, string>();
  const occupationByCode = new Map<string, string>();
  const skillByCode = new Map<string, string>();

  for (const row of sectors) {
    const existing =
      (await prisma.sector.findUnique({ where: { name: row.name } })) ??
      (await prisma.sector.findUnique({ where: { code: row.code } }));

    const saved = existing
      ? await prisma.sector.update({
          where: { id: existing.id },
          data: {
            code: row.code,
            name: row.name,
            description: row.description,
            status: "ACTIVE",
          },
        })
      : await prisma.sector.create({
          data: {
            code: row.code,
            name: row.name,
            description: row.description,
            status: "ACTIVE",
          },
        });

    sectorByCode.set(row.code, saved.id);
  }

  for (const row of occupations) {
    const sectorId = sectorByCode.get(row.sectorCode);
    if (!sectorId) {
      throw new Error(`Unknown sector ${row.sectorCode} for occupation ${row.code}`);
    }

    const existing =
      (row.id
        ? await prisma.occupation.findUnique({ where: { id: row.id } })
        : null) ??
      (await prisma.occupation.findUnique({ where: { code: row.code } }));

    const saved = existing
      ? await prisma.occupation.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            code: row.code,
            description: row.description,
            sectorId,
            status: "ACTIVE",
          },
        })
      : await prisma.occupation.create({
          data: {
            ...(row.id ? { id: row.id } : {}),
            name: row.name,
            code: row.code,
            description: row.description,
            sectorId,
            status: "ACTIVE",
          },
        });

    occupationByCode.set(row.code, saved.id);

    const ncoMapping = await prisma.taxonomyMapping.findFirst({
      where: {
        occupationId: saved.id,
        authority: "NCO_2015",
        externalCode: row.code,
      },
    });

    if (ncoMapping) {
      await prisma.taxonomyMapping.update({
        where: { id: ncoMapping.id },
        data: {
          externalName: row.name,
          confidence: 1,
          notes: "Occupation.code is the NCO-2015 unit group.",
        },
      });
    } else {
      await prisma.taxonomyMapping.create({
        data: {
          occupationId: saved.id,
          authority: "NCO_2015",
          externalCode: row.code,
          externalName: row.name,
          confidence: 1,
          notes: "Occupation.code is the NCO-2015 unit group.",
        },
      });
    }
  }

  for (const row of skills) {
    const existing = await prisma.skill.findUnique({
      where: { canonicalName: row.canonicalName },
    });

    const saved = existing
      ? await prisma.skill.update({
          where: { id: existing.id },
          data: {
            code: row.code,
            name: row.name,
            description: row.description,
            category: row.category,
            skillType: row.skillType,
            status: "ACTIVE",
          },
        })
      : await prisma.skill.create({
          data: {
            ...(row.id ? { id: row.id } : {}),
            code: row.code,
            name: row.name,
            canonicalName: row.canonicalName,
            description: row.description,
            category: row.category,
            skillType: row.skillType,
            status: "ACTIVE",
          },
        });

    skillByCode.set(row.code, saved.id);
  }

  for (const row of aliases) {
    const skillId = skillByCode.get(row.skillCode);
    if (!skillId) {
      throw new Error(`Unknown skill ${row.skillCode} for alias ${row.rawTerm}`);
    }

    const normalizedTerm = normalizeTerm(row.rawTerm);
    if (!normalizedTerm) {
      throw new Error(`Alias ${row.rawTerm} normalizes to an empty term`);
    }

    await prisma.skillAlias.upsert({
      where: { normalizedTerm },
      update: {
        skillId,
        rawTerm: row.rawTerm,
        locale: "en-IN",
        authority: "SKILLPULSE",
        confidence: row.confidence,
        notes: row.notes,
      },
      create: {
        skillId,
        rawTerm: row.rawTerm,
        normalizedTerm,
        locale: "en-IN",
        authority: "SKILLPULSE",
        confidence: row.confidence,
        notes: row.notes,
      },
    });
  }

  for (const row of skillOccupations) {
    const skillId = skillByCode.get(row.skillCode);
    const occupationId = occupationByCode.get(row.occupationCode);
    if (!skillId || !occupationId) {
      throw new Error(
        `Unknown skill/occupation link ${row.skillCode} ↔ ${row.occupationCode}`,
      );
    }

    await prisma.skillOccupation.upsert({
      where: {
        skillId_occupationId: { skillId, occupationId },
      },
      update: {
        relation: row.relation,
        confidence: row.confidence,
        authority: "SKILLPULSE",
        notes: row.notes,
      },
      create: {
        skillId,
        occupationId,
        relation: row.relation,
        confidence: row.confidence,
        authority: "SKILLPULSE",
        notes: row.notes,
      },
    });
  }

  for (const row of mappings) {
    const skillId = row.skillCode ? skillByCode.get(row.skillCode) : undefined;
    const occupationId = row.occupationCode
      ? occupationByCode.get(row.occupationCode)
      : undefined;
    const sectorId = row.sectorCode ? sectorByCode.get(row.sectorCode) : undefined;

    if (row.skillCode && !skillId) {
      throw new Error(`Unknown skill ${row.skillCode} for mapping`);
    }
    if (row.occupationCode && !occupationId) {
      throw new Error(`Unknown occupation ${row.occupationCode} for mapping`);
    }
    if (row.sectorCode && !sectorId) {
      throw new Error(`Unknown sector ${row.sectorCode} for mapping`);
    }

    const existing = await prisma.taxonomyMapping.findFirst({
      where: {
        skillId: skillId ?? null,
        occupationId: occupationId ?? null,
        sectorId: sectorId ?? null,
        authority: row.authority,
        externalCode: row.externalCode,
      },
    });

    const data = {
      skillId: skillId ?? null,
      occupationId: occupationId ?? null,
      sectorId: sectorId ?? null,
      authority: row.authority,
      externalCode: row.externalCode,
      externalName: row.externalName,
      url: row.url,
      confidence: row.confidence,
      notes: row.notes,
    };

    if (existing) {
      await prisma.taxonomyMapping.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.taxonomyMapping.create({ data });
    }
  }

  return { sectorByCode, occupationByCode, skillByCode };
}
