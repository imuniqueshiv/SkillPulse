import type { QualityChangeDetection } from "./contract";
import {
  assessJobQuality,
  type AssessJobQualityInput,
  type AssessJobQualityResult,
} from "./pipeline";

export type ReassessJobQualityInput = AssessJobQualityInput;

export type ReassessJobQualityResult = AssessJobQualityResult & {
  outcome: "created" | "unchanged" | "changed" | "preserved";
  changeDetection: QualityChangeDetection | null;
};

/**
 * Phase 7.9 safe reassessment — uses the existing assessJobQuality pipeline.
 *
 * Outcomes:
 * - created: first PROCESSED write
 * - unchanged: identical fingerprint (no unnecessary duplicate)
 * - changed: inputs changed; prior success nested in previousAssessment
 * - preserved: FAILED attempt did not destroy prior PROCESSED (via persist path)
 */
export async function reassessJobQuality(
  input: ReassessJobQualityInput,
): Promise<ReassessJobQualityResult> {
  const result = await assessJobQuality({
    ...input,
    persist: input.persist ?? true,
  });

  if (!result.persistence) {
    return {
      ...result,
      outcome: "created",
      changeDetection: result.changeDetection,
    };
  }

  if (result.persistence.preserved) {
    return {
      ...result,
      outcome: "preserved",
      changeDetection: result.changeDetection,
    };
  }
  if (result.persistence.unchanged) {
    return {
      ...result,
      outcome: "unchanged",
      changeDetection: result.changeDetection,
    };
  }
  if (result.persistence.created) {
    return {
      ...result,
      outcome: "created",
      changeDetection: result.changeDetection,
    };
  }
  return {
    ...result,
    outcome: "changed",
    changeDetection: result.changeDetection,
  };
}
