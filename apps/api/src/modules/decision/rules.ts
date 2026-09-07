import type { DemandPeriod } from "../demand/contract";
import type { SkillGapRow } from "../gaps/contract";
import type {
  DecisionIntelligenceInput,
  DecisionSignal,
  DecisionTarget,
} from "./contract";
import { periodsCompatible } from "./compatibility";
import { computeDecisionScore, degradeConfidence, evidence, priorityFromScore } from "./scoring";
import {
  DECISION_ACTION,
  DECISION_CATEGORY,
  DECISION_CONFIDENCE,
  DECISION_METHODOLOGY_VERSION,
  DECISION_MIN_DEMAND_SAMPLE,
  DECISION_MIN_EMPLOYMENT_SAMPLE,
  DECISION_PRIORITY,
  STRONG_DEMAND_WEIGHTED_MIN,
  STRONG_EMPLOYMENT_RATE_THRESHOLD,
  WEAK_EMPLOYMENT_RATE_THRESHOLD,
} from "./policy";

function emptyTarget(partial?: Partial<DecisionTarget>): DecisionTarget {
  return {
    skillId: null,
    skillCanonicalName: null,
    programId: null,
    courseId: null,
    instituteId: null,
    employerId: null,
    occupationId: null,
    sectorId: null,
    ...partial,
  };
}

function signalId(
  category: string,
  skillId: string | null,
  programId: string | null,
  period: DemandPeriod,
): string {
  return [
    category,
    skillId ?? "-",
    programId ?? "-",
    period.from,
    period.to,
  ].join("::");
}

function demandSufficient(
  gap: SkillGapRow,
  demandSummary: DecisionIntelligenceInput["demandSummary"],
): boolean {
  if (gap.demandJobCount >= DECISION_MIN_DEMAND_SAMPLE) return true;
  if (gap.metrics.demandQuantity >= STRONG_DEMAND_WEIGHTED_MIN) return true;
  if (demandSummary) {
    const row = demandSummary.skills.find((s) => s.skillId === gap.skillId);
    if (row && row.jobCount >= DECISION_MIN_DEMAND_SAMPLE) return true;
    if (row && row.weightedDemand >= STRONG_DEMAND_WEIGHTED_MIN) return true;
  }
  return false;
}

function demandStrong(gap: SkillGapRow): boolean {
  return (
    gap.metrics.demandQuantity >= STRONG_DEMAND_WEIGHTED_MIN ||
    gap.demandJobCount >= DECISION_MIN_DEMAND_SAMPLE
  );
}

/**
 * Emit deterministic DecisionSignals from upstream summaries.
 * Rules are investigation signals — not government commands.
 */
export function applyDecisionRules(
  input: DecisionIntelligenceInput,
): DecisionSignal[] {
  const signals: DecisionSignal[] = [];
  const period = input.period;
  const gaps = input.gapSummary?.skills ?? [];
  const trainingNeeds = input.trainingSummary?.trainingNeeds ?? [];
  const programs = input.trainingSummary?.programs ?? [];
  const capabilities = input.instituteSummary?.skillCapabilities ?? [];
  const employment = input.employmentSummary;

  const needBySkill = new Map(trainingNeeds.map((n) => [n.skillId, n]));
  const capBySkill = new Map(capabilities.map((c) => [c.skillId, c]));
  const alignByProgram = new Map(programs.map((p) => [p.programId, p]));

  const versions = {
    quality: input.qualitySummary?.assessmentVersion,
    demand:
      input.demandSummary?.demandVersion ?? input.gapSummary?.demandVersion,
    gap: input.gapSummary?.gapVersion,
    training: input.trainingSummary?.trainingVersion,
    institute: input.instituteSummary?.instituteVersion,
    employment: input.employmentSummary?.employmentVersion,
    decision: DECISION_METHODOLOGY_VERSION,
  };

  // Temporal gate for employment vs gap
  const employmentPeriodOk =
    !employment ||
    periodsCompatible(period, employment.period) ||
    periodsCompatible(input.gapSummary?.period, employment.period);

  const empSample =
    employment?.totals.uniqueLearners ??
    employment?.evidenceCoverage.uniqueLearners ??
    0;
  const empSampleOk = empSample >= DECISION_MIN_EMPLOYMENT_SAMPLE;
  const empRate = employment?.rates.trainingToEmployment.value ?? null;
  const empWeak =
    empSampleOk && empRate !== null && empRate < WEAK_EMPLOYMENT_RATE_THRESHOLD;
  const empStrong =
    empSampleOk &&
    empRate !== null &&
    empRate >= STRONG_EMPLOYMENT_RATE_THRESHOLD;

  // RULE 7 — DATA_QUALITY (summary-level)
  if (input.qualitySummary) {
    const q = input.qualitySummary;
    const exclude = q.eligibility.EXCLUDE ?? 0;
    const caution = q.eligibility.INCLUDE_WITH_CAUTION ?? 0;
    const total = q.total || 0;
    if (total > 0 && (exclude + caution) / total >= 0.4) {
      signals.push({
        signalId: signalId(DECISION_CATEGORY.DATA_QUALITY, null, null, period),
        category: DECISION_CATEGORY.DATA_QUALITY,
        priority: DECISION_PRIORITY.MEDIUM,
        decisionScore: null,
        confidence: DECISION_CONFIDENCE.MEDIUM,
        target: emptyTarget(),
        geography: null,
        actionType: DECISION_ACTION.IMPROVE_DATA_COLLECTION,
        rationale:
          "A material share of quality assessments are EXCLUDE or INCLUDE_WITH_CAUTION. Decision synthesis may be limited by data quality — improve collection/verification before treating other signals as conclusive.",
        contributingMetrics: {
          totalAssessments: total,
          exclude,
          caution,
        },
        evidence: [
          evidence(
            "QUALITY",
            "quality-summary",
            "eligibility",
            `EXCLUDE=${exclude};CAUTION=${caution};total=${total}`,
            "UNKNOWN≠ZERO; poor eligibility share indicates evidence risk, not a labour outcome.",
          ),
        ],
        phaseVersions: {
          quality: versions.quality,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: [
          "Data-quality signal does not imply a skill shortage or program failure.",
        ],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }
  }

  if (!input.gapSummary || gaps.length === 0) {
    if (!input.gapSummary) {
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.DATA_QUALITY,
          "missing-gap",
          null,
          period,
        ),
        category: DECISION_CATEGORY.DATA_QUALITY,
        priority: DECISION_PRIORITY.INSUFFICIENT_DATA,
        decisionScore: null,
        confidence: DECISION_CONFIDENCE.INSUFFICIENT_DATA,
        target: emptyTarget(),
        geography: null,
        actionType: DECISION_ACTION.IMPROVE_DATA_COLLECTION,
        rationale:
          "No Phase 9 skill-gap summary provided. Missing evidence ≠ no shortage.",
        contributingMetrics: {},
        evidence: [],
        phaseVersions: { decision: DECISION_METHODOLOGY_VERSION },
        period,
        limitations: ["INSUFFICIENT_DATA — do not conclude low priority."],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }
    return dedupeSignals(signals);
  }

  // Gap period must match decision period
  if (!periodsCompatible(period, input.gapSummary.period)) {
    signals.push({
      signalId: signalId(
        DECISION_CATEGORY.DATA_QUALITY,
        "period-mismatch",
        null,
        period,
      ),
      category: DECISION_CATEGORY.DATA_QUALITY,
      priority: DECISION_PRIORITY.INSUFFICIENT_DATA,
      decisionScore: null,
      confidence: DECISION_CONFIDENCE.INSUFFICIENT_DATA,
      target: emptyTarget(),
      geography: null,
      actionType: DECISION_ACTION.IMPROVE_DATA_COLLECTION,
      rationale:
        "Decision period is incompatible with Phase 9 gap period — cross-phase synthesis withheld.",
      contributingMetrics: {
        decisionFrom: period.from,
        gapFrom: input.gapSummary.period.from,
      },
      evidence: [
        evidence(
          "SKILL_GAP",
          "gap-period",
          "period",
          `${input.gapSummary.period.from}→${input.gapSummary.period.to}`,
          "Temporal compatibility required before synthesis.",
        ),
      ],
      phaseVersions: {
        gap: versions.gap,
        decision: DECISION_METHODOLOGY_VERSION,
      },
      period,
      limitations: ["Incompatible periods — no false shortage conclusion."],
      policyVersion: DECISION_METHODOLOGY_VERSION,
    });
    return dedupeSignals(signals);
  }

  for (const gap of gaps) {
    const demOk = demandSufficient(gap, input.demandSummary);
    const demStrong = demandStrong(gap);
    const need = needBySkill.get(gap.skillId);
    const cap = capBySkill.get(gap.skillId);
    const capacityStatus = need?.capacity.status ?? cap?.capacity.status ?? null;
    const capabilityStatus = cap?.capabilityStatus ?? null;

    const conf = degradeConfidence([
      gap.confidence,
      need?.confidence,
      cap?.confidence,
    ]);

    // RULE 1 — SEVERE SKILL SHORTAGE
    if (
      gap.severity === "SEVERE" &&
      demOk &&
      gap.confidence !== "INSUFFICIENT_DATA"
    ) {
      const score = computeDecisionScore({
        gapSeverity: gap.severity,
        demandSufficient: demOk,
        capacityStatus,
        capabilityStatus,
        alignment: null,
        employmentRate: empRate,
        employmentSampleOk: empSampleOk && employmentPeriodOk,
        gapTrend: gap.trend.direction,
      });
      // Healthy employment + severe gap = conflict → keep signal but lower confidence
      const conflict =
        empStrong && employmentPeriodOk
          ? [
              "Conflicting evidence: severe gap alongside strong employment rate — investigate; do not average away conflict.",
            ]
          : [];
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.SKILL_SHORTAGE,
          gap.skillId,
          null,
          period,
        ),
        category: DECISION_CATEGORY.SKILL_SHORTAGE,
        priority: priorityFromScore(
          score,
          gap.severity === "SEVERE"
            ? DECISION_PRIORITY.CRITICAL
            : DECISION_PRIORITY.HIGH,
        ),
        decisionScore: score,
        confidence: conflict.length
          ? DECISION_CONFIDENCE.LOW
          : conf === "HIGH"
            ? DECISION_CONFIDENCE.HIGH
            : conf,
        target: emptyTarget({
          skillId: gap.skillId,
          skillCanonicalName: gap.canonicalName,
          occupationId: gap.occupationId,
          sectorId: gap.sectorId,
        }),
        geography: gap.geography,
        actionType: DECISION_ACTION.MONITOR,
        rationale:
          "Evidence indicates a severe skill gap with sufficient demand evidence. This is a decision-support signal for investigation — not a mandatory government intervention.",
        contributingMetrics: {
          severity: gap.severity,
          shortageQuantity: gap.metrics.shortageQuantity,
          demandQuantity: gap.metrics.demandQuantity,
          gapConfidence: gap.confidence,
        },
        evidence: [
          evidence(
            "SKILL_GAP",
            gap.skillId,
            "severity",
            gap.severity,
            "Phase 9 severity — numerical shortage ≠ proven real-world shortage alone.",
          ),
          evidence(
            "SKILL_GAP",
            gap.skillId,
            "shortageQuantity",
            gap.metrics.shortageQuantity,
            "Shortage quantity from gap-v1 metrics.",
          ),
        ],
        phaseVersions: {
          demand: versions.demand,
          gap: versions.gap,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: [
          "Does not mandate funding or program creation.",
          ...conflict,
        ],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }

    // RULE 2 — HIGH DEMAND + INSUFFICIENT CAPACITY
    if (
      demStrong &&
      (gap.severity === "HIGH" || gap.severity === "SEVERE") &&
      (capacityStatus === "INSUFFICIENT" ||
        capacityStatus === "UNAVAILABLE" ||
        capabilityStatus === "MISSING" ||
        capabilityStatus === "LIMITED")
    ) {
      const score = computeDecisionScore({
        gapSeverity: gap.severity,
        demandSufficient: true,
        capacityStatus,
        capabilityStatus,
        alignment: null,
        employmentRate: empRate,
        employmentSampleOk: empSampleOk && employmentPeriodOk,
        gapTrend: gap.trend.direction,
      });
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.TRAINING_CAPACITY,
          gap.skillId,
          null,
          period,
        ),
        category: DECISION_CATEGORY.TRAINING_CAPACITY,
        priority: priorityFromScore(score, DECISION_PRIORITY.HIGH),
        decisionScore: score,
        confidence: degradeConfidence([
          gap.confidence,
          need?.confidence,
          cap?.confidence,
          capacityStatus === "UNKNOWN" || capabilityStatus === "INSUFFICIENT_DATA"
            ? "LOW"
            : "MEDIUM",
        ]),
        target: emptyTarget({
          skillId: gap.skillId,
          skillCanonicalName: gap.canonicalName,
        }),
        geography: gap.geography,
        actionType: DECISION_ACTION.REVIEW_TRAINING_CAPACITY,
        rationale:
          "Observed demand/gap alongside insufficient or missing comparable training capacity indicates a potential capacity constraint. Review training capacity — do not allocate a specific budget or institute.",
        contributingMetrics: {
          severity: gap.severity,
          capacityStatus,
          capabilityStatus,
          trainingNeed: need?.trainingNeed ?? null,
        },
        evidence: [
          evidence(
            "SKILL_GAP",
            gap.skillId,
            "severity",
            gap.severity,
            "Gap severity HIGH/SEVERE.",
          ),
          evidence(
            "TRAINING",
            gap.skillId,
            "capacityStatus",
            capacityStatus,
            "TRAINING_CAPACITY ≠ AVAILABLE_WORKFORCE. UNKNOWN ≠ zero.",
          ),
          ...(cap
            ? [
                evidence(
                  "INSTITUTE",
                  gap.skillId,
                  "capabilityStatus",
                  capabilityStatus,
                  "No provider data ≠ provider does not exist when INSUFFICIENT_DATA.",
                ),
              ]
            : []),
        ],
        phaseVersions: {
          demand: versions.demand,
          gap: versions.gap,
          training: versions.training,
          institute: versions.institute,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: [
          "Capacity status UNKNOWN must not be treated as UNAVAILABLE without evidence.",
        ],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }

    // RULE 5 — ADEQUATE CAPACITY + LOW DEMAND → PROGRAM_REVIEW / MONITOR
    if (
      (capabilityStatus === "ADEQUATE" || capacityStatus === "AVAILABLE") &&
      (gap.severity === "SURPLUS" ||
        gap.severity === "BALANCED" ||
        (!demStrong && gap.metrics.demandQuantity < STRONG_DEMAND_WEIGHTED_MIN / 2))
    ) {
      if (gap.confidence !== "INSUFFICIENT_DATA") {
        signals.push({
          signalId: signalId(
            DECISION_CATEGORY.PROGRAM_REVIEW,
            gap.skillId,
            null,
            period,
          ),
          category: DECISION_CATEGORY.PROGRAM_REVIEW,
          priority: DECISION_PRIORITY.LOW,
          decisionScore: null,
          confidence: conf,
          target: emptyTarget({
            skillId: gap.skillId,
            skillCanonicalName: gap.canonicalName,
          }),
          geography: gap.geography,
          actionType: DECISION_ACTION.MONITOR,
          rationale:
            "Existing observed training capacity may not be tightly aligned with observed market demand. Monitor — do not close programs.",
          contributingMetrics: {
            severity: gap.severity,
            demandQuantity: gap.metrics.demandQuantity,
            capabilityStatus,
            capacityStatus,
          },
          evidence: [
            evidence(
              "SKILL_GAP",
              gap.skillId,
              "severity",
              gap.severity,
              "Low/surplus gap with adequate capacity.",
            ),
          ],
          phaseVersions: {
            gap: versions.gap,
            institute: versions.institute,
            decision: DECISION_METHODOLOGY_VERSION,
          },
          period,
          limitations: ["Not a program closure recommendation."],
          policyVersion: DECISION_METHODOLOGY_VERSION,
        });
      }
    }
  }

  // RULE 3 — HIGH DEMAND + WEAK CURRICULUM ALIGNMENT (program-level)
  for (const prog of programs) {
    if (prog.alignment !== "WEAK") continue;
    const highDemandGaps = gaps.filter(
      (g) =>
        demandStrong(g) &&
        (g.severity === "HIGH" || g.severity === "SEVERE" || g.severity === "MODERATE"),
    );
    if (highDemandGaps.length === 0) continue;
    const top = highDemandGaps[0]!;
    const score = computeDecisionScore({
      gapSeverity: top.severity,
      demandSufficient: true,
      capacityStatus: null,
      capabilityStatus: null,
      alignment: prog.alignment,
      employmentRate: empRate,
      employmentSampleOk: empSampleOk && employmentPeriodOk,
      gapTrend: top.trend.direction,
    });
    signals.push({
      signalId: signalId(
        DECISION_CATEGORY.CURRICULUM_ALIGNMENT,
        top.skillId,
        prog.programId,
        period,
      ),
      category: DECISION_CATEGORY.CURRICULUM_ALIGNMENT,
      priority: priorityFromScore(score, DECISION_PRIORITY.HIGH),
      decisionScore: score,
      confidence: degradeConfidence([prog.confidence, top.confidence]),
      target: emptyTarget({
        skillId: top.skillId,
        skillCanonicalName: top.canonicalName,
        programId: prog.programId,
        courseId: null,
      }),
      geography: top.geography,
      actionType: DECISION_ACTION.REVIEW_CURRICULUM,
      rationale:
        "Strong observed demand alongside weak Phase 10 curriculum alignment suggests curriculum review may be warranted. Association ≠ causation.",
      contributingMetrics: {
        alignment: prog.alignment,
        demandWeightedCoverage: prog.demandWeightedCoverage,
        programId: prog.programId,
      },
      evidence: [
        evidence(
          "TRAINING",
          prog.programId,
          "alignment",
          prog.alignment,
          "Phase 10 demand-weighted alignment WEAK.",
        ),
        evidence(
          "SKILL_GAP",
          top.skillId,
          "severity",
          top.severity,
          "Market gap context for alignment concern.",
        ),
      ],
      phaseVersions: {
        demand: versions.demand,
        gap: versions.gap,
        training: versions.training,
        decision: DECISION_METHODOLOGY_VERSION,
      },
      period,
      limitations: [
        "Does not prove curriculum caused employment outcomes.",
      ],
      policyVersion: DECISION_METHODOLOGY_VERSION,
    });
  }

  // RULE 4 — STRONG ALIGNMENT + WEAK EMPLOYMENT
  if (employmentPeriodOk && empWeak) {
    for (const prog of programs) {
      if (prog.alignment !== "STRONG") continue;
      const related = gaps.find((g) => demandStrong(g));
      if (!related) continue;
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.EMPLOYMENT_OUTCOME,
          related.skillId,
          prog.programId,
          period,
        ),
        category: DECISION_CATEGORY.EMPLOYMENT_OUTCOME,
        priority: DECISION_PRIORITY.HIGH,
        decisionScore: computeDecisionScore({
          gapSeverity: related.severity,
          demandSufficient: true,
          capacityStatus: null,
          capabilityStatus: null,
          alignment: prog.alignment,
          employmentRate: empRate,
          employmentSampleOk: true,
          gapTrend: related.trend.direction,
        }),
        confidence: empSampleOk
          ? DECISION_CONFIDENCE.MEDIUM
          : DECISION_CONFIDENCE.LOW,
        target: emptyTarget({
          skillId: related.skillId,
          skillCanonicalName: related.canonicalName,
          programId: prog.programId,
        }),
        geography: related.geography,
        actionType: DECISION_ACTION.INVESTIGATE_EMPLOYMENT_OUTCOME,
        rationale:
          "Market demand and strong curriculum alignment coexist with weak observed employment outcomes. Investigate employment outcomes — do not conclude the curriculum caused weak outcomes.",
        contributingMetrics: {
          alignment: prog.alignment,
          trainingToEmployment: empRate,
          employmentSample: empSample,
        },
        evidence: [
          evidence(
            "TRAINING",
            prog.programId,
            "alignment",
            prog.alignment,
            "STRONG curriculum alignment from Phase 10.",
          ),
          evidence(
            "EMPLOYMENT",
            "employment-summary",
            "trainingToEmployment",
            empRate,
            "TRAINED≠EMPLOYED; PLACED≠EMPLOYED. Weak rate is observational.",
          ),
        ],
        phaseVersions: {
          training: versions.training,
          employment: versions.employment,
          gap: versions.gap,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: [
          "Possible explanations include geography, employer mismatch, incomplete outcome data, learner factors, or other unobserved variables — not causal proof.",
        ],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }

    // Also PROGRAM_REVIEW when employment weak with sufficient sample
    if (empSampleOk) {
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.PROGRAM_REVIEW,
          "employment",
          null,
          period,
        ),
        category: DECISION_CATEGORY.PROGRAM_REVIEW,
        priority: DECISION_PRIORITY.MEDIUM,
        decisionScore: null,
        confidence: DECISION_CONFIDENCE.MEDIUM,
        target: emptyTarget(),
        geography: null,
        actionType: DECISION_ACTION.REVIEW_PROGRAM,
        rationale:
          "Weak employment outcomes with sufficient sample warrant program-level review of observed outcomes — not program closure.",
        contributingMetrics: {
          trainingToEmployment: empRate,
          uniqueLearners: empSample,
        },
        evidence: [
          evidence(
            "EMPLOYMENT",
            "employment-summary",
            "trainingToEmployment",
            empRate,
            "Observational employment rate below decision-v1 weak threshold.",
          ),
        ],
        phaseVersions: {
          employment: versions.employment,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: ["Not a CLOSE_PROGRAM action."],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }
  }

  // RULE 6 — persistent employment concern (needs previous period via trends)
  if (
    employmentPeriodOk &&
    empSampleOk &&
    employment?.trends.some(
      (t) =>
        t.metric === "employed" &&
        t.direction === "DECLINING" &&
        t.previousSample >= DECISION_MIN_EMPLOYMENT_SAMPLE,
    ) &&
    empWeak
  ) {
    signals.push({
      signalId: signalId(
        DECISION_CATEGORY.EMPLOYMENT_OUTCOME,
        "persistent",
        null,
        period,
      ),
      category: DECISION_CATEGORY.EMPLOYMENT_OUTCOME,
      priority: DECISION_PRIORITY.HIGH,
      decisionScore: null,
      confidence: DECISION_CONFIDENCE.MEDIUM,
      target: emptyTarget(),
      geography: null,
      actionType: DECISION_ACTION.INVESTIGATE_EMPLOYMENT_OUTCOME,
      rationale:
        "Weak employment outcomes with a declining employed trend across compatible periods suggest a persistent outcome concern for investigation.",
      contributingMetrics: {
        trainingToEmployment: empRate,
        trend: "DECLINING",
      },
      evidence: [
        evidence(
          "EMPLOYMENT",
          "employment-trend",
          "employed",
          "DECLINING",
          "Persistence requires sufficient samples in both periods — not a forecast.",
        ),
      ],
      phaseVersions: {
        employment: versions.employment,
        decision: DECISION_METHODOLOGY_VERSION,
      },
      period,
      limitations: ["Trend is observational change, not future prediction."],
      policyVersion: DECISION_METHODOLOGY_VERSION,
    });
  }

  // RULE 8 — GEOGRAPHIC MISMATCH (capability missing in gap geography with demand)
  for (const gap of gaps) {
    if (!gap.geography.known || gap.geography.level === "UNKNOWN") continue;
    if (!(gap.severity === "HIGH" || gap.severity === "SEVERE")) continue;
    const cap = capBySkill.get(gap.skillId);
    if (!cap) continue;
    if (
      cap.capabilityStatus === "MISSING" &&
      demandStrong(gap) &&
      cap.evidence.programCountInAnalysis > 0
    ) {
      signals.push({
        signalId: signalId(
          DECISION_CATEGORY.GEOGRAPHIC_MISMATCH,
          gap.skillId,
          null,
          period,
        ),
        category: DECISION_CATEGORY.GEOGRAPHIC_MISMATCH,
        priority: DECISION_PRIORITY.HIGH,
        decisionScore: null,
        confidence: degradeConfidence([gap.confidence, cap.confidence]),
        target: emptyTarget({
          skillId: gap.skillId,
          skillCanonicalName: gap.canonicalName,
        }),
        geography: gap.geography,
        actionType: DECISION_ACTION.INVESTIGATE_GEOGRAPHIC_GAP,
        rationale:
          "High/severe gap geography shows missing confirmed provider capability for the skill. Investigate geographic capability — do not invent location relationships.",
        contributingMetrics: {
          capabilityStatus: cap.capabilityStatus,
          severity: gap.severity,
          geoLevel: gap.geography.level,
        },
        evidence: [
          evidence(
            "INSTITUTE",
            gap.skillId,
            "capabilityStatus",
            cap.capabilityStatus,
            "Capability MISSING with programs in analysis set.",
          ),
          evidence(
            "SKILL_GAP",
            gap.skillId,
            "geography",
            `${gap.geography.level}:${gap.geography.state ?? ""}`,
            "Gap geography from Phase 9 — Course has no locationId.",
          ),
        ],
        phaseVersions: {
          gap: versions.gap,
          institute: versions.institute,
          decision: DECISION_METHODOLOGY_VERSION,
        },
        period,
        limitations: [
          "Course location is not assumed from institute or gap geography alone.",
        ],
        policyVersion: DECISION_METHODOLOGY_VERSION,
      });
    }
  }

  // High priority + low confidence example path: SEVERE with LOW gap confidence
  for (const gap of gaps) {
    if (gap.severity !== "HIGH" && gap.severity !== "SEVERE") continue;
    if (gap.confidence !== "LOW") continue;
    if (!demOk(gap)) continue;
    // Ensure we have a SKILL_SHORTAGE-style investigation with explicit HIGH+LOW combo
    const exists = signals.some(
      (s) =>
        s.category === DECISION_CATEGORY.SKILL_SHORTAGE &&
        s.target.skillId === gap.skillId,
    );
    if (exists) continue;
    signals.push({
      signalId: signalId(
        DECISION_CATEGORY.SKILL_SHORTAGE,
        `${gap.skillId}-lowconf`,
        null,
        period,
      ),
      category: DECISION_CATEGORY.SKILL_SHORTAGE,
      priority: DECISION_PRIORITY.HIGH,
      decisionScore: null,
      confidence: DECISION_CONFIDENCE.LOW,
      target: emptyTarget({
        skillId: gap.skillId,
        skillCanonicalName: gap.canonicalName,
      }),
      geography: gap.geography,
      actionType: DECISION_ACTION.MONITOR,
      rationale:
        "Gap severity is elevated but confidence is LOW. Priority HIGH with confidence LOW means investigate carefully — evidence is weak.",
      contributingMetrics: {
        severity: gap.severity,
        gapConfidence: gap.confidence,
      },
      evidence: [
        evidence(
          "SKILL_GAP",
          gap.skillId,
          "confidence",
          gap.confidence,
          "Priority ≠ confidence. HIGH priority + LOW confidence is valid.",
        ),
      ],
      phaseVersions: {
        gap: versions.gap,
        decision: DECISION_METHODOLOGY_VERSION,
      },
      period,
      limitations: ["Weak evidence — do not treat as proven shortage."],
      policyVersion: DECISION_METHODOLOGY_VERSION,
    });
  }

  void alignByProgram;
  return dedupeSignals(signals);
}

function demOk(gap: SkillGapRow): boolean {
  return (
    gap.demandJobCount >= DECISION_MIN_DEMAND_SAMPLE ||
    gap.metrics.demandQuantity >= STRONG_DEMAND_WEIGHTED_MIN
  );
}

function dedupeSignals(signals: DecisionSignal[]): DecisionSignal[] {
  const byId = new Map<string, DecisionSignal>();
  for (const s of signals) {
    if (!byId.has(s.signalId)) {
      byId.set(s.signalId, s);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.signalId.localeCompare(b.signalId);
  });
}

function priorityRank(p: string): number {
  switch (p) {
    case "CRITICAL":
      return 5;
    case "HIGH":
      return 4;
    case "MEDIUM":
      return 3;
    case "LOW":
      return 2;
    default:
      return 1;
  }
}
