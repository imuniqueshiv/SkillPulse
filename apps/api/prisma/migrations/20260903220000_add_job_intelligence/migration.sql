-- CreateEnum
CREATE TYPE "JobIntelligenceStatus" AS ENUM ('PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "JobIntelligence" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "processorVersion" TEXT NOT NULL,
    "status" "JobIntelligenceStatus" NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "JobIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobIntelligence_jobId_processorVersion_key" ON "JobIntelligence"("jobId", "processorVersion");

-- CreateIndex
CREATE INDEX "JobIntelligence_jobId_idx" ON "JobIntelligence"("jobId");

-- CreateIndex
CREATE INDEX "JobIntelligence_status_idx" ON "JobIntelligence"("status");

-- AddForeignKey
ALTER TABLE "JobIntelligence" ADD CONSTRAINT "JobIntelligence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
