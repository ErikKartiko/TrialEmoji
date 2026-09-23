import {
  deleteEvaluation,
  getEvaluation,
  storageIsPersistent,
  updateLecturerAssessment,
} from "@/lib/server/repository";
import { sanitizeLecturerAssessment } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/evaluations/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await getEvaluation(id);
    if (!record) {
      return NextResponse.json(
        { error: "Evaluation not found.", persistent: storageIsPersistent() },
        { status: 404 },
      );
    }
    return NextResponse.json({
      evaluation: record,
      persistent: storageIsPersistent(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load the evaluation." },
      { status: 500 },
    );
  }
}

/** PATCH /api/evaluations/:id — save the manual lecturer assessment. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const patch = sanitizeLecturerAssessment(body);
    const record = await updateLecturerAssessment(id, patch);
    if (!record) {
      return NextResponse.json(
        { error: "Evaluation not found.", persistent: storageIsPersistent() },
        { status: 404 },
      );
    }
    return NextResponse.json({
      evaluation: record,
      persistent: storageIsPersistent(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save the lecturer assessment." },
      { status: 500 },
    );
  }
}

/** DELETE /api/evaluations/:id */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const ok = await deleteEvaluation(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Evaluation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete the evaluation." },
      { status: 500 },
    );
  }
}
