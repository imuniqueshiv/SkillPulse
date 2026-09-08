import { getPrisma } from "../../config/database";
import {
  NCS_ACCESS_MODE,
  NCS_SOURCE_CODE,
  NCS_SOURCE_URL,
  resolveNcsAccessMode,
  type NcsAccessMode,
} from "../ingestion/sources/ncs-access";

/**
 * Truthful demand-source status for product/API surfaces.
 * Never reports LIVE NCS DATA unless an authorized/approved mode is configured
 * and a successful snapshot exists.
 */
export const DEMAND_DATA_STATUS = {
  NOT_CONFIGURED: "NOT_CONFIGURED",
  SYNTHETIC_FIXTURE: "SYNTHETIC_FIXTURE",
  AUTHORIZED_FILE: "AUTHORIZED_FILE",
  AUTHORIZED_API: "AUTHORIZED_API",
  PUBLIC_PAGE: "PUBLIC_PAGE",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  ACCESS_DENIED: "ACCESS_DENIED",
  PARTIAL_SYNC: "PARTIAL_SYNC",
  SUCCESS: "SUCCESS",
} as const;

export type DemandDataStatus =
  (typeof DEMAND_DATA_STATUS)[keyof typeof DEMAND_DATA_STATUS];

export type DemandSourceStatus = {
  source: {
    code: typeof NCS_SOURCE_CODE;
    name: "National Career Service";
    url: typeof NCS_SOURCE_URL;
  };
  scope: {
    state: string | null;
    district: string | null;
  };
  configuredMode: NcsAccessMode;
  dataStatus: DemandDataStatus;
  liveNcsData: false;
  observationCount: number;
  lastObservedAt: string | null;
  lastSnapshot: {
    id: string;
    retrievalTime: string;
    accessMethod: string;
    status: string;
    recordCount: number;
    checksum: string;
  } | null;
  notes: string[];
};

function configuredModeFromEnv(): NcsAccessMode {
  try {
    return resolveNcsAccessMode({
      mode: process.env.NCS_ACQUISITION_MODE ?? "disabled",
      liveEnabled: process.env.NCS_LIVE_ENABLED,
    });
  } catch {
    return NCS_ACCESS_MODE.DISABLED;
  }
}

function statusFromSnapshot(
  configuredMode: NcsAccessMode,
  snapshot: {
    status: string;
    accessMethod: string;
  } | null,
): DemandDataStatus {
  if (!snapshot) {
    if (configuredMode === NCS_ACCESS_MODE.DISABLED) {
      return DEMAND_DATA_STATUS.NOT_CONFIGURED;
    }
    if (configuredMode === NCS_ACCESS_MODE.SYNTHETIC_FIXTURE) {
      return DEMAND_DATA_STATUS.SYNTHETIC_FIXTURE;
    }
    if (configuredMode === NCS_ACCESS_MODE.AUTHORIZED_FILE) {
      return DEMAND_DATA_STATUS.AUTHORIZED_FILE;
    }
    if (configuredMode === NCS_ACCESS_MODE.AUTHORIZED_API) {
      return DEMAND_DATA_STATUS.AUTHORIZED_API;
    }
    if (configuredMode === NCS_ACCESS_MODE.PUBLIC_PAGE) {
      return DEMAND_DATA_STATUS.PUBLIC_PAGE;
    }
    return DEMAND_DATA_STATUS.NOT_CONFIGURED;
  }

  if (snapshot.status === "ACCESS_DENIED") {
    return DEMAND_DATA_STATUS.ACCESS_DENIED;
  }
  if (snapshot.status === "SOURCE_UNAVAILABLE") {
    return DEMAND_DATA_STATUS.SOURCE_UNAVAILABLE;
  }
  if (snapshot.status === "PARTIAL_SYNC") {
    return DEMAND_DATA_STATUS.PARTIAL_SYNC;
  }
  if (snapshot.status === "COMPLETED") {
    if (snapshot.accessMethod === "SYNTHETIC_FIXTURE") {
      return DEMAND_DATA_STATUS.SYNTHETIC_FIXTURE;
    }
    if (snapshot.accessMethod === "AUTHORIZED_FILE") {
      return DEMAND_DATA_STATUS.AUTHORIZED_FILE;
    }
    if (snapshot.accessMethod === "AUTHORIZED_API") {
      return DEMAND_DATA_STATUS.AUTHORIZED_API;
    }
    if (snapshot.accessMethod === "PUBLIC_PAGE") {
      return DEMAND_DATA_STATUS.PUBLIC_PAGE;
    }
    return DEMAND_DATA_STATUS.SUCCESS;
  }
  return DEMAND_DATA_STATUS.ACCESS_DENIED;
}

export async function getNcsDemandSourceStatus(input?: {
  state?: string | null;
  district?: string | null;
}): Promise<DemandSourceStatus> {
  const prisma = getPrisma();
  const configuredMode = configuredModeFromEnv();
  const source = await prisma.dataSource.findUnique({
    where: { code: NCS_SOURCE_CODE },
    select: { id: true },
  });

  if (!source) {
    return {
      source: {
        code: NCS_SOURCE_CODE,
        name: "National Career Service",
        url: NCS_SOURCE_URL,
      },
      scope: {
        state: input?.state ?? null,
        district: input?.district ?? null,
      },
      configuredMode,
      dataStatus: DEMAND_DATA_STATUS.SOURCE_UNAVAILABLE,
      liveNcsData: false,
      observationCount: 0,
      lastObservedAt: null,
      lastSnapshot: null,
      notes: ["DataSource sp.source.ncs is not registered."],
    };
  }

  const [observationCount, lastJob, lastSnapshot] = await Promise.all([
    prisma.job.count({
      where: {
        sourceId: source.id,
        ...(input?.state
          ? {
              /* location strings live on ingestion metadata; count all NCS jobs */
            }
          : {}),
      },
    }),
    prisma.job.findFirst({
      where: { sourceId: source.id },
      orderBy: [{ lastObservedAt: "desc" }, { updatedAt: "desc" }],
      select: { lastObservedAt: true, updatedAt: true },
    }),
    prisma.ingestionSnapshot.findFirst({
      where: { sourceId: source.id },
      orderBy: { retrievalTime: "desc" },
      select: {
        id: true,
        retrievalTime: true,
        accessMethod: true,
        status: true,
        recordCount: true,
        checksum: true,
      },
    }),
  ]);

  const dataStatus = statusFromSnapshot(configuredMode, lastSnapshot);
  const notes: string[] = [
    "SkillPulse does not assume unrestricted permission to scrape NCS.",
    "liveNcsData is always false until an official authorized feed is documented and connected.",
  ];
  if (dataStatus === DEMAND_DATA_STATUS.SYNTHETIC_FIXTURE) {
    notes.push("Current observations include SYNTHETIC fixture data — not real NCS labour-market statistics.");
  }

  return {
    source: {
      code: NCS_SOURCE_CODE,
      name: "National Career Service",
      url: NCS_SOURCE_URL,
    },
    scope: {
      state: input?.state ?? "Maharashtra",
      district: input?.district ?? null,
    },
    configuredMode,
    dataStatus,
    liveNcsData: false,
    observationCount,
    lastObservedAt:
      lastJob?.lastObservedAt?.toISOString() ??
      lastJob?.updatedAt.toISOString() ??
      null,
    lastSnapshot: lastSnapshot
      ? {
          id: lastSnapshot.id,
          retrievalTime: lastSnapshot.retrievalTime.toISOString(),
          accessMethod: lastSnapshot.accessMethod,
          status: lastSnapshot.status,
          recordCount: lastSnapshot.recordCount,
          checksum: lastSnapshot.checksum,
        }
      : null,
    notes,
  };
}
