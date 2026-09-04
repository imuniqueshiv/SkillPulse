import {
  QUALITY_CHECK_STATUS,
  QUALITY_SEVERITY,
  type CompletenessAssessment,
  type CompletenessFieldDetail,
  type JobIntelligenceResult,
  type QualityJobInput,
  type QualityProvenanceInput,
  type QualityRuleCheck,
} from "./contract";

type WeightClass = CompletenessFieldDetail["weight"];

const WEIGHT_VALUE: Record<WeightClass, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function pushField(
  fields: CompletenessFieldDetail[],
  field: CompletenessFieldDetail,
) {
  fields.push(field);
}

/**
 * Weighted completeness of a quality assessment snapshot.
 * Score = present weight / expected weight. Not accuracy or trust.
 *
 * UNKNOWN / UNCLASSIFIED derived fields count as missing for completeness
 * of derived coverage, but do not alone mark a record invalid.
 */
export function assessCompleteness(input: {
  job: QualityJobInput;
  provenance: QualityProvenanceInput | null;
  intelligence: JobIntelligenceResult | null;
}): { assessment: CompletenessAssessment; checks: QualityRuleCheck[] } {
  const fields: CompletenessFieldDetail[] = [];
  const notes = [
    "Completeness measures presence of expected assessment fields.",
    "It does not measure accuracy, source reliability, or intelligence confidence.",
    "UNKNOWN/UNCLASSIFIED derived values are not counted as present.",
  ];

  const titlePresent = hasText(input.job.title);
  pushField(fields, {
    field: "title",
    weight: "CRITICAL",
    present: titlePresent,
    kind: "OBSERVED",
  });

  const sourcePresent = hasText(input.job.sourceId);
  pushField(fields, {
    field: "source",
    weight: "CRITICAL",
    present: sourcePresent,
    kind: "OBSERVED",
  });

  const observedAtPresent = Boolean(input.provenance?.observedAt);
  pushField(fields, {
    field: "observedAt",
    weight: "CRITICAL",
    present: observedAtPresent,
    kind: "PROVENANCE",
    note: observedAtPresent
      ? undefined
      : "Job has no observedAt column; value comes from Evidence/Raw when available",
  });

  pushField(fields, {
    field: "description",
    weight: "HIGH",
    present: hasText(input.job.description),
    kind: "OBSERVED",
  });

  pushField(fields, {
    field: "location",
    weight: "HIGH",
    present: hasText(input.job.locationId),
    kind: "OBSERVED",
    note: "Ingestion does not currently populate Job.locationId",
  });

  const skillsPresent =
    input.job.skillCount > 0 ||
    Boolean(
      input.intelligence?.skills.some((row) => row.status === "RESOLVED"),
    );
  pushField(fields, {
    field: "skills",
    weight: "HIGH",
    present: skillsPresent,
    kind: skillsPresent && input.job.skillCount > 0 ? "OBSERVED" : "DERIVED",
  });

  pushField(fields, {
    field: "employer",
    weight: "MEDIUM",
    present: hasText(input.job.companyName),
    kind: "OBSERVED",
  });

  const occupationPresent = input.intelligence?.occupation.status === "CLASSIFIED";
  pushField(fields, {
    field: "occupation",
    weight: "MEDIUM",
    present: Boolean(occupationPresent),
    kind: "DERIVED",
    note:
      input.intelligence?.occupation.status === "UNCLASSIFIED"
        ? "UNCLASSIFIED is not treated as present completeness"
        : undefined,
  });

  const sectorPresent = input.intelligence?.sector.status === "CLASSIFIED";
  pushField(fields, {
    field: "sector",
    weight: "MEDIUM",
    present: Boolean(sectorPresent),
    kind: "DERIVED",
  });

  const experiencePresent = input.intelligence?.experience.status === "PARSED";
  pushField(fields, {
    field: "experience",
    weight: "MEDIUM",
    present: Boolean(experiencePresent),
    kind: "DERIVED",
    note:
      input.intelligence?.experience.status === "UNKNOWN"
        ? "UNKNOWN means no caller text; not counted as present"
        : undefined,
  });

  const qualificationPresent = Boolean(
    input.intelligence?.qualifications.some((row) => row.status === "PARSED"),
  );
  pushField(fields, {
    field: "qualification",
    weight: "MEDIUM",
    present: qualificationPresent,
    kind: "DERIVED",
    note:
      input.intelligence?.qualifications.some((row) => row.status === "UNKNOWN")
        ? "UNKNOWN means no caller text; not counted as present"
        : undefined,
  });

  let expected = 0;
  let presentWeight = 0;
  for (const field of fields) {
    const weight = WEIGHT_VALUE[field.weight];
    expected += weight;
    if (field.present) {
      presentWeight += weight;
    }
  }

  const score = expected === 0 ? 0 : Number((presentWeight / expected).toFixed(4));
  const presentFields = fields.filter((row) => row.present).map((row) => row.field);
  const missingFields = fields.filter((row) => !row.present).map((row) => row.field);

  const checks: QualityRuleCheck[] = [
    {
      rule: "JOB_TITLE_PRESENT",
      status: titlePresent ? QUALITY_CHECK_STATUS.PASS : QUALITY_CHECK_STATUS.FAIL,
      severity: titlePresent ? QUALITY_SEVERITY.INFO : QUALITY_SEVERITY.ERROR,
      message: titlePresent ? "Title is present" : "Title is missing",
    },
    {
      rule: "JOB_SOURCE_PRESENT",
      status: sourcePresent ? QUALITY_CHECK_STATUS.PASS : QUALITY_CHECK_STATUS.FAIL,
      severity: sourcePresent ? QUALITY_SEVERITY.INFO : QUALITY_SEVERITY.ERROR,
      message: sourcePresent ? "Source is present" : "Source is missing",
    },
    {
      rule: "JOB_OBSERVED_AT_PRESENT",
      status: observedAtPresent ? QUALITY_CHECK_STATUS.PASS : QUALITY_CHECK_STATUS.FAIL,
      severity: observedAtPresent ? QUALITY_SEVERITY.INFO : QUALITY_SEVERITY.ERROR,
      message: observedAtPresent
        ? "Observation timestamp is available from provenance"
        : "Observation timestamp is unavailable",
    },
    {
      rule: "JOB_DESCRIPTION_PRESENT",
      status: hasText(input.job.description)
        ? QUALITY_CHECK_STATUS.PASS
        : QUALITY_CHECK_STATUS.WARN,
      severity: hasText(input.job.description)
        ? QUALITY_SEVERITY.INFO
        : QUALITY_SEVERITY.WARNING,
    },
    {
      rule: "JOB_LOCATION_PRESENT",
      status: hasText(input.job.locationId)
        ? QUALITY_CHECK_STATUS.PASS
        : QUALITY_CHECK_STATUS.WARN,
      severity: hasText(input.job.locationId)
        ? QUALITY_SEVERITY.INFO
        : QUALITY_SEVERITY.WARNING,
    },
    {
      rule: "JOB_SKILLS_PRESENT",
      status: skillsPresent ? QUALITY_CHECK_STATUS.PASS : QUALITY_CHECK_STATUS.WARN,
      severity: skillsPresent ? QUALITY_SEVERITY.INFO : QUALITY_SEVERITY.WARNING,
    },
  ];

  return {
    assessment: {
      score,
      presentFields: [...presentFields].sort((a, b) => a.localeCompare(b)),
      missingFields: [...missingFields].sort((a, b) => a.localeCompare(b)),
      fields,
      notes,
    },
    checks,
  };
}
