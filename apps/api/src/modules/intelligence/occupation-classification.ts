import {
  INTELLIGENCE_CONFIDENCE_TIER,
  OCCUPATION_CLASSIFICATION_METHOD,
  OCCUPATION_INTELLIGENCE_STATUS,
  SKILL_INTELLIGENCE_STATUS,
  type JobIntelligenceOccupation,
  type JobIntelligenceSkill,
} from "./contract";
import { normalizeTerm } from "../taxonomy/normalize";

export type OccupationClassificationRecord = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  skillLinks: readonly {
    skillId: string;
    relation: string;
  }[];
};

function pluralVariants(value: string): string[] {
  const out = [value];
  if (value.endsWith("s") && value.length > 3) {
    out.push(value.slice(0, -1));
  } else {
    out.push(`${value}s`);
  }
  return [...new Set(out)];
}

function titleExact(title: string, occupationName: string): boolean {
  const titleNorm = normalizeTerm(title);
  const nameNorm = normalizeTerm(occupationName);
  if (!titleNorm || !nameNorm) {
    return false;
  }
  return pluralVariants(titleNorm).includes(nameNorm) || pluralVariants(nameNorm).includes(titleNorm);
}

function titleKeyword(title: string, occupationName: string): boolean {
  const titleNorm = ` ${normalizeTerm(title)} `;
  for (const variant of pluralVariants(normalizeTerm(occupationName))) {
    if (variant.length < 4) {
      continue;
    }
    if (titleNorm.includes(` ${variant} `)) {
      return true;
    }
  }
  return false;
}

function classified(
  occupation: OccupationClassificationRecord,
  method: JobIntelligenceOccupation["method"],
  confidenceTier: NonNullable<JobIntelligenceOccupation["confidenceTier"]>,
  evidence: string,
): JobIntelligenceOccupation {
  return {
    status: OCCUPATION_INTELLIGENCE_STATUS.CLASSIFIED,
    occupationId: occupation.id,
    code: occupation.code,
    name: occupation.name,
    method,
    confidenceTier,
    evidence,
  };
}

function unclassified(evidence: string): JobIntelligenceOccupation {
  return {
    status: OCCUPATION_INTELLIGENCE_STATUS.UNCLASSIFIED,
    method: OCCUPATION_CLASSIFICATION_METHOD.UNCLASSIFIED,
    evidence,
  };
}

function uniqueById(
  occupations: OccupationClassificationRecord[],
): OccupationClassificationRecord[] {
  const map = new Map<string, OccupationClassificationRecord>();
  for (const occupation of occupations) {
    map.set(occupation.id, occupation);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Conservative occupation classification. Ties and weak evidence stay UNCLASSIFIED.
 */
export function classifyOccupation(input: {
  title: string;
  skills: readonly JobIntelligenceSkill[];
  occupations: readonly OccupationClassificationRecord[];
}): JobIntelligenceOccupation {
  const active = input.occupations.filter((row) => row.status === "ACTIVE");
  const exact = uniqueById(active.filter((row) => titleExact(input.title, row.name)));
  const keyword = uniqueById(active.filter((row) => titleKeyword(input.title, row.name)));

  const resolvedIds = new Set(
    input.skills
      .filter((row) => row.status === SKILL_INTELLIGENCE_STATUS.RESOLVED && row.skillId)
      .map((row) => row.skillId as string),
  );

  const coreCounts = new Map<string, number>();
  for (const occupation of active) {
    let count = 0;
    for (const link of occupation.skillLinks) {
      if (link.relation === "CORE" && resolvedIds.has(link.skillId)) {
        count += 1;
      }
    }
    if (count > 0) {
      coreCounts.set(occupation.id, count);
    }
  }

  const scored = [...coreCounts.entries()].sort((a, b) => {
    const byCount = b[1] - a[1];
    if (byCount !== 0) {
      return byCount;
    }
    return a[0].localeCompare(b[0]);
  });
  const topScore = scored[0]?.[1] ?? 0;
  const topTied = scored.filter((row) => row[1] === topScore);
  const skillWinner =
    topScore >= 2 && topTied.length === 1
      ? active.find((row) => row.id === topTied[0]?.[0])
      : undefined;

  if (exact.length === 1) {
    const occupation = exact[0];
    if (!occupation) {
      return unclassified("Exact title match was empty");
    }
    if (skillWinner && skillWinner.id === occupation.id) {
      return classified(
        occupation,
        OCCUPATION_CLASSIFICATION_METHOD.COMBINED_SIGNAL,
        INTELLIGENCE_CONFIDENCE_TIER.HIGH,
        `Title exact match with CORE skill association for ${occupation.name}`,
      );
    }
    return classified(
      occupation,
      OCCUPATION_CLASSIFICATION_METHOD.TITLE_EXACT,
      INTELLIGENCE_CONFIDENCE_TIER.HIGH,
      `Title matches occupation name ${occupation.name}`,
    );
  }
  if (exact.length > 1) {
    return unclassified("Multiple occupations share an exact title match");
  }

  if (keyword.length === 1) {
    const occupation = keyword[0];
    if (!occupation) {
      return unclassified("Title keyword match was empty");
    }
    if (skillWinner && skillWinner.id === occupation.id) {
      return classified(
        occupation,
        OCCUPATION_CLASSIFICATION_METHOD.COMBINED_SIGNAL,
        INTELLIGENCE_CONFIDENCE_TIER.HIGH,
        `Title keyword match with CORE skill association for ${occupation.name}`,
      );
    }
    return classified(
      occupation,
      OCCUPATION_CLASSIFICATION_METHOD.TITLE_KEYWORD,
      INTELLIGENCE_CONFIDENCE_TIER.MEDIUM,
      `Title contains occupation name ${occupation.name}`,
    );
  }
  if (keyword.length > 1) {
    return unclassified("Multiple occupations share a title keyword match");
  }

  if (skillWinner) {
    return classified(
      skillWinner,
      OCCUPATION_CLASSIFICATION_METHOD.SKILL_ASSOCIATION,
      INTELLIGENCE_CONFIDENCE_TIER.MEDIUM,
      `Unique CORE skill association (count=${topScore})`,
    );
  }

  if (topTied.length > 1) {
    return unclassified("CORE skill associations are tied across occupations");
  }

  return unclassified("Insufficient occupation evidence");
}
