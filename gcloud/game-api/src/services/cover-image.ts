import { createCanvas, type CanvasRenderingContext2D } from "@napi-rs/canvas";
import { cleanDisplayTitle } from "./title.js";

const W = 1200;
const H = 750;

type CoverTheme = "pirate" | "racing" | "space" | "fish" | "arcade" | "default";

export interface CoverInput {
  title: string;
  slug: string;
  userPrompt?: string;
  plan?: string;
  /** Skip Cursor agent prompt step — use template prompt for faster parallel cover generation. */
  skipAgentPrompt?: boolean;
}

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

function detectTheme(input: CoverInput): CoverTheme {
  const text = `${input.title} ${input.slug} ${input.userPrompt ?? ""} ${input.plan ?? ""}`.toLowerCase();
  if (/pirate|ship|treasure|ocean|sea|anchor|plunder|cannon/.test(text)) return "pirate";
  if (/race|drive|car|neon|speed|traffic|sprint|overdrive|lane/.test(text)) return "racing";
  if (/space|rocket|galaxy|planet|astro|star/.test(text)) return "space";
  if (/fish|ocean|shark|underwater|sea/.test(text)) return "fish";
  if (/arrow|puzzle|block|tap|hyper/.test(text)) return "arcade";
  return "default";
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawBackground(ctx: CanvasRenderingContext2D, theme: CoverTheme, seed: number) {
  const hue = seed % 360;

  const palettes: Record<CoverTheme, [string, string, string]> = {
    pirate: ["#0c4a6e", "#155e75", "#0891b2"],
    racing: ["#581c87", "#7e22ce", "#db2777"],
    space: ["#1e1b4b", "#312e81", "#4c1d95"],
    fish: ["#0e7490", "#0284c7", "#06b6d4"],
    arcade: ["#9a3412", "#c2410c", "#ea580c"],
    default: [`hsl(${hue}, 70%, 32%)`, `hsl(${(hue + 40) % 360}, 68%, 38%)`, `hsl(${(hue + 80) % 360}, 60%, 28%)`],
  };

  const [c1, c2, c3] = palettes[theme];
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.55, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.7);
  glow.addColorStop(0, "rgba(255,255,255,0.22)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.18, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.12, H * 0.82, 220, 0, Math.PI * 2);
  ctx.fill();
}

function drawThemeArt(ctx: CanvasRenderingContext2D, theme: CoverTheme) {
  ctx.save();
  ctx.globalAlpha = 0.35;

  if (theme === "pirate") {
    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, H * 0.55 + i * 28);
      for (let x = 0; x <= W; x += 40) {
        ctx.quadraticCurveTo(x + 20, H * 0.55 + i * 28 + (i % 2 ? 18 : -18), x + 40, H * 0.55 + i * 28);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.moveTo(W * 0.72, H * 0.28);
    ctx.lineTo(W * 0.78, H * 0.52);
    ctx.lineTo(W * 0.66, H * 0.52);
    ctx.closePath();
    ctx.fill();
  }

  if (theme === "racing") {
    ctx.strokeStyle = "#f5d0fe";
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.55 + i * 18, 0);
      ctx.lineTo(W * 0.35 + i * 12, H);
      ctx.stroke();
    }
    ctx.fillStyle = "#fde047";
    ctx.fillRect(W * 0.62, H * 0.42, 280, 90);
    ctx.fillStyle = "#111";
    ctx.fillRect(W * 0.67, H * 0.5, 50, 50);
    ctx.fillRect(W * 0.78, H * 0.5, 50, 50);
  }

  if (theme === "space") {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % W;
      const y = (i * 89) % H;
      ctx.beginPath();
      ctx.arc(x, y, i % 3 === 0 ? 2.5 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c4b5fd";
    ctx.beginPath();
    ctx.ellipse(W * 0.7, H * 0.35, 120, 40, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (theme === "fish") {
    ctx.fillStyle = "#67e8f9";
    ctx.beginPath();
    ctx.ellipse(W * 0.68, H * 0.42, 140, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0891b2";
    ctx.beginPath();
    ctx.moveTo(W * 0.78, H * 0.42);
    ctx.lineTo(W * 0.86, H * 0.3);
    ctx.lineTo(W * 0.86, H * 0.54);
    ctx.closePath();
    ctx.fill();
  }

  if (theme === "arcade") {
    ctx.fillStyle = "#fed7aa";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(W * 0.55 + col * 42, H * 0.25 + row * 42, 36, 36);
        }
      }
    }
  }

  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, tagline: string) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "700 88px system-ui, -apple-system, Segoe UI, sans-serif";
  const lines = wrapLines(ctx, title.toUpperCase(), W * 0.78);
  const lineHeight = 96;
  const startY = H * 0.38 - ((lines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(lines[i], W / 2 + 3, y + 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lines[i], W / 2, y);
  }

  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(tagline.toUpperCase(), W / 2, H * 0.62);

  ctx.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("FORGE LITE", W / 2, H * 0.88);
}

function taglineForTheme(theme: CoverTheme): string {
  switch (theme) {
    case "pirate":
      return "Hypercasual Adventure";
    case "racing":
      return "Arcade Action";
    case "space":
      return "Cosmic Arcade";
    case "fish":
      return "Arcade Game";
    case "arcade":
      return "Puzzle Action";
    default:
      return "Hypercasual Game";
  }
}

export async function generateFallbackCoverJpeg(input: CoverInput): Promise<Buffer> {
  const title = cleanDisplayTitle(input.title);
  const theme = detectTheme(input);
  const seed = hashSlug(input.slug);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, theme, seed);
  drawThemeArt(ctx, theme);
  drawTitle(ctx, title, taglineForTheme(theme));

  return canvas.toBuffer("image/jpeg", 88);
}
