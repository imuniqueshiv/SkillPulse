export const JOB_INTELLIGENCE_PROCESSOR_VERSION = "phase6-v1";

export const SKILL_EXTRACTION_METHOD = {
  EXPLICIT_SKILL_FIELD: "EXPLICIT_SKILL_FIELD",
  CANONICAL_NAME_MATCH: "CANONICAL_NAME_MATCH",
  ALIAS_MATCH: "ALIAS_MATCH",
  TEXT_MATCH: "TEXT_MATCH",
} as const;

export type SkillExtractionMethod =
  (typeof SKILL_EXTRACTION_METHOD)[keyof typeof SKILL_EXTRACTION_METHOD];

export const INTELLIGENCE_CONFIDENCE_TIER = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type IntelligenceConfidenceTier =
  (typeof INTELLIGENCE_CONFIDENCE_TIER)[keyof typeof INTELLIGENCE_CONFIDENCE_TIER];

export const SKILL_INTELLIGENCE_STATUS = {
  RESOLVED: "RESOLVED",
  UNRESOLVED: "UNRESOLVED",
} as const;

export type SkillIntelligenceStatus =
  (typeof SKILL_INTELLIGENCE_STATUS)[keyof typeof SKILL_INTELLIGENCE_STATUS];

export const OCCUPATION_INTELLIGENCE_STATUS = {
  CLASSIFIED: "CLASSIFIED",
  UNCLASSIFIED: "UNCLASSIFIED",
} as const;

export type OccupationIntelligenceStatus =
  (typeof OCCUPATION_INTELLIGENCE_STATUS)[keyof typeof OCCUPATION_INTELLIGENCE_STATUS];

export const OCCUPATION_CLASSIFICATION_METHOD = {
  TITLE_EXACT: "TITLE_EXACT",
  TITLE_KEYWORD: "TITLE_KEYWORD",
  SKILL_ASSOCIATION: "SKILL_ASSOCIATION",
  COMBINED_SIGNAL: "COMBINED_SIGNAL",
  UNCLASSIFIED: "UNCLASSIFIED",
} as const;

export type OccupationClassificationMethod =
  (typeof OCCUPATION_CLASSIFICATION_METHOD)[keyof typeof OCCUPATION_CLASSIFICATION_METHOD];

export const SECTOR_INTELLIGENCE_STATUS = {
  CLASSIFIED: "CLASSIFIED",
  UNCLASSIFIED: "UNCLASSIFIED",
} as const;

export type SectorIntelligenceStatus =
  (typeof SECTOR_INTELLIGENCE_STATUS)[keyof typeof SECTOR_INTELLIGENCE_STATUS];

export const SECTOR_CLASSIFICATION_METHOD = {
  OCCUPATION_SECTOR: "OCCUPATION_SECTOR",
  UNCLASSIFIED: "UNCLASSIFIED",
} as const;

export type SectorClassificationMethod =
  (typeof SECTOR_CLASSIFICATION_METHOD)[keyof typeof SECTOR_CLASSIFICATION_METHOD];

export const EXPERIENCE_INTELLIGENCE_STATUS = {
  PARSED: "PARSED",
  UNPARSED: "UNPARSED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ExperienceIntelligenceStatus =
  (typeof EXPERIENCE_INTELLIGENCE_STATUS)[keyof typeof EXPERIENCE_INTELLIGENCE_STATUS];

export const QUALIFICATION_INTELLIGENCE_STATUS = {
  PARSED: "PARSED",
  UNPARSED: "UNPARSED",
  UNKNOWN: "UNKNOWN",
} as const;

export type QualificationIntelligenceStatus =
  (typeof QUALIFICATION_INTELLIGENCE_STATUS)[keyof typeof QUALIFICATION_INTELLIGENCE_STATUS];

export type JobIntelligenceJobInput = {
  id: string;
  title: string;
  description?: string | null;
  skills?: readonly JobIntelligenceExplicitSkill[];
};

export type JobIntelligenceExplicitSkill = {
  skillId?: string;
  name: string;
};

export type PreparedJobText = {
  title: string;
  titlePrepared: string;
  description: string | null;
  descriptionPrepared: string | null;
  analysisText: string;
};

export type ExtractedSkillCandidate = {
  rawTerm: string;
  sourceField: "title" | "description" | "explicitSkills" | "job.skills";
  extractionMethod: SkillExtractionMethod;
  evidence: string;
  evidenceStart?: number;
  evidenceEnd?: number;
};

export type JobIntelligenceSkill = {
  rawTerm: string;
  contributingTerms: string[];
  skillId?: string;
  canonicalName?: string;
  status: SkillIntelligenceStatus;
  sourceField?: ExtractedSkillCandidate["sourceField"];
  extractionMethod: SkillExtractionMethod;
  extractionMethods: SkillExtractionMethod[];
  normalizationMethod?: "canonical" | "alias";
  confidenceTier: IntelligenceConfidenceTier;
  evidence?: string;
  evidenceStart?: number;
  evidenceEnd?: number;
};

export type JobIntelligenceOccupation = {
  status: OccupationIntelligenceStatus;
  occupationId?: string;
  code?: string | null;
  name?: string;
  method: OccupationClassificationMethod;
  confidenceTier?: IntelligenceConfidenceTier;
  evidence?: string;
};

export type JobIntelligenceSector = {
  status: SectorIntelligenceStatus;
  sectorId?: string;
  code?: string | null;
  name?: string;
  method: SectorClassificationMethod;
  confidenceTier?: IntelligenceConfidenceTier;
  evidence?: string;
};

export type JobIntelligenceExperience = {
  status: ExperienceIntelligenceStatus;
  minYears?: number;
  maxYears?: number | null;
  freshersAccepted?: boolean;
  rawText?: string | null;
};

export type JobIntelligenceQualification = {
  rawText: string;
  normalized?: string;
  type?: string;
  status: QualificationIntelligenceStatus;
};

export type JobIntelligenceResult = {
  jobId: string;
  processorVersion: string;
  text: {
    title: string;
    analysisText: string;
  };
  skills: JobIntelligenceSkill[];
  occupation: JobIntelligenceOccupation;
  sector: JobIntelligenceSector;
  experience: JobIntelligenceExperience;
  qualifications: JobIntelligenceQualification[];
};
