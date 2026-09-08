/**
 * National Career Service (NCS) — Phase 17 source access boundary.
 *
 * Distinguishes:
 *   SOURCE_AVAILABLE          — DataSource sp.source.ncs is registered
 *   ACCESS_NOT_CONFIGURED     — no authorized live/file path configured
 *   AUTHORIZED_FILE           — operator-supplied NCS-shaped file (authorized)
 *   AUTHORIZED_API            — official feed URL + token; never scrapes ncs.gov.in
 *   SYNTHETIC_FIXTURE         — evaluation/demo sample only
 *
 * SkillPulse does not assume unrestricted permission to scrape ncs.gov.in.
 * Live ingestion requires an authorized access mechanism. This module does
 * not invent API endpoints, credentials, or HTTP clients.
 */

export const NCS_SOURCE_CODE = "sp.source.ncs" as const;
export const NCS_SOURCE_URL = "https://www.ncs.gov.in/" as const;

export const NCS_ACCESS_MODE = {
  DISABLED: "DISABLED",
  SYNTHETIC_FIXTURE: "SYNTHETIC_FIXTURE",
  AUTHORIZED_FILE: "AUTHORIZED_FILE",
  AUTHORIZED_API: "AUTHORIZED_API",
} as const;

export type NcsAccessMode =
  (typeof NCS_ACCESS_MODE)[keyof typeof NCS_ACCESS_MODE];

export type NcsAccessStatus = {
  sourceAvailable: true;
  sourceCode: typeof NCS_SOURCE_CODE;
  sourceUrl: typeof NCS_SOURCE_URL;
  mode: NcsAccessMode;
  accessConfigured: boolean;
  liveAccessImplemented: false;
  authorizedFileSupported: true;
  authorizedApiConnectorReady: boolean;
  syntheticFixtureSupported: true;
  realNcsDataIngested: false;
  notes: string[];
};

/**
 * Resolve access mode from CLI/env intent.
 * AUTHORIZED_API is a connector mode for a future official feed URL/token.
 * Website scraping / unauthorized live access remains refused.
 */
export function resolveNcsAccessMode(input?: {
  mode?: string | null;
  liveEnabled?: string | null;
}): NcsAccessMode {
  const requested = (input?.mode ?? "").trim().toLowerCase();

  if (
    requested === "live" ||
    requested === "authorized_live" ||
    requested === "scrape"
  ) {
    throw new Error(
      "Unauthorized live NCS execution is rejected: no scraping client and no undocumented NCS website API",
    );
  }

  if (input?.liveEnabled === "true" || input?.liveEnabled === "1") {
    throw new Error(
      "NCS_LIVE_ENABLED cannot enable live access: configure AUTHORIZED_API with an official feed URL and token",
    );
  }

  if (
    requested === "api" ||
    requested === "authorized_api" ||
    requested === NCS_ACCESS_MODE.AUTHORIZED_API.toLowerCase()
  ) {
    return NCS_ACCESS_MODE.AUTHORIZED_API;
  }

  if (
    requested === "file" ||
    requested === "authorized_file" ||
    requested === NCS_ACCESS_MODE.AUTHORIZED_FILE.toLowerCase()
  ) {
    return NCS_ACCESS_MODE.AUTHORIZED_FILE;
  }

  if (
    requested === "synthetic" ||
    requested === "synthetic_fixture" ||
    requested === "fixture" ||
    requested === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE.toLowerCase()
  ) {
    return NCS_ACCESS_MODE.SYNTHETIC_FIXTURE;
  }

  if (
    requested === "" ||
    requested === "disabled" ||
    requested === NCS_ACCESS_MODE.DISABLED.toLowerCase()
  ) {
    return NCS_ACCESS_MODE.DISABLED;
  }

  throw new Error(
    `Unknown NCS access mode "${input?.mode}". Use disabled | synthetic | file | api`,
  );
}

export function describeNcsAccess(mode: NcsAccessMode): NcsAccessStatus {
  const accessConfigured =
    mode === NCS_ACCESS_MODE.AUTHORIZED_FILE ||
    mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE ||
    mode === NCS_ACCESS_MODE.AUTHORIZED_API;

  const notes: string[] = [
    "SOURCE_AVAILABLE: DataSource sp.source.ncs is registered (WEB_REFERENCE).",
    "Live NCS website scraping and undocumented API envelopes are NOT used.",
  ];

  if (mode === NCS_ACCESS_MODE.DISABLED) {
    notes.push("ACCESS_NOT_CONFIGURED: no ingestion mode selected.");
  }
  if (mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE) {
    notes.push(
      "SYNTHETIC_FIXTURE: evaluation/demo only — not real NCS labour-market data.",
    );
  }
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_FILE) {
    notes.push(
      "AUTHORIZED_FILE: operator-supplied NCS-shaped file; SkillPulse does not claim official NCS schema.",
    );
  }
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_API) {
    notes.push(
      "AUTHORIZED_API: provider-neutral official feed connector. Requires NCS_API_BASE_URL and NCS_API_TOKEN. Does not scrape ncs.gov.in.",
    );
  }

  return {
    sourceAvailable: true,
    sourceCode: NCS_SOURCE_CODE,
    sourceUrl: NCS_SOURCE_URL,
    mode,
    accessConfigured,
    liveAccessImplemented: false,
    authorizedFileSupported: true,
    authorizedApiConnectorReady: Boolean(
      process.env.NCS_API_BASE_URL?.trim() && process.env.NCS_API_TOKEN?.trim(),
    ),
    syntheticFixtureSupported: true,
    realNcsDataIngested: false,
    notes,
  };
}
