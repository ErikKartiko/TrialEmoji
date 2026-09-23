import type { AnalysisBundle, AppSettings, EvaluationRecord } from "./types";

/** Rebuilds an AnalysisBundle from a persisted evaluation record. */
export function analysisFromRecord(
  e: EvaluationRecord,
  settings: AppSettings,
): AnalysisBundle {
  return {
    cv: {
      structural: e.cvStructural,
      shape: e.cvShape,
      color: e.cvColor,
      composition: e.cvComposition,
      score: e.cvScore,
    },
    ai:
      e.aiStatus === "ok" &&
      e.aiShape !== null &&
      e.aiComposition !== null &&
      e.aiProportion !== null &&
      e.aiColor !== null &&
      e.aiDetail !== null &&
      e.aiOverall !== null
        ? {
            shape: e.aiShape,
            composition: e.aiComposition,
            proportion: e.aiProportion,
            color: e.aiColor,
            detail: e.aiDetail,
            overall: e.aiOverall,
            similarities: e.aiSimilarities,
            differences: e.aiDifferences,
            explanation: e.aiExplanation,
          }
        : null,
    aiScore: e.aiScore,
    aiStatus: e.aiStatus,
    finalScore: e.finalScore,
    category: e.category,
    settingsSnapshot: settings,
    images: {
      original: e.originalImage,
      reconstruction: e.reconstructionImage,
      diff: e.diffImage,
    },
  };
}
