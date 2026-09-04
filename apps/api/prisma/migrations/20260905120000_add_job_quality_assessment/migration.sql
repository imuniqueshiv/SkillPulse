-- CreateEnum
CREATE TYPE "QualityEligibility" AS ENUM ('INCLUDE', 'INCLUDE_WITH_CAUTION', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "QualityAssessmentStatus" AS ENUM ('PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "JobQualityAssessment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assessmentVersion" TEXT NOT NULL,
    "status" "QualityAssessmentStatus" NOT NULL,
    "eligibility" "QualityEligibility" NOT NULL,
    "result" JSONB NOT NULL,
    "assessedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "JobQualityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobQualityAssessment_jobId_assessmentVersion_key" ON "JobQualityAssessment"("jobId", "assessmentVersion");

-- CreateIndex
CREATE INDEX "JobQualityAssessment_jobId_idx" ON "JobQualityAssessment"("jobId");

-- CreateIndex
CREATE INDEX "JobQualityAssessment_status_idx" ON "JobQualityAssessment"("status");

-- CreateIndex
CREATE INDEX "JobQualityAssessment_eligibility_idx" ON "JobQualityAssessment"("eligibility");

-- AddForeignKey
ALTER TABLE "JobQualityAssessment" ADD CONSTRAINT "JobQualityAssessment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
