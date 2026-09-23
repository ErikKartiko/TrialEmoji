/** CSV export helpers (client-side). */
import type { EvaluationRecord } from "./types";

export const EVALUATION_CSV_HEADERS = [
  "Student Name",
  "NIM",
  "Class",
  "Original Owner",
  "CV Score",
  "AI Score",
  "Final Similarity",
  "Lecturer Score",
  "Lecturer Notes",
];

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const score = (v: number | null): string =>
  v === null || v === undefined ? "" : v.toFixed(1);

export function evaluationToCsvRow(
  e: EvaluationRecord,
): (string | number | null)[] {
  return [
    e.studentName,
    e.nim,
    e.className,
    e.originalOwner,
    score(e.cvScore),
    score(e.aiScore),
    score(e.finalScore),
    e.lecturerScore ?? "",
    e.lecturerNotes,
  ];
}

export function exportEvaluationsCsv(
  evaluations: EvaluationRecord[],
  filename = "emoji-evaluations.csv",
): void {
  const csv = toCsv(
    EVALUATION_CSV_HEADERS,
    evaluations.map(evaluationToCsvRow),
  );
  downloadTextFile(filename, csv);
}
