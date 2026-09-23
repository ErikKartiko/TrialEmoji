/**
 * Browser-side persistence (localStorage) used when the server has no
 * database configured (the API reports `persistent: false`).
 *
 * Evaluations are stored as full EvaluationRecord objects (including small
 * embedded preview images). If storage quota is exceeded, images are
 * progressively dropped before giving up gracefully.
 */
import { mergeSettings } from "./defaults";
import type { AppSettings, EvaluationRecord } from "./types";

const LS_EVALUATIONS = "emoji-re:evaluations:v1";
const LS_SETTINGS = "emoji-re:settings:v1";
const MAX_LOCAL_RECORDS = 40;

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function readRecords(): EvaluationRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(LS_EVALUATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EvaluationRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRecords(records: EvaluationRecord[]): { ok: boolean; error?: string } {
  if (!canUseStorage()) return { ok: false, error: "Browser storage unavailable." };
  try {
    window.localStorage.setItem(LS_EVALUATIONS, JSON.stringify(records));
    return { ok: true };
  } catch {
    return { ok: false, error: "quota" };
  }
}

export function listLocalEvaluations(): EvaluationRecord[] {
  return readRecords().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLocalEvaluation(id: string): EvaluationRecord | null {
  return readRecords().find((r) => r.id === id) ?? null;
}

/** Upserts a record; trims history and drops heavy images when quota is hit. */
export function saveLocalEvaluation(
  record: EvaluationRecord,
): { ok: boolean; error?: string } {
  let records = readRecords();
  records = [record, ...records.filter((r) => r.id !== record.id)].slice(
    0,
    MAX_LOCAL_RECORDS,
  );

  let attempt = writeRecords(records);
  if (attempt.ok) return attempt;

  // Quota exceeded — first drop the difference maps, then the large previews.
  const slim = records.map((r, i) =>
    i === 0
      ? { ...r, diffImage: "" }
      : { ...r, diffImage: "" },
  );
  attempt = writeRecords(slim);
  if (attempt.ok) return attempt;

  const smaller = slim.map((r) => ({
    ...r,
    originalImage: r.originalImage.length > 120_000 ? "" : r.originalImage,
    reconstructionImage:
      r.reconstructionImage.length > 120_000 ? "" : r.reconstructionImage,
  }));
  attempt = writeRecords(smaller);
  if (attempt.ok) return attempt;

  // Give up on older history, keep only the newest records.
  for (const keep of [10, 3, 1]) {
    attempt = writeRecords(smaller.slice(0, keep));
    if (attempt.ok) return attempt;
  }
  return {
    ok: false,
    error: "Browser storage is full — export your results to keep them.",
  };
}

export function updateLocalEvaluation(
  id: string,
  patch: Partial<Pick<EvaluationRecord, "lecturerScore" | "lecturerNotes">>,
): EvaluationRecord | null {
  const records = readRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index < 0) return null;
  const updated = { ...records[index], ...patch };
  records[index] = updated;
  writeRecords(records);
  return updated;
}

export function removeLocalEvaluation(id: string): void {
  writeRecords(readRecords().filter((r) => r.id !== id));
}

/* ---------------------------------------------------------------- settings */

export function getLocalSettings(): AppSettings | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(LS_SETTINGS);
    if (!raw) return null;
    return mergeSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalSettings(settings: AppSettings): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore quota errors for settings — they are tiny and non-critical.
  }
}
