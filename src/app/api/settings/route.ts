import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { mergeSettings } from "@/lib/defaults";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SETTINGS_ID = "default";

/** GET /api/settings — lecturer-configurable weights & thresholds. */
export async function GET() {
  try {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, SETTINGS_ID))
      .limit(1);
    return NextResponse.json({ settings: mergeSettings(row?.data) });
  } catch {
    // Table may not exist yet on first boot — serve defaults.
    return NextResponse.json({ settings: mergeSettings(null) });
  }
}

/** PUT /api/settings — save updated configuration. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = mergeSettings(body);
    await db
      .insert(appSettings)
      .values({
        id: SETTINGS_ID,
        data: settings as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: {
          data: settings as unknown as Record<string, unknown>,
          updatedAt: sql`now()`,
        },
      });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json(
      { error: "Could not save settings." },
      { status: 500 },
    );
  }
}
