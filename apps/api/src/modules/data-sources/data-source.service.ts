import {
  DataSourceAccessMethod,
  DataSourceDomain,
  DataSourceGeographicScope,
  DataSourceType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CODE_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  type: z.nativeEnum(DataSourceType).optional(),
  domain: z.nativeEnum(DataSourceDomain).optional(),
  accessMethod: z.nativeEnum(DataSourceAccessMethod).optional(),
  geographicScope: z.nativeEnum(DataSourceGeographicScope).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  isDemo: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "URL must use http or https",
  });

const writeSchema = z.object({
  code: z.string().trim().min(3).max(80).regex(CODE_RE),
  name: z.string().trim().min(1).max(200),
  type: z.nativeEnum(DataSourceType),
  url: httpUrl.nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  reliability: z.number().min(0).max(1).nullable().optional(),
  accessMethod: z.nativeEnum(DataSourceAccessMethod).optional(),
  domain: z.nativeEnum(DataSourceDomain).optional(),
  geographicScope: z.nativeEnum(DataSourceGeographicScope).optional(),
  active: z.boolean().optional(),
});

const patchSchema = writeSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "No fields to update",
});

const sourceSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  url: true,
  description: true,
  reliability: true,
  accessMethod: true,
  domain: true,
  geographicScope: true,
  active: true,
  isDemo: true,
  createdAt: true,
  updatedAt: true,
} as const;

function parsedOr400<T>(parsed: z.SafeParseReturnType<unknown, T>): T {
  if (!parsed.success) {
    throw new AppError(400, "Invalid input");
  }
  return parsed.data;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError(409, "Data source already exists");
  }
  throw error;
}

export async function listDataSources(query: unknown) {
  const params = parsedOr400(listQuerySchema.safeParse(query));
  const prisma = getPrisma();

  const where: Prisma.DataSourceWhereInput = {
    type: params.type,
    domain: params.domain,
    accessMethod: params.accessMethod,
    geographicScope: params.geographicScope,
    active: params.active,
    isDemo: params.isDemo,
  };

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { code: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.dataSource.count({ where }),
    prisma.dataSource.findMany({
      where,
      select: sourceSelect,
      orderBy: [{ name: "asc" }],
      take: params.limit,
      skip: params.offset,
    }),
  ]);

  return { items, total, limit: params.limit, offset: params.offset };
}

export async function getDataSource(idOrCode: string) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.findFirst({
    where: isUuid(idOrCode) ? { id: idOrCode } : { code: idOrCode },
    select: sourceSelect,
  });

  if (!source) {
    throw new AppError(404, "Data source not found");
  }

  return { source };
}

export async function createDataSource(body: unknown) {
  const data = parsedOr400(writeSchema.safeParse(body));
  const prisma = getPrisma();

  try {
    const source = await prisma.dataSource.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        url: data.url ?? null,
        description: data.description ?? null,
        reliability: data.reliability ?? null,
        accessMethod: data.accessMethod ?? "WEB_REFERENCE",
        domain: data.domain ?? "OTHER",
        geographicScope: data.geographicScope ?? "INDIA",
        active: data.active ?? true,
        isDemo: false,
      },
      select: sourceSelect,
    });
    return { source };
  } catch (error) {
    mapWriteError(error);
  }
}

export async function updateDataSource(idOrCode: string, body: unknown) {
  const data = parsedOr400(patchSchema.safeParse(body));
  const existing = await getDataSource(idOrCode);
  const prisma = getPrisma();

  try {
    const source = await prisma.dataSource.update({
      where: { id: existing.source.id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.reliability !== undefined ? { reliability: data.reliability } : {}),
        ...(data.accessMethod !== undefined ? { accessMethod: data.accessMethod } : {}),
        ...(data.domain !== undefined ? { domain: data.domain } : {}),
        ...(data.geographicScope !== undefined
          ? { geographicScope: data.geographicScope }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      select: sourceSelect,
    });
    return { source };
  } catch (error) {
    mapWriteError(error);
  }
}
