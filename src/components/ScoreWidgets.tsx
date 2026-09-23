"use client";

import { CATEGORY_META, formatScore, getCategory } from "@/lib/defaults";
import type { AppSettings, CategoryKey } from "@/lib/types";
import { useEffect, useState } from "react";

/** Circular score gauge with animated ring. */
export function ScoreGauge({
  score,
  thresholds,
  size = 180,
}: {
  score: number;
  thresholds?: AppSettings["thresholds"];
  size?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(score * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const category: CategoryKey = getCategory(score, thresholds);
  const color = CATEGORY_META[category].ring;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, display / 100));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-4xl font-semibold tracking-tight"
          style={{ color }}
        >
          {display.toFixed(1)}
        </span>
        <span className="font-mono text-xs text-[var(--ink-soft)]">/ 100</span>
      </div>
    </div>
  );
}

/** Horizontal metric bar used inside breakdown sections. */
export function MetricBar({
  label,
  value,
  weight,
  tone = "accent",
}: {
  label: string;
  value: number | null;
  weight?: string;
  tone?: "accent" | "violet";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[var(--ink)]">
          {label}
          {weight && (
            <span className="ml-2 font-mono text-[10px] font-normal text-[var(--ink-soft)]">
              {weight}
            </span>
          )}
        </span>
        <span className="font-mono text-sm font-semibold text-[var(--ink)]">
          {value === null ? "—" : `${formatScore(value)}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--paper-2)] ring-1 ring-[var(--line)]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            tone === "accent" ? "bg-[var(--accent)]" : "bg-violet-500"
          }`}
          style={{ width: `${value === null ? 0 : Math.max(2, value)}%` }}
        />
      </div>
    </div>
  );
}

/** Small stat card used on the dashboard. */
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--ink-soft)] uppercase">
        {label}
      </p>
      <p className="font-mono mt-1.5 text-2xl font-semibold text-[var(--ink)]">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{sub}</p>}
    </div>
  );
}

/** Category distribution chart (CSS-only bars). */
export function DistributionChart({
  counts,
  total,
}: {
  counts: Record<CategoryKey, number>;
  total: number;
}) {
  const order: CategoryKey[] = ["very-high", "high", "moderate", "low"];
  return (
    <div className="space-y-3">
      {order.map((key) => {
        const count = counts[key];
        const pct = total > 0 ? (count / total) * 100 : 0;
        const meta = CATEGORY_META[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium text-[var(--ink-soft)]">
              {meta.short}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-md bg-[var(--paper-2)] ring-1 ring-[var(--line)]">
              <div
                className={`h-full rounded-md transition-[width] duration-700 ${meta.bar}`}
                style={{ width: `${Math.max(count > 0 ? 3 : 0, pct)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-[var(--ink)]">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
