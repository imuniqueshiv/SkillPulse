import {
  Prisma,
  SkillStatus,
  SkillType,
  TaxonomyStatus,
} from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import { normalizeTerm } from "./normalize";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(SkillStatus).optional(),
  category: z.string().trim().max(100).optional(),
  skillType: z.nativeEnum(SkillType).optional(),
  occupationId: z.string().trim().optional(),
  sectorId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const occupationListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(TaxonomyStatus).optional(),
  sectorId: z.string().trim().optional(),
  code: z.string().trim().max(32).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const sectorListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(TaxonomyStatus).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const mappingSelect = {
  id: true,
  authority: true,
  externalCode: true,
  externalName: true,
  url: true,
  confidence: true,
  notes: true,
} as const;

function parseQuery<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query");
  }
  return parsed.data;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function requireUuid(value: string | undefined, label: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (!isUuid(value)) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return value;
}

const skillSummarySelect = {
  id: true,
  code: true,
  name: true,
  canonicalName: true,
  description: true,
  category: true,
  skillType: true,
  status: true,
} as const;

export async function listSkills(query: unknown) {
  const params = parseQuery(listQuerySchema, query);
  const occupationId = requireUuid(params.occupationId, "occupationId");
  const prisma = getPrisma();
  const normalized = params.q ? normalizeTerm(params.q) : "";

  const where: Prisma.SkillWhereInput = {
    status: params.status ?? "ACTIVE",
    category: params.category,
    skillType: params.skillType,
    occupationLinks: occupationId
      ? { some: { occupationId } }
      : undefined,
  };

  if (normalized) {
    const text = params.q ?? normalized;
    where.OR = [
      { name: { contains: text, mode: "insensitive" } },
      { canonicalName: { contains: normalized } },
      { code: { contains: text, mode: "insensitive" } },
      { aliases: { some: { normalizedTerm: { contains: normalized } } } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      select: skillSummarySelect,
      orderBy: [{ name: "asc" }],
      take: params.limit,
      skip: params.offset,
    }),
  ]);

  return { items, total, limit: params.limit, offset: params.offset };
}

export async function getSkill(idOrCode: string) {
  const prisma = getPrisma();
  const skill = await prisma.skill.findFirst({
    where: isUuid(idOrCode) ? { id: idOrCode } : { code: idOrCode },
    select: {
      ...skillSummarySelect,
      aliases: {
        select: {
          id: true,
          rawTerm: true,
          normalizedTerm: true,
          locale: true,
          authority: true,
          confidence: true,
          notes: true,
        },
        orderBy: { rawTerm: "asc" },
      },
      occupationLinks: {
        select: {
          relation: true,
          confidence: true,
          authority: true,
          notes: true,
          occupation: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              sector: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { occupation: { name: "asc" } },
      },
      taxonomyMappings: {
        select: mappingSelect,
        orderBy: [{ authority: "asc" }, { externalCode: "asc" }],
      },
    },
  });

  if (!skill) {
    throw new AppError(404, "Skill not found");
  }

  return { skill };
}

export async function listOccupations(query: unknown) {
  const params = parseQuery(occupationListQuerySchema, query);
  const sectorId = requireUuid(params.sectorId, "sectorId");
  const prisma = getPrisma();
  const normalized = params.q ? normalizeTerm(params.q) : "";

  const where: Prisma.OccupationWhereInput = {
    status: params.status ?? "ACTIVE",
    sectorId,
    code: params.code,
  };

  if (normalized) {
    const text = params.q ?? normalized;
    where.OR = [
      { name: { contains: text, mode: "insensitive" } },
      { code: { contains: text, mode: "insensitive" } },
      { description: { contains: text, mode: "insensitive" } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.occupation.count({ where }),
    prisma.occupation.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        status: true,
        sector: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ name: "asc" }],
      take: params.limit,
      skip: params.offset,
    }),
  ]);

  return { items, total, limit: params.limit, offset: params.offset };
}

export async function getOccupation(idOrCode: string) {
  const prisma = getPrisma();
  const occupation = await prisma.occupation.findFirst({
    where: isUuid(idOrCode) ? { id: idOrCode } : { code: idOrCode },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      status: true,
      sector: { select: { id: true, code: true, name: true, status: true } },
      skillLinks: {
        select: {
          relation: true,
          confidence: true,
          authority: true,
          notes: true,
          skill: { select: skillSummarySelect },
        },
        orderBy: { skill: { name: "asc" } },
      },
      taxonomyMappings: {
        select: mappingSelect,
        orderBy: [{ authority: "asc" }, { externalCode: "asc" }],
      },
    },
  });

  if (!occupation) {
    throw new AppError(404, "Occupation not found");
  }

  return { occupation };
}

export async function listSectors(query: unknown) {
  const params = parseQuery(sectorListQuerySchema, query);
  const prisma = getPrisma();
  const normalized = params.q ? normalizeTerm(params.q) : "";

  const where: Prisma.SectorWhereInput = {
    status: params.status ?? "ACTIVE",
  };

  if (normalized) {
    const text = params.q ?? normalized;
    where.OR = [
      { name: { contains: text, mode: "insensitive" } },
      { code: { contains: text, mode: "insensitive" } },
      { description: { contains: text, mode: "insensitive" } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.sector.count({ where }),
    prisma.sector.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        _count: { select: { occupations: true } },
      },
      orderBy: [{ name: "asc" }],
      take: params.limit,
      skip: params.offset,
    }),
  ]);

  return {
    items: items.map(({ _count, ...sector }) => ({
      ...sector,
      occupationCount: _count.occupations,
    })),
    total,
    limit: params.limit,
    offset: params.offset,
  };
}

export async function getSector(idOrCode: string) {
  const prisma = getPrisma();
  const sector = await prisma.sector.findFirst({
    where: isUuid(idOrCode) ? { id: idOrCode } : { code: idOrCode },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      occupations: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, code: true, status: true },
        orderBy: { name: "asc" },
      },
      taxonomyMappings: {
        select: mappingSelect,
        orderBy: [{ authority: "asc" }, { externalCode: "asc" }],
      },
    },
  });

  if (!sector) {
    throw new AppError(404, "Sector not found");
  }

  return { sector };
}

export async function resolveTerm(raw: unknown) {
  const term = typeof raw === "string" ? raw : "";
  const normalized = normalizeTerm(term);

  if (!normalized) {
    return {
      query: term,
      normalized: "",
      status: "unresolved" as const,
    };
  }

  const prisma = getPrisma();

  const canonical = await prisma.skill.findFirst({
    where: {
      canonicalName: normalized,
      status: { in: ["ACTIVE", "DEPRECATED"] },
    },
    select: skillSummarySelect,
  });

  if (canonical) {
    return {
      query: term,
      normalized,
      status: "resolved" as const,
      matchType: "canonical" as const,
      confidence: 1,
      skill: canonical,
    };
  }

  const alias = await prisma.skillAlias.findUnique({
    where: { normalizedTerm: normalized },
    select: {
      confidence: true,
      skill: { select: skillSummarySelect },
    },
  });

  if (alias && (alias.skill.status === "ACTIVE" || alias.skill.status === "DEPRECATED")) {
    return {
      query: term,
      normalized,
      status: "resolved" as const,
      matchType: "alias" as const,
      confidence: alias.confidence,
      skill: alias.skill,
    };
  }

  return {
    query: term,
    normalized,
    status: "unresolved" as const,
  };
}
