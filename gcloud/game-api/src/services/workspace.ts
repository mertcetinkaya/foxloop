import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scaffoldDir = path.resolve(__dirname, "../templates/scaffold");

const REFERENCE_GAME_SLUGS = [
  "eat-smaller-fish",
  "brawl-arena",
  "city-race",
  "arrow-out",
];

export function workspaceDir(gameId: string): string {
  return path.join(config.workspaceRoot, gameId);
}

export async function ensureWorkspace(gameId: string): Promise<string> {
  const dir = workspaceDir(gameId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function initWorkspaceFromScaffold(gameId: string): Promise<string> {
  const dir = await ensureWorkspace(gameId);
  const entries = await fs.readdir(scaffoldDir);
  for (const name of entries) {
    const src = path.join(scaffoldDir, name);
    const dest = path.join(dir, name);
    await fs.copyFile(src, dest);
  }
  return dir;
}

export async function copyReferenceGamesToWorkspace(workspaceDir: string): Promise<void> {
  const destRoot = path.join(workspaceDir, "reference-games");
  await fs.mkdir(destRoot, { recursive: true });
  for (const slug of REFERENCE_GAME_SLUGS) {
    const src = path.join(config.webRoot, "src/games", slug);
    const dest = path.join(destRoot, slug);
    try {
      await fs.access(src);
      await fs.cp(src, dest, { recursive: true });
    } catch {
      // skip missing reference games
    }
  }
}

export async function removeWorkspace(gameId: string): Promise<void> {
  await fs.rm(workspaceDir(gameId), { recursive: true, force: true });
}

export async function listWorkspaceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries.filter(
    (e) => e.endsWith(".ts") || e.endsWith(".json") || e.endsWith(".tsx")
  );
}
