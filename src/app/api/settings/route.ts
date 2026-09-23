import {
  getSettings,
  saveSettings,
  storageIsPersistent,
} from "@/lib/server/repository";
import { mergeSettings } from "@/lib/defaults";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/settings — lecturer-configurable weights & thresholds. */
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings, persistent: storageIsPersistent() });
  } catch {
    return NextResponse.json({
      settings: mergeSettings(null),
      persistent: storageIsPersistent(),
    });
  }
}

/** PUT /api/settings — save updated configuration. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = mergeSettings(body);
    await saveSettings(settings);
    return NextResponse.json({
      ok: true,
      settings,
      persistent: storageIsPersistent(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save settings." },
      { status: 500 },
    );
  }
}
