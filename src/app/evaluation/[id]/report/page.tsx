import { PrintButton } from "@/components/PrintButton";
import { db } from "@/db";
import { evaluations as evaluationsTable } from "@/db/schema";
import { CATEGORY_META, DISCLAIMER, formatScore } from "@/lib/defaults";
import { serializeEvaluation } from "@/lib/serialize";
import type { EvaluationRecord } from "@/lib/types";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        background: "#efece2",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.max(2, value)}%`,
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

function ReportImage({
  src,
  caption,
}: {
  src: string;
  caption: string;
}) {
  return (
    <figure style={{ textAlign: "center" }}>
      <div
        style={{
          border: "1px solid #e4dfd3",
          borderRadius: 12,
          padding: 8,
          background: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption}
          style={{ width: "100%", maxWidth: 240, margin: "0 auto" }}
        />
      </div>
      <figcaption
        style={{
          marginTop: 6,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6d675a",
          fontWeight: 700,
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let record: EvaluationRecord | null = null;
  try {
    const [row] = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.id, id))
      .limit(1);
    if (row) record = serializeEvaluation(row);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-[var(--ink-soft)]">Evaluation not found.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper)]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const e = record;
  const meta = CATEGORY_META[e.category];
  const hasAi =
    e.aiStatus === "ok" && e.aiScore !== null && e.aiShape !== null;

  const sectionTitle: React.CSSProperties = {
    fontFamily: "Fraunces, Georgia, serif",
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 10,
    color: "#1c1a15",
  };
  const box: React.CSSProperties = {
    border: "1px solid #e4dfd3",
    borderRadius: 14,
    padding: 18,
    background: "#fff",
    marginBottom: 16,
  };

  return (
    <div className="rise-in mx-auto max-w-3xl">
      <PrintButton />

      <div className="no-print mb-4">
        <Link
          href={`/evaluation/${e.id}`}
          className="text-sm font-semibold text-[var(--accent)] underline underline-offset-2"
        >
          ← Back to evaluation
        </Link>
      </div>

      {/* header */}
      <div style={{ ...box, display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#4f46e5", fontWeight: 700 }}>
            Computer Graphics · Assessment Aid
          </p>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 24, fontWeight: 600, color: "#1c1a15", marginTop: 4 }}>
            Emoji Reconstruction — Evaluation Report
          </h1>
          <p style={{ fontSize: 11, color: "#6d675a", marginTop: 4 }}>
            Generated {new Date().toLocaleString()} · Report ID {e.id.slice(0, 8)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6d675a", fontWeight: 700 }}>
            Visual Similarity
          </p>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 34, fontWeight: 600, color: meta.ring }}>
            {formatScore(e.finalScore)}
            <span style={{ fontSize: 14, color: "#6d675a" }}> / 100</span>
          </p>
          <p style={{ fontSize: 11, fontWeight: 700, color: meta.ring }}>
            {meta.label}
          </p>
        </div>
      </div>

      {/* student info */}
      <div style={box}>
        <h2 style={sectionTitle}>Student Information</h2>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Student Name", e.studentName || "—"],
              ["NIM / Student ID", e.nim || "—"],
              ["Class", e.className || "—"],
              ["Original Emoji Owner", e.originalOwner || "—"],
              ["Evaluated", new Date(e.createdAt).toLocaleString()],
              ...(e.notes ? [["Notes", e.notes]] : []),
            ].map(([k, v]) => (
              <tr key={k as string} style={{ borderTop: "1px solid #efece2" }}>
                <td style={{ padding: "7px 0", color: "#6d675a", width: 190 }}>{k}</td>
                <td style={{ padding: "7px 0", color: "#1c1a15", fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* images */}
      <div style={box}>
        <h2 style={sectionTitle}>Image Comparison</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <ReportImage src={e.originalImage} caption="Original Emoji" />
          <ReportImage src={e.reconstructionImage} caption="PyCairo Reconstruction" />
          {e.diffImage ? (
            <ReportImage src={e.diffImage} caption="Difference Map" />
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* CV breakdown */}
      <div style={box}>
        <h2 style={sectionTitle}>
          Computer Vision Analysis — CV Score {formatScore(e.cvScore)}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {(
            [
              ["Structural", e.cvStructural],
              ["Shape", e.cvShape],
              ["Color", e.cvColor],
              ["Composition", e.cvComposition],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#1c1a15", fontWeight: 500 }}>{label}</span>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                  {formatScore(value)}%
                </span>
              </div>
              <Bar value={value} color="#4f46e5" />
            </div>
          ))}
        </div>
      </div>

      {/* AI analysis */}
      <div style={box}>
        <h2 style={sectionTitle}>
          AI Vision Analysis {hasAi ? `— AI Score ${formatScore(e.aiScore)}` : ""}
        </h2>
        {!hasAi ? (
          <p style={{ fontSize: 13, color: "#6d675a" }}>
            AI analysis unavailable. Computer Vision analysis is still available
            and shown above.
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {(
                [
                  ["Shape", e.aiShape],
                  ["Composition", e.aiComposition],
                  ["Proportion", e.aiProportion],
                  ["Color", e.aiColor],
                  ["Detail", e.aiDetail],
                  ["Model Overall", e.aiOverall],
                ] as [string, number | null][]
              ).map(([label, value]) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#1c1a15", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                      {value === null ? "—" : `${formatScore(value)}%`}
                    </span>
                  </div>
                  <Bar value={value ?? 0} color="#7c3aed" />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 5 }}>
                  What is similar?
                </p>
                <ul style={{ fontSize: 12, color: "#1c1a15", paddingLeft: 16, lineHeight: 1.7 }}>
                  {e.aiSimilarities.map((s, i) => (
                    <li key={i} style={{ listStyle: "disc" }}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#b45309", marginBottom: 5 }}>
                  What is different?
                </p>
                <ul style={{ fontSize: 12, color: "#1c1a15", paddingLeft: 16, lineHeight: 1.7 }}>
                  {e.aiDifferences.map((s, i) => (
                    <li key={i} style={{ listStyle: "disc" }}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            {e.aiExplanation && (
              <p style={{ fontSize: 12, color: "#6d675a", fontStyle: "italic", marginTop: 12, lineHeight: 1.7 }}>
                {e.aiExplanation}
              </p>
            )}
          </>
        )}
      </div>

      {/* lecturer assessment */}
      <div style={box}>
        <h2 style={sectionTitle}>Manual Lecturer Assessment</h2>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid #efece2" }}>
              <td style={{ padding: "7px 0", color: "#6d675a", width: 190 }}>
                Lecturer Score
              </td>
              <td style={{ padding: "7px 0", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                {e.lecturerScore === null ? "not assessed" : `${e.lecturerScore} / 100`}
              </td>
            </tr>
            <tr style={{ borderTop: "1px solid #efece2" }}>
              <td style={{ padding: "7px 0", color: "#6d675a", verticalAlign: "top" }}>
                Lecturer Notes
              </td>
              <td style={{ padding: "7px 0", color: "#1c1a15", whiteSpace: "pre-wrap" }}>
                {e.lecturerNotes || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 10.5, color: "#6d675a", lineHeight: 1.7, borderTop: "1px solid #e4dfd3", paddingTop: 10 }}>
        {DISCLAIMER} The Visual Similarity Score is a descriptive similarity
        category, not an academic grade.
      </p>
    </div>
  );
}
