/**
 * Objective computer-vision similarity metrics.
 *
 * All metrics return values in the 0-100 range and are designed to tolerate
 * small rendering differences (canvas size, anti-aliasing, line width,
 * minor coordinate or color deviations) rather than exact pixel equality.
 */
import { clamp, round1 } from "./defaults";
import type { ProcessedImage } from "./image-processing";

/* ------------------------------------------------------------------ */
/* A. Structural similarity (windowed SSIM on the grayscale images)    */
/* ------------------------------------------------------------------ */

function ssimIndex(a: Float32Array, b: Float32Array, size: number): number {
  const WIN = 8;
  const STRIDE = 4;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let total = 0;
  let windows = 0;

  for (let y = 0; y + WIN <= size; y += STRIDE) {
    for (let x = 0; x + WIN <= size; x += STRIDE) {
      let meanA = 0;
      let meanB = 0;
      const count = WIN * WIN;
      for (let wy = 0; wy < WIN; wy++) {
        for (let wx = 0; wx < WIN; wx++) {
          const i = (y + wy) * size + (x + wx);
          meanA += a[i];
          meanB += b[i];
        }
      }
      meanA /= count;
      meanB /= count;

      let varA = 0;
      let varB = 0;
      let cov = 0;
      for (let wy = 0; wy < WIN; wy++) {
        for (let wx = 0; wx < WIN; wx++) {
          const i = (y + wy) * size + (x + wx);
          const da = a[i] - meanA;
          const db = b[i] - meanB;
          varA += da * da;
          varB += db * db;
          cov += da * db;
        }
      }
      varA /= count;
      varB /= count;
      cov /= count;

      const numerator = (2 * meanA * meanB + C1) * (2 * cov + C2);
      const denominator = (meanA ** 2 + meanB ** 2 + C1) * (varA + varB + C2);
      total += numerator / denominator;
      windows++;
    }
  }
  return windows > 0 ? total / windows : 0;
}

/** Structural Similarity: 0-100 (SSIM-based). */
export function structuralSimilarity(
  a: ProcessedImage,
  b: ProcessedImage,
): number {
  const value = ssimIndex(a.gray, b.gray, a.size);
  return round1(clamp(value * 100));
}

/* ------------------------------------------------------------------ */
/* B. Shape similarity (edge maps + chamfer distance + soft overlap)   */
/* ------------------------------------------------------------------ */

/** Two-pass chamfer distance transform of a binary edge map. */
function distanceTransform(mask: Uint8Array, size: number): Float32Array {
  const dt = new Float32Array(size * size);
  const INF = 1e9;
  const SQRT2 = Math.SQRT2;
  for (let i = 0; i < mask.length; i++) dt[i] = mask[i] ? 0 : INF;
  // Forward pass
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (dt[i] === 0) continue;
      let m = dt[i];
      if (x > 0) m = Math.min(m, dt[i - 1] + 1);
      if (y > 0) m = Math.min(m, dt[i - size] + 1);
      if (x > 0 && y > 0) m = Math.min(m, dt[i - size - 1] + SQRT2);
      if (x < size - 1 && y > 0) m = Math.min(m, dt[i - size + 1] + SQRT2);
      dt[i] = m;
    }
  }
  // Backward pass
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      if (dt[i] === 0) continue;
      let m = dt[i];
      if (x < size - 1) m = Math.min(m, dt[i + 1] + 1);
      if (y < size - 1) m = Math.min(m, dt[i + size] + 1);
      if (x < size - 1 && y < size - 1) m = Math.min(m, dt[i + size + 1] + SQRT2);
      if (x > 0 && y < size - 1) m = Math.min(m, dt[i + size - 1] + SQRT2);
      dt[i] = m;
    }
  }
  return dt;
}

function dilate(mask: Uint8Array, size: number, radius = 1): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!mask[i]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            out[ny * size + nx] = 1;
          }
        }
      }
    }
  }
  return out;
}

/** Shape Similarity: 0-100 (symmetric chamfer distance + dilated edge overlap). */
export function shapeSimilarity(a: ProcessedImage, b: ProcessedImage): number {
  const ea = a.edgeCount;
  const eb = b.edgeCount;
  if (ea === 0 && eb === 0) {
    // Both effectively blank — compare how much "ink" each contains.
    return round1(
      clamp(100 * (1 - Math.min(1, Math.abs(a.inkRatio - b.inkRatio) * 4))),
    );
  }
  if (ea === 0 || eb === 0) {
    return 12; // Only one image has discernible structure.
  }
  const dtA = distanceTransform(a.edges, a.size);
  const dtB = distanceTransform(b.edges, a.size);
  let sumBA = 0;
  let sumAB = 0;
  for (let i = 0; i < a.edges.length; i++) {
    if (b.edges[i]) sumBA += dtA[i];
    if (a.edges[i]) sumAB += dtB[i];
  }
  const avgDist = sumBA / eb / 2 + sumAB / ea / 2;
  const chamfer = 100 * Math.exp(-avgDist / 5);

  // Tolerant overlap: dilate each edge map by 2px before intersecting.
  const dilA = dilate(a.edges, a.size, 2);
  const dilB = dilate(b.edges, a.size, 2);
  let inter = 0;
  for (let i = 0; i < a.edges.length; i++) {
    if (a.edges[i] && dilB[i]) inter++;
    if (b.edges[i] && dilA[i]) inter++;
  }
  const dice = (100 * inter) / (ea + eb);

  return round1(clamp(0.5 * chamfer + 0.5 * dice));
}

/* ------------------------------------------------------------------ */
/* C. Color similarity (background-aware histogram intersection)       */
/* ------------------------------------------------------------------ */

/** Color Similarity: 0-100 (512-bin RGB histogram intersection). */
export function colorSimilarity(a: ProcessedImage, b: ProcessedImage): number {
  let intersection = 0;
  for (let i = 0; i < a.hist.length; i++) {
    intersection += Math.min(a.hist[i], b.hist[i]);
  }
  // Penalize large differences in overall ink coverage (e.g. missing fills).
  const inkPenalty = Math.min(0.35, Math.abs(a.inkRatio - b.inkRatio));
  const value = clamp(intersection - inkPenalty * 0.5, 0, 1);
  return round1(clamp(value * 100));
}

/* ------------------------------------------------------------------ */
/* D. Composition similarity (spatial ink distribution + centroid)     */
/* ------------------------------------------------------------------ */

/** Composition Similarity: 0-100 (8x8 ink-density grid + centroid alignment). */
export function compositionSimilarity(
  a: ProcessedImage,
  b: ProcessedImage,
): number {
  let num = 0;
  let den = 1e-9;
  for (let i = 0; i < a.grid.length; i++) {
    num += Math.abs(a.grid[i] - b.grid[i]);
    den += a.grid[i] + b.grid[i];
  }
  const gridSim = clamp(1 - num / den);

  const d = Math.hypot(a.centroidX - b.centroidX, a.centroidY - b.centroidY);
  const centroidSim = Math.exp(-d / 0.12);

  return round1(clamp(100 * (0.72 * gridSim + 0.28 * centroidSim)));
}
