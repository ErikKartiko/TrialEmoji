"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Spinner } from "./ui";
import { useToast } from "./Toast";

export interface LecturerAssessmentValue {
  score: string;
  notes: string;
}

interface LecturerAssessmentProps {
  value: LecturerAssessmentValue;
  onChange: (value: LecturerAssessmentValue) => void;
  /** When provided, the form saves directly via PATCH. */
  evaluationId?: string | null;
  /** Custom persistence handler (e.g. browser localStorage). Overrides PATCH. */
  onSaveCustom?: (value: LecturerAssessmentValue) => Promise<boolean>;
  disabled?: boolean;
}

export function LecturerAssessment({
  value,
  onChange,
  evaluationId,
  onSaveCustom,
  disabled,
}: LecturerAssessmentProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const numericScore = value.score.trim() === "" ? null : Number(value.score);
  const scoreInvalid =
    numericScore !== null &&
    (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100);
  const canSave = Boolean(evaluationId) || Boolean(onSaveCustom);

  const save = async () => {
    if (scoreInvalid || !canSave) return;
    setSaving(true);
    if (onSaveCustom) {
      try {
        const ok = await onSaveCustom(value);
        if (!ok) throw new Error();
        toast.push("Lecturer assessment saved.", "success");
      } catch {
        toast.push("Could not save the lecturer assessment.", "error");
      } finally {
        setSaving(false);
      }
      return;
    }
    try {
      if (!evaluationId) throw new Error();
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturerScore:
            numericScore === null || Number.isNaN(numericScore)
              ? null
              : Math.round(numericScore),
          lecturerNotes: value.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.push("Lecturer assessment saved.", "success");
    } catch {
      toast.push("Could not save the lecturer assessment.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
      <div>
        <label
          htmlFor="lecturer-score"
          className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase"
        >
          Lecturer Score
        </label>
        <div className="relative">
          <input
            id="lecturer-score"
            type="number"
            min={0}
            max={100}
            value={value.score}
            disabled={disabled || saving}
            onChange={(e) => onChange({ ...value, score: e.target.value })}
            placeholder="0 – 100"
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-sm text-[var(--ink)] outline-none transition focus:ring-2 ${
              scoreInvalid
                ? "border-rose-400 focus:ring-rose-200"
                : "border-[var(--line-strong)] focus:ring-[var(--accent)]/25"
            }`}
          />
          {scoreInvalid && (
            <p className="mt-1 text-[11px] text-rose-600">
              Score must be between 0 and 100.
            </p>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-soft)]">
          Manual assessment — kept separate from the automated score.
        </p>
      </div>

      <div>
        <label
          htmlFor="lecturer-notes"
          className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-[var(--ink)] uppercase"
        >
          Lecturer Notes
        </label>
        <textarea
          id="lecturer-notes"
          rows={4}
          value={value.notes}
          disabled={disabled || saving}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Observations about structure, geometry usage, effort, deviations…"
          className="w-full resize-y rounded-xl border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:ring-2 focus:ring-[var(--accent)]/25"
        />
        {canSave && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || scoreInvalid || disabled}
              className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition hover:opacity-85 disabled:opacity-50"
            >
              {saving ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
              Save assessment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
