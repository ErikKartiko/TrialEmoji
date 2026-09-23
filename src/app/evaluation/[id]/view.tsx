"use client";

import { EvaluationResult } from "@/components/EvaluationResult";
import { analysisFromRecord } from "@/lib/bundle";
import type { AppSettings, EvaluationRecord } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function EvaluationDetailView({
  record,
  settings,
}: {
  record: EvaluationRecord;
  settings: AppSettings;
}) {
  const analysis = analysisFromRecord(record, settings);
  return (
    <div className="rise-in space-y-4">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-2)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
      </div>
      <EvaluationResult
        student={{
          studentName: record.studentName,
          nim: record.nim,
          className: record.className,
          originalOwner: record.originalOwner,
          notes: record.notes,
        }}
        analysis={analysis}
        variant="persisted"
        evaluationId={record.id}
        createdAt={record.createdAt}
        initialLecturer={{
          score: record.lecturerScore === null ? "" : String(record.lecturerScore),
          notes: record.lecturerNotes,
        }}
      />
    </div>
  );
}
