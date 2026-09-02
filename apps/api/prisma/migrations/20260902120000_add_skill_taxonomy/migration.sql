-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('TECHNICAL', 'TRANSVERSAL', 'LANGUAGE', 'TOOL', 'DOMAIN', 'PROCESS');

-- CreateEnum
CREATE TYPE "TaxonomyStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaxonomyAuthority" AS ENUM ('SKILLPULSE', 'NCO_2015', 'NCVET_NQR', 'NSQF', 'NIC_2008', 'ESCO', 'ONET', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillOccupationRelation" AS ENUM ('CORE', 'RELATED', 'OPTIONAL');

-- AlterTable Sector
ALTER TABLE "Sector" ADD COLUMN "code" TEXT;
ALTER TABLE "Sector" ADD COLUMN "status" "TaxonomyStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Sector"
SET "code" = 'sp.sector.it-ites'
WHERE "name" = 'Information Technology' AND "code" IS NULL;

CREATE UNIQUE INDEX "Sector_code_key" ON "Sector"("code");
CREATE INDEX "Sector_status_idx" ON "Sector"("status");

-- AlterTable Occupation
ALTER TABLE "Occupation" ADD COLUMN "status" "TaxonomyStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX "Occupation_code_key" ON "Occupation"("code");
CREATE INDEX "Occupation_status_idx" ON "Occupation"("status");

-- AlterTable Skill
ALTER TABLE "Skill" ADD COLUMN "code" TEXT;
ALTER TABLE "Skill" ADD COLUMN "skillType" "SkillType" NOT NULL DEFAULT 'TECHNICAL';
ALTER TABLE "Skill" ADD COLUMN "status" "SkillStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Skill"
SET "code" = 'sp.skill.' || "canonicalName"
WHERE "code" IS NULL;

ALTER TABLE "Skill" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");
CREATE INDEX "Skill_status_idx" ON "Skill"("status");
CREATE INDEX "Skill_skillType_idx" ON "Skill"("skillType");

-- CreateTable
CREATE TABLE "SkillAlias" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rawTerm" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "authority" "TaxonomyAuthority" NOT NULL DEFAULT 'SKILLPULSE',
    "confidence" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SkillAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillAlias_normalizedTerm_key" ON "SkillAlias"("normalizedTerm");
CREATE INDEX "SkillAlias_skillId_idx" ON "SkillAlias"("skillId");

ALTER TABLE "SkillAlias"
ADD CONSTRAINT "SkillAlias_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SkillOccupation" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "occupationId" TEXT NOT NULL,
    "relation" "SkillOccupationRelation" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "authority" "TaxonomyAuthority" NOT NULL DEFAULT 'SKILLPULSE',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SkillOccupation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillOccupation_skillId_occupationId_key" ON "SkillOccupation"("skillId", "occupationId");
CREATE INDEX "SkillOccupation_occupationId_idx" ON "SkillOccupation"("occupationId");

ALTER TABLE "SkillOccupation"
ADD CONSTRAINT "SkillOccupation_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkillOccupation"
ADD CONSTRAINT "SkillOccupation_occupationId_fkey"
FOREIGN KEY ("occupationId") REFERENCES "Occupation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TaxonomyMapping" (
    "id" TEXT NOT NULL,
    "skillId" TEXT,
    "occupationId" TEXT,
    "sectorId" TEXT,
    "authority" "TaxonomyAuthority" NOT NULL,
    "externalCode" TEXT NOT NULL,
    "externalName" TEXT,
    "url" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "TaxonomyMapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxonomyMapping_authority_externalCode_idx" ON "TaxonomyMapping"("authority", "externalCode");
CREATE INDEX "TaxonomyMapping_skillId_idx" ON "TaxonomyMapping"("skillId");
CREATE INDEX "TaxonomyMapping_occupationId_idx" ON "TaxonomyMapping"("occupationId");
CREATE INDEX "TaxonomyMapping_sectorId_idx" ON "TaxonomyMapping"("sectorId");

ALTER TABLE "TaxonomyMapping"
ADD CONSTRAINT "TaxonomyMapping_skillId_fkey"
FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxonomyMapping"
ADD CONSTRAINT "TaxonomyMapping_occupationId_fkey"
FOREIGN KEY ("occupationId") REFERENCES "Occupation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxonomyMapping"
ADD CONSTRAINT "TaxonomyMapping_sectorId_fkey"
FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
