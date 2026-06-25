"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  activateNitro,
  createInitialState,
  onKey,
  restartLevel,
  setBraking,
  setRacing,
  setSteerLeft,
  setSteerRight,
  updateGame,
} from "@/games/city-race/engine";
import { drawGame } from "@/games/city-race/renderer";
import type { GameState } from "@/games/city-race/types";

function hitCircle(
  x: number,
  y: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

export function CityRaceGame() {
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

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      onKey(stateRef.current, k, true);
      if (k === " " || k === "n") {
        e.preventDefault();
        activateNitro(stateRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => onKey(stateRef.current, e.key, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const handlePointer = (clientX: number, clientY: number, down: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { w, h } = viewSizeRef.current;
      const sx = (x / rect.width) * w;
      const sy = (y / rect.height) * h;
      const state = stateRef.current;

      const steerY = h - 88;
      if (hitCircle(sx, sy, 56, steerY, 40)) {
        setSteerLeft(state, down);
        return;
      }
      if (hitCircle(sx, sy, 130, steerY, 40)) {
        setSteerRight(state, down);
        return;
      }

      const pedalY = h - 100;
      if (sx >= w - 150 && sx <= w - 92 && sy >= pedalY && sy <= pedalY + 72) {
        setBraking(state, down);
        return;
      }
      if (sx >= w - 78 && sx <= w - 20 && sy >= pedalY && sy <= pedalY + 72) {
        setRacing(state, down);
        return;
      }

      if (sx > w * 0.35 && sx < w * 0.65 && sy < 100 && down) {
        activateNitro(state);
      }
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
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      handlePointer(e.clientX, e.clientY, true);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);

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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#87ceeb]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="City Race game"
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
              {gameStatus === "won" ? "Race Complete!" : "Crashed!"}
            </h2>
            <p className="mt-3 text-muted">
              {gameStatus === "won"
                ? "You finished the city sprint!"
                : "Avoid the red traffic and try again."}
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
