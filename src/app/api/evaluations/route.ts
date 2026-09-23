import {
  createEvaluation,
  listEvaluations,
  storageIsPersistent,
} from "@/lib/server/repository";
import { sanitizeEvaluationPayload } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/evaluations
 * Works with or without a database. `persistent` tells the client whether
 * results are stored server-side (DATABASE_URL configured) or not.
 */
export async function GET() {
  try {
    const records = await listEvaluations();
    return NextResponse.json({
      evaluations: records,
      persistent: storageIsPersistent(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load evaluations.", persistent: storageIsPersistent() },
      { status: 500 },
    );
  }
}

/** POST /api/evaluations — persist a completed analysis. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sanitizeEvaluationPayload(body);
    const record = await createEvaluation(payload);
    return NextResponse.json(
      { evaluation: record, persistent: storageIsPersistent() },
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
