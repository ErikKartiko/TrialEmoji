import { getEvaluation, getSettings } from "@/lib/server/repository";
import { LocalEvaluationView } from "./local";

export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Server-side storage (PostgreSQL or in-memory) is tried first.
  const record = await getEvaluation(id).catch(() => null);
  if (record) {
    const settings = await getSettings().catch(() => null);
    return (
      <LocalEvaluationView id={id} serverRecord={record} serverSettings={settings} />
    );
  }
  // Without a database the record may live in the browser's localStorage —
  // the client component below resolves it there.
  return <LocalEvaluationView id={id} serverRecord={null} serverSettings={null} />;
}
