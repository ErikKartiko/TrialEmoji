"use client";

import {
  CATEGORY_META,
  formatScore,
  weightPercent,
} from "@/lib/defaults";
import { downloadTextFile, toCsv } from "@/lib/export";
import { removeLocalEvaluation, updateLocalEvaluation } from "@/lib/local-store";
import type { AnalysisBundle, StudentInfo } from "@/lib/types";
import {
  CalendarDays,
  FileDown,
  FileText,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AIAnalysisView } from "./AIAnalysisView";
import { ImageComparison } from "./ImageComparison";
import {
  LecturerAssessment,
  type LecturerAssessmentValue,
} from "./LecturerAssessment";
import { MetricBar, ScoreGauge } from "./ScoreWidgets";
import { useToast } from "./Toast";
import { CategoryBadge, DisclaimerNote, ScoreChip, Spinner } from "./ui";

interface EvaluationResultProps {
  student: StudentInfo;
  analysis: AnalysisBundle;
  variant: "preview" | "persisted";
  /** Where "persisted" records live: server DB/API or browser localStorage. */
  persistence?: "server" | "local";
  evaluationId?: string;
  initialLecturer?: LecturerAssessmentValue;
  createdAt?: string;
  saving?: boolean;
  onSave?: (assessment: LecturerAssessmentValue) => void;
}

function InfoChip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--ink)]">
      <span className="font-semibold text-[var(--ink-soft)]">{label}</span>
      {value}
    </span>
  );
}

export function EvaluationResult({
  student,
  analysis,
  variant,
  persistence = "server",
  evaluationId,
  initialLecturer,
  createdAt,
  saving,
  onSave,
}: EvaluationResultProps) {
  const toast = useToast();
  const router = useRouter();
  const [lecturer, setLecturer] = useState<LecturerAssessmentValue>(
    initialLecturer ?? { score: "", notes: "" },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { cv, ai, aiScore, aiStatus, finalScore, category, images } = analysis;
  const meta = CATEGORY_META[category];
  const settings = analysis.settingsSnapshot;
  const totalFinal = settings.finalWeights.cv + settings.finalWeights.ai;
  const cvPct = totalFinal > 0 ? Math.round((settings.finalWeights.cv / totalFinal) * 100) : 0;
  const aiPct = totalFinal > 0 ? 100 - cvPct : 0;
  const cvWeightsRecord = settings.cvWeights as unknown as Record<string, number>;

  const exportSingleCsv = () => {
    const row = [
      student.studentName,
      student.nim,
      student.className,
      student.originalOwner,
      formatScore(cv.score),
      formatScore(aiScore),
      formatScore(finalScore),
      lecturer.score,
      lecturer.notes,
    ];
    const csv = toCsv(
      [
        "Student Name",
        "NIM",
        "Class",
        "Original Owner",
        "CV Score",
        "AI Score",
        "Final Similarity",
        "Lecturer Score",
        "Lecturer Notes",
      ],
      [row],
    );
    downloadTextFile(
      `evaluation-${student.nim || student.studentName || "result"}.csv`,
      csv,
    );
  };

  const doDelete = async () => {
    if (!evaluationId) return;
    setDeleting(true);
    if (persistence === "local") {
      removeLocalEvaluation(evaluationId);
      toast.push("Evaluation deleted from this browser.", "success");
      router.push("/");
      router.refresh();
      return;
    }
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.push("Evaluation deleted.", "success");
      router.push("/");
      router.refresh();
    } catch {
      toast.push("Could not delete the evaluation.", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  /** Persist lecturer assessment in browser mode. */
  const saveLecturerLocally = async (value: LecturerAssessmentValue) => {
    if (!evaluationId) return false;
    const parsed =
      value.score.trim() === "" ? null : Math.round(Number(value.score));
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
      return false;
    }
    const updated = updateLocalEvaluation(evaluationId, {
      lecturerScore: parsed,
      lecturerNotes: value.notes,
    });
    return updated !== null;
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ student context */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display mr-2 text-2xl font-semibold text-[var(--ink)]">
          {student.studentName || "Unnamed student"}
        </h1>
        <InfoChip label="NIM" value={student.nim} />
        <InfoChip label="Class" value={student.className} />
        <InfoChip label="Original by" value={student.originalOwner} />
        {createdAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-[var(--ink-soft)]">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {new Date(createdAt).toLocaleString()}
          </span>
        )}
      </div>
      {student.notes && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-4 py-2.5 text-sm text-[var(--ink-soft)] italic">
          {student.notes}
        </p>
      )}

      {/* ------------------------------------------------ score hero */}
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="flex flex-col items-center gap-8 p-6 sm:p-8 lg:flex-row">
          <div className="shrink-0">
            <ScoreGauge score={finalScore} thresholds={settings.thresholds} />
          </div>
          <div className="w-full flex-1">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
              Overall Visual Similarity
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`font-mono text-4xl font-bold ${meta.text}`}>
                {formatScore(finalScore)}
                <span className="text-lg font-medium text-[var(--ink-soft)]">
                  {" "}
                  / 100
                </span>
              </span>
              <CategoryBadge category={category} />
            </div>
            <p className="mt-2 max-w-xl text-sm text-[var(--ink-soft)]">
              {meta.label} — {meta.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <ScoreChip label="CV Score" value={formatScore(cv.score)} />
              <ScoreChip
                label="AI Score"
                value={aiScore === null ? "n/a" : formatScore(aiScore)}
                tone="accent"
              />
              <div className="rounded-xl border border-[var(--line)] bg-white px-3.5 py-2">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                  Formula
                </p>
                <p className="font-mono text-xs text-[var(--ink)]">
                  {aiScore === null
                    ? "CV only (AI unavailable)"
                    : `CV × ${cvPct}% + AI × ${aiPct}%`}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-[var(--ink-soft)]">
              This is a <strong>Visual Similarity Score</strong> — a descriptive
              similarity category, not an academic grade.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 sm:px-8">
          <DisclaimerNote />
        </div>
      </section>

      {/* ------------------------------------------------ image comparison */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <h2 className="font-display mb-4 text-xl font-semibold text-[var(--ink)]">
          Image Comparison
        </h2>
        <ImageComparison
          original={images.original}
          reconstruction={images.reconstruction}
          diff={images.diff}
        />
      </section>

      {/* ------------------------------------------------ CV breakdown */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Similarity Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              Objective computer-vision metrics on normalized images
            </p>
          </div>
          <ScoreChip label="CV Similarity Score" value={formatScore(cv.score)} tone="accent" />
        </div>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <MetricBar
            label="Structural"
            value={cv.structural}
            weight={`${weightPercent(settings.cvWeights.structural, cvWeightsRecord)}% weight`}
          />
          <MetricBar
            label="Shape"
            value={cv.shape}
            weight={`${weightPercent(settings.cvWeights.shape, cvWeightsRecord)}% weight`}
          />
          <MetricBar
            label="Color"
            value={cv.color}
            weight={`${weightPercent(settings.cvWeights.color, cvWeightsRecord)}% weight`}
          />
          <MetricBar
            label="Composition"
            value={cv.composition}
            weight={`${weightPercent(settings.cvWeights.composition, cvWeightsRecord)}% weight`}
          />
        </div>
      </section>

      {/* ------------------------------------------------ AI analysis */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <h2 className="font-display mb-5 text-xl font-semibold text-[var(--ink)]">
          AI Analysis
        </h2>
        <AIAnalysisView
          status={aiStatus}
          analysis={ai}
          aiScore={aiScore}
          aiWeights={settings.aiWeights}
        />
      </section>

      {/* ------------------------------------------------ lecturer assessment */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            Manual Lecturer Assessment
          </h2>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            Recorded separately — this never overwrites the automated result.
          </p>
        </div>
        <LecturerAssessment
          value={lecturer}
          onChange={setLecturer}
          evaluationId={
            variant === "persisted" && persistence === "server" ? evaluationId : null
          }
          onSaveCustom={
            variant === "persisted" && persistence === "local"
              ? saveLecturerLocally
              : undefined
          }
        />
      </section>

      {/* ------------------------------------------------ actions */}
      <section className="flex flex-wrap items-center gap-2.5">
        {variant === "preview" && onSave && (
          <button
            type="button"
            onClick={() => onSave(lecturer)}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
            {saving ? "Saving…" : "Save Evaluation"}
          </button>
        )}
        {variant === "persisted" && evaluationId && (
          <>
            <a
              href={`/evaluation/${evaluationId}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper)] transition hover:opacity-85"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Printable Report
            </a>
            <button
              type="button"
              onClick={exportSingleCsv}
              className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </button>
          </>
        )}
      </section>

      {/* ------------------------------------------------ delete modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <TriangleAlert className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
                  Delete this evaluation?
                </h3>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  The evaluation for{" "}
                  <strong>{student.studentName || "this student"}</strong> and
                  its stored images will be permanently removed. This cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
