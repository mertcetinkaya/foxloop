import fs from "fs/promises";
import path from "path";
import * as esbuild from "esbuild";
import { config } from "../config.js";
import type { GameFile } from "../types.js";
import { workspaceDir } from "./workspace.js";

const PREVIEW_RUNNER = `
import * as engine from "./engine";
import { drawGame } from "./renderer";

const {
  createInitialState,
  updateGame,
  setPointer,
} = engine;

const onPointerDown = engine.onPointerDown ?? ((s, x, y) => {
  setPointer(s, x, y);
});
const onPointerUp = engine.onPointerUp ?? (() => {});
const onKey = engine.onKey ?? (() => {});

const canvas = document.getElementById("game");
if (!canvas) throw new Error("Missing #game canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

canvas.tabIndex = 0;
canvas.style.touchAction = "none";

let state = createInitialState(canvas.width, canvas.height);
let last = performance.now();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  state = createInitialState(canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

function localXY(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  canvas.focus();
  const { x, y } = localXY(e.clientX, e.clientY);
  onPointerDown(state, x, y);
  setPointer(state, x, y);
});

canvas.addEventListener("pointermove", (e) => {
  const { x, y } = localXY(e.clientX, e.clientY);
  setPointer(state, x, y);
});

canvas.addEventListener("pointerup", (e) => {
  const { x, y } = localXY(e.clientX, e.clientY);
  onPointerUp(state, x, y);
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
});

canvas.addEventListener("pointercancel", () => {
  onPointerUp(state, 0, 0);
});

const keyCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"]);

window.addEventListener("keydown", (e) => {
  onKey(state, e.code, true);
  if (keyCodes.has(e.code)) e.preventDefault();
});

window.addEventListener("keyup", (e) => {
  onKey(state, e.code, false);
});

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateGame(state, dt);
  drawGame(ctx, state, canvas.width, canvas.height);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`;

export async function buildPreviewHtml(files: GameFile[]): Promise<string> {
  const tmp = path.join(config.workspaceRoot, ".preview-build");
  await fs.mkdir(tmp, { recursive: true });

  for (const file of files) {
    const dest = path.join(tmp, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
  }

  await fs.writeFile(path.join(tmp, "preview-runner.ts"), PREVIEW_RUNNER, "utf8");

  const result = await esbuild.build({
    entryPoints: [path.join(tmp, "preview-runner.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2020",
    absWorkingDir: tmp,
  });

  const js = result.outputFiles?.[0]?.text ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Foxloop Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #050810; overflow: hidden; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module">${js}</script>
</body>
</html>`;
}

export async function buildPreviewFromWorkspace(gameId: string, files: GameFile[]): Promise<string> {
  void gameId;
  return buildPreviewHtml(files);
}

export async function buildPreviewFromGameId(
  gameId: string,
  getFiles: () => Promise<GameFile[]>
): Promise<string> {
  const files = await getFiles();
  if (!files.length) {
    const dir = workspaceDir(gameId);
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const fromDisk: GameFile[] = [];
    for (const name of names) {
      if (!name.endsWith(".ts")) continue;
      fromDisk.push({
        path: name,
        content: await fs.readFile(path.join(dir, name), "utf8"),
        updatedAt: new Date().toISOString(),
      });
    }
    return buildPreviewHtml(fromDisk);
  }
  return buildPreviewHtml(files);
}
