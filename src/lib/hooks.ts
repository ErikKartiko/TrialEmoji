"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, mergeSettings } from "./defaults";
import { getLocalSettings } from "./local-store";
import type { AppSettings } from "./types";

/** Loads lecturer-configurable settings (falls back to defaults). */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.persistent === false) {
          // No database — browser-stored settings take precedence.
          setSettings(getLocalSettings() ?? mergeSettings(data?.settings));
        } else if (data?.settings) {
          setSettings(mergeSettings(data.settings));
        }
      })
      .catch(() => {
        if (!cancelled) setSettings(getLocalSettings() ?? DEFAULT_SETTINGS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, setSettings, loading };
}

/** Whether an AI vision provider key is configured server-side. */
export function useAiConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-analysis")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setConfigured(Boolean(data?.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return configured;
}
