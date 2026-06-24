"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  createInitialState,
  updateGame,
  screenToWorld,
} from "@/games/eat-smaller-fish/engine";
import { drawGame } from "@/games/eat-smaller-fish/renderer";
import type { GameState } from "@/games/eat-smaller-fish/types";

export function EatSmallerFishGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
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
  }, []);

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
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

    const handlePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const { w, h } = viewSizeRef.current;
      const state = stateRef.current;
      state.mouseWorld = screenToWorld(sx, sy, state.camera, w, h);
    };

    const onMouseMove = (e: MouseEvent) => handlePointer(e.clientX, e.clientY);
    const onMouseDown = () => {
      stateRef.current.boosting = true;
    };
    const onMouseUp = () => {
      stateRef.current.boosting = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0])
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      stateRef.current.boosting = true;
      if (e.touches[0])
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      stateRef.current.boosting = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    let animId = 0;
    let lastTime = performance.now();
    let lastStatus = stateRef.current.status;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const state = stateRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#0d4f5c]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Eat the Smaller Fish game"
      />

      <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {gameStatus !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-[#141820] p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus === "won" ? "🎉 You Win!" : "Game Over"}
            </h2>
            <p className="mt-3 text-muted">
              {gameStatus === "won"
                ? "You reached 1000 points and ruled the ocean!"
                : "A bigger fish caught you. Swim smarter next time!"}
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
