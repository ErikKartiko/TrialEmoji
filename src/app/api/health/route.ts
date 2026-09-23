import { getDb, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    // Database intentionally disabled — the app runs in local/session mode.
    return Response.json({ ok: true, database: "disabled" });
  }
  const db = getDb();
  if (!db) {
    return Response.json({ ok: true, database: "disabled" });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "error" }, { status: 500 });
  }
}
