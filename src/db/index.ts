import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The database is OPTIONAL.
 *
 * - When DATABASE_URL is set, a lazily-created Drizzle/PostgreSQL client is
 *   used for persistent storage.
 * - When it is missing, getDb() returns null and callers fall back to an
 *   in-memory store (see src/lib/server/repository.ts).
 *
 * Nothing connects or throws at module import time, so `next build` works
 * with or without a database (e.g. on Vercel without DATABASE_URL).
 */
const globalForDb = globalThis as typeof globalThis & {
  __emojiRePool?: Pool;
  __emojiReDb?: NodePgDatabase | null;
};

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === "string" && url.trim() !== "";
}

/** Lazily creates (and caches) the Drizzle client. Returns null when no DB. */
export function getDb(): NodePgDatabase | null {
  if (!isDatabaseConfigured()) return null;
  if (globalForDb.__emojiReDb === undefined) {
    try {
      const pool =
        globalForDb.__emojiRePool ??
        new Pool({ connectionString: process.env.DATABASE_URL });
      globalForDb.__emojiRePool = pool;
      globalForDb.__emojiReDb = drizzle(pool);
    } catch {
      globalForDb.__emojiReDb = null;
    }
  }
  return globalForDb.__emojiReDb ?? null;
}
