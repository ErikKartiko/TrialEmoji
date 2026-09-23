/**
 * Orchestrates the full similarity analysis:
 * client-side computer vision metrics + optional server-proxied AI vision call.
 */
import {
  clamp,
  getCategory,
  round1,
  weightedAverage,
} from "./defaults";
import {
  buildDifferenceMap,
  loadImage,
  processImage,
  toJpegDataUrl,
} from "./image-processing";
import {
  colorSimilarity,
  compositionSimilarity,
  shapeSimilarity,
  structuralSimilarity,
} from "./similarity";
import type {
  AiAnalysis,
  AiStatus,
  AnalysisBundle,
  AppSettings,
  CvMetrics,
} from "./types";
import { sanitizeAiAnalysis } from "./validation";

export { sanitizeAiAnalysis };

export type AnalysisStage = "normalize" | "cv" | "ai" | "finalize";

export const ANALYSIS_STAGES: { key: AnalysisStage; label: string }[] = [
  { key: "normalize", label: "Normalizing images" },
  { key: "cv", label: "Computing vision metrics" },
  { key: "ai", label: "Running AI vision analysis" },
  { key: "finalize", label: "Combining scores" },
];

async function requestAiAnalysis(
  originalImage: string,
  reconstructionImage: string,
): Promise<AiAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("/api/ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalImage, reconstructionImage }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "AI analysis is unavailable.",
      );
    }
    return sanitizeAiAnalysis(data.analysis);
  } finally {
    clearTimeout(timeout);
  }
}

export interface RunAnalysisOptions {
  originalSrc: string;
  reconstructionSrc: string;
  settings: AppSettings;
  useAi: boolean;
  onStage?: (stage: AnalysisStage) => void;
}

/**
 * Runs the complete analysis pipeline. Never throws for AI problems —
 * the CV result is always produced, and AI failures are flagged via aiStatus.
 */
export async function runFullAnalysis({
  originalSrc,
  reconstructionSrc,
  settings,
  useAi,
  onStage,
}: RunAnalysisOptions): Promise<AnalysisBundle> {
  onStage?.("normalize");
  const [originalImg, reconstructionImg] = await Promise.all([
    loadImage(originalSrc),
    loadImage(reconstructionSrc),
  ]);
  const processedA = processImage(originalImg);
  const processedB = processImage(reconstructionImg);

  onStage?.("cv");
  // Yield so the UI can paint the loading state before heavy math.
  await new Promise((r) => setTimeout(r, 30));
  const structural = structuralSimilarity(processedA, processedB);
  const shape = shapeSimilarity(processedA, processedB);
  const color = colorSimilarity(processedA, processedB);
  const composition = compositionSimilarity(processedA, processedB);
  const cvScore = weightedAverage(
    { structural, shape, color, composition },
    settings.cvWeights as unknown as Record<string, number>,
  );
  const cv: CvMetrics = { structural, shape, color, composition, score: cvScore };
  const diff = buildDifferenceMap(processedA, processedB);

  let ai: AiAnalysis | null = null;
  let aiScore: number | null = null;
  let aiStatus: AiStatus = useAi ? "unavailable" : "skipped";

  if (useAi) {
    onStage?.("ai");
    try {
      ai = await requestAiAnalysis(
        toJpegDataUrl(originalImg, 512, 0.85),
        toJpegDataUrl(reconstructionImg, 512, 0.85),
      );
      aiScore = weightedAverage(
        {
          shape: ai.shape,
          composition: ai.composition,
          proportion: ai.proportion,
          color: ai.color,
          detail: ai.detail,
        },
        settings.aiWeights as unknown as Record<string, number>,
      );
      aiStatus = "ok";
    } catch {
      ai = null;
      aiScore = null;
      aiStatus = "error";
    }
  }

  onStage?.("finalize");
  const { cv: cvWeight, ai: aiWeight } = settings.finalWeights;
  const finalScore =
    aiScore !== null && cvWeight + aiWeight > 0
      ? round1(clamp((cvScore * cvWeight + aiScore * aiWeight) / (cvWeight + aiWeight)))
      : cvScore;

  return {
    cv,
    ai,
    aiScore,
    aiStatus,
    finalScore,
    category: getCategory(finalScore, settings.thresholds),
    settingsSnapshot: settings,
    images: {
      original: toJpegDataUrl(originalImg, 400, 0.88),
      reconstruction: toJpegDataUrl(reconstructionImg, 400, 0.88),
      diff,
    },
  };
}

/** Checks whether an AI vision provider is configured on the server. */
export async function checkAiConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai-analysis", { method: "GET" });
    const data = await res.json();
    return Boolean(data?.configured);
  } catch {
    return false;
  }
}
