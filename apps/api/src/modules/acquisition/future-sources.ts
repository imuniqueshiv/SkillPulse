/**
 * Future government training/qualification connectors (MSSDS / NQR / DGT).
 *
 * Registered as WEB_REFERENCE DataSources only. No executable collectors yet.
 * When authorized feeds exist, implement GovernmentSourceConnector here —
 * never invent endpoints, scrape unauthorized sites, or fabricate NSQF/ITI
 * placement outcomes.
 */

import type { GovernmentSourceIdentity } from "./government-connector";

export const FUTURE_GOVERNMENT_SOURCES: readonly GovernmentSourceIdentity[] = [
  {
    sourceCode: "sp.source.mssds",
    sourceName: "Maharashtra State Skill Development Society",
    sourceUrl: "https://www.mssds.in/",
  },
  {
    sourceCode: "sp.source.nqr",
    sourceName: "National Qualifications Register",
    sourceUrl: "https://nqr.gov.in/",
  },
  {
    sourceCode: "sp.source.dgt",
    sourceName: "Directorate General of Training",
    sourceUrl: "https://dgt.gov.in/en",
  },
] as const;
