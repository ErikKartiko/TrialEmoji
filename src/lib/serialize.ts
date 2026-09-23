import type { EvaluationRow } from "@/db/schema";
import type { AiStatus, CategoryKey, EvaluationRecord } from "./types";

/** Converts a DB row into the serialized record shape used across the app. */
export function serializeEvaluation(row: EvaluationRow): EvaluationRecord {
  return {
    id: row.id,
    studentName: row.studentName,
    nim: row.nim,
    className: row.className,
    originalOwner: row.originalOwner,
    notes: row.notes,
    batchId: row.batchId,
    cvStructural: row.cvStructural,
    cvShape: row.cvShape,
    cvColor: row.cvColor,
    cvComposition: row.cvComposition,
    cvScore: row.cvScore,
    aiStatus: (["ok", "error", "unavailable", "skipped"].includes(row.aiStatus)
      ? row.aiStatus
      : "skipped") as AiStatus,
    aiShape: row.aiShape,
    aiComposition: row.aiComposition,
    aiProportion: row.aiProportion,
    aiColor: row.aiColor,
    aiDetail: row.aiDetail,
    aiOverall: row.aiOverall,
    aiScore: row.aiScore,
    aiSimilarities: Array.isArray(row.aiSimilarities) ? row.aiSimilarities : [],
    aiDifferences: Array.isArray(row.aiDifferences) ? row.aiDifferences : [],
    aiExplanation: row.aiExplanation,
    finalScore: row.finalScore,
    category: (["very-high", "high", "moderate", "low"].includes(row.category)
      ? row.category
      : "moderate") as CategoryKey,
    lecturerScore: row.lecturerScore,
    lecturerNotes: row.lecturerNotes,
    originalImage: row.originalImage,
    reconstructionImage: row.reconstructionImage,
    diffImage: row.diffImage,
    createdAt: row.createdAt.toISOString(),
  };
}
