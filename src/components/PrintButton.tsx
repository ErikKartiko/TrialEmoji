"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--paper)] shadow-xl transition hover:opacity-85"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Print / Save PDF
    </button>
  );
}
