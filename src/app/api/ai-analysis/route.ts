import { sanitizeAiAnalysis } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = [
  "You are an expert visual analysis system assisting a university Computer Graphics lecturer.",
  "You are given two images of the SAME 2D emoji:",
  "1) ORIGINAL: an emoji originally drawn by one student.",
  "2) RECONSTRUCTION: the same emoji re-created programmatically by another student using Python + PyCairo.",
  "",
  "This is a VISUAL RECONSTRUCTION task. Do not simply decide whether the images are 'similar'.",
  "Carefully compare the two images on these specific dimensions:",
  "1. Main shape (the primary geometric forms)",
  "2. Component structure (which sub-components exist and how they are built)",
  "3. Relative positions of components",
  "4. Proportion (relative sizes of components to each other and to the whole)",
  "5. Color (palette, dominant colors, color placement)",
  "6. Details (small decorative elements, strokes, accessories)",
  "7. Unique characteristics that distinguish this particular emoji",
  "",
  "CRITICAL: distinguish between 'same type of object' and 'same visual structure'.",
  "Two smiling faces are NOT highly similar just because both are smiling faces — compare their",
  "exact structure, geometry, positions, proportions and details.",
  "Small rendering differences (canvas size, anti-aliasing, line width, tiny coordinate shifts)",
  "should be tolerated and only slightly reduce scores.",
  "",
  "Respond ONLY with a valid JSON object using exactly this structure:",
  "{",
  '  "shape": 0-100,',
  '  "composition": 0-100,',
  '  "proportion": 0-100,',
  '  "color": 0-100,',
  '  "detail": 0-100,',
  '  "overall": 0-100,',
  '  "similarities": ["..."],',
  '  "differences": ["..."],',
  '  "explanation": "one concise paragraph"',
  "}",
  "Numbers must be plain numbers (no % sign). List items must be short, specific strings.",
].join("\n");

function isDataImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.length > 100 &&
    value.length < 8_000_000
  );
}

/** GET /api/ai-analysis — reports whether an AI provider key is configured. */
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.AI_API_KEY) });
}

/** POST /api/ai-analysis — proxies both images to the configured vision model. */
export async function POST(request: Request) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI analysis unavailable. Computer Vision analysis is still available.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }
  const { originalImage, reconstructionImage } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (!isDataImage(originalImage) || !isDataImage(reconstructionImage)) {
    return NextResponse.json(
      { ok: false, error: "Both images are required for AI analysis." },
      { status: 400 },
    );
  }

  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Image 1 is the ORIGINAL emoji. Image 2 is the PYCAIRO RECONSTRUCTION. Compare them as instructed and return JSON only.",
              },
              {
                type: "image_url",
                image_url: { url: originalImage, detail: "low" },
              },
              {
                type: "image_url",
                image_url: { url: reconstructionImage, detail: "low" },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "AI analysis unavailable. Computer Vision analysis is still available.",
        },
        { status: 503 },
      );
    }

    const data = await response.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("empty content");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Some providers wrap JSON in code fences — attempt a recovery.
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("invalid json");
      parsed = JSON.parse(match[0]);
    }
    const analysis = sanitizeAiAnalysis(parsed);
    return NextResponse.json({ ok: true, analysis });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI analysis unavailable. Computer Vision analysis is still available.",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
