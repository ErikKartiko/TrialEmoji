import { db } from "@/db";
import { appSettings, evaluations as evaluationsTable } from "@/db/schema";
import { mergeSettings } from "@/lib/defaults";
import { serializeEvaluation } from "@/lib/serialize";
import type { EvaluationRecord } from "@/lib/types";
import { eq } from "drizzle-orm";
import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { EvaluationDetailView } from "./view";

export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let record: EvaluationRecord | null = null;
  let settings = mergeSettings(null);
  try {
    const [row] = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.id, id))
      .limit(1);
    if (row) record = serializeEvaluation(row);
    const [settingsRow] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, "default"))
      .limit(1);
    if (settingsRow) settings = mergeSettings(settingsRow.data);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--ink-soft)] shadow-sm">
          <FileQuestion className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">
          Evaluation not found
        </h1>
        <p className="text-sm text-[var(--ink-soft)]">
          It may have been deleted, or the link is incorrect.
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

  return <EvaluationDetailView record={record} settings={settings} />;
}
