/**
 * Procedural demo emojis — three example pairs drawn at runtime with Canvas.
 * The generated pairs run through the real analysis pipeline, so lecturers
 * can immediately see how the evaluation behaves on:
 *   1. a very similar reconstruction,
 *   2. a moderately similar reconstruction,
 *   3. a clearly different reconstruction.
 */
import type { CategoryKey, StudentInfo } from "./types";

interface SunParams {
  size: number;
  faceRadius: number;
  faceColor: string;
  outlineColor: string;
  lineWidth: number;
  rayCount: number;
  rayLength: number;
  eyeDX: number;
  eyeDY: number;
  eyeR: number;
  leftEyeScale: number;
  smileY: number;
  smileDepth: number;
  smileWidth: number;
  smileTilt: number;
  blush: boolean;
  browTilt: number;
  squareFace?: boolean;
}

function drawSunEmoji(params: SunParams): string {
  const {
    size,
    faceRadius,
    faceColor,
    outlineColor,
    lineWidth,
    rayCount,
    rayLength,
    eyeDX,
    eyeDY,
    eyeR,
    leftEyeScale,
    smileY,
    smileDepth,
    smileWidth,
    smileTilt,
    blush,
    browTilt,
    squareFace,
  } = params;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Rays
  if (rayCount > 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 - Math.PI / 2;
      const r1 = faceRadius + size * 0.02;
      const r2 = faceRadius + size * 0.02 + rayLength;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
  }

  // Face
  ctx.beginPath();
  if (squareFace) {
    const r = faceRadius * 0.42;
    const x0 = cx - faceRadius;
    const y0 = cy - faceRadius;
    const w = faceRadius * 2;
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + w, r);
    ctx.arcTo(x0 + w, y0 + w, x0, y0 + w, r);
    ctx.arcTo(x0, y0 + w, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath();
  } else {
    ctx.arc(cx, cy, faceRadius, 0, Math.PI * 2);
  }
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = outlineColor;
  ctx.beginPath();
  ctx.ellipse(
    cx - eyeDX,
    cy - eyeDY,
    eyeR * leftEyeScale,
    eyeR * leftEyeScale * 1.15,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + eyeDX, cy - eyeDY, eyeR, eyeR * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  if (browTilt !== 0) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth * 0.8;
    const bw = eyeR * 2.4;
    for (const side of [-1, 1]) {
      const ex = cx + side * eyeDX;
      const ey = cy - eyeDY - eyeR * 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - bw / 2, ey - side * browTilt);
      ctx.lineTo(ex + bw / 2, ey + side * browTilt);
      ctx.stroke();
    }
  }

  // Blush
  if (blush) {
    ctx.fillStyle = "rgba(240, 110, 110, 0.55)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * eyeDX * 1.65, cy + size * 0.02, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Smile (positive depth = smile, negative = frown)
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  const my = cy + smileY;
  const mw = smileWidth;
  const depth = smileDepth;
  ctx.moveTo(cx - mw / 2, my - smileTilt);
  ctx.quadraticCurveTo(cx, my + depth, cx + mw / 2, my + smileTilt);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export interface DemoExample {
  id: string;
  title: string;
  subtitle: string;
  expectation: CategoryKey;
  description: string;
  student: StudentInfo;
  original: string;
  reconstruction: string;
}

export function getDemoExamples(): DemoExample[] {
  const base: SunParams = {
    size: 480,
    faceRadius: 150,
    faceColor: "#f7b731",
    outlineColor: "#2d3436",
    lineWidth: 9,
    rayCount: 12,
    rayLength: 34,
    eyeDX: 58,
    eyeDY: 34,
    eyeR: 16,
    leftEyeScale: 1,
    smileY: 42,
    smileDepth: 52,
    smileWidth: 130,
    smileTilt: 8,
    blush: true,
    browTilt: 0,
  };

  const verySimilarReconstruction: SunParams = {
    ...base,
    size: 400,
    faceColor: "#f6b93b",
    lineWidth: 8,
    eyeDY: 36,
    smileDepth: 49,
    rayLength: 30,
  };

  const moderateReconstruction: SunParams = {
    ...base,
    faceRadius: 132,
    faceColor: "#f5b52e",
    rayCount: 10,
    rayLength: 26,
    eyeDX: 64,
    eyeDY: 28,
    leftEyeScale: 1.45,
    smileY: 66,
    smileDepth: 26,
    smileWidth: 100,
    blush: false,
  };

  const differentReconstruction: SunParams = {
    ...base,
    faceColor: "#5b8def",
    outlineColor: "#1e2a4a",
    rayCount: 0,
    squareFace: true,
    eyeDY: 12,
    eyeR: 13,
    smileY: 88,
    smileDepth: -38,
    smileWidth: 110,
    smileTilt: 0,
    blush: false,
    browTilt: 10,
  };

  return [
    {
      id: "demo-very-similar",
      title: "Example 1 — Faithful reconstruction",
      subtitle: "Expected: very high similarity",
      expectation: "very-high",
      description:
        "The PyCairo version redraws the sun emoji at a different canvas size with slightly shifted eyes and a subtly different stroke width — exactly the small rendering differences the system is built to tolerate.",
      student: {
        studentName: "Demo Student A",
        nim: "DEMO-001",
        className: "CG-A",
        originalOwner: "Student X",
        notes: "Generated demo pair.",
      },
      original: drawSunEmoji(base),
      reconstruction: drawSunEmoji(verySimilarReconstruction),
    },
    {
      id: "demo-moderate",
      title: "Example 2 — Partially reconstructed",
      subtitle: "Expected: moderate similarity",
      expectation: "moderate",
      description:
        "The reconstruction keeps the overall idea but changes proportions: a smaller face, fewer rays, one larger eye, a flatter mouth placed lower, and missing blush details.",
      student: {
        studentName: "Demo Student B",
        nim: "DEMO-002",
        className: "CG-A",
        originalOwner: "Student X",
        notes: "Generated demo pair.",
      },
      original: drawSunEmoji(base),
      reconstruction: drawSunEmoji(moderateReconstruction),
    },
    {
      id: "demo-different",
      title: "Example 3 — Different structure",
      subtitle: "Expected: low similarity",
      expectation: "low",
      description:
        "A different expression and geometry: square blue face, no rays, frown and angled eyebrows. Two 'faces', but not the same visual structure.",
      student: {
        studentName: "Demo Student C",
        nim: "DEMO-003",
        className: "CG-B",
        originalOwner: "Student X",
        notes: "Generated demo pair.",
      },
      original: drawSunEmoji(base),
      reconstruction: drawSunEmoji(differentReconstruction),
    },
  ];
}
