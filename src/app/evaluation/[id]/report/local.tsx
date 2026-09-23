"use client";

import { ReportDocument } from "@/components/ReportDocument";
import { Spinner } from "@/components/ui";
import { getLocalEvaluation } from "@/lib/local-store";
import type { EvaluationRecord } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function LocalReportView({ id }: { id: string }) {
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setRecord(getLocalEvaluation(id));
    setChecking(false);
  }, [id]);

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-[var(--ink-soft)]">
        <Spinner /> Preparing report…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-[var(--ink-soft)]">
          Evaluation not found on this device.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper)]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <ReportDocument record={record} />;
}
