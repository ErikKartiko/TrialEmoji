import { db } from "@/db";
import { evaluations } from "@/db/schema";
import { serializeEvaluation } from "@/lib/serialize";
import { sanitizeLecturerAssessment } from "@/lib/validation";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/evaluations/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [row] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.id, id))
      .limit(1);
    if (!row) {
      return NextResponse.json(
        { error: "Evaluation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ evaluation: serializeEvaluation(row) });
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
    const { lecturerScore, lecturerNotes } = sanitizeLecturerAssessment(body);
    const [row] = await db
      .update(evaluations)
      .set({ lecturerScore, lecturerNotes })
      .where(eq(evaluations.id, id))
      .returning();
    if (!row) {
      return NextResponse.json(
        { error: "Evaluation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ evaluation: serializeEvaluation(row) });
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
    const deleted = await db
      .delete(evaluations)
      .where(eq(evaluations.id, id))
      .returning({ id: evaluations.id });
    if (deleted.length === 0) {
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
