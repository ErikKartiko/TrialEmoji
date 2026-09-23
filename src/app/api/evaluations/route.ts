import { db } from "@/db";
import { evaluations } from "@/db/schema";
import { serializeEvaluation } from "@/lib/serialize";
import { sanitizeEvaluationPayload } from "@/lib/validation";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/evaluations — list all evaluations (newest first). */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(evaluations)
      .orderBy(desc(evaluations.createdAt));
    return NextResponse.json({
      evaluations: rows.map(serializeEvaluation),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load evaluations." },
      { status: 500 },
    );
  }
}

/** POST /api/evaluations — persist a completed analysis. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sanitizeEvaluationPayload(body);
    const [row] = await db.insert(evaluations).values(payload).returning();
    return NextResponse.json(
      { evaluation: serializeEvaluation(row) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("payload")
        ? error.message
        : "Could not save the evaluation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
