import { db } from "@/db";
import { evaluations } from "@/db/schema";
import { serializeEvaluation } from "@/lib/serialize";
import {
  EVALUATION_CSV_HEADERS,
  evaluationToCsvRow,
  toCsv,
} from "@/lib/export";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET /api/export — CSV of all evaluations. */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(evaluations)
      .orderBy(desc(evaluations.createdAt));
    const csv = toCsv(
      EVALUATION_CSV_HEADERS,
      rows.map((row) => evaluationToCsvRow(serializeEvaluation(row))),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="emoji-evaluations.csv"',
      },
    });
  } catch {
    return Response.json({ error: "Could not export evaluations." }, { status: 500 });
  }
}
