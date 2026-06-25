import { Agent } from "@cursor/sdk";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { config, requireCursorKey } from "../config.js";
import {
  generateFallbackCoverJpeg,
  type CoverInput,
} from "./cover-image.js";
import { cleanDisplayTitle } from "./title.js";

export type { CoverInput };

const COVER_W = 1200;
const COVER_H = 750;

function templateCoverPrompt(input: CoverInput): string {
  const title = cleanDisplayTitle(input.title);
  const idea = input.userPrompt?.trim() || title;
  return [
    `Professional mobile hypercasual game store cover art for "${title}".`,
    "Vibrant polished 3D cartoon illustration in the style of top mobile arcade games",
    "(colorful fish underwater, soccer penalty kick, or action puzzle — match the theme).",
    `Theme / gameplay: ${idea.slice(0, 200)}.`,
    `Bold stylized title text "${title.toUpperCase()}" integrated into the artwork.`,
    "Bright colors, glossy characters, marketing splash screen quality, 16:10 landscape composition.",
    "No watermarks, no UI buttons, no extra logos.",
  ].join(" ");
}

async function composeCoverPromptWithAgent(input: CoverInput): Promise<string> {
  const apiKey = requireCursorKey();
  const title = cleanDisplayTitle(input.title);
  const planExcerpt = input.plan?.slice(0, 600) ?? "";

  const result = await Agent.prompt(
    [
      "You write image-generation prompts for DALL-E 3.",
      "Create ONE detailed prompt for a hypercasual mobile game cover / store listing hero image.",
      "Style reference: polished 3D cartoon game art like Fish Eat Fish, Penalty Fever — bold title text in the image, vibrant colors, commercial quality.",
      "",
      `Game title: ${title}`,
      `Player idea: ${input.userPrompt ?? title}`,
      planExcerpt ? `Design notes:\n${planExcerpt}` : "",
      "",
      "Output ONLY the DALL-E prompt text. No markdown, no quotes, no explanation.",
    ].join("\n"),
    {
      apiKey,
      model: { id: config.cursorModel },
      local: { cwd: config.webRoot, settingSources: [] },
    }
  );

  const text = result.result?.trim();
  if (!text || text.length < 40) {
    return templateCoverPrompt(input);
  }
  return text.slice(0, 3800);
}

async function generateDalleImage(prompt: string): Promise<Buffer> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for cover art generation");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openaiImageModel,
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    data?: Array<{ b64_json?: string }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI image API failed (${res.status})`);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data");
  }

  return Buffer.from(b64, "base64");
}

async function resizeCoverToJpeg(png: Buffer): Promise<Buffer> {
  const img = await loadImage(png);
  const canvas = createCanvas(COVER_W, COVER_H);
  const ctx = canvas.getContext("2d");

  const scale = Math.max(COVER_W / img.width, COVER_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (COVER_W - w) / 2;
  const y = (COVER_H - h) / 2;

  ctx.drawImage(img, x, y, w, h);
  return canvas.toBuffer("image/jpeg", 90);
}

/** Composer writes the DALL-E prompt; OpenAI renders the cover. Falls back to canvas if unavailable. */
export async function generateCoverJpeg(input: CoverInput): Promise<Buffer> {
  const normalized: CoverInput = {
    ...input,
    title: cleanDisplayTitle(input.title),
  };

  if (!config.openaiApiKey) {
    console.warn(
      "OPENAI_API_KEY missing — using canvas cover fallback. Add OPENAI_API_KEY for DALL-E covers."
    );
    return generateFallbackCoverJpeg(normalized);
  }

  try {
    const prompt = await composeCoverPromptWithAgent(normalized);
    const png = await generateDalleImage(prompt);
    return await resizeCoverToJpeg(png);
  } catch (err) {
    console.error("AI cover generation failed, using canvas fallback:", err);
    return generateFallbackCoverJpeg(normalized);
  }
}
