/**
 * Normalize captured NCS public job-listing cards into the SkillPulse NCS
 * adapter input shape. Does not invent missing geography, postedAt, or skills.
 *
 * Source: local snapshot of https://ncs.gov.in/job-listing cards.
 * Not an official NCS API schema.
 */

const MAHARASHTRA_CITIES = new Set(
  [
    "mumbai",
    "mumbai city",
    "mumbai suburban",
    "pune",
    "nagpur",
    "nashik",
    "thane",
    "navi mumbai",
    "aurangabad",
    "chhatrapati sambhajinagar",
    "solapur",
    "kolhapur",
    "amravati",
    "pimpri-chinchwad",
    "pimpri",
    "chakan",
    "raigad",
    "kalyan",
    "vasai",
    "virar",
    "ulhasnagar",
    "bhiwandi",
    "panvel",
    "satara",
    "sangli",
    "latur",
    "akola",
    "jalgaon",
    "ahmednagar",
    "ahilyanagar",
    "chandrapur",
    "parbhani",
    "nanded",
    "dhule",
    "jalna",
    "beed",
    "osmanabad",
    "dharashiv",
    "gadchiroli",
    "gondia",
    "wardha",
    "yavatmal",
    "buldhana",
    "washim",
    "hingoli",
    "ratnagiri",
    "sindhudurg",
    "palghar",
  ].map((s) => s.toLowerCase()),
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function isMaharashtraCity(name: string): boolean {
  return MAHARASHTRA_CITIES.has(name.trim().toLowerCase());
}

export function isPublicListingJobCard(record: unknown): boolean {
  if (!isPlainObject(record)) {
    return false;
  }
  return (
    (typeof record.id === "number" || typeof record.id === "string") &&
    Array.isArray(record.locations) &&
    !("job_id" in record)
  );
}

/**
 * Convert relative NCS listing labels using the snapshot retrieval instant.
 * Returns null for imprecise labels (e.g. "30+ days ago") or unparseable text.
 */
export function resolveRelativePostedAt(
  postedRaw: string | undefined,
  retrievalTime: Date,
): string | undefined {
  if (!postedRaw || Number.isNaN(retrievalTime.getTime())) {
    return undefined;
  }
  const value = postedRaw.trim().toLowerCase();

  if (/^\d+\+\s*days?\s+ago$/.test(value)) {
    return undefined;
  }

  const hour = value.match(/^(\d+)\s+hours?\s+ago$/);
  if (hour) {
    const n = Number(hour[1]);
    if (!Number.isFinite(n) || n < 0) {
      return undefined;
    }
    return new Date(retrievalTime.getTime() - n * 60 * 60 * 1000).toISOString();
  }

  const day = value.match(/^(\d+)\s+days?\s+ago$/);
  if (day) {
    const n = Number(day[1]);
    if (!Number.isFinite(n) || n < 0) {
      return undefined;
    }
    return new Date(retrievalTime.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  }

  const minute = value.match(/^(\d+)\s+minutes?\s+ago$/);
  if (minute) {
    const n = Number(minute[1]);
    if (!Number.isFinite(n) || n < 0) {
      return undefined;
    }
    return new Date(retrievalTime.getTime() - n * 60 * 1000).toISOString();
  }

  // Absolute ISO / timezone-aware instants only — never Date.parse of free text.
  if (/^\d{4}-\d{2}-\d{2}T/.test(postedRaw.trim())) {
    const instant = new Date(postedRaw.trim());
    if (!Number.isNaN(instant.getTime())) {
      return instant.toISOString();
    }
  }

  return undefined;
}

function locationParts(locations: unknown): {
  raw?: string;
  city?: string;
  state?: string;
  locations: string[];
} {
  const list = Array.isArray(locations)
    ? locations.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
  if (list.length === 0) {
    return { locations: [] };
  }

  const mhCities = list.filter(isMaharashtraCity);
  const allMaharashtra = list.every(isMaharashtraCity);

  let city: string | undefined;
  if (list.length === 1) {
    city = list[0];
  } else if (mhCities.length === 1) {
    city = mhCities[0];
  } else if (mhCities.length > 1) {
    city = mhCities[0];
  }

  return {
    raw: list.join(", "),
    city,
    state: allMaharashtra ? "Maharashtra" : undefined,
    locations: list,
  };
}

export type NormalizedNcsListingRecord = {
  job_id: string;
  title: string;
  description?: string;
  employer_name?: string;
  city?: string;
  district?: string;
  state?: string;
  sector?: string;
  functional_role?: string;
  required_skills?: string[];
  experience?: string;
  salary_raw?: string;
  posted_on?: string;
  notice_url?: string;
  /** Preserved public-listing extras for adapter sourceMetadata */
  _listing?: {
    source_file?: string;
    posted_raw?: string;
    applicants?: string;
    employment_type?: string;
    category?: string;
    subcategory?: string;
    locations?: string[];
    logo?: string;
    reported_total_on_page?: number | null;
  };
};

/**
 * Map one captured public job card into adapter-compatible fields.
 * Missing/unsafe values stay omitted — never invented.
 */
export function normalizePublicListingJob(
  card: Record<string, unknown>,
  options: {
    retrievalTime: Date;
    sourceFile?: string;
    reportedTotalOnPage?: number | null;
  },
): NormalizedNcsListingRecord | null {
  const id =
    typeof card.id === "number" && Number.isFinite(card.id)
      ? String(card.id)
      : typeof card.id === "string" && card.id.trim() !== ""
        ? card.id.trim()
        : null;
  const title = text(card.title);
  if (!id || !title) {
    return null;
  }

  const loc = locationParts(card.locations);
  const skills = Array.isArray(card.skills)
    ? card.skills.filter((s): s is string => typeof s === "string" && s.trim() !== "")
    : [];
  const postedRaw = text(card.posted);
  const postedOn = resolveRelativePostedAt(postedRaw, options.retrievalTime);

  const category = text(card.category);
  const subcategory = text(card.subcategory);

  return {
    job_id: id,
    title,
    description: text(card.description),
    employer_name: text(card.company),
    city: loc.city,
    state: loc.state,
    sector: category && category.toUpperCase() !== "N/A" ? category : undefined,
    functional_role:
      subcategory && subcategory.toUpperCase() !== "N/A" ? subcategory : undefined,
    required_skills: skills.length > 0 ? skills : undefined,
    experience: text(card.experience),
    salary_raw: text(card.salary),
    posted_on: postedOn,
    notice_url: options.sourceFile,
    _listing: {
      source_file: options.sourceFile,
      posted_raw: postedRaw,
      applicants: text(card.applicants),
      employment_type: text(card.employment_type),
      category,
      subcategory,
      locations: loc.locations,
      logo: text(card.logo),
      reported_total_on_page: options.reportedTotalOnPage ?? null,
    },
  };
}

export function recordMatchesGeoFilter(
  record: Record<string, unknown>,
  filter: { state?: string; district?: string; city?: string },
): boolean {
  if (filter.district) {
    const district = text(record.district);
    if (
      !district ||
      district.toLowerCase() !== filter.district.trim().toLowerCase()
    ) {
      return false;
    }
  }

  if (filter.city) {
    const needle = filter.city.trim().toLowerCase();
    const city = text(record.city)?.toLowerCase();
    const listingLocs = record._listing;
    const locs =
      isPlainObject(listingLocs) && Array.isArray(listingLocs.locations)
        ? listingLocs.locations
        : Array.isArray(record.locations)
          ? record.locations
          : [];
    const inLocs = locs.some(
      (item) => typeof item === "string" && item.trim().toLowerCase() === needle,
    );
    if (city !== needle && !inLocs) {
      return false;
    }
  }

  if (filter.state) {
    const needle = filter.state.trim().toLowerCase();
    const state = text(record.state)?.toLowerCase();
    if (state === needle) {
      return true;
    }
    if (needle === "maharashtra") {
      const listingLocs = record._listing;
      const locs =
        isPlainObject(listingLocs) && Array.isArray(listingLocs.locations)
          ? listingLocs.locations
          : Array.isArray(record.locations)
            ? record.locations
            : [];
      return locs.some(
        (item) => typeof item === "string" && isMaharashtraCity(item),
      );
    }
    return false;
  }

  return true;
}
