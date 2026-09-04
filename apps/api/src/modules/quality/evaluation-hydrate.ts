import type { BuildQualityAssessmentInput } from "./assessment";
import type { JobIntelligenceResult } from "../intelligence/contract";
import type {
  QualityJobInput,
  QualityProvenanceInput,
  QualitySourceInput,
} from "./contract";
import type { QualityEvaluationCase, QualityEvaluationDataset } from "./evaluate";

type JsonJob = Omit<QualityJobInput, "postedAt" | "expiresAt"> & {
  postedAt?: string | null;
  expiresAt?: string | null;
};

type JsonProvenance = Omit<QualityProvenanceInput, "observedAt"> & {
  observedAt?: string | null;
};

type JsonCase = Omit<QualityEvaluationCase, "input"> & {
  input: {
    job: JsonJob;
    source: QualitySourceInput | null;
    provenance: JsonProvenance | null;
    intelligence: JobIntelligenceResult | null;
    referenceTime: string;
    assessmentVersion?: string;
    intelligenceProcessorVersion?: string;
    assessedAt?: string;
  };
};

type JsonDataset = Omit<QualityEvaluationDataset, "cases"> & {
  cases: JsonCase[];
};

function parseDate(value: string | null | undefined): Date | null {
  if (value == null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

export function hydrateQualityEvaluationDataset(
  raw: JsonDataset,
): QualityEvaluationDataset {
  return {
    classification: raw.classification,
    note: raw.note,
    cases: raw.cases.map((evaluationCase) => {
      const input: BuildQualityAssessmentInput = {
        job: {
          ...evaluationCase.input.job,
          postedAt: parseDate(evaluationCase.input.job.postedAt ?? null),
          expiresAt: parseDate(evaluationCase.input.job.expiresAt ?? null),
        },
        source: evaluationCase.input.source,
        provenance: evaluationCase.input.provenance
          ? {
              ...evaluationCase.input.provenance,
              observedAt: parseDate(evaluationCase.input.provenance.observedAt ?? null),
            }
          : null,
        intelligence: evaluationCase.input.intelligence,
        referenceTime: parseDate(evaluationCase.input.referenceTime) as Date,
        assessmentVersion: evaluationCase.input.assessmentVersion,
        intelligenceProcessorVersion:
          evaluationCase.input.intelligenceProcessorVersion,
        assessedAt: evaluationCase.input.assessedAt
          ? (parseDate(evaluationCase.input.assessedAt) as Date)
          : undefined,
      };
      return {
        id: evaluationCase.id,
        label: evaluationCase.label,
        input,
        expected: evaluationCase.expected,
      };
    }),
  };
}
