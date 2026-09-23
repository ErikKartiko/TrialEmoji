import type {
  AppSettings,
  CategoryKey,
  CategoryThresholds,
} from "./types";

/** Default scoring configuration (used until the lecturer saves custom settings). */
export const DEFAULT_SETTINGS: AppSettings = {
  finalWeights: { cv: 60, ai: 40 },
  cvWeights: { structural: 25, shape: 15, color: 10, composition: 10 },
  aiWeights: { shape: 25, composition: 20, proportion: 20, color: 15, detail: 20 },
  thresholds: { veryHigh: 90, high: 75, moderate: 60 },
};

export const DISCLAIMER =
  "Visual similarity is an automated estimate and should be used as an assessment aid. " +
  "A high similarity score does not prove copying, and a low similarity score does not " +
  "necessarily indicate poor programming ability.";

export const SCORE_LABEL = "Visual Similarity Score";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_DIM = 24;

export interface CategoryMeta {
  label: string;
  short: string;
  description: string;
  /** Tailwind classes */
  badge: string;
  bar: string;
  text: string;
  ring: string;
}

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  "very-high": {
    label: "Very High Visual Similarity",
    short: "Very High",
    description: "The reconstruction is visually almost indistinguishable from the original.",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    ring: "#10b981",
  },
  high: {
    label: "High Visual Similarity",
    short: "High",
    description: "Major structure and details match, with minor visual deviations.",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    bar: "bg-sky-500",
    text: "text-sky-600",
    ring: "#0ea5e9",
  },
  moderate: {
    label: "Moderate Visual Similarity",
    short: "Moderate",
    description: "The general idea is preserved, but several visual aspects differ.",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-600",
    ring: "#f59e0b",
  },
  low: {
    label: "Low Visual Similarity",
    short: "Low",
    description: "The reconstruction differs substantially from the original emoji.",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-600",
    ring: "#f43f5e",
  },
};

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

/** Weighted average of metric values; tolerant of zero-weight configurations. */
export function weightedAverage(
  values: Record<string, number>,
  weights: Record<string, number>,
): number {
  let sum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights)) {
    const w = Number(weights[key]) || 0;
    const v = Number(values[key]);
    if (Number.isNaN(v)) continue;
    sum += v * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return 0;
  return clamp(round1(sum / totalWeight));
}

/** Percentage contribution of a single weight within its group. */
export function weightPercent(weight: number, all: Record<string, number>): number {
  const total = Object.values(all).reduce((s, w) => s + (Number(w) || 0), 0);
  if (total <= 0) return 0;
  return Math.round(((Number(weight) || 0) / total) * 100);
}

export function getCategory(
  score: number,
  thresholds: CategoryThresholds = DEFAULT_SETTINGS.thresholds,
): CategoryKey {
  if (score >= thresholds.veryHigh) return "very-high";
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.moderate) return "moderate";
  return "low";
}

/** Deep-merge persisted (possibly partial) settings over the defaults. */
export function mergeSettings(raw: unknown): AppSettings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const fw = (r.finalWeights ?? {}) as Record<string, unknown>;
  const cv = (r.cvWeights ?? {}) as Record<string, unknown>;
  const ai = (r.aiWeights ?? {}) as Record<string, unknown>;
  const th = (r.thresholds ?? {}) as Record<string, unknown>;
  return {
    finalWeights: {
      cv: num(fw.cv, d.finalWeights.cv),
      ai: num(fw.ai, d.finalWeights.ai),
    },
    cvWeights: {
      structural: num(cv.structural, d.cvWeights.structural),
      shape: num(cv.shape, d.cvWeights.shape),
      color: num(cv.color, d.cvWeights.color),
      composition: num(cv.composition, d.cvWeights.composition),
    },
    aiWeights: {
      shape: num(ai.shape, d.aiWeights.shape),
      composition: num(ai.composition, d.aiWeights.composition),
      proportion: num(ai.proportion, d.aiWeights.proportion),
      color: num(ai.color, d.aiWeights.color),
      detail: num(ai.detail, d.aiWeights.detail),
    },
    thresholds: {
      veryHigh: num(th.veryHigh, d.thresholds.veryHigh),
      high: num(th.high, d.thresholds.high),
      moderate: num(th.moderate, d.thresholds.moderate),
    },
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
