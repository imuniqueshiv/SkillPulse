"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS,
  fetchIntelligenceOverview,
  IntelligenceApiError,
  peekIntelligenceOverview,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";

export function useIntelligenceOverview() {
  const { getToken, isLoaded } = useAuth();
  const cached = peekIntelligenceOverview(DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(
    cached?.data ?? null,
  );
  const [meta, setMeta] = useState<IntelligenceMeta | null>(cached?.meta ?? null);

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      const warm = peekIntelligenceOverview(DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS);
      if (!warm) {
        setLoading(true);
      }
      setError(null);
      setUnauthorized(false);
      try {
        const token = await resolveAccessToken(getToken);
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchIntelligenceOverview(
          token,
          DEFAULT_INTELLIGENCE_OVERVIEW_PARAMS,
        );
        setOverview(result.data);
        setMeta(result.meta);
      } catch (err) {
        if (err instanceof IntelligenceApiError && err.status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            err instanceof IntelligenceApiError
              ? err.message
              : "Unable to load intelligence.",
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, isLoaded]);

  return { loading, error, unauthorized, overview, meta };
}
