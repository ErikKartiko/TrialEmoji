import {
  EVALUATION_CSV_HEADERS,
  evaluationToCsvRow,
  toCsv,
} from "@/lib/export";
import { listEvaluations } from "@/lib/server/repository";

export const dynamic = "force-dynamic";

/** GET /api/export — CSV of all evaluations (works with or without a DB). */
export async function GET() {
  try {
    const records = await listEvaluations();
    const csv = toCsv(EVALUATION_CSV_HEADERS, records.map(evaluationToCsvRow));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="emoji-evaluations.csv"',
      },
    });
  } catch {
    return Response.json(
      { error: "Could not export evaluations." },
      { status: 500 },
    );
  }
}
