/**
 * Deterministic Maharashtra location resolution for job persistence.
 * Only resolves when the source lists exactly one city that is a known MH city.
 * Multi-city listings stay unresolved (raw preserved in source metadata).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { isMaharashtraCity } from "../ingestion/sources/ncs-public-listing";

const CITY_ALIASES: Record<string, string> = {
  "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
  aurangabad: "Chhatrapati Sambhajinagar",
  "navi mumbai": "Navi Mumbai",
  "pimpri-chinchwad": "Pimpri-Chinchwad",
  pimpri: "Pimpri-Chinchwad",
  ahmednagar: "Ahilyanagar",
  ahilyanagar: "Ahilyanagar",
};

export function canonicalMaharashtraCityName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !isMaharashtraCity(trimmed)) {
    return null;
  }
  const key = trimmed.toLowerCase();
  return CITY_ALIASES[key] ?? trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a Location id only for single-city Maharashtra listings.
 * Returns null for multi-city, non-MH, or ambiguous geography.
 */
export async function resolveMaharashtraLocationId(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: {
    city?: string | null;
    state?: string | null;
    sourceLocations?: unknown;
  },
): Promise<string | null> {
  const listed = Array.isArray(input.sourceLocations)
    ? input.sourceLocations.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      )
    : [];

  let cityRaw: string | null = null;
  if (listed.length === 1) {
    cityRaw = listed[0] ?? null;
  } else if (listed.length === 0 && input.city) {
    // Adapter-provided single city with no multi-city list.
    cityRaw = input.city;
  } else {
    // Multi-city or conflicting signals — do not invent a single city.
    return null;
  }

  if (!cityRaw) {
    return null;
  }

  const cityName = canonicalMaharashtraCityName(cityRaw);
  if (!cityName) {
    return null;
  }

  // If state is present and not Maharashtra, refuse.
  if (
    input.state &&
    input.state.trim().toLowerCase() !== "maharashtra"
  ) {
    return null;
  }

  const existing = await prisma.location.findFirst({
    where: {
      country: "India",
      state: "Maharashtra",
      city: { equals: cityName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.location.create({
    data: {
      country: "India",
      state: "Maharashtra",
      district: null,
      city: cityName,
    },
    select: { id: true },
  });
  return created.id;
}
