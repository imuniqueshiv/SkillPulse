-- Phase 15: support Phase 8 demand window filters (postedAt range scans).
CREATE INDEX IF NOT EXISTS "Job_postedAt_idx" ON "Job"("postedAt");
