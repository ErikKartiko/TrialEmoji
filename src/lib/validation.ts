/** Shared validation helpers (no DOM or Node dependencies). */
import { clamp, round1 } from "./defaults";
import type { AiAnalysis } from "./types";

/** Validates + normalizes a raw AI vision analysis payload. Throws on invalid shape. */
export function sanitizeAiAnalysis(raw: unknown): AiAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid AI response payload.");
  }
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number => {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    if (typeof n !== "number" || Number.isNaN(n)) {
      throw new Error("AI response contained a non-numeric score.");
    }
    return clamp(round1(n));
  };
  const list = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 12)
      : [];
  return {
    shape: num(r.shape),
    composition: num(r.composition),
    proportion: num(r.proportion),
    color: num(r.color),
    detail: num(r.detail),
    overall: num(r.overall),
    similarities: list(r.similarities),
    differences: list(r.differences),
    explanation: typeof r.explanation === "string" ? r.explanation.slice(0, 2000) : "",
  };
}

const short = (v: unknown, max = 120): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const score = (v: unknown): number =>
  clamp(round1(typeof v === "number" && Number.isFinite(v) ? v : 0));

const scoreOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? clamp(round1(v)) : null;

const text = (v: unknown, max = 4000): string =>
  typeof v === "string" ? v.slice(0, max) : "";

const dataUrl = (v: unknown): string => {
  if (typeof v !== "string") return "";
  if (!v.startsWith("data:image/") && !v.startsWith("data:application/octet-stream")) {
    return "";
  }
  return v.length <= 2_500_000 ? v : "";
};

/** Validates + normalizes the payload for creating an evaluation. */
export function sanitizeEvaluationPayload(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid evaluation payload.");
  }
  const r = raw as Record<string, unknown>;
  const analysis = (r.analysis ?? {}) as Record<string, unknown>;
  const cv = (analysis.cv ?? {}) as Record<string, unknown>;
  const aiRaw = analysis.ai as Record<string, unknown> | null | undefined;
  const images = (analysis.images ?? {}) as Record<string, unknown>;
  const settingsSnapshot =
    analysis.settingsSnapshot && typeof analysis.settingsSnapshot === "object"
      ? (analysis.settingsSnapshot as Record<string, unknown>)
      : null;

  const aiStatusRaw = analysis.aiStatus;
  const aiStatus = ["ok", "error", "unavailable", "skipped"].includes(
    aiStatusRaw as string,
  )
    ? (aiStatusRaw as "ok" | "error" | "unavailable" | "skipped")
    : "skipped";

  let ai: AiAnalysis | null = null;
  if (aiStatus === "ok" && aiRaw) {
    try {
      ai = sanitizeAiAnalysis(aiRaw);
    } catch {
      ai = null;
    }
  }

  const category = ["very-high", "high", "moderate", "low"].includes(
    analysis.category as string,
  )
    ? (analysis.category as "very-high" | "high" | "moderate" | "low")
    : "moderate";

  return {
    studentName: short(r.studentName, 120),
    nim: short(r.nim, 40),
    className: short(r.className, 40),
    originalOwner: short(r.originalOwner, 120),
    notes: text(r.notes, 2000),
    batchId:
      typeof r.batchId === "string" && r.batchId.length > 0
        ? r.batchId.slice(0, 60)
        : null,
    cvStructural: score(cv.structural),
    cvShape: score(cv.shape),
    cvColor: score(cv.color),
    cvComposition: score(cv.composition),
    cvScore: score(cv.score),
    aiStatus,
    aiShape: ai ? ai.shape : scoreOrNull(undefined),
    aiComposition: ai ? ai.composition : null,
    aiProportion: ai ? ai.proportion : null,
    aiColor: ai ? ai.color : null,
    aiDetail: ai ? ai.detail : null,
    aiOverall: ai ? ai.overall : null,
    aiScore: ai ? scoreOrNull(analysis.aiScore) : null,
    aiSimilarities: ai ? ai.similarities : [],
    aiDifferences: ai ? ai.differences : [],
    aiExplanation: ai ? ai.explanation : "",
    finalScore: score(analysis.finalScore),
    category,
    weightsSnapshot: settingsSnapshot,
    lecturerScore:
      typeof r.lecturerScore === "number" && Number.isFinite(r.lecturerScore)
        ? Math.round(clamp(r.lecturerScore))
        : null,
    lecturerNotes: text(r.lecturerNotes, 5000),
    originalImage: dataUrl(images.original),
    reconstructionImage: dataUrl(images.reconstruction),
    diffImage: dataUrl(images.diff),
  };
}

export function sanitizeLecturerAssessment(raw: unknown): {
  lecturerScore: number | null;
  lecturerNotes: string;
} {
  const r = (raw ?? {}) as Record<string, unknown>;
  let lecturerScore: number | null = null;
  if (typeof r.lecturerScore === "number" && Number.isFinite(r.lecturerScore)) {
    lecturerScore = Math.round(clamp(r.lecturerScore));
  }
  return {
    lecturerScore,
    lecturerNotes: text(r.lecturerNotes, 5000),
  };
}
