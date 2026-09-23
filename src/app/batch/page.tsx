"use client";

import { EvaluationResult } from "@/components/EvaluationResult";
import { useToast } from "@/components/Toast";
import { CategoryBadge, SectionHeader, Spinner } from "@/components/ui";
import { runFullAnalysis } from "@/lib/analysis";
import { formatScore } from "@/lib/defaults";
import { downloadTextFile, toCsv } from "@/lib/export";
import { useAiConfigured, useSettings } from "@/lib/hooks";
import { readImageFile, validateImageFile } from "@/lib/image-processing";
import { saveLocalEvaluation } from "@/lib/local-store";
import type { AnalysisBundle } from "@/lib/types";
import {
  ArrowDownToLine,
  Bot,
  CloudUpload,
  Eye,
  Link2,
  Play,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

/* ------------------------------------------------------------------ types */

interface BatchFileEntry {
  id: string;
  name: string;
  file: File;
  url: string;
  guessKey: string;
  guessSide: "original" | "result" | null;
}

interface BatchPair {
  id: string;
  key: string;
  studentName: string;
  original: BatchFileEntry;
  result: BatchFileEntry;
  status: "pending" | "processing" | "done" | "error";
  analysis: AnalysisBundle | null;
  error: string | null;
  lecturerScore: string;
  saved: boolean;
}

const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

function parseName(fileName: string): {
  key: string;
  side: "original" | "result" | null;
} {
  const base = fileName.replace(/\.[^.]+$/, "");
  const match = base.match(/^(.*?)[\s_\-.]*(original|result|reconstruction|recon)$/i);
  if (match && match[1].length > 0) {
    const rawSide = match[2].toLowerCase();
    return {
      key: match[1].replace(/[\s_\-.]+$/, ""),
      side: rawSide === "original" ? "original" : "result",
    };
  }
  return { key: base, side: null };
}

function humanize(key: string): string {
  const cleaned = key.replace(/[_\-.]+/g, " ").trim();
  if (!cleaned) return "Student";
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ------------------------------------------------------------------ page */

export default function BatchPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const aiConfigured = useAiConfigured();

  const [pendingFiles, setPendingFiles] = useState<BatchFileEntry[]>([]);
  const [pairs, setPairs] = useState<BatchPair[]>([]);
  const [sharedClass, setSharedClass] = useState("");
  const [sharedOwner, setSharedOwner] = useState("");
  const [includeAi, setIncludeAi] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [savingAll, setSavingAll] = useState(false);
  const [viewing, setViewing] = useState<BatchPair | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const batchIdRef = useRef(uid());

  // manual pairing selections
  const [manualOriginal, setManualOriginal] = useState("");
  const [manualResult, setManualResult] = useState("");

  // result filters
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [sortKey, setSortKey] = useState<"student" | "cv" | "ai" | "final">("student");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    document.title = "Batch Evaluation · Emoji RE Evaluator";
  }, []);

  const makePair = (
    a: BatchFileEntry,
    b: BatchFileEntry,
  ): BatchPair => {
    const original = a.guessSide === "result" ? b : a;
    const result = a.guessSide === "result" ? a : b === original ? b : b;
    const key = original.guessKey || result.guessKey;
    return {
      id: uid(),
      key,
      studentName: humanize(key),
      original,
      result,
      status: "pending",
      analysis: null,
      error: null,
      lecturerScore: "",
      saved: false,
    };
  };

  const addFiles = (files: File[]) => {
    if (processing) return;
    const entries: BatchFileEntry[] = [];
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) {
        toast.push(problem, "error");
        continue;
      }
      const { key, side } = parseName(file.name);
      entries.push({
        id: uid(),
        name: file.name,
        file,
        url: URL.createObjectURL(file),
        guessKey: key,
        guessSide: side,
      });
    }
    if (entries.length === 0) return;

    const nextPending = [...pendingFiles];
    let nextPairs = [...pairs];
    for (const entry of entries) {
      if (entry.guessSide) {
        const idx = nextPending.findIndex(
          (p) =>
            p.guessKey.toLowerCase() === entry.guessKey.toLowerCase() &&
            p.guessSide &&
            p.guessSide !== entry.guessSide,
        );
        if (idx >= 0) {
          const counterpart = nextPending.splice(idx, 1)[0];
          nextPairs = [...nextPairs, makePair(entry, counterpart)];
          continue;
        }
      }
      nextPending.push(entry);
    }
    setPendingFiles(nextPending);
    setPairs(nextPairs);
    const autoPaired = nextPairs.length - pairs.length;
    toast.push(
      autoPaired > 0
        ? `Added ${entries.length} file(s), auto-paired ${autoPaired} student(s).`
        : `Added ${entries.length} file(s).`,
      "info",
    );
  };

  const createManualPair = () => {
    const original = pendingFiles.find((f) => f.id === manualOriginal);
    const result = pendingFiles.find((f) => f.id === manualResult);
    if (!original || !result || original.id === result.id) return;
    const pair = makePair(
      { ...original, guessSide: "original" },
      { ...result, guessSide: "result" },
    );
    setPendingFiles(pendingFiles.filter(
      (f) => f.id !== original.id && f.id !== result.id,
    ));
    setPairs([...pairs, pair]);
    setManualOriginal("");
    setManualResult("");
  };

  const removePending = (id: string) =>
    setPendingFiles(pendingFiles.filter((f) => f.id !== id));
  const updatePair = (id: string, patch: Partial<BatchPair>) =>
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePair = (id: string) =>
    setPairs((prev) => prev.filter((p) => p.id !== id));

  /* ------------------------------------------------------------- process */

  const pendingCount = pairs.filter(
    (p) => p.status === "pending" || p.status === "error",
  ).length;

  const processAll = async () => {
    const targets = pairs.filter(
      (p) => p.status === "pending" || p.status === "error",
    );
    if (targets.length === 0 || processing) return;
    setProcessing(true);
    setProgress({ done: 0, total: targets.length });
    let processed = 0;
    for (const target of targets) {
      updatePair(target.id, { status: "processing", error: null });
      try {
        const [orig, rec] = await Promise.all([
          readImageFile(target.original.file),
          readImageFile(target.result.file),
        ]);
        const analysis = await runFullAnalysis({
          originalSrc: orig.dataUrl,
          reconstructionSrc: rec.dataUrl,
          settings,
          useAi: includeAi && aiConfigured === true,
          onStage: () => {},
        });
        updatePair(target.id, { status: "done", analysis, error: null });
      } catch (error) {
        updatePair(target.id, {
          status: "error",
          error:
            error instanceof Error ? error.message : "Image processing failed.",
        });
      }
      processed++;
      setProgress({ done: processed, total: targets.length });
    }
    setProcessing(false);
    toast.push(`Batch processing finished (${targets.length} pairs).`, "success");
  };

  /* ---------------------------------------------------------------- save */

  const saveAll = async () => {
    const targets = pairs.filter((p) => p.status === "done" && p.analysis && !p.saved);
    if (targets.length === 0 || savingAll) return;
    setSavingAll(true);
    let saved = 0;
    let failed = 0;
    let savedLocally = false;
    for (const target of targets) {
      try {
        const score =
          target.lecturerScore.trim() === ""
            ? null
            : Math.round(Number(target.lecturerScore));
        const res = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: target.studentName,
            nim: target.key,
            className: sharedClass,
            originalOwner: sharedOwner,
            notes: "",
            batchId: batchIdRef.current,
            lecturerScore: score !== null && !Number.isNaN(score) ? score : null,
            analysis: target.analysis,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json().catch(() => null);
        if (data?.persistent === false && data?.evaluation) {
          // No database — keep the record in this browser.
          saveLocalEvaluation(data.evaluation);
          savedLocally = true;
        }
        updatePair(target.id, { saved: true });
        saved++;
      } catch {
        failed++;
      }
    }
    setSavingAll(false);
    if (failed > 0) {
      toast.push(`Saved ${saved} evaluations — ${failed} failed.`, "error");
    } else if (savedLocally) {
      toast.push(
        `Saved ${saved} evaluations in this browser (no database configured).`,
        "success",
      );
    } else {
      toast.push(`Saved ${saved} evaluations to the database.`, "success");
    }
  };

  const exportCsv = () => {
    const done = pairs.filter((p) => p.status === "done" && p.analysis);
    const rows = done.map((p) => [
      p.studentName,
      p.key,
      sharedClass,
      sharedOwner,
      formatScore(p.analysis!.cv.score),
      formatScore(p.analysis!.aiScore),
      formatScore(p.analysis!.finalScore),
      p.lecturerScore,
      "",
    ]);
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
      rows,
    );
    downloadTextFile("batch-evaluations.csv", csv);
  };

  /* --------------------------------------------------------- result list */

  const donePairs = pairs.filter((p) => p.status === "done" && p.analysis);
  const visibleDone = donePairs
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (q && !p.studentName.toLowerCase().includes(q) && !p.key.toLowerCase().includes(q))
        return false;
      const s = p.analysis!.finalScore;
      if (minScore !== "" && s < Number(minScore)) return false;
      if (maxScore !== "" && s > Number(maxScore)) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "student":
          return dir * a.studentName.localeCompare(b.studentName);
        case "cv":
          return dir * (a.analysis!.cv.score - b.analysis!.cv.score);
        case "ai":
          return dir * ((a.analysis!.aiScore ?? -1) - (b.analysis!.aiScore ?? -1));
        default:
          return dir * (a.analysis!.finalScore - b.analysis!.finalScore);
      }
    });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "student" ? "asc" : "desc");
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  /* -------------------------------------------------------------- render */

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Batch"
        title="Batch Evaluation"
        description="Process many student submissions at once. Files that follow the NIM_original / NIM_result naming convention are paired automatically."
      />

      {/* ------------------------------------------------ upload */}
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="batch-class" className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
              Class (applies to all)
            </label>
            <input
              id="batch-class"
              value={sharedClass}
              onChange={(e) => setSharedClass(e.target.value)}
              placeholder="e.g. CG-A"
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
            />
          </div>
          <div>
            <label htmlFor="batch-owner" className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
              Original Emoji Owner (applies to all)
            </label>
            <input
              id="batch-owner"
              value={sharedOwner}
              onChange={(e) => setSharedOwner(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!processing) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={processing}
          className={`mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-all disabled:opacity-50 ${
            dragging
              ? "border-[var(--accent)]/50 bg-[var(--accent)]/6"
              : "border-[var(--line-strong)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/4"
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <CloudUpload className="h-7 w-7" aria-hidden />
          </span>
          <span className="text-center">
            <span className="block text-sm font-semibold text-[var(--ink)]">
              Drop all submission images here
            </span>
            <span className="mt-1 block text-xs text-[var(--ink-soft)]">
              Name files{" "}
              <code className="rounded bg-[var(--paper-2)] px-1.5 py-0.5 font-mono text-[11px]">
                NIM_original.png
              </code>{" "}
              and{" "}
              <code className="rounded bg-[var(--paper-2)] px-1.5 py-0.5 font-mono text-[11px]">
                NIM_result.png
              </code>{" "}
              for automatic pairing — PNG, JPG, JPEG, WEBP
            </span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </section>

      {/* ------------------------------------------------ unmatched files */}
      {pendingFiles.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
            Unmatched Files{" "}
            <span className="font-mono text-sm text-[var(--ink-soft)]">
              ({pendingFiles.length})
            </span>
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            These files could not be paired automatically. Pair them manually or
            remove them.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingFiles.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5"
              >
                <div className="checker flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-[var(--ink)]">{f.name}</p>
                  <p className="text-[10px] text-[var(--ink-soft)]">
                    {f.guessSide ? `looks like “${f.guessSide}”` : "unknown role"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePending(f.id)}
                  className="rounded-lg p-1.5 text-[var(--ink-soft)] transition hover:bg-white hover:text-rose-600"
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {pendingFiles.length >= 2 && (
            <div className="mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3.5">
              <div className="min-w-44 flex-1">
                <label className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                  Original image
                </label>
                <select
                  value={manualOriginal}
                  onChange={(e) => setManualOriginal(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-2 text-xs outline-none"
                >
                  <option value="">Select file…</option>
                  {pendingFiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-44 flex-1">
                <label className="mb-1 block text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
                  Reconstruction image
                </label>
                <select
                  value={manualResult}
                  onChange={(e) => setManualResult(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-2 text-xs outline-none"
                >
                  <option value="">Select file…</option>
                  {pendingFiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={createManualPair}
                disabled={!manualOriginal || !manualResult || manualOriginal === manualResult}
                className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[var(--paper)] transition hover:opacity-85 disabled:opacity-40"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Create pair
              </button>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ pairs */}
      {pairs.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
                Paired Submissions{" "}
                <span className="font-mono text-sm text-[var(--ink-soft)]">
                  ({pairs.length})
                </span>
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Student names can be edited before processing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                <input
                  type="checkbox"
                  checked={includeAi && aiConfigured === true}
                  disabled={processing || aiConfigured === false}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                <span className="flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                  {aiConfigured === false
                    ? "AI not configured — CV only"
                    : "Include AI per pair"}
                </span>
              </label>
              <button
                type="button"
                onClick={processAll}
                disabled={processing || pendingCount === 0}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-50"
              >
                {processing ? <Spinner /> : <Play className="h-4 w-4" aria-hidden />}
                {processing
                  ? `Processing ${progress.done} / ${progress.total}`
                  : `Process ${pendingCount > 0 ? pendingCount : "all"} pair${pendingCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {processing && (
            <div className="mb-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--paper-2)] ring-1 ring-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[var(--ink-soft)]">
                Processing {progress.done} / {progress.total}
              </p>
            </div>
          )}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pairs.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border p-3.5 transition ${
                  p.status === "processing"
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/4"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    value={p.studentName}
                    disabled={processing}
                    onChange={(e) =>
                      updatePair(p.id, { studentName: e.target.value })
                    }
                    className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-[var(--ink)] outline-none transition hover:border-[var(--line-strong)] focus:border-[var(--accent)]/40 focus:bg-white"
                    aria-label="Student name"
                  />
                  <button
                    type="button"
                    onClick={() => removePair(p.id)}
                    disabled={processing}
                    className="rounded-lg p-1.5 text-[var(--ink-soft)] transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    aria-label="Remove pair"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="px-1.5 font-mono text-[10px] text-[var(--ink-soft)]">
                  {p.key}
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="checker flex aspect-square items-center justify-center rounded-lg border border-[var(--line)] p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.original.url} alt="Original" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="checker flex aspect-square items-center justify-center rounded-lg border border-[var(--line)] p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.result.url} alt="Reconstruction" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between px-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                      p.status === "done"
                        ? "bg-emerald-50 text-emerald-700"
                        : p.status === "error"
                          ? "bg-rose-50 text-rose-700"
                          : p.status === "processing"
                            ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "bg-[var(--paper-2)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {p.status === "processing" ? (
                      <span className="flex items-center gap-1.5">
                        <Spinner className="h-3 w-3" /> processing
                      </span>
                    ) : (
                      p.status
                    )}
                  </span>
                  {p.status === "done" && p.analysis && (
                    <span className="font-mono text-sm font-semibold text-[var(--accent)]">
                      {formatScore(p.analysis.finalScore)}
                    </span>
                  )}
                </div>
                {p.error && (
                  <p className="mt-1.5 px-1.5 text-[11px] text-rose-600">{p.error}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------ results table */}
      {donePairs.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
                Batch Results
              </h2>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                {donePairs.length} processed · {donePairs.filter((p) => !p.saved).length} unsaved
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveAll}
                disabled={savingAll || donePairs.every((p) => p.saved)}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {savingAll ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
                Save all to database
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
              >
                <ArrowDownToLine className="h-4 w-4" aria-hidden />
                Export CSV
              </button>
            </div>
          </div>

          {/* filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or NIM…"
                className="w-full rounded-xl border border-[var(--line-strong)] bg-white py-2 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
              />
            </div>
            <span className="text-xs text-[var(--ink-soft)]">Final score</span>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="min"
              className="w-20 rounded-xl border border-[var(--line-strong)] bg-white px-2.5 py-2 text-center font-mono text-sm outline-none"
              aria-label="Minimum final score"
            />
            <span className="text-xs text-[var(--ink-soft)]">–</span>
            <input
              type="number"
              min={0}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="max"
              className="w-20 rounded-xl border border-[var(--line-strong)] bg-white px-2.5 py-2 text-center font-mono text-sm outline-none"
              aria-label="Maximum final score"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--paper-2)]">
                  {(
                    [
                      ["student", "Student"],
                      ["cv", "CV Score"],
                      ["ai", "AI Score"],
                      ["final", "Final Similarity"],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
                      <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 transition hover:text-[var(--ink)]">
                        {label}
                        {sortKey === key && (
                          <span className="font-mono text-[10px]">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
                    Lecturer Score
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDone.map((p) => {
                  const a = p.analysis!;
                  return (
                    <tr key={p.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--accent)]/3">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--ink)]">{p.studentName}</p>
                        <p className="font-mono text-[10px] text-[var(--ink-soft)]">
                          {p.key}
                          {p.saved && (
                            <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">
                              saved
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold">{formatScore(a.cv.score)}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold">{formatScore(a.aiScore)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={a.category} />
                          <span className="font-mono font-semibold text-[var(--accent)]">
                            {formatScore(a.finalScore)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={p.lecturerScore}
                          disabled={p.saved}
                          onChange={(e) => updatePair(p.id, { lecturerScore: e.target.value })}
                          placeholder="0–100"
                          className="w-24 rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-1.5 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25 disabled:bg-[var(--paper-2)]"
                          aria-label={`Lecturer score for ${p.studentName}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setViewing(p)}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleDone.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
                      No processed pairs match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pairs.length === 0 && pendingFiles.length === 0 && (
        <section className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-8 py-12 text-center">
          <p className="font-display text-lg font-semibold text-[var(--ink)]">
            No files yet
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--ink-soft)]">
            Drop the whole submission folder above. Files named{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              2110511042_original.png
            </code>{" "}
            and{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              2110511042_result.png
            </code>{" "}
            will be paired automatically; the rest can be paired manually.
          </p>
        </section>
      )}

      {/* ------------------------------------------------ view modal */}
      {viewing && viewing.analysis && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewing(null)}
        >
          <div
            className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-[var(--paper)] uppercase">
                Batch result detail
              </span>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-xl border border-[var(--line-strong)] bg-white p-2 text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <EvaluationResult
              student={{
                studentName: viewing.studentName,
                nim: viewing.key,
                className: sharedClass,
                originalOwner: sharedOwner,
                notes: "",
              }}
              analysis={viewing.analysis}
              variant="preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
