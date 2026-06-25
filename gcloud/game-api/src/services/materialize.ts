import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import type { GameFile } from "../types.js";
import { toPascalCase } from "../utils.js";

export async function materializeGameToRepo(
  slug: string,
  title: string,
  files: GameFile[]
): Promise<void> {
  const gameDir = path.join(config.webRoot, "src/games", slug);
  await fs.mkdir(gameDir, { recursive: true });

  for (const file of files) {
    if (!file.path.match(/\.(ts|json)$/)) continue;
    const dest = path.join(gameDir, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
  }

  const pascal = toPascalCase(slug);
  const componentName = `${pascal}Game`;
  const componentPath = path.join(
    config.webRoot,
    "src/components/games",
    `${componentName}.tsx`
  );
  const pagePath = path.join(config.webRoot, "src/app/games", slug, "page.tsx");

  await fs.mkdir(path.dirname(pagePath), { recursive: true });
  await fs.writeFile(componentPath, buildGameComponent(slug, pascal, title), "utf8");
  await fs.writeFile(pagePath, buildGamePage(slug, pascal, title), "utf8");
}

function buildGameComponent(slug: string, pascal: string, title: string): string {
  return `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  createInitialState,
  restartLevel,
  setPointer,
  onPointerDown,
  onPointerUp,
  onKey,
  updateGame,
} from "@/games/${slug}/engine";
import { drawGame } from "@/games/${slug}/renderer";
import type { GameState } from "@/games/${slug}/types";

type RuntimeState = ReturnType<typeof createInitialState>;

export function ${pascal}Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  const [gameStatus, setGameStatus] = useState<GameState["status"]>("playing");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [hint, setHint] = useState("");

  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    stateRef.current = createInitialState(w, h);
    setGameStatus(stateRef.current.status);
    setScore(stateRef.current.score);
    setLives(stateRef.current.lives);
    setHint(stateRef.current.hint ?? "");
  }, []);

  const restart = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    restartLevel(state);
    setGameStatus(state.status);
    setScore(state.score);
    setLives(state.lives);
    setHint(state.hint ?? "");
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const localXY = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const onPointerDownHandler = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      canvas.setPointerCapture(e.pointerId);
      canvas.focus();
      const { x, y } = localXY(e.clientX, e.clientY);
      onPointerDown(state, x, y);
      setPointer(state, x, y);
    };

    const onPointerMoveHandler = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const { x, y } = localXY(e.clientX, e.clientY);
      setPointer(state, x, y);
    };

    const onPointerUpHandler = (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state) return;
      const { x, y } = localXY(e.clientX, e.clientY);
      onPointerUp(state, x, y);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerCancelHandler = () => {
      const state = stateRef.current;
      if (!state) return;
      onPointerUp(state, 0, 0);
    };

    const keyCodes = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      onKey(state, e.code, true);
      if (keyCodes.has(e.code)) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      onKey(state, e.code, false);
    };

    canvas.addEventListener("pointerdown", onPointerDownHandler);
    canvas.addEventListener("pointermove", onPointerMoveHandler);
    canvas.addEventListener("pointerup", onPointerUpHandler);
    canvas.addEventListener("pointercancel", onPointerCancelHandler);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDownHandler);
      canvas.removeEventListener("pointermove", onPointerMoveHandler);
      canvas.removeEventListener("pointerup", onPointerUpHandler);
      canvas.removeEventListener("pointercancel", onPointerCancelHandler);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const state = stateRef.current;
      const ctx = canvas.getContext("2d");
      if (!state || !ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateGame(state, dt);
      drawGame(ctx, state, canvas.width, canvas.height);
      setGameStatus(state.status);
      setScore(state.score);
      setLives(state.lives);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#2a1f4e]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="block h-full w-full touch-none outline-none"
        aria-label="${title}"
      />

      <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <button
          onClick={restart}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#facc15] px-4 py-2 text-sm font-semibold text-[#422006] transition-colors hover:bg-[#fde047]"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {gameStatus === "playing" && hint && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm text-violet-200/80">{hint}</p>
        </div>
      )}

      {gameStatus !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-[#141820] p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus === "won" ? "Victory!" : "Game Over"}
            </h2>
            <p className="mt-3 text-muted">Score: {score}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={restart}
                className="flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
              <Link
                href="/"
                className="rounded-full border border-border py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
}

function buildGamePage(slug: string, pascal: string, title: string): string {
  return `import { ${pascal}Game } from "@/components/games/${pascal}Game";

export const metadata = {
  title: "${title} — foxloop",
  description: "Play ${title} on Foxloop Forge Lite.",
};

export default function ${pascal}Page() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <${pascal}Game />
    </div>
  );
}
`;
}

export async function writeCoverPlaceholder(slug: string): Promise<string> {
  const coverPath = path.join(config.webRoot, "public/games", `${slug}.jpg`);
  const fallback = path.join(config.webRoot, "public/games/arrow-out.jpg");
  try {
    await fs.mkdir(path.dirname(coverPath), { recursive: true });
    await fs.copyFile(fallback, coverPath);
  } catch {
    // optional
  }
  return `/games/${slug}.jpg`;
}
