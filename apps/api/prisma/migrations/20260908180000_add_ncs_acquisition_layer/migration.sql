-- Phase 17.2: NCS acquisition snapshots, job lifecycle, change-detection hashes.
-- Additive and backward compatible. Does not delete jobs or rewrite historical rows.

CREATE TYPE "JobLifecycleStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE "IngestionAccessMethod" AS ENUM ('AUTHORIZED_API', 'AUTHORIZED_FILE', 'SYNTHETIC_FIXTURE');
CREATE TYPE "IngestionSnapshotStatus" AS ENUM ('COMPLETED', 'PARTIAL_SYNC', 'FAILED', 'SOURCE_UNAVAILABLE', 'ACCESS_DENIED', 'SCHEMA_CHANGED');

ALTER TABLE "Job"
  ADD COLUMN "lifecycleStatus" "JobLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "lastObservedAt" TIMESTAMPTZ;

CREATE INDEX "Job_lifecycleStatus_idx" ON "Job"("lifecycleStatus");
CREATE INDEX "Job_contentHash_idx" ON "Job"("contentHash");

CREATE TABLE "IngestionSnapshot" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retrievalTime" TIMESTAMPTZ NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "accessMethod" "IngestionAccessMethod" NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "IngestionSnapshotStatus" NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "expiredCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestionSnapshot_sourceId_idx" ON "IngestionSnapshot"("sourceId");
CREATE INDEX "IngestionSnapshot_retrievalTime_idx" ON "IngestionSnapshot"("retrievalTime");
CREATE INDEX "IngestionSnapshot_checksum_idx" ON "IngestionSnapshot"("checksum");
CREATE INDEX "IngestionSnapshot_status_idx" ON "IngestionSnapshot"("status");

ALTER TABLE "IngestionSnapshot"
  ADD CONSTRAINT "IngestionSnapshot_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
