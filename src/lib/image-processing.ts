/**
 * Client-side image preprocessing for the visual similarity analysis.
 *
 * Pipeline per image (raw pixels are only compared after normalization):
 *  1. Decode + validate the uploaded file.
 *  2. Rasterize onto a white 256x256 canvas, preserving aspect ratio
 *     (tolerates different canvas sizes used by students).
 *  3. Build a grayscale representation.
 *  4. Build an edge representation (Sobel + adaptive threshold).
 *  5. Build a color histogram (background-aware) and an 8x8 ink-density grid
 *     used for composition comparison.
 */
import {
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  MIN_IMAGE_DIM,
} from "./defaults";

export const ANALYSIS_SIZE = 256;
export const GRID_CELLS = 8;

export interface ProcessedImage {
  size: number;
  rgba: Uint8ClampedArray;
  gray: Float32Array;
  edges: Uint8Array;
  edgeCount: number;
  hist: Float32Array;
  grid: Float32Array;
  inkRatio: number;
  centroidX: number;
  centroidY: number;
  /** Normalized square PNG used for display in comparison views. */
  dataUrl: string;
}

export function validateImageFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = [".png", ".jpg", ".jpeg", ".webp"].some((e) =>
    name.endsWith(e),
  );
  if (!ACCEPTED_TYPES.includes(file.type) && !extOk) {
    return `Unsupported format "${file.name}". Please use PNG, JPG, JPEG or WEBP.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(
      1,
    )} MB). Maximum size is 10 MB.`;
  }
  if (file.size === 0) {
    return `"${file.name}" appears to be empty or corrupted.`;
  }
  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (
        img.naturalWidth < MIN_IMAGE_DIM ||
        img.naturalHeight < MIN_IMAGE_DIM
      ) {
        reject(
          new Error(
            `Insufficient resolution (${img.naturalWidth}x${img.naturalHeight}px). ` +
              `Images should be at least ${MIN_IMAGE_DIM}x${MIN_IMAGE_DIM}px.`,
          ),
        );
        return;
      }
      resolve(img);
    };
    img.onerror = () =>
      reject(new Error("The image could not be decoded. It may be corrupted."));
    img.src = src;
  });
}

/** Read, validate and decode an uploaded File. Throws with friendly messages. */
export async function readImageFile(
  file: File,
): Promise<{ dataUrl: string; img: HTMLImageElement }> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  return { dataUrl, img };
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return [canvas, ctx];
}

/** Normalize an image onto a square white canvas (aspect-ratio preserving). */
export function normalizeToCanvas(
  img: HTMLImageElement,
  size = ANALYSIS_SIZE,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const dx = Math.round((size - w) / 2);
  const dy = Math.round((size - h) / 2);
  ctx.drawImage(img, dx, dy, w, h);
  return [canvas, ctx];
}

function sobelMagnitudes(gray: Float32Array, size: number): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const tl = gray[i - size - 1];
      const t = gray[i - size];
      const tr = gray[i - size + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + size - 1];
      const b = gray[i + size];
      const br = gray[i + size + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/** Full preprocessing for one image. */
export function processImage(
  img: HTMLImageElement,
  size = ANALYSIS_SIZE,
): ProcessedImage {
  const [canvas, ctx] = normalizeToCanvas(img, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const rgba = imageData.data;
  const n = size * size;

  // Grayscale + ink statistics
  const gray = new Float32Array(n);
  let inkCount = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    if (lum < 235) {
      inkCount++;
      sumX += (i % size) / size;
      sumY += Math.floor(i / size) / size;
    }
  }
  const inkRatio = inkCount / n;
  const centroidX = inkCount > 0 ? sumX / inkCount : 0.5;
  const centroidY = inkCount > 0 ? sumY / inkCount : 0.5;

  // Edge representation (Sobel magnitude with adaptive threshold)
  const mags = sobelMagnitudes(gray, size);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += mags[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (mags[i] - mean) ** 2;
  const std = Math.sqrt(variance / n);
  const threshold = Math.max(48, mean + std * 1.1);
  const edges = new Uint8Array(n);
  let edgeCount = 0;
  for (let i = 0; i < n; i++) {
    if (mags[i] > threshold && gray[i] < 250) {
      edges[i] = 1;
      edgeCount++;
    }
  }

  // Color histogram (8x8x8 bins), ignoring near-white background pixels
  const HIST_BINS = 512;
  const hist = new Float32Array(HIST_BINS);
  let histCount = 0;
  const accum = (includeWhite: boolean) => {
    hist.fill(0);
    histCount = 0;
    for (let i = 0; i < n; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      if (!includeWhite && r > 240 && g > 240 && b > 240) continue;
      const bin = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
      hist[bin]++;
      histCount++;
    }
  };
  accum(false);
  if (histCount < n * 0.002) accum(true);
  if (histCount > 0) {
    for (let i = 0; i < HIST_BINS; i++) hist[i] /= histCount;
  }
  // Soft-bin the histogram so small color shifts (anti-aliasing, slightly
  // different hex values) keep most of their similarity.
  blurHistogram(hist);

  // 8x8 ink-density grid for composition analysis
  const grid = new Float32Array(GRID_CELLS * GRID_CELLS);
  const cell = size / GRID_CELLS;
  for (let i = 0; i < n; i++) {
    if (gray[i] < 235) {
      const gx = Math.min(GRID_CELLS - 1, Math.floor((i % size) / cell));
      const gy = Math.min(GRID_CELLS - 1, Math.floor(Math.floor(i / size) / cell));
      grid[gy * GRID_CELLS + gx]++;
    }
  }
  const perCell = cell * cell;
  for (let i = 0; i < grid.length; i++) grid[i] /= perCell;

  return {
    size,
    rgba,
    gray,
    edges,
    edgeCount,
    hist,
    grid,
    inkRatio,
    centroidX,
    centroidY,
    dataUrl: canvas.toDataURL("image/png"),
  };
}

/**
 * Separable [0.25, 0.5, 0.25] blur across each axis of the 8x8x8 RGB
 * histogram. Adjacent-bin differences become partial matches instead of
 * complete misses. Total mass is renormalized to 1.
 */
export function blurHistogram(hist: Float32Array): void {
  const SIDE = 8; // 8 bins per channel → 512 bins

  // Axis-aware blur along R, then G, then B.
  const blur = (get: (i: number, delta: number) => number | null) => {
    const src = Float32Array.from(hist);
    for (let i = 0; i < SIDE * SIDE * SIDE; i++) {
      let sum = src[i] * 0.5;
      let weight = 0.5;
      for (const delta of [-1, 1]) {
        const j = get(i, delta);
        if (j !== null) {
          sum += src[j] * 0.25;
          weight += 0.25;
        }
      }
      hist[i] = sum / weight;
    }
  };
  const binR = (i: number) => Math.floor(i / 64);
  const binG = (i: number) => Math.floor(i / 8) % 8;
  const binB = (i: number) => i % 8;
  blur((i, d) => {
    const r = binR(i) + d;
    return r >= 0 && r < SIDE ? i + d * 64 : null;
  });
  blur((i, d) => {
    const g = binG(i) + d;
    return g >= 0 && g < SIDE ? i + d * 8 : null;
  });
  blur((i, d) => {
    const b = binB(i) + d;
    return b >= 0 && b < SIDE ? i + d : null;
  });
  let total = 0;
  for (let i = 0; i < hist.length; i++) total += hist[i];
  if (total > 0) {
    for (let i = 0; i < hist.length; i++) hist[i] /= total;
  }
}

/** Downscale an image to a JPEG data URL (for storage and AI payloads). */
export function toJpegDataUrl(
  img: HTMLImageElement | HTMLCanvasElement,
  maxDim = 384,
  quality = 0.86,
): string {
  const srcW =
    img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const srcH =
    img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Visual difference map: white where the normalized images agree,
 * amber → red heat where they diverge.
 */
export function buildDifferenceMap(
  a: ProcessedImage,
  b: ProcessedImage,
): string {
  const size = a.size;
  const [canvas, ctx] = createCanvas(size);
  const out = ctx.createImageData(size, size);
  const data = out.data;
  for (let i = 0; i < size * size; i++) {
    const dr = Math.abs(a.rgba[i * 4] - b.rgba[i * 4]);
    const dg = Math.abs(a.rgba[i * 4 + 1] - b.rgba[i * 4 + 1]);
    const db = Math.abs(a.rgba[i * 4 + 2] - b.rgba[i * 4 + 2]);
    const d = Math.max(dr, dg, db);
    const t = Math.min(1, d / 72);
    let r: number;
    let g: number;
    let bl: number;
    if (t < 0.04) {
      r = g = bl = 255;
    } else if (t < 0.5) {
      const k = (t - 0.04) / 0.46;
      r = 255;
      g = Math.round(255 - 150 * k);
      bl = Math.round(255 - 200 * k);
    } else {
      const k = (t - 0.5) / 0.5;
      r = Math.round(255 - 40 * k);
      g = Math.round(105 - 80 * k);
      bl = Math.round(55 - 40 * k);
    }
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = bl;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/png");
}
