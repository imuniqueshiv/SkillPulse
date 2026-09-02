-- CreateEnum
CREATE TYPE "DataSourceAccessMethod" AS ENUM ('WEB_REFERENCE', 'API', 'FILE', 'MANUAL_IMPORT', 'PARTNER_FEED');

-- CreateEnum
CREATE TYPE "DataSourceDomain" AS ENUM ('JOBS', 'TRAINING', 'QUALIFICATIONS', 'EMPLOYMENT', 'LABOUR_MARKET', 'OTHER');

-- CreateEnum
CREATE TYPE "DataSourceGeographicScope" AS ENUM ('INDIA', 'STATE', 'GLOBAL');

-- AlterTable
ALTER TABLE "DataSource" ADD COLUMN "code" TEXT;
ALTER TABLE "DataSource" ADD COLUMN "accessMethod" "DataSourceAccessMethod" NOT NULL DEFAULT 'WEB_REFERENCE';
ALTER TABLE "DataSource" ADD COLUMN "domain" "DataSourceDomain" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "DataSource" ADD COLUMN "geographicScope" "DataSourceGeographicScope" NOT NULL DEFAULT 'INDIA';

UPDATE "DataSource"
SET "code" = 'sp.source.demo-seed'
WHERE "name" = '[DEMO] SkillPulse Seed' AND "code" IS NULL;

UPDATE "DataSource"
SET "code" = 'sp.source.' || replace("id", '-', '')
WHERE "code" IS NULL;

ALTER TABLE "DataSource" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");
CREATE INDEX "DataSource_type_idx" ON "DataSource"("type");
CREATE INDEX "DataSource_active_idx" ON "DataSource"("active");
CREATE INDEX "DataSource_domain_idx" ON "DataSource"("domain");
