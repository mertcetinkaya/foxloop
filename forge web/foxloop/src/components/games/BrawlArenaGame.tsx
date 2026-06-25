"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  createInitialState,
  onKey,
  restartLevel,
  setMoveLeft,
  setMoveRight,
  triggerJump,
  triggerKick,
  triggerPunch,
  updateGame,
} from "@/games/brawl-arena/engine";
import { drawGame } from "@/games/brawl-arena/renderer";
import type { GameState } from "@/games/brawl-arena/types";

function inRect(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

export function BrawlArenaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const viewSizeRef = useRef({ w: 800, h: 600 });
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );

  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    viewSizeRef.current = { w, h };
    canvas.width = w;
    canvas.height = h;
    if (!stateRef.current) {
      stateRef.current = createInitialState(w, h);
    } else {
      stateRef.current.arenaW = w;
      stateRef.current.arenaH = h;
      stateRef.current.groundY = h * 0.78;
    }
  }, []);

  const restart = useCallback(() => {
    if (!stateRef.current) return;
    restartLevel(stateRef.current);
    setGameStatus("playing");
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onKeyDown = (e: KeyboardEvent) => onKey(stateRef.current!, e.key, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(stateRef.current!, e.key, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const mapPointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { w, h } = viewSizeRef.current;
      return {
        sx: ((clientX - rect.left) / rect.width) * w,
        sy: ((clientY - rect.top) / rect.height) * h,
      };
    };

    const handlePointer = (clientX: number, clientY: number, down: boolean) => {
      const state = stateRef.current;
      if (!state) return;
      const { sx, sy } = mapPointer(clientX, clientY);
      const w = state.arenaW;
      const by = state.arenaH - 56;

      if (inRect(sx, sy, 20, by - 30, 44, 44)) setMoveLeft(state, down);
      if (inRect(sx, sy, 72, by - 30, 44, 44)) setMoveRight(state, down);
      if (inRect(sx, sy, 46, by - 58, 44, 36) && down) triggerJump(state);

      if (inRect(sx, sy, w - 188, by - 30, 52, 52) && down) triggerPunch(state);
      if (inRect(sx, sy, w - 120, by - 30, 52, 52) && down) triggerKick(state);
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      handlePointer(e.clientX, e.clientY, true);
    };
    const onPointerUp = (e: PointerEvent) => {
      handlePointer(e.clientX, e.clientY, false);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    let animId = 0;
    let lastTime = performance.now();
    let lastStatus: GameState["status"] = "playing";

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const state = stateRef.current;
      const ctx = canvas.getContext("2d");
      if (!state || !ctx) return;

      updateGame(state, dt);
      if (state.status !== lastStatus) {
        lastStatus = state.status;
        setGameStatus(state.status);
      }

      const { w, h } = viewSizeRef.current;
      drawGame(ctx, state, w, h);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#1a1a2e]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Brawl Arena fighting game"
      />

      <div className="pointer-events-none absolute left-0 top-0 p-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {gameStatus !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-[#141820] p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus === "won" ? "Victory!" : "Defeat"}
            </h2>
            <p className="mt-3 text-muted">
              {gameStatus === "won"
                ? "You won the brawl!"
                : "Train harder and come back."}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={restart}
                className="flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
              <Link
                href="/"
                className="rounded-full border border-border py-3 text-sm font-medium text-white hover:bg-white/5"
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
