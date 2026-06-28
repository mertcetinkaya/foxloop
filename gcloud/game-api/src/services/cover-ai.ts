import sharp from "sharp";
import { config, isAiCoverEnabled } from "../config.js";
import {
  generateFallbackCoverJpeg,
  type CoverInput,
} from "./cover-image.js";
import { cleanDisplayTitle } from "./title.js";

export type { CoverInput };

const COVER_W = 1200;
const COVER_H = 750;

const GPT_IMAGE_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const GPT_IMAGE_QUALITIES = new Set(["low", "medium", "high"]);

function templateCoverPrompt(input: CoverInput): string {
  const title = cleanDisplayTitle(input.title);
  const idea = (input.userPrompt?.trim() || title).slice(0, 300);
  return [
    "Hypercasual mobile game cover art for a store listing.",
    `Game idea: ${idea}.`,
    `Title text on the cover: "${title}".`,
    "Place the title in the lower third with clear margins — nothing cropped at the edges.",
    "Vibrant 3D cartoon style, polished commercial game marketing quality, wide landscape composition.",
    "No watermarks, no UI buttons, no extra logos.",
  ].join(" ");
}

function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image") || model === "chatgpt-image-latest";
}

function buildImageRequestBody(model: string, prompt: string): Record<string, unknown> {
  const size = GPT_IMAGE_SIZES.has(config.openaiImageSize)
    ? config.openaiImageSize
    : "1536x1024";
  const quality = GPT_IMAGE_QUALITIES.has(config.openaiImageQuality)
    ? config.openaiImageQuality
    : "low";

  if (isGptImageModel(model)) {
    return {
      model,
      prompt,
      n: 1,
      size,
      quality,
    };
  }

  return {
    model,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "b64_json",
  };
}

async function requestOpenAiImage(model: string, prompt: string): Promise<Buffer> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildImageRequestBody(model, prompt)),
  });

  const data = (await res.json()) as {
    error?: { message?: string; code?: string };
    data?: Array<{ b64_json?: string }>;
  };

  if (!res.ok) {
    throw new Error(
      data.error?.message ?? `OpenAI image API failed (${res.status}) for ${model}`
    );
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`OpenAI returned no image data for ${model}`);
  }

  return Buffer.from(b64, "base64");
}

async function resizeCoverToJpeg(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .resize(COVER_W, COVER_H, { fit: "cover", position: "attention" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** OpenAI image only — throws if OPENAI_API_KEY is unset. */
export async function generateAiCoverJpeg(input: CoverInput): Promise<Buffer> {
  if (!isAiCoverEnabled()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const normalized: CoverInput = {
    ...input,
    title: cleanDisplayTitle(input.title),
  };

  const model = config.openaiImageModel.trim() || "gpt-image-1-mini";
  const prompt = templateCoverPrompt(normalized);
  console.log(`Generating AI cover with ${model} (${config.openaiImageQuality}/${config.openaiImageSize})`);
  const png = await requestOpenAiImage(model, prompt);
  return await resizeCoverToJpeg(png);
}

/**
 * Cover for new games: AI when OPENAI_API_KEY is set, otherwise simple canvas art.
 * AI failure falls back to canvas so the build can still complete.
 */
export async function generateCoverForCreate(input: CoverInput): Promise<Buffer> {
  const normalized: CoverInput = {
    ...input,
    title: cleanDisplayTitle(input.title),
  };

  if (!isAiCoverEnabled()) {
    return generateFallbackCoverJpeg(normalized);
  }

  try {
    return await generateAiCoverJpeg(normalized);
  } catch (err) {
    console.error("AI cover generation failed, using canvas fallback:", err);
    return generateFallbackCoverJpeg(normalized);
  }
}
