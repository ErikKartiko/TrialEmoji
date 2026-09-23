"use client";

import { useToast } from "@/components/Toast";
import { SectionHeader, Spinner } from "@/components/ui";
import { DEFAULT_SETTINGS, weightPercent } from "@/lib/defaults";
import { useSettings } from "@/lib/hooks";
import { saveLocalSettings } from "@/lib/local-store";
import type { AppSettings } from "@/lib/types";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

function WeightRow({
  label,
  description,
  value,
  normalized,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  normalized: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[var(--line)] py-3.5 last:border-0">
      <div className="min-w-40 flex-1">
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        {description && (
          <p className="text-[11px] text-[var(--ink-soft)]">{description}</p>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-40 sm:w-56"
        aria-label={`${label} weight`}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
        }
        className="w-20 rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-1.5 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
        aria-label={`${label} weight value`}
      />
      <span className="w-24 text-right font-mono text-[11px] text-[var(--ink-soft)]">
        ≈ {normalized}
      </span>
    </div>
  );
}

function ThresholdRow({
  label,
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--line)] py-3.5 last:border-0">
      <span className="flex min-w-40 flex-1 items-center gap-2.5">
        <span className={`h-3 w-3 rounded-full ${tone}`} />
        <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-40 sm:w-56"
        aria-label={`${label} threshold`}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
        }
        className="w-20 rounded-lg border border-[var(--line-strong)] bg-white px-2.5 py-1.5 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
        aria-label={`${label} threshold value`}
      />
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { settings: loaded, loading } = useSettings();
  const [settings, setSettings] = useState<AppSettings>(loaded);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Settings · Emoji RE Evaluator";
  }, []);

  useEffect(() => {
    if (!loading) setSettings(loaded);
  }, [loading, loaded]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => null);
      if (data?.persistent === false) {
        // No database — remember the configuration in this browser.
        saveLocalSettings(settings);
        toast.push("Settings saved in this browser.", "success");
      } else {
        toast.push("Settings saved.", "success");
      }
    } catch {
      toast.push("Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.push("Defaults restored — save to apply them.", "info");
  };

  const cvWeightsRecord = settings.cvWeights as unknown as Record<string, number>;
  const aiWeightsRecord = settings.aiWeights as unknown as Record<string, number>;
  const finalTotal = settings.finalWeights.cv + settings.finalWeights.ai;
  const finalNormalized = (w: number) =>
    finalTotal > 0 ? `${Math.round((w / finalTotal) * 100)}%` : "0%";

  const thresholdsValid =
    settings.thresholds.veryHigh > settings.thresholds.high &&
    settings.thresholds.high > settings.thresholds.moderate &&
    settings.thresholds.moderate > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Configuration"
        title="Settings"
        description="Tune how the Visual Similarity Score is composed and how categories are labelled. Weights are normalized automatically, so they do not need to sum to 100."
        actions={
          <>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset defaults
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading || !thresholdsValid}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
              Save settings
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-white py-16 text-sm text-[var(--ink-soft)]">
          <Spinner /> Loading settings…
        </div>
      ) : (
        <>
          {/* Final weights */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Similarity Weight
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              How the final Visual Similarity combines the Computer Vision score
              and the AI score. Default: 60% CV + 40% AI.
            </p>
            <div className="mt-4">
              <WeightRow
                label="CV weight"
                description="Objective computer-vision metrics"
                value={settings.finalWeights.cv}
                normalized={finalNormalized(settings.finalWeights.cv)}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    finalWeights: { ...settings.finalWeights, cv: v },
                  })
                }
              />
              <WeightRow
                label="AI weight"
                description="AI vision judgement (when available)"
                value={settings.finalWeights.ai}
                normalized={finalNormalized(settings.finalWeights.ai)}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    finalWeights: { ...settings.finalWeights, ai: v },
                  })
                }
              />
            </div>
          </section>

          {/* CV components */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              CV Components
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Relative contribution of each computer-vision metric to the CV
              Similarity Score.
            </p>
            <div className="mt-4">
              <WeightRow
                label="Structural"
                description="SSIM-based grayscale structure"
                value={settings.cvWeights.structural}
                normalized={`${weightPercent(settings.cvWeights.structural, cvWeightsRecord)}%`}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    cvWeights: { ...settings.cvWeights, structural: v },
                  })
                }
              />
              <WeightRow
                label="Shape"
                description="Edge-map chamfer distance"
                value={settings.cvWeights.shape}
                normalized={`${weightPercent(settings.cvWeights.shape, cvWeightsRecord)}%`}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    cvWeights: { ...settings.cvWeights, shape: v },
                  })
                }
              />
              <WeightRow
                label="Color"
                description="Background-aware color histograms"
                value={settings.cvWeights.color}
                normalized={`${weightPercent(settings.cvWeights.color, cvWeightsRecord)}%`}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    cvWeights: { ...settings.cvWeights, color: v },
                  })
                }
              />
              <WeightRow
                label="Composition"
                description="Spatial ink distribution grid"
                value={settings.cvWeights.composition}
                normalized={`${weightPercent(settings.cvWeights.composition, cvWeightsRecord)}%`}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    cvWeights: { ...settings.cvWeights, composition: v },
                  })
                }
              />
            </div>
          </section>

          {/* AI components */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              AI Components
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Weights applied to the five dimensions judged by the AI vision model.
            </p>
            <div className="mt-4">
              {(
                [
                  ["shape", "Shape", "Primary geometric forms"],
                  ["composition", "Composition", "Component structure & layout"],
                  ["proportion", "Proportion", "Relative sizes of components"],
                  ["color", "Color", "Palette and color placement"],
                  ["detail", "Detail", "Decorative elements and strokes"],
                ] as const
              ).map(([key, label, description]) => (
                <WeightRow
                  key={key}
                  label={label}
                  description={description}
                  value={settings.aiWeights[key]}
                  normalized={`${weightPercent(settings.aiWeights[key], aiWeightsRecord)}%`}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      aiWeights: { ...settings.aiWeights, [key]: v },
                    })
                  }
                />
              ))}
            </div>
          </section>

          {/* Thresholds */}
          <section className="rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-[var(--ink)]">
              Category Thresholds
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Boundaries for the descriptive similarity categories (not academic
              grades). Everything below the Moderate threshold is labelled Low.
            </p>
            <div className="mt-4">
              <ThresholdRow
                label="Very High ≥"
                tone="bg-emerald-500"
                value={settings.thresholds.veryHigh}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, veryHigh: v },
                  })
                }
              />
              <ThresholdRow
                label="High ≥"
                tone="bg-sky-500"
                value={settings.thresholds.high}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, high: v },
                  })
                }
              />
              <ThresholdRow
                label="Moderate ≥"
                tone="bg-amber-500"
                value={settings.thresholds.moderate}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    thresholds: { ...settings.thresholds, moderate: v },
                  })
                }
              />
            </div>
            {!thresholdsValid && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                Thresholds must be strictly ordered: Very High &gt; High &gt;
                Moderate &gt; 0.
              </p>
            )}
          </section>

          {/* Preview strip */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper-2)] p-6">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-soft)] uppercase">
              Preview: score 0–100 mapped to categories
            </p>
            <div className="flex h-3.5 overflow-hidden rounded-full ring-1 ring-[var(--line-strong)]">
              <div className="bg-rose-400" style={{ width: `${settings.thresholds.moderate}%` }} />
              <div
                className="bg-amber-400"
                style={{ width: `${Math.max(0, settings.thresholds.high - settings.thresholds.moderate)}%` }}
              />
              <div
                className="bg-sky-400"
                style={{ width: `${Math.max(0, settings.thresholds.veryHigh - settings.thresholds.high)}%` }}
              />
              <div
                className="bg-emerald-400"
                style={{ width: `${Math.max(0, 100 - settings.thresholds.veryHigh)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--ink-soft)]">
              <span>0</span>
              <span>{settings.thresholds.moderate}</span>
              <span>{settings.thresholds.high}</span>
              <span>{settings.thresholds.veryHigh}</span>
              <span>100</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
