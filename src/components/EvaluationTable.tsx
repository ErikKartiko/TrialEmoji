"use client";

import { formatScore } from "@/lib/defaults";
import type { CategoryKey, EvaluationRecord } from "@/lib/types";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryBadge } from "./ui";

type SortKey = "student" | "cv" | "ai" | "final" | "date";

const HEADERS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: "student", label: "Student" },
  { key: null, label: "Original", className: "hidden lg:table-cell" },
  { key: null, label: "Reconstruction", className: "hidden lg:table-cell" },
  { key: "cv", label: "CV Score", className: "text-right" },
  { key: "ai", label: "AI Score", className: "text-right hidden sm:table-cell" },
  { key: "final", label: "Final Similarity", className: "text-right" },
];

function Thumb({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return (
      <div className="checker h-11 w-11 rounded-lg border border-[var(--line)]" />
    );
  }
  return (
    <div className="checker flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

export function EvaluationTable({
  evaluations,
}: {
  evaluations: EvaluationRecord[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | CategoryKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = evaluations.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.studentName.toLowerCase().includes(q) ||
        e.nim.toLowerCase().includes(q) ||
        e.className.toLowerCase().includes(q) ||
        e.originalOwner.toLowerCase().includes(q)
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "student":
          return dir * a.studentName.localeCompare(b.studentName);
        case "cv":
          return dir * (a.cvScore - b.cvScore);
        case "ai":
          return dir * ((a.aiScore ?? -1) - (b.aiScore ?? -1));
        case "final":
          return dir * (a.finalScore - b.finalScore);
        default:
          return dir * a.createdAt.localeCompare(b.createdAt);
      }
    });
    return list;
  }, [evaluations, query, category, sortKey, sortDir]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, NIM, class or owner…"
            className="w-full rounded-xl border border-[var(--line-strong)] bg-white py-2.5 pr-3 pl-9 text-sm text-[var(--ink)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/25"
            aria-label="Search evaluations"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "all" | CategoryKey)}
          className="rounded-xl border border-[var(--line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/25"
          aria-label="Filter by similarity category"
        >
          <option value="all">All categories</option>
          <option value="very-high">Very High</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--paper-2)]">
              {HEADERS.map(({ key, label, className }) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase ${className ?? ""}`}
                >
                  {key ? (
                    <button
                      onClick={() => toggleSort(key)}
                      className={`inline-flex items-center gap-1.5 transition hover:text-[var(--ink)] ${
                        (className ?? "").includes("text-right") ? "flex-row-reverse" : ""
                      }`}
                    >
                      {label}
                      {sortKey === key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr
                key={e.id}
                onClick={() => router.push(`/evaluation/${e.id}`)}
                className="cursor-pointer border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--accent)]/4"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--ink)]">
                    {e.studentName || "—"}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--ink-soft)]">
                    {e.nim || "no NIM"} · {e.className || "—"}
                  </p>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <Thumb src={e.originalImage} alt="Original emoji" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <Thumb src={e.reconstructionImage} alt="PyCairo reconstruction" />
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--ink)]">
                  {formatScore(e.cvScore)}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono font-semibold text-[var(--ink)] sm:table-cell">
                  {formatScore(e.aiScore)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2.5">
                    <CategoryBadge category={e.category} />
                    <span className="font-mono font-semibold text-[var(--accent)]">
                      {formatScore(e.finalScore)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-[var(--ink-soft)]"
                >
                  No evaluations match the current search and filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
