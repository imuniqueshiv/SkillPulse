import {
  DataSourceAccessMethod,
  DataSourceDomain,
  DataSourceGeographicScope,
  DataSourceType,
  PrismaClient,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type RegistryRow = {
  code: string;
  name: string;
  type: DataSourceType;
  url: string;
  description: string;
  accessMethod: DataSourceAccessMethod;
  domain: DataSourceDomain;
  geographicScope: DataSourceGeographicScope;
  active: boolean;
};

export async function seedDataSources(prisma: PrismaClient): Promise<void> {
  const filePath = resolve(
    __dirname,
    "../../../data/data-sources/registry.json",
  );
  const rows = JSON.parse(readFileSync(filePath, "utf8")) as RegistryRow[];

  for (const row of rows) {
    const existing =
      (await prisma.dataSource.findUnique({ where: { code: row.code } })) ??
      (await prisma.dataSource.findUnique({ where: { name: row.name } }));

    const data = {
      code: row.code,
      name: row.name,
      type: row.type,
      url: row.url,
      description: row.description,
      reliability: null,
      accessMethod: row.accessMethod,
      domain: row.domain,
      geographicScope: row.geographicScope,
      active: row.active,
      isDemo: false,
    };

    if (existing) {
      await prisma.dataSource.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.dataSource.create({ data });
    }
  }
}
