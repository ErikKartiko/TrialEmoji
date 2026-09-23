"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  push: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden />,
  info: <Info className="h-4 w-4 text-[var(--accent)]" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 shadow-[0_12px_32px_-12px_rgba(26,25,20,0.35)]"
          >
            <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
            <p className="flex-1 text-sm leading-snug text-[var(--ink)]">
              {toast.message}
            </p>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="shrink-0 rounded-md p-1 text-[var(--ink-soft)] transition hover:bg-[var(--paper-2)]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
