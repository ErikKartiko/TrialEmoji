"use client";

import { EvaluationResult } from "@/components/EvaluationResult";
import type { LecturerAssessmentValue } from "@/components/LecturerAssessment";
import { useToast } from "@/components/Toast";
import { CategoryBadge, SectionHeader, Spinner } from "@/components/ui";
import { runFullAnalysis } from "@/lib/analysis";
import { getDemoExamples, type DemoExample } from "@/lib/demo";
import { useAiConfigured, useSettings } from "@/lib/hooks";
import { saveLocalEvaluation } from "@/lib/local-store";
import type { AnalysisBundle } from "@/lib/types";
import { ArrowLeft, Bot, FlaskConical, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DemoPage() {
  const toast = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const aiConfigured = useAiConfigured();

  const [examples, setExamples] = useState<DemoExample[]>([]);

  useEffect(() => {
    try {
      setExamples(getDemoExamples());
    } catch {
      setExamples([]);
    }
  }, []);

  const [runningId, setRunningId] = useState<string | null>(null);
  const [active, setActive] = useState<{
    example: DemoExample;
    analysis: AnalysisBundle;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Demo · Emoji RE Evaluator";
  }, []);

  const runDemo = async (example: DemoExample) => {
    setRunningId(example.id);
    try {
      const analysis = await runFullAnalysis({
        originalSrc: example.original,
        reconstructionSrc: example.reconstruction,
        settings,
        useAi: aiConfigured === true,
        onStage: () => {},
      });
      setActive({ example, analysis });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.push("The demo analysis failed unexpectedly.", "error");
    } finally {
      setRunningId(null);
    }
  };

  const save = async (assessment: LecturerAssessmentValue) => {
    if (!active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...active.example.student,
          notes: `${active.example.student.notes} (${active.example.title})`,
          analysis: active.analysis,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.evaluation?.id) throw new Error();
      const parsedScore =
        assessment.score.trim() === "" ? null : Math.round(Number(assessment.score));
      if (data.persistent === false) {
        const record = {
          ...(data.evaluation as NonNullable<typeof data.evaluation>),
          lecturerScore:
            parsedScore !== null && !Number.isNaN(parsedScore) ? parsedScore : null,
          lecturerNotes: assessment.notes,
        };
        saveLocalEvaluation(record);
        toast.push("Demo evaluation saved in this browser.", "success");
        router.push(`/evaluation/${data.evaluation.id}`);
        router.refresh();
        return;
      }
      if (
        (parsedScore !== null && !Number.isNaN(parsedScore)) ||
        assessment.notes.trim() !== ""
      ) {
        await fetch(`/api/evaluations/${data.evaluation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lecturerScore: parsedScore,
            lecturerNotes: assessment.notes,
          }),
        }).catch(() => {});
      }
      toast.push("Demo evaluation saved to the dashboard.", "success");
      router.push(`/evaluation/${data.evaluation.id}`);
      router.refresh();
    } catch {
      toast.push("Could not save the demo evaluation.", "error");
      setSaving(false);
    }
  };

  if (active) {
    return (
      <div className="rise-in space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActive(null)}
            className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to demo examples
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            {active.example.title}
          </span>
        </div>
        <EvaluationResult
          student={active.example.student}
          analysis={active.analysis}
          variant="preview"
          saving={saving}
          onSave={save}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        kicker="Demo Mode"
        title="Try the Evaluator"
        description="Three sample emoji pairs are generated locally in your browser and run through the real analysis pipeline — no uploads required. See how the system behaves on faithful, partial and failed reconstructions."
      />

      {aiConfigured === false && (
        <p className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-4 py-3 text-xs text-[var(--ink-soft)]">
          <Bot className="h-4 w-4 shrink-0 text-[var(--ink-soft)]" aria-hidden />
          No AI key is configured, so the demo will run the Computer Vision
          analysis only — exactly what lecturers see without an API key.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {examples.map((example) => (
          <article
            key={example.id}
            className="flex flex-col rounded-2xl border border-[var(--line)] bg-white p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(28,26,21,0.4)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <CategoryBadge category={example.expectation} />
              <span className="font-mono text-[10px] text-[var(--ink-soft)] uppercase">
                {example.subtitle}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <figure>
                <div className="checker flex aspect-square items-center justify-center rounded-xl border border-[var(--line)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={example.original}
                    alt="Demo original emoji"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <figcaption className="mt-1.5 text-center text-[10px] font-bold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                  Original
                </figcaption>
              </figure>
              <figure>
                <div className="checker flex aspect-square items-center justify-center rounded-xl border border-[var(--line)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={example.reconstruction}
                    alt="Demo PyCairo reconstruction"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <figcaption className="mt-1.5 text-center text-[10px] font-bold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                  Reconstruction
                </figcaption>
              </figure>
            </div>

            <h3 className="font-display text-lg leading-snug font-semibold text-[var(--ink)]">
              {example.title}
            </h3>
            <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--ink-soft)]">
              {example.description}
            </p>

            <button
              type="button"
              onClick={() => runDemo(example)}
              disabled={runningId !== null}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper)] transition hover:opacity-85 disabled:opacity-50"
            >
              {runningId === example.id ? (
                <>
                  <Spinner /> Analyzing…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden /> Run analysis
                </>
              )}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
