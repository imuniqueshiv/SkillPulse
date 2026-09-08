/**
 * National Career Service (NCS) — Phase 17 / 17.2 source access boundary.
 *
 * Distinguishes:
 *   SOURCE_AVAILABLE          — DataSource sp.source.ncs is registered
 *   ACCESS_NOT_CONFIGURED     — no authorized live/file path configured
 *   AUTHORIZED_FILE           — operator-supplied NCS-shaped file (authorized)
 *   AUTHORIZED_API            — official feed URL + token; never scrapes ncs.gov.in
 *   PUBLIC_PAGE               — permission-gated; collector refused unless
 *                               NCS_PUBLIC_PAGE_PERMITTED=true AND a compliant
 *                               collector is implemented (currently not)
 *   SYNTHETIC_FIXTURE         — evaluation/demo sample only
 *
 * SkillPulse does not assume unrestricted permission to scrape ncs.gov.in.
 * Live ingestion requires an authorized access mechanism or a documented
 * compliant public-page collection method. This module does not invent API
 * endpoints, credentials, or scrapers.
 */

export const NCS_SOURCE_CODE = "sp.source.ncs" as const;
export const NCS_SOURCE_URL = "https://www.ncs.gov.in/" as const;

export const NCS_ACCESS_MODE = {
  DISABLED: "DISABLED",
  SYNTHETIC_FIXTURE: "SYNTHETIC_FIXTURE",
  AUTHORIZED_FILE: "AUTHORIZED_FILE",
  AUTHORIZED_API: "AUTHORIZED_API",
  PUBLIC_PAGE: "PUBLIC_PAGE",
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
  publicPagePermitted: boolean;
  publicPageCollectorImplemented: false;
  syntheticFixtureSupported: true;
  realNcsDataIngested: false;
  notes: string[];
};

export function isPublicPagePermitted(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.NCS_PUBLIC_PAGE_PERMITTED === "true" ||
    env.NCS_PUBLIC_PAGE_PERMITTED === "1"
  );
}

/**
 * Resolve access mode from CLI/env intent.
 * AUTHORIZED_API is a connector mode for a future official feed URL/token.
 * PUBLIC_PAGE is resolvable as a mode but remains collector-gated.
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
      "NCS_LIVE_ENABLED cannot enable live access: configure AUTHORIZED_API with an official feed URL and token, or PUBLIC_PAGE only after documented terms review",
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
    requested === "public" ||
    requested === "public_page" ||
    requested === NCS_ACCESS_MODE.PUBLIC_PAGE.toLowerCase()
  ) {
    return NCS_ACCESS_MODE.PUBLIC_PAGE;
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
    `Unknown NCS access mode "${input?.mode}". Use disabled | synthetic | file | api | public`,
  );
}

export function describeNcsAccess(mode: NcsAccessMode): NcsAccessStatus {
  const publicPagePermitted = isPublicPagePermitted();
  const accessConfigured =
    mode === NCS_ACCESS_MODE.AUTHORIZED_FILE ||
    mode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE ||
    mode === NCS_ACCESS_MODE.AUTHORIZED_API ||
    mode === NCS_ACCESS_MODE.PUBLIC_PAGE;

  const notes: string[] = [
    "SOURCE_AVAILABLE: DataSource sp.source.ncs is registered (WEB_REFERENCE).",
    "SkillPulse does not assume unrestricted permission to scrape NCS. Live acquisition requires a permitted/authorized access mechanism or a documented compliant public-page collection method.",
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
  if (mode === NCS_ACCESS_MODE.PUBLIC_PAGE) {
    notes.push(
      publicPagePermitted
        ? "PUBLIC_PAGE: terms flag set, but no compliant page collector is implemented — acquisition refuses rather than scrape."
        : "PUBLIC_PAGE: ACCESS_DENIED until NCS_PUBLIC_PAGE_PERMITTED=true after documented terms review. No scraper is shipped.",
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
    publicPagePermitted,
    publicPageCollectorImplemented: false,
    syntheticFixtureSupported: true,
    realNcsDataIngested: false,
    notes,
  };
}
