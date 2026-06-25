#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "games", "placeholders");
const W = 1200;
const H = 750;
const COUNT = 10;

/** Gradient pairs inspired by simple card art — no text, two soft circles. */
const PALETTES = [
  ["#5eead4", "#0d9488"],
  ["#a78bfa", "#6d28d9"],
  ["#fb7185", "#be123c"],
  ["#fbbf24", "#b45309"],
  ["#60a5fa", "#1d4ed8"],
  ["#4ade80", "#15803d"],
  ["#f472b6", "#9d174d"],
  ["#38bdf8", "#0369a1"],
  ["#c084fc", "#7e22ce"],
  ["#fb923c", "#c2410c"],
];

async function loadCanvas() {
  const candidates = [
    path.join(ROOT, "node_modules", "@napi-rs", "canvas", "index.js"),
    path.join(
      ROOT,
      "..",
      "..",
      "gcloud",
      "game-api",
      "node_modules",
      "@napi-rs",
      "canvas",
      "index.js"
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return import(pathToFileURL(candidate).href);
    }
  }

  throw new Error(
    "Missing @napi-rs/canvas. Run npm install in forge web/foxloop or gcloud/game-api."
  );
}

function drawPlaceholder(createCanvas, index) {
  const [c1, c2] = PALETTES[index];
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.22, 190, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.arc(W * 0.14, H * 0.78, 210, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(W * 0.55, H * 0.55, 120, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer("image/jpeg", 85);
}

async function main() {
  const { createCanvas } = await loadCanvas();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let i = 0; i < COUNT; i += 1) {
    const name = `${String(i + 1).padStart(2, "0")}.jpg`;
    const outPath = path.join(OUT_DIR, name);
    fs.writeFileSync(outPath, drawPlaceholder(createCanvas, i));
    console.log(`wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
