"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  createInitialState,
  findArrowAtPoint,
  restartLevel,
  trySelectArrow,
  updateGame,
} from "@/games/arrow-out/engine";
import { drawGame, getBoardLayout } from "@/games/arrow-out/renderer";
import type { GameState } from "@/games/arrow-out/types";

export function ArrowOutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const hoverRef = useRef<string | null>(null);
  const viewSizeRef = useRef({ w: 800, h: 600 });
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [lives, setLives] = useState(3);

  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    viewSizeRef.current = { w, h };
    canvas.width = w;
    canvas.height = h;
  }, []);

  const restart = useCallback(() => {
    restartLevel(stateRef.current);
    setGameStatus("playing");
    setLives(stateRef.current.lives);
    hoverRef.current = null;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const state = stateRef.current;
      const { w, h } = viewSizeRef.current;
      const layout = getBoardLayout(w, h, state.gridWidth, state.gridHeight);
      hoverRef.current = findArrowAtPoint(state, px, py, layout);
      canvas.style.cursor = hoverRef.current ? "pointer" : "default";
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      const state = stateRef.current;
      if (state.status !== "playing" || state.runoutIds.length > 0) return;

      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const { w, h } = viewSizeRef.current;
      const layout = getBoardLayout(w, h, state.gridWidth, state.gridHeight);
      const arrowId = findArrowAtPoint(state, px, py, layout);
      if (!arrowId) return;

      trySelectArrow(state, arrowId);
      setLives(state.lives);
      if (state.status !== "playing") {
        setGameStatus(state.status);
      }
    };

    const onMouseMove = (e: MouseEvent) =>
      handlePointerMove(e.clientX, e.clientY);
    const onMouseDown = (e: MouseEvent) =>
      handlePointerDown(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });

    let animId = 0;
    let lastTime = performance.now();
    let lastStatus = stateRef.current.status;
    let lastLives = stateRef.current.lives;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const state = stateRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      updateGame(state, dt);

      if (state.status !== lastStatus) {
        lastStatus = state.status;
        setGameStatus(state.status);
      }
      if (state.lives !== lastLives) {
        lastLives = state.lives;
        setLives(state.lives);
      }

      const { w, h } = viewSizeRef.current;
      drawGame(ctx, state, w, h, hoverRef.current);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#2a1f4e]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Arrow Out puzzle game"
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

      {gameStatus === "playing" && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 text-center">
          <p className="text-sm text-violet-200/80">
            Tap an arrow to slide it out. Blocked moves cost a life ({lives}{" "}
            left).
          </p>
        </div>
      )}

      {gameStatus !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-[#141820] p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus === "won" ? "Board Clear!" : "Game Over"}
            </h2>
            <p className="mt-3 text-muted">
              {gameStatus === "won"
                ? "You cleared every arrow from the board."
                : "You ran out of lives before clearing the puzzle."}
            </p>
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
