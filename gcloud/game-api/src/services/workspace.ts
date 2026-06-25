import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scaffoldDir = path.resolve(__dirname, "../templates/scaffold");

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

export async function writeReferenceImage(workspaceDir: string, image: Buffer): Promise<void> {
  await fs.writeFile(path.join(workspaceDir, "reference-scene.jpg"), image);
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
