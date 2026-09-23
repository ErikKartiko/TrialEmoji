/** Shared types for the Emoji Reverse Engineering Evaluator. */

export interface CvWeights {
  structural: number;
  shape: number;
  color: number;
  composition: number;
}

export interface AiWeights {
  shape: number;
  composition: number;
  proportion: number;
  color: number;
  detail: number;
}

export interface CategoryThresholds {
  veryHigh: number;
  high: number;
  moderate: number;
}

export interface AppSettings {
  /** Contribution of CV vs AI to the final visual similarity score. */
  finalWeights: { cv: number; ai: number };
  cvWeights: CvWeights;
  aiWeights: AiWeights;
  thresholds: CategoryThresholds;
}

export type CategoryKey = "very-high" | "high" | "moderate" | "low";

export type AiStatus = "ok" | "error" | "unavailable" | "skipped";

/** Computer-vision metric bundle (all values 0-100). */
export interface CvMetrics {
  structural: number;
  shape: number;
  color: number;
  composition: number;
  score: number;
}

/** Raw structured analysis returned by the AI vision model. */
export interface AiAnalysis {
  shape: number;
  composition: number;
  proportion: number;
  color: number;
  detail: number;
  overall: number;
  similarities: string[];
  differences: string[];
  explanation: string;
}

/** Full client-side analysis result, ready to display and persist. */
export interface AnalysisBundle {
  cv: CvMetrics;
  ai: AiAnalysis | null;
  aiScore: number | null;
  aiStatus: AiStatus;
  finalScore: number;
  category: CategoryKey;
  settingsSnapshot: AppSettings;
  images: {
    original: string;
    reconstruction: string;
    diff: string;
  };
}

export interface StudentInfo {
  studentName: string;
  nim: string;
  className: string;
  originalOwner: string;
  notes: string;
}

/** Payload sent to POST /api/evaluations. */
export interface EvaluationPayload extends StudentInfo {
  batchId?: string | null;
  analysis: AnalysisBundle;
}

/** Serialized evaluation row as returned by the API / loaded from the DB. */
export interface EvaluationRecord {
  id: string;
  studentName: string;
  nim: string;
  className: string;
  originalOwner: string;
  notes: string;
  batchId: string | null;
  cvStructural: number;
  cvShape: number;
  cvColor: number;
  cvComposition: number;
  cvScore: number;
  aiStatus: AiStatus;
  aiShape: number | null;
  aiComposition: number | null;
  aiProportion: number | null;
  aiColor: number | null;
  aiDetail: number | null;
  aiOverall: number | null;
  aiScore: number | null;
  aiSimilarities: string[];
  aiDifferences: string[];
  aiExplanation: string;
  finalScore: number;
  category: CategoryKey;
  lecturerScore: number | null;
  lecturerNotes: string;
  originalImage: string;
  reconstructionImage: string;
  diffImage: string;
  createdAt: string;
}
