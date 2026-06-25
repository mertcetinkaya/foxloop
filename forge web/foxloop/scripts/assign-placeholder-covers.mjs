#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAMES_JSON = path.join(ROOT, "src", "data", "games.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const PLACEHOLDER_COUNT = 10;

function hashSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

function placeholderImage(slug) {
  const idx = (hashSlug(slug) % PLACEHOLDER_COUNT) + 1;
  return `/games/placeholders/${String(idx).padStart(2, "0")}.jpg`;
}

function localImageExists(imagePath) {
  if (!imagePath || !imagePath.startsWith("/")) return false;
  const rel = imagePath.replace(/^\//, "");
  return fs.existsSync(path.join(PUBLIC_DIR, rel));
}

function patchGames(games) {
  let updated = 0;
  for (const game of games) {
    if (!game.image || localImageExists(game.image)) continue;
    game.image = placeholderImage(game.id);
    updated += 1;
  }
  return updated;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(GAMES_JSON, "utf8"));
  const sections = ["forge", "native", "embed"];
  let total = 0;

  for (const section of sections) {
    if (!Array.isArray(catalog[section])) continue;
    total += patchGames(catalog[section]);
  }

  fs.writeFileSync(GAMES_JSON, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Assigned placeholder covers to ${total} games in games.json`);
}

main();
