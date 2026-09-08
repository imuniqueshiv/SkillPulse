-- Phase 17.2+ : PUBLIC_PAGE access method + richer snapshot counters.
-- Additive and backward compatible.

ALTER TYPE "IngestionAccessMethod" ADD VALUE IF NOT EXISTS 'PUBLIC_PAGE';

ALTER TABLE "IngestionSnapshot"
  ADD COLUMN IF NOT EXISTS "parserVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "withdrawnCount" INTEGER NOT NULL DEFAULT 0;
