import { AppError } from "../../utils/errors";
import type {
  DecisionIntelligenceInput,
  GovernmentDecisionSummary,
} from "./contract";
import { DECISION_CATEGORY, DECISION_METHODOLOGY_VERSION, DEFAULT_DECISION_RANK_LIMIT, MAX_DECISION_RANK_LIMIT } from "./policy";
import { applyDecisionRules } from "./rules";
import type { DecisionCategory } from "./policy";

/**
 * Phase 13 government decision intelligence (decision-v1).
 * Synthesizes Phase 7–12 summaries into explainable decision-support signals.
 * Does not execute policy, allocate budgets, or recompute upstream phases.
 */
export function summarizeGovernmentDecisions(
  input: DecisionIntelligenceInput,
): GovernmentDecisionSummary {
  if (!input.period?.from || !input.period?.to) {
    throw new AppError(400, "period.from and period.to are required");
  }

  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_DECISION_RANK_LIMIT),
    MAX_DECISION_RANK_LIMIT,
  );

  const signals = applyDecisionRules(input).slice(0, rankLimit);

  const priorityCounts = {
    critical: signals.filter((s) => s.priority === "CRITICAL").length,
    high: signals.filter((s) => s.priority === "HIGH").length,
    medium: signals.filter((s) => s.priority === "MEDIUM").length,
    low: signals.filter((s) => s.priority === "LOW").length,
    insufficientData: signals.filter((s) => s.priority === "INSUFFICIENT_DATA")
      .length,
  };

  const categoryCounts = Object.fromEntries(
    Object.values(DECISION_CATEGORY).map((c) => [
      c,
      signals.filter((s) => s.category === c).length,
    ]),
  ) as Record<DecisionCategory, number>;

  const evidenceCoverage = {
    totalSignals: signals.length,
    highConfidence: signals.filter((s) => s.confidence === "HIGH").length,
    mediumConfidence: signals.filter((s) => s.confidence === "MEDIUM").length,
    lowConfidence: signals.filter((s) => s.confidence === "LOW").length,
    insufficientData: signals.filter(
      (s) => s.confidence === "INSUFFICIENT_DATA",
    ).length,
  };

  const limitations = [
    "Phase 13 provides decision-support signals — it does not determine or execute government policy.",
    "Does not allocate budgets, close programs/institutes, or issue mandatory interventions.",
    "Does not recompute Phase 7–12 intelligence.",
    "TRAINING_CAPACITY ≠ AVAILABLE_WORKFORCE; TRAINED ≠ EMPLOYED; PLACED ≠ EMPLOYED.",
    "Missing evidence ≠ no problem. UNKNOWN ≠ zero.",
    "Synthetic evaluation fixtures are not government decision evidence.",
  ];

  if (!input.gapSummary) {
    limitations.push("Phase 9 gap summary absent — shortage conclusions withheld.");
  }
  if (!input.employmentSummary) {
    limitations.push("Phase 12 employment summary absent — employment signals limited.");
  }

  return {
    policyVersion: DECISION_METHODOLOGY_VERSION,
    period: input.period,
    signals,
    priorityCounts,
    categoryCounts,
    evidenceCoverage,
    phaseVersions: {
      quality: input.qualitySummary?.assessmentVersion ?? null,
      demand:
        input.demandSummary?.demandVersion ??
        input.gapSummary?.demandVersion ??
        null,
      gap: input.gapSummary?.gapVersion ?? null,
      training: input.trainingSummary?.trainingVersion ?? null,
      institute: input.instituteSummary?.instituteVersion ?? null,
      employment: input.employmentSummary?.employmentVersion ?? null,
      decision: DECISION_METHODOLOGY_VERSION,
    },
    limitations,
    notes: [
      "decision-v1 synthesizes demand, gaps, training, institute capability, employment, and quality into explainable signals.",
      "Every signal includes rationale, evidence, confidence, and limitations.",
    ],
  };
}
