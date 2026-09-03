import {
  INTELLIGENCE_CONFIDENCE_TIER,
  OCCUPATION_INTELLIGENCE_STATUS,
  SECTOR_CLASSIFICATION_METHOD,
  SECTOR_INTELLIGENCE_STATUS,
  type JobIntelligenceOccupation,
  type JobIntelligenceSector,
} from "./contract";

export type SectorClassificationRecord = {
  id: string;
  code: string | null;
  name: string;
  status: string;
};

/**
 * Derive sector only from a classified occupation's existing Sector relation.
 */
export function classifySector(input: {
  occupation: JobIntelligenceOccupation;
  sector: SectorClassificationRecord | null;
}): JobIntelligenceSector {
  if (input.occupation.status !== OCCUPATION_INTELLIGENCE_STATUS.CLASSIFIED) {
    return {
      status: SECTOR_INTELLIGENCE_STATUS.UNCLASSIFIED,
      method: SECTOR_CLASSIFICATION_METHOD.UNCLASSIFIED,
      evidence: "Occupation is unclassified",
    };
  }

  if (!input.sector || input.sector.status !== "ACTIVE") {
    return {
      status: SECTOR_INTELLIGENCE_STATUS.UNCLASSIFIED,
      method: SECTOR_CLASSIFICATION_METHOD.UNCLASSIFIED,
      evidence: "Classified occupation has no active sector relation",
    };
  }

  return {
    status: SECTOR_INTELLIGENCE_STATUS.CLASSIFIED,
    sectorId: input.sector.id,
    code: input.sector.code,
    name: input.sector.name,
    method: SECTOR_CLASSIFICATION_METHOD.OCCUPATION_SECTOR,
    confidenceTier: input.occupation.confidenceTier ?? INTELLIGENCE_CONFIDENCE_TIER.MEDIUM,
    evidence: `Derived from occupation ${input.occupation.name ?? input.occupation.occupationId}`,
  };
}
