"use client";

import { EvaluationResult } from "@/components/EvaluationResult";
import { ImageUploader } from "@/components/ImageUploader";
import type { LecturerAssessmentValue } from "@/components/LecturerAssessment";
import { useToast } from "@/components/Toast";
import { SectionHeader, Spinner } from "@/components/ui";
import {
  ANALYSIS_STAGES,
  runFullAnalysis,
  type AnalysisStage,
} from "@/lib/analysis";
import { useAiConfigured, useSettings } from "@/lib/hooks";
import { readImageFile } from "@/lib/image-processing";
import { saveLocalEvaluation } from "@/lib/local-store";
import type { AnalysisBundle, StudentInfo } from "@/lib/types";
import { ArrowLeft, Bot, ScanSearch, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UploadedImage {
  dataUrl: string;
  fileName: string;
}

const EMPTY_STUDENT: StudentInfo = {
  studentName: "",
  nim: "",
  className: "",
  originalOwner: "",
  notes: "",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const id = `field-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={textarea ? "sm:col-span-2" : ""}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase"
      >
        {label}
        {required && <span className="ml-1 text-[var(--accent)]">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/25"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/25"
        />
      )}
    </div>
  );
}

export default function NewEvaluationPage() {
  const toast = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const aiConfigured = useAiConfigured();

  const [student, setStudent] = useState<StudentInfo>(EMPTY_STUDENT);
  const [original, setOriginal] = useState<UploadedImage | null>(null);
  const [reconstruction, setReconstruction] = useState<UploadedImage | null>(null);
  const [useAi, setUseAi] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<AnalysisStage | null>(null);
  const [result, setResult] = useState<AnalysisBundle | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "New Evaluation · Emoji RE Evaluator";
  }, []);

  useEffect(() => {
    if (aiConfigured === false) setUseAi(false);
  }, [aiConfigured]);

  const handleFile =
    (setter: (img: UploadedImage | null) => void) => async (file: File) => {
      try {
        const { dataUrl } = await readImageFile(file);
        setter({ dataUrl, fileName: file.name });
      } catch (error) {
        toast.push(
          error instanceof Error ? error.message : "Could not load the image.",
          "error",
        );
      }
    };

  const canAnalyze =
    !analyzing && original !== null && reconstruction !== null;

  const analyze = async () => {
    if (!original || !reconstruction) return;
    setAnalyzing(true);
    setResult(null);
    setStage("normalize");
    try {
      const bundle = await runFullAnalysis({
        originalSrc: original.dataUrl,
        reconstructionSrc: reconstruction.dataUrl,
        settings,
        useAi: useAi && aiConfigured === true,
        onStage: setStage,
      });
      setResult(bundle);
      if (bundle.aiStatus === "error") {
        toast.push(
          "AI analysis unavailable. Computer Vision analysis is still available.",
          "info",
        );
      }
      window.setTimeout(
        () =>
          document
            .getElementById("evaluation-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (error) {
      toast.push(
        error instanceof Error
          ? error.message
          : "Image processing failed. Please try different images.",
        "error",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async (assessment: LecturerAssessmentValue) => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...student, analysis: result }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.evaluation?.id) {
        throw new Error(data?.error ?? "Could not save the evaluation.");
      }
      const id = data.evaluation.id as string;
      const parsedScore =
        assessment.score.trim() === "" ? null : Math.round(Number(assessment.score));
      if (data.persistent === false) {
        // No database on the server — keep the record in this browser.
        const record = {
          ...(data.evaluation as NonNullable<typeof data.evaluation>),
          lecturerScore:
            parsedScore !== null && !Number.isNaN(parsedScore) ? parsedScore : null,
          lecturerNotes: assessment.notes,
        };
        const saved = saveLocalEvaluation(record);
        toast.push(
          saved.ok
            ? "Evaluation saved in this browser (no database configured)."
            : (saved.error ?? "Could not store the evaluation locally."),
          saved.ok ? "success" : "error",
        );
        router.push(`/evaluation/${id}`);
        router.refresh();
        return;
      }
      if (
        (parsedScore !== null && !Number.isNaN(parsedScore)) ||
        assessment.notes.trim() !== ""
      ) {
        await fetch(`/api/evaluations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lecturerScore: parsedScore,
            lecturerNotes: assessment.notes,
          }),
        }).catch(() => {});
      }
      toast.push("Evaluation saved.", "success");
      router.push(`/evaluation/${id}`);
      router.refresh();
    } catch (error) {
      toast.push(
        error instanceof Error ? error.message : "Could not save the evaluation.",
        "error",
      );
      setSaving(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setOriginal(null);
    setReconstruction(null);
    setStudent(EMPTY_STUDENT);
    setStage(null);
  };

  const visibleStages = ANALYSIS_STAGES.filter(
    (s) => s.key !== "ai" || (useAi && aiConfigured === true),
  );
  const stageIndex = (key: AnalysisStage | null) =>
    key === null ? -1 : visibleStages.findIndex((s) => s.key === key);

  if (result) {
    return (
      <div id="evaluation-result" className="rise-in space-y-4">
        <button
          type="button"
          onClick={resetAll}
          className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Start another evaluation
        </button>
        <EvaluationResult
          student={student}
          analysis={result}
          variant="preview"
          saving={saving}
          onSave={save}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Evaluation"
        title="New Evaluation"
        description="Upload the original emoji and the student's PyCairo reconstruction. Both images are compared after normalization, so different canvas sizes and minor rendering differences are tolerated."
      />

      {/* ------------------------------------------------ student info */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <h2 className="font-display mb-5 text-xl font-semibold text-[var(--ink)]">
          Student Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Student Name"
            required
            value={student.studentName}
            onChange={(v) => setStudent({ ...student, studentName: v })}
            placeholder="e.g. Aisyah Putri"
          />
          <Field
            label="NIM / Student ID"
            value={student.nim}
            onChange={(v) => setStudent({ ...student, nim: v })}
            placeholder="e.g. 2110511042"
          />
          <Field
            label="Class"
            value={student.className}
            onChange={(v) => setStudent({ ...student, className: v })}
            placeholder="e.g. CG-B"
          />
          <Field
            label="Original Emoji Owner"
            value={student.originalOwner}
            onChange={(v) => setStudent({ ...student, originalOwner: v })}
            placeholder="Who created the original emoji"
          />
          <Field
            label="Notes (optional)"
            textarea
            value={student.notes}
            onChange={(v) => setStudent({ ...student, notes: v })}
            placeholder="Any context worth recording for this evaluation"
          />
        </div>
      </section>

      {/* ------------------------------------------------ uploads */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <h2 className="font-display mb-5 text-xl font-semibold text-[var(--ink)]">
          Emoji Images
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUploader
            id="upload-original"
            label="Original Emoji"
            hint="Created by the original owner"
            tone="original"
            value={original?.dataUrl ?? null}
            fileName={original?.fileName ?? null}
            onFile={handleFile(setOriginal)}
            onClear={() => setOriginal(null)}
            disabled={analyzing}
          />
          <ImageUploader
            id="upload-reconstruction"
            label="PyCairo Reconstruction"
            hint="Recreated with Python + PyCairo"
            tone="reconstruction"
            value={reconstruction?.dataUrl ?? null}
            fileName={reconstruction?.fileName ?? null}
            onFile={handleFile(setReconstruction)}
            onClear={() => setReconstruction(null)}
            disabled={analyzing}
          />
        </div>

        {/* AI toggle */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3.5">
          <input
            id="use-ai"
            type="checkbox"
            checked={useAi && aiConfigured === true}
            disabled={analyzing || aiConfigured === false}
            onChange={(e) => setUseAi(e.target.checked)}
            className="mt-1 h-4 w-4 rounded accent-violet-600"
          />
          <label htmlFor="use-ai" className="text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
              <Bot className="h-4 w-4 text-violet-600" aria-hidden />
              Include AI Vision analysis
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ink-soft)]">
              {aiConfigured === false ? (
                <>
                  No AI provider key is configured (set{" "}
                  <code className="font-mono text-[11px]">AI_API_KEY</code>), so
                  this evaluation will use Computer Vision analysis only.
                </>
              ) : (
                <>
                  Both images will be sent to the configured AI vision service to
                  judge proportions, positions, details and unique
                  characteristics. Disable to keep all processing local.
                </>
              )}
            </span>
          </label>
        </div>

        {/* analyze button / progress */}
        {analyzing ? (
          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--paper-2)] p-5">
            <div className="flex items-center gap-2.5">
              <Spinner className="h-5 w-5 text-[var(--accent)]" />
              <p className="text-sm font-semibold text-[var(--ink)]">
                Analyzing similarity…
              </p>
            </div>
            <ol className="mt-4 space-y-2.5">
              {visibleStages.map((s, i) => {
                const current = stageIndex(stage);
                const done = i < current;
                const active = i === current;
                return (
                  <li key={s.key} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--line)] text-[var(--ink-soft)]"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={
                        active
                          ? "font-medium text-[var(--ink)]"
                          : done
                            ? "text-[var(--ink-soft)] line-through"
                            : "text-[var(--ink-soft)]"
                      }
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="mt-6">
            <button
              type="button"
              onClick={analyze}
              disabled={!canAnalyze}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[var(--accent)] px-6 py-4 text-sm font-bold tracking-[0.12em] text-white uppercase shadow-[0_14px_30px_-12px_var(--accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto sm:px-12"
            >
              <ScanSearch className="h-5 w-5" aria-hidden />
              Analyze Similarity
            </button>
            {!canAnalyze && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Both images are required before the analysis can run.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
