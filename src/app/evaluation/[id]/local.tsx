"use client";

import { EvaluationResult } from "@/components/EvaluationResult";
import { Spinner } from "@/components/ui";
import { analysisFromRecord } from "@/lib/bundle";
import { useSettings } from "@/lib/hooks";
import { getLocalEvaluation } from "@/lib/local-store";
import type { AppSettings, EvaluationRecord } from "@/lib/types";
import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function NotFoundPanel() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--ink-soft)] shadow-sm">
        <FileQuestion className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">
        Evaluation not found
      </h1>
      <p className="max-w-md text-sm text-[var(--ink-soft)]">
        It may have been deleted, or it is stored in a different browser (in
        browser-storage mode, evaluations never leave the device they were
        created on).
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper)] transition hover:opacity-85"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export function LocalEvaluationView({
  id,
  serverRecord,
  serverSettings,
}: {
  id: string;
  serverRecord: EvaluationRecord | null;
  serverSettings: AppSettings | null;
}) {
  const { settings: hookSettings } = useSettings();
  const [record, setRecord] = useState<EvaluationRecord | null>(serverRecord);
  const [persistence, setPersistence] = useState<"server" | "local">(
    serverRecord ? "server" : "local",
  );
  const [checking, setChecking] = useState(serverRecord === null);

  useEffect(() => {
    if (serverRecord) return;
    const local = getLocalEvaluation(id);
    setRecord(local);
    setPersistence("local");
    setChecking(false);
  }, [id, serverRecord]);

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-[var(--ink-soft)]">
        <Spinner /> Loading evaluation…
      </div>
    );
  }

  if (!record) return <NotFoundPanel />;

  const settings = serverSettings ?? hookSettings;
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
        persistence={persistence}
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
