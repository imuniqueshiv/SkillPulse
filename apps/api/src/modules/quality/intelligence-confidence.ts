import {
  OVERALL_INTELLIGENCE_CONFIDENCE,
  QUALITY_CHECK_STATUS,
  QUALITY_SEVERITY,
  type IntelligenceConfidenceAssessment,
  type JobIntelligenceResult,
  type QualityRuleCheck,
} from "./contract";

type Tier = "HIGH" | "MEDIUM" | "LOW";

/**
 * Aggregate Phase 6 confidence without averaging.
 *
 * Meaningful signals only:
 * - RESOLVED skills
 * - CLASSIFIED occupation / sector
 * - PARSED experience / qualification
 *
 * Skipped (not LOW):
 * - UNKNOWN experience/qualification (no available evidence)
 * - UNCLASSIFIED occupation/sector
 * - UNRESOLVED skills (candidate only; not a classified confidence input)
 * - DEFAULT_MENTIONED requirement tiers
 *
 * Aggregation (conservative):
 * - no meaningful signals → UNKNOWN
 * - any LOW → LOW
 * - else any MEDIUM → MEDIUM
 * - else all HIGH → HIGH
 */
export function assessIntelligenceConfidence(input: {
  intelligence: JobIntelligenceResult | null;
  processorVersion: string;
}): { assessment: IntelligenceConfidenceAssessment; checks: QualityRuleCheck[] } {
  if (!input.intelligence) {
    const assessment: IntelligenceConfidenceAssessment = {
      overall: OVERALL_INTELLIGENCE_CONFIDENCE.UNKNOWN,
      processorVersion: null,
      available: false,
      contributing: [],
      skipped: [
        {
          signal: "JobIntelligence",
          reason: `No PROCESSED JobIntelligence for processorVersion=${input.processorVersion}`,
        },
      ],
      method: "NO_INTELLIGENCE",
    };
    return {
      assessment,
      checks: [
        {
          rule: "INTELLIGENCE_CONFIDENCE",
          status: QUALITY_CHECK_STATUS.WARN,
          severity: QUALITY_SEVERITY.WARNING,
          message: assessment.skipped[0]?.reason,
        },
      ],
    };
  }

  const contributing: IntelligenceConfidenceAssessment["contributing"] = [];
  const skipped: IntelligenceConfidenceAssessment["skipped"] = [];

  for (const skill of input.intelligence.skills) {
    if (skill.status === "RESOLVED" && skill.confidenceTier) {
      contributing.push({
        signal: `skill:${skill.canonicalName ?? skill.rawTerm}`,
        confidenceTier: skill.confidenceTier,
      });
    } else if (skill.status === "UNRESOLVED") {
      skipped.push({
        signal: `skill:${skill.rawTerm}`,
        reason: "UNRESOLVED skill is not a meaningful classified confidence signal",
      });
    }
  }

  if (input.intelligence.occupation.status === "CLASSIFIED") {
    contributing.push({
      signal: "occupation",
      confidenceTier: (input.intelligence.occupation.confidenceTier ?? "MEDIUM") as Tier,
    });
  } else {
    skipped.push({
      signal: "occupation",
      reason: "UNCLASSIFIED occupation is absence of classification, not LOW confidence",
    });
  }

  if (input.intelligence.sector.status === "CLASSIFIED") {
    contributing.push({
      signal: "sector",
      confidenceTier: (input.intelligence.sector.confidenceTier ?? "MEDIUM") as Tier,
    });
  } else {
    skipped.push({
      signal: "sector",
      reason: "UNCLASSIFIED sector is absence of classification, not LOW confidence",
    });
  }

  if (input.intelligence.experience.status === "PARSED") {
    contributing.push({
      signal: "experience",
      confidenceTier: input.intelligence.experience.confidenceTier,
    });
  } else if (input.intelligence.experience.status === "UNKNOWN") {
    skipped.push({
      signal: "experience",
      reason: "UNKNOWN experience means no available evidence, not LOW confidence",
    });
  } else {
    skipped.push({
      signal: "experience",
      reason: `Experience status ${input.intelligence.experience.status} is not a meaningful parsed signal`,
    });
  }

  for (const [index, row] of input.intelligence.qualifications.entries()) {
    if (row.status === "PARSED") {
      contributing.push({
        signal: `qualification:${row.normalized ?? index}`,
        confidenceTier: row.confidenceTier,
      });
    } else if (row.status === "UNKNOWN") {
      skipped.push({
        signal: `qualification:${index}`,
        reason: "UNKNOWN qualification means no available evidence, not LOW confidence",
      });
    } else {
      skipped.push({
        signal: `qualification:${index}`,
        reason: `Qualification status ${row.status} is not a meaningful parsed signal`,
      });
    }
  }

  contributing.sort((a, b) => a.signal.localeCompare(b.signal));
  skipped.sort((a, b) => a.signal.localeCompare(b.signal));

  let overall: IntelligenceConfidenceAssessment["overall"] =
    OVERALL_INTELLIGENCE_CONFIDENCE.UNKNOWN;
  if (contributing.length > 0) {
    if (contributing.some((row) => row.confidenceTier === "LOW")) {
      overall = OVERALL_INTELLIGENCE_CONFIDENCE.LOW;
    } else if (contributing.some((row) => row.confidenceTier === "MEDIUM")) {
      overall = OVERALL_INTELLIGENCE_CONFIDENCE.MEDIUM;
    } else {
      overall = OVERALL_INTELLIGENCE_CONFIDENCE.HIGH;
    }
  }

  const assessment: IntelligenceConfidenceAssessment = {
    overall,
    processorVersion: input.intelligence.processorVersion,
    available: true,
    contributing,
    skipped,
    method:
      "CONSERVATIVE_TIER_RULE: any LOW→LOW; else any MEDIUM→MEDIUM; else all HIGH→HIGH; empty→UNKNOWN",
  };

  const checkStatus =
    overall === "HIGH"
      ? QUALITY_CHECK_STATUS.PASS
      : overall === "UNKNOWN"
        ? QUALITY_CHECK_STATUS.WARN
        : QUALITY_CHECK_STATUS.WARN;

  return {
    assessment,
    checks: [
      {
        rule: "INTELLIGENCE_CONFIDENCE",
        status: checkStatus,
        severity: overall === "HIGH" ? QUALITY_SEVERITY.INFO : QUALITY_SEVERITY.WARNING,
        message: `Overall intelligence confidence is ${overall}`,
      },
    ],
  };
}
