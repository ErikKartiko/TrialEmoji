/**
 * Dual-mode server-side persistence.
 *
 * - PostgreSQL (via Drizzle) when DATABASE_URL is configured.
 * - An in-memory store (per server instance) otherwise — enough for the MVP
 *   so every API route keeps working on platforms without a database.
 *
 * All functions are only called at request time, never during `next build`.
 * To switch to Supabase/PostgreSQL later, only this module needs changes.
 */
import { getDb, isDatabaseConfigured } from "@/db";
import { appSettings, evaluations } from "@/db/schema";
import { mergeSettings } from "@/lib/defaults";
import { serializeEvaluation } from "@/lib/serialize";
import type { AppSettings, EvaluationRecord } from "@/lib/types";
import type { sanitizeEvaluationPayload } from "@/lib/validation";
import { desc, eq, sql } from "drizzle-orm";

type EvaluationInsert = ReturnType<typeof sanitizeEvaluationPayload>;

/* ------------------------------------------------------------ memory store */

interface MemoryStore {
  evaluations: Map<string, EvaluationRecord>;
  settings: AppSettings | null;
}

const globalForMemory = globalThis as typeof globalThis & {
  __emojiReMemory?: MemoryStore;
};

function memory(): MemoryStore {
  globalForMemory.__emojiReMemory ??= {
    evaluations: new Map(),
    settings: null,
  };
  return globalForMemory.__emojiReMemory;
}

/* ------------------------------------------------------------------- API */

export function storageIsPersistent(): boolean {
  return isDatabaseConfigured();
}

export async function listEvaluations(): Promise<EvaluationRecord[]> {
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(evaluations)
        .orderBy(desc(evaluations.createdAt));
      return rows.map(serializeEvaluation);
    } catch {
      // Fall through to memory if the database is unreachable.
    }
  }
  return [...memory().evaluations.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createEvaluation(
  payload: EvaluationInsert,
): Promise<EvaluationRecord> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db.insert(evaluations).values(payload).returning();
      return serializeEvaluation(row);
    } catch {
      // Fall through to memory storage.
    }
  }
  const record: EvaluationRecord = {
    ...payload,
    id: crypto.randomUUID(),
    category: payload.category,
    aiStatus: payload.aiStatus,
    createdAt: new Date().toISOString(),
  };
  memory().evaluations.set(record.id, record);
  return record;
}

export async function getEvaluation(
  id: string,
): Promise<EvaluationRecord | null> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.id, id))
        .limit(1);
      if (row) return serializeEvaluation(row);
    } catch {
      // Fall through to memory.
    }
  }
  return memory().evaluations.get(id) ?? null;
}

export async function updateLecturerAssessment(
  id: string,
  patch: { lecturerScore: number | null; lecturerNotes: string },
): Promise<EvaluationRecord | null> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db
        .update(evaluations)
        .set(patch)
        .where(eq(evaluations.id, id))
        .returning();
      if (row) return serializeEvaluation(row);
    } catch {
      // Fall through to memory.
    }
  }
  const existing = memory().evaluations.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  memory().evaluations.set(id, updated);
  return updated;
}

export async function deleteEvaluation(id: string): Promise<boolean> {
  const db = getDb();
  if (db) {
    try {
      const deleted = await db
        .delete(evaluations)
        .where(eq(evaluations.id, id))
        .returning({ id: evaluations.id });
      if (deleted.length > 0) return true;
    } catch {
      // Fall through to memory.
    }
  }
  return memory().evaluations.delete(id);
}

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.id, "default"))
        .limit(1);
      if (row) return mergeSettings(row.data);
    } catch {
      // Fall through to memory/defaults.
    }
  }
  return mergeSettings(memory().settings);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = getDb();
  if (db) {
    try {
      await db
        .insert(appSettings)
        .values({
          id: "default",
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
      return;
    } catch {
      // Fall through to memory.
    }
  }
  memory().settings = settings;
}
