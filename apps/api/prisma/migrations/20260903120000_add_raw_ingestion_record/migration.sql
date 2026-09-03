-- CreateEnum
CREATE TYPE "RawIngestionRecordKind" AS ENUM ('JOB');

-- CreateEnum
CREATE TYPE "RawIngestionPayloadFormat" AS ENUM ('JSON', 'TEXT', 'EXTERNAL_REF');

-- CreateEnum
CREATE TYPE "RawIngestionStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "RawIngestionRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "kind" "RawIngestionRecordKind" NOT NULL,
    "externalId" TEXT,
    "payload" JSONB,
    "payloadFormat" "RawIngestionPayloadFormat" NOT NULL,
    "payloadRef" TEXT,
    "checksum" TEXT NOT NULL,
    "observedAt" TIMESTAMPTZ NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL,
    "status" "RawIngestionStatus" NOT NULL DEFAULT 'RECEIVED',
    "adapterName" TEXT,
    "adapterVersion" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "RawIngestionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawIngestionRecord_sourceId_idx" ON "RawIngestionRecord"("sourceId");

-- CreateIndex
CREATE INDEX "RawIngestionRecord_sourceId_externalId_idx" ON "RawIngestionRecord"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "RawIngestionRecord_checksum_idx" ON "RawIngestionRecord"("checksum");

-- CreateIndex
CREATE INDEX "RawIngestionRecord_status_idx" ON "RawIngestionRecord"("status");

-- CreateIndex
CREATE INDEX "RawIngestionRecord_observedAt_idx" ON "RawIngestionRecord"("observedAt");

-- CreateIndex
CREATE INDEX "RawIngestionRecord_kind_idx" ON "RawIngestionRecord"("kind");

-- AddForeignKey
ALTER TABLE "RawIngestionRecord" ADD CONSTRAINT "RawIngestionRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
