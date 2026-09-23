import { sql } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Evaluations — one row per (original emoji, PyCairo reconstruction) pair.
 * Images are stored as downscaled data URLs so the report view works without
 * external storage. Kept separate from any future "students" table.
 */
export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Student information
  studentName: text("student_name").notNull().default(""),
  nim: text("nim").notNull().default(""),
  className: text("class_name").notNull().default(""),
  originalOwner: text("original_owner").notNull().default(""),
  notes: text("notes").notNull().default(""),
  batchId: text("batch_id"),

  // Computer vision metrics (0-100)
  cvStructural: doublePrecision("cv_structural").notNull().default(0),
  cvShape: doublePrecision("cv_shape").notNull().default(0),
  cvColor: doublePrecision("cv_color").notNull().default(0),
  cvComposition: doublePrecision("cv_composition").notNull().default(0),
  cvScore: doublePrecision("cv_score").notNull().default(0),

  // AI vision metrics (0-100), nullable when AI was unavailable
  aiStatus: text("ai_status").notNull().default("unavailable"),
  aiShape: doublePrecision("ai_shape"),
  aiComposition: doublePrecision("ai_composition"),
  aiProportion: doublePrecision("ai_proportion"),
  aiColor: doublePrecision("ai_color"),
  aiDetail: doublePrecision("ai_detail"),
  aiOverall: doublePrecision("ai_overall"),
  aiScore: doublePrecision("ai_score"),
  aiSimilarities: jsonb("ai_similarities")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  aiDifferences: jsonb("ai_differences")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  aiExplanation: text("ai_explanation").notNull().default(""),

  // Combined score + descriptive category
  finalScore: doublePrecision("final_score").notNull().default(0),
  category: text("category").notNull().default("moderate"),
  weightsSnapshot: jsonb("weights_snapshot").$type<Record<string, unknown>>(),

  // Manual lecturer assessment (kept separate from automated result)
  lecturerScore: integer("lecturer_score"),
  lecturerNotes: text("lecturer_notes").notNull().default(""),

  // Stored images (downscaled data URLs)
  originalImage: text("original_image").notNull().default(""),
  reconstructionImage: text("reconstruction_image").notNull().default(""),
  diffImage: text("diff_image").notNull().default(""),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EvaluationRow = typeof evaluations.$inferSelect;

/**
 * Application settings (single row with id = "default").
 * Stores similarity weights, component weights and category thresholds.
 */
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("default"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
