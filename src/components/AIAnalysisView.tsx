"use client";

import { formatScore, weightPercent } from "@/lib/defaults";
import type { AiAnalysis, AiStatus, AppSettings } from "@/lib/types";
import {
  Bot,
  BotOff,
  CheckCircle2,
  CircleMinus,
  Quote,
} from "lucide-react";
import { MetricBar } from "./ScoreWidgets";

interface AIAnalysisViewProps {
  status: AiStatus;
  analysis: AiAnalysis | null;
  aiScore: number | null;
  aiWeights?: AppSettings["aiWeights"];
}

function UnavailablePanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-6 py-8">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--ink-soft)] shadow-sm">
        <BotOff className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{message}</p>
      </div>
    </div>
  );
}

export function AIAnalysisView({
  status,
  analysis,
  aiScore,
  aiWeights,
}: AIAnalysisViewProps) {
  if (status !== "ok" || !analysis) {
    if (status === "skipped") {
      return (
        <UnavailablePanel
          title="AI vision analysis was not run"
          message="The lecturer chose to run this evaluation with Computer Vision analysis only. No images were sent to any external service."
        />
      );
    }
    return (
      <UnavailablePanel
        title="AI analysis unavailable"
        message="AI analysis unavailable. Computer Vision analysis is still available. The scores above rely on the objective image-processing metrics only."
      />
    );
  }

  const w = aiWeights ?? { shape: 25, composition: 20, proportion: 20, color: 15, detail: 20 };
  const metrics: { key: keyof typeof w; label: string; value: number }[] = [
    { key: "shape", label: "Shape", value: analysis.shape },
    { key: "composition", label: "Composition", value: analysis.composition },
    { key: "proportion", label: "Proportion", value: analysis.proportion },
    { key: "color", label: "Color", value: analysis.color },
    { key: "detail", label: "Detail", value: analysis.detail },
  ];

  return (
    <div className="space-y-6">
      {/* AI metric breakdown */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Bot className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                AI Vision Analysis
              </p>
              <p className="text-[11px] text-[var(--ink-soft)]">
                Model judgement across five visual dimensions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-violet-300 bg-white px-3.5 py-1.5">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                AI Score&nbsp;
              </span>
              <span className="font-mono text-base font-semibold text-violet-700">
                {formatScore(aiScore)}
              </span>
            </span>
            <span className="rounded-xl border border-violet-300 bg-white px-3.5 py-1.5">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                Model Overall&nbsp;
              </span>
              <span className="font-mono text-base font-semibold text-violet-700">
                {formatScore(analysis.overall)}
              </span>
            </span>
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <MetricBar
              key={m.key}
              label={m.label}
              value={m.value}
              weight={`${weightPercent(
                w[m.key],
                w as unknown as Record<string, number>,
              )}%`}
              tone="violet"
            />
          ))}
        </div>
      </div>

      {/* Similarities / Differences / Explanation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            What is similar?
          </h4>
          {analysis.similarities.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {analysis.similarities.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--ink)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No specific similarities were reported.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <CircleMinus className="h-4 w-4" aria-hidden />
            What is different?
          </h4>
          {analysis.differences.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {analysis.differences.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--ink)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No specific differences were reported.
            </p>
          )}
        </div>
      </div>

      {analysis.explanation && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper-2)] p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <Quote className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            Overall analysis
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)] italic">
            {analysis.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
