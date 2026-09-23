"use client";

import { Columns2, Flame, Layers } from "lucide-react";
import { useState } from "react";

type Mode = "side" | "overlay" | "diff";

const MODES: { key: Mode; label: string; icon: typeof Columns2 }[] = [
  { key: "side", label: "Side by Side", icon: Columns2 },
  { key: "overlay", label: "Overlay", icon: Layers },
  { key: "diff", label: "Difference Map", icon: Flame },
];

function PanelImage({
  src,
  alt,
  tag,
  tagClass,
}: {
  src: string;
  alt: string;
  tag: string;
  tagClass: string;
}) {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="checker flex aspect-square items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>
      <figcaption
        className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.16em] uppercase shadow-sm ${tagClass}`}
      >
        {tag}
      </figcaption>
    </figure>
  );
}

export function ImageComparison({
  original,
  reconstruction,
  diff,
}: {
  original: string;
  reconstruction: string;
  diff?: string | null;
}) {
  const [mode, setMode] = useState<Mode>("side");
  const [opacity, setOpacity] = useState(55);

  return (
    <div>
      <div
        className="mb-4 inline-flex rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-1"
        role="tablist"
        aria-label="Comparison mode"
      >
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              mode === key
                ? "bg-[var(--ink)] text-[var(--paper)] shadow-sm"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {mode === "side" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PanelImage
            src={original}
            alt="Original emoji"
            tag="Original Emoji"
            tagClass="bg-[var(--ink)] text-white"
          />
          <PanelImage
            src={reconstruction}
            alt="PyCairo reconstruction"
            tag="PyCairo Result"
            tagClass="bg-emerald-600 text-white"
          />
        </div>
      )}

      {mode === "overlay" && (
        <div>
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-xl border border-[var(--line)]">
            <div className="checker relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={original}
                alt="Original emoji"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reconstruction}
                alt="PyCairo reconstruction overlay"
                className="absolute inset-0 h-full w-full object-contain transition-opacity duration-150"
                style={{ opacity: opacity / 100 }}
                draggable={false}
              />
            </div>
            <span className="absolute top-3 left-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-white uppercase shadow-sm">
              Original
            </span>
            <span className="absolute top-3 right-3 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-white uppercase shadow-sm">
              Reconstruction {opacity}%
            </span>
          </div>
          <div className="mx-auto mt-4 flex max-w-xl items-center gap-3">
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">0%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="slider flex-1"
              aria-label="Reconstruction opacity"
            />
            <span className="font-mono text-[11px] text-[var(--ink-soft)]">100%</span>
          </div>
        </div>
      )}

      {mode === "diff" && (
        <div>
          {diff ? (
            <>
              <div className="relative mx-auto max-w-xl overflow-hidden rounded-xl border border-[var(--line)]">
                <div className="checker flex aspect-square items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={diff}
                    alt="Difference map between original and reconstruction"
                    className="max-h-full max-w-full object-contain"
                    draggable={false}
                  />
                </div>
                <span className="absolute top-3 left-3 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-white uppercase shadow-sm">
                  Difference Map
                </span>
              </div>
              <div className="mx-auto mt-4 max-w-xl">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-white via-amber-300 to-rose-600 ring-1 ring-[var(--line)]" />
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--ink-soft)]">
                  <span>identical</span>
                  <span>slight difference</span>
                  <span>strong difference</span>
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-2)] px-6 py-10 text-center text-sm text-[var(--ink-soft)]">
              No difference map is available for this evaluation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
