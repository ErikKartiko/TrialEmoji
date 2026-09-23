"use client";

import { CATEGORY_META } from "@/lib/defaults";
import type { CategoryKey } from "@/lib/types";
import { Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function CategoryBadge({ category }: { category: CategoryKey }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.moderate;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.bar}`} />
      {meta.short}
    </span>
  );
}

export function SectionHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--ink-soft)] uppercase">
            {kicker}
          </p>
        )}
        <h2 className="font-display mt-1 text-2xl font-semibold text-[var(--ink)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DisclaimerNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-4 py-3 ${className}`}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
      <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
        <span className="font-semibold text-[var(--ink)]">
          Assessment aid, not a grade.
        </span>{" "}
        Visual similarity is an automated estimate and should be used as an
        assessment aid. A high similarity score does not prove copying, and a
        low similarity score does not necessarily indicate poor programming
        ability.
      </p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--accent)] shadow-sm">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold text-[var(--ink)]">{title}</p>
      <div className="max-w-md text-sm text-[var(--ink-soft)]">{children}</div>
    </div>
  );
}

export function ScoreChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-2 ${
        tone === "accent"
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/8"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">
        {label}
      </p>
      <p
        className={`font-mono text-base font-semibold ${
          tone === "accent" ? "text-[var(--accent)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
