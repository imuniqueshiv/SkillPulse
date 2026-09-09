const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const localDemoToken =
  process.env.NODE_ENV === "production"
    ? undefined
    : process.env.NEXT_PUBLIC_SKILLPULSE_DEV_AUTH_TOKEN;

export async function resolveAccessToken(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  const clerkToken = await getToken();
  if (clerkToken) {
    return clerkToken;
  }
  return localDemoToken ?? null;
}

export type ApplicationUser = {
  id: string;
  clerkUserId: string;
  role: string;
  organizationId: string | null;
};

export type IntelligenceMeta = {
  productVersion?: string;
  period?: { from: string; to: string; dateField: string };
  generatedAt?: string;
  phaseVersions?: Record<string, string | null>;
  limitations?: string[];
  dataQuality?: string | null;
};

export type IntelligenceEnvelope<T> = {
  data: T;
  meta: IntelligenceMeta;
};

export class IntelligenceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchCurrentUser(token: string): Promise<ApplicationUser> {
  const response = await fetch(`${apiBase}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load application user");
  }

  const body = (await response.json()) as { user: ApplicationUser };
  return body.user;
}

async function intelligenceFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string | number | undefined>,
): Promise<IntelligenceEnvelope<T>> {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  const url = `${apiBase}${path}${qs ? `?${qs}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new IntelligenceApiError("Unable to reach the SkillPulse API.", 0);
  }
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    meta?: IntelligenceMeta;
    error?: { message?: string; statusCode?: number };
  };
  if (!response.ok) {
    throw new IntelligenceApiError(
      body.error?.message ?? "Unable to load intelligence.",
      response.status,
    );
  }
  return {
    data: body.data as T,
    meta: body.meta ?? {},
  };
}

export const DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS = { limit: 20 };

type OverviewEnvelope = IntelligenceEnvelope<Record<string, unknown>>;
type OverviewCacheEntry = {
  at: number;
  promise: Promise<OverviewEnvelope>;
  value?: OverviewEnvelope;
};

const OVERVIEW_CLIENT_TTL_MS = 45_000;
const overviewClientCache = new Map<string, OverviewCacheEntry>();

function overviewCacheKey(
  params?: { from?: string; to?: string; state?: string; limit?: number },
) {
  return JSON.stringify(params ?? DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS);
}

export function peekIntelligenceOverview(
  params?: { from?: string; to?: string; state?: string; limit?: number },
): OverviewEnvelope | null {
  const hit = overviewClientCache.get(overviewCacheKey(params));
  if (hit?.value && Date.now() - hit.at < OVERVIEW_CLIENT_TTL_MS) {
    return hit.value;
  }
  return null;
}

export async function fetchIntelligenceOverview(
  token: string,
  params?: { from?: string; to?: string; state?: string; limit?: number },
) {
  const key = overviewCacheKey(params);
  const now = Date.now();
  const hit = overviewClientCache.get(key);
  if (hit && now - hit.at < OVERVIEW_CLIENT_TTL_MS) {
    return hit.promise;
  }
  const promise = intelligenceFetch<Record<string, unknown>>(
    "/api/v1/intelligence/overview",
    token,
    params,
  )
    .then((result) => {
      const entry = overviewClientCache.get(key);
      if (entry) {
        entry.value = result;
      }
      return result;
    })
    .catch((err) => {
      overviewClientCache.delete(key);
      throw err;
    });
  overviewClientCache.set(key, { at: now, promise });
  return promise;
}

export async function fetchSkillIntelligence(
  token: string,
  skillId: string,
  params?: { from?: string; to?: string; state?: string },
) {
  return intelligenceFetch<Record<string, unknown>>(
    `/api/v1/intelligence/skills/${encodeURIComponent(skillId)}`,
    token,
    params,
  );
}

export async function fetchProgramIntelligence(
  token: string,
  courseId: string,
  params?: { from?: string; to?: string },
) {
  return intelligenceFetch<Record<string, unknown>>(
    `/api/v1/intelligence/programs/${encodeURIComponent(courseId)}`,
    token,
    params,
  );
}

export async function fetchInstituteIntelligence(
  token: string,
  organizationId: string,
  params?: { from?: string; to?: string },
) {
  return intelligenceFetch<Record<string, unknown>>(
    `/api/v1/intelligence/institutes/${encodeURIComponent(organizationId)}`,
    token,
    params,
  );
}

export async function fetchDecisionSignals(
  token: string,
  params?: {
    from?: string;
    to?: string;
    priority?: string;
    category?: string;
    confidence?: string;
    skillId?: string;
    state?: string;
    limit?: number;
    offset?: number;
  },
) {
  return intelligenceFetch<{
    signals: Array<Record<string, unknown>>;
    priorityCounts?: Record<string, number>;
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>("/api/v1/intelligence/decisions", token, params);
}

export async function fetchDecisionSignalDetail(
  token: string,
  signalId: string,
  params?: { from?: string; to?: string },
) {
  return intelligenceFetch<{ signal: Record<string, unknown> }>(
    `/api/v1/intelligence/decisions/${encodeURIComponent(signalId)}`,
    token,
    params,
  );
}

export async function fetchQualityIntelligence(token: string) {
  return intelligenceFetch<Record<string, unknown>>(
    "/api/v1/intelligence/quality",
    token,
  );
}

/** Legacy SAMPLE product helpers — not Phase 7–13 intelligence. */
export async function fetchJobs(params?: {
  search?: string;
  state?: string;
  sector?: string;
  limit?: number;
}) {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.state) query.set("state", params.state);
    if (params?.sector) query.set("sector", params.sector);
    if (params?.limit) query.set("limit", params.limit.toString());

    const res = await fetch(`${apiBase}/api/v1/jobs?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return await res.json();
  } catch (error) {
    console.error("fetchJobs error:", error);
    return null;
  }
}

export async function fetchJobAnalytics() {
  try {
    const res = await fetch(`${apiBase}/api/v1/jobs/analytics/summary`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch job analytics");
    return await res.json();
  } catch (error) {
    console.error("fetchJobAnalytics error:", error);
    return null;
  }
}

export async function fetchSkills(params?: { search?: string; category?: string }) {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);

    const res = await fetch(`${apiBase}/api/v1/skills?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch skills");
    return await res.json();
  } catch (error) {
    console.error("fetchSkills error:", error);
    return null;
  }
}

export async function fetchSkillDemand() {
  try {
    const res = await fetch(`${apiBase}/api/v1/skills/demand`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch skill demand");
    return await res.json();
  } catch (error) {
    console.error("fetchSkillDemand error:", error);
    return null;
  }
}

export async function fetchGapAnalysis(params?: {
  sector?: string;
  minSeverity?: number;
}) {
  try {
    const query = new URLSearchParams();
    if (params?.sector) query.set("sector", params.sector);
    if (params?.minSeverity) query.set("minSeverity", params.minSeverity.toString());

    const res = await fetch(
      `${apiBase}/api/v1/curricula/gaps?${query.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Failed to fetch gap analysis");
    return await res.json();
  } catch (error) {
    console.error("fetchGapAnalysis error:", error);
    return null;
  }
}

export async function fetchRecommendations(params?: { targetRole?: string }) {
  try {
    const query = new URLSearchParams();
    if (params?.targetRole) query.set("targetRole", params.targetRole);

    const res = await fetch(
      `${apiBase}/api/v1/recommendations?${query.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Failed to fetch recommendations");
    return await res.json();
  } catch (error) {
    console.error("fetchRecommendations error:", error);
    return null;
  }
}

export async function fetchOutcomes() {
  try {
    const res = await fetch(`${apiBase}/api/v1/outcomes`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch outcomes");
    return await res.json();
  } catch (error) {
    console.error("fetchOutcomes error:", error);
    return null;
  }
}

export async function submitAuditFeedback(payload: {
  recommendationId?: string;
  skillId?: string;
  rating: number;
  comments: string;
  expertRole?: string;
}) {
  try {
    const res = await fetch(`${apiBase}/api/v1/outcomes/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit audit feedback");
    return await res.json();
  } catch (error) {
    console.error("submitAuditFeedback error:", error);
    return null;
  }
}
