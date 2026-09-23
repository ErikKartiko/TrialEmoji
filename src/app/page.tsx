"use client";

import { EvaluationTable } from "@/components/EvaluationTable";
import { DistributionChart, StatCard } from "@/components/ScoreWidgets";
import { useToast } from "@/components/Toast";
import { EmptyState, Spinner } from "@/components/ui";
import {
  CATEGORY_META,
  formatScore,
  median,
  round1,
} from "@/lib/defaults";
import { exportEvaluationsCsv } from "@/lib/export";
import { listLocalEvaluations } from "@/lib/local-store";
import type { CategoryKey, EvaluationRecord } from "@/lib/types";
import {
  ArrowDownToLine,
  FileImage,
  HardDriveDownload,
  Layers,
  ShieldCheck,
  Sparkles,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const toast = useToast();
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/evaluations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.persistent) {
          // Database-backed storage is the source of truth.
          setEvaluations(
            Array.isArray(data.evaluations) ? data.evaluations : [],
          );
          setPersistent(true);
        } else {
          // No database — evaluations live in this browser.
          setEvaluations(listLocalEvaluations());
          setPersistent(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvaluations(listLocalEvaluations());
          setPersistent(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scores = evaluations.map((e) => e.finalScore);
  const total = evaluations.length;
  const average =
    total > 0 ? round1(scores.reduce((s, v) => s + v, 0) / total) : 0;
  const med = total > 0 ? round1(median(scores)) : 0;
  const highest = total > 0 ? Math.max(...scores) : 0;
  const lowest = total > 0 ? Math.min(...scores) : 0;

  const counts: Record<CategoryKey, number> = {
    "very-high": 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
  for (const e of evaluations) counts[e.category]++;

  return (
    <div className="space-y-10">
      {/* -------------------------------------------------------------- hero */}
      <section className="rise-in">
        <p className="text-[11px] font-semibold tracking-[0.24em] text-[var(--accent)] uppercase">
          Computer Graphics · Assessment Aid
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
              Emoji Reverse Engineering{" "}
              <span className="text-[var(--accent)] italic">Evaluator</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-soft)]">
              Compare each student&apos;s Python + PyCairo reconstruction with the
              original emoji. Objective computer-vision metrics analyse
              structure, shape, color and composition; optional AI vision adds
              qualitative judgement of proportions and details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/evaluation/new"
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110"
            >
              <SquarePen className="h-4 w-4" aria-hidden />
              New Evaluation
            </Link>
            <Link
              href="/batch"
              className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper)] transition hover:opacity-85"
            >
              <Layers className="h-4 w-4" aria-hidden />
              Batch Evaluation
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {persistent === false && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <HardDriveDownload className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <p className="text-xs leading-relaxed text-sky-900">
            <strong>Browser storage mode.</strong> No database is configured
            (DATABASE_URL is not set), so evaluations and settings are kept in
            this browser only. Use Export CSV to archive results. Add a
            PostgreSQL/Supabase connection later for shared, persistent storage.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-white py-20 text-sm text-[var(--ink-soft)]">
          <Spinner /> Loading evaluations…
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- stats */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total evaluations" value={String(total)} />
            <StatCard
              label="Average similarity"
              value={total ? formatScore(average) : "—"}
            />
            <StatCard
              label="Median similarity"
              value={total ? formatScore(med) : "—"}
            />
            <StatCard
              label="Highest similarity"
              value={total ? formatScore(highest) : "—"}
            />
            <StatCard
              label="Lowest similarity"
              value={total ? formatScore(lowest) : "—"}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            {/* ------------------------------------------------- distribution */}
            <section className="rounded-2xl border border-[var(--line)] bg-white p-6 lg:col-span-3">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                    Similarity Distribution
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Descriptive categories — not academic grades
                  </p>
                </div>
              </div>
              <DistributionChart counts={counts} total={total} />
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(CATEGORY_META) as CategoryKey[]).map((key) => (
                  <div
                    key={key}
                    className={`rounded-xl border px-3 py-2 text-center ${CATEGORY_META[key].badge}`}
                  >
                    <p className="font-mono text-lg leading-none font-semibold">
                      {counts[key]}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold tracking-wide uppercase">
                      {CATEGORY_META[key].short}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------------ workflow */}
            <section className="flex flex-col gap-4 lg:col-span-2">
              <div className="flex-1 rounded-2xl border border-[var(--line)] bg-white p-6">
                <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                  How it works
                </h2>
                <ol className="mt-4 space-y-3">
                  {[
                    "Upload the original emoji and the PyCairo reconstruction.",
                    "Images are normalized in your browser — size, canvas and small rendering differences are tolerated.",
                    "Computer Vision scores structural, shape, color and composition similarity.",
                    "Optional AI vision analysis judges proportions, positions, details and unique characteristics.",
                    "Review the comparison modes, then record your manual assessment.",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 font-mono text-[11px] font-semibold text-[var(--accent)]">
                        {i + 1}
                      </span>
                      <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                  <strong className="text-[var(--ink)]">Privacy first.</strong>{" "}
                  All image processing happens locally in the browser. Images are
                  only sent to an AI service when you explicitly enable
                  per-evaluation AI analysis.
                </p>
              </div>
            </section>
          </div>

          {/* --------------------------------------------------------- recent */}
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--ink-soft)] uppercase">
                  History
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold text-[var(--ink)]">
                  Recent Evaluations
                </h2>
              </div>
              {total > 0 &&
                (persistent ? (
                  <a
                    href="/api/export"
                    download
                    className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
                  >
                    <ArrowDownToLine className="h-4 w-4" aria-hidden />
                    Export CSV
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      exportEvaluationsCsv(evaluations);
                      toast.push("CSV exported.", "success");
                    }}
                    className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
                  >
                    <ArrowDownToLine className="h-4 w-4" aria-hidden />
                    Export CSV
                  </button>
                ))}
            </div>

            {total === 0 ? (
              <EmptyState
                icon={<FileImage className="h-6 w-6" aria-hidden />}
                title="No evaluations yet"
              >
                <p>
                  Run your first evaluation to see results here — or explore the{" "}
                  <Link
                    href="/demo"
                    className="font-semibold text-[var(--accent)] underline underline-offset-2"
                  >
                    interactive demo
                  </Link>{" "}
                  with generated sample emoji pairs.
                </p>
              </EmptyState>
            ) : (
              <EvaluationTable evaluations={evaluations} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
