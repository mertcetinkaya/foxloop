"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  continueAfterLoss,
  continueFromBracket,
  createInitialState,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  screenToScene,
  selectTeam,
  updateGame,
} from "@/games/penalty-fever/engine";
import {
  drawBracketPlayButton,
  drawGame,
  drawTeamSelectOverlay,
  getBracketPlayButton,
  getTeamSelectHitboxes,
} from "@/games/penalty-fever/renderer";
import { TEAMS } from "@/games/penalty-fever/constants";
import type { GameState } from "@/games/penalty-fever/types";

export function PenaltyFeverGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const viewSizeRef = useRef({ w: 800, h: 600 });
  const holdingRef = useRef(false);
  const [screen, setScreen] = useState(stateRef.current.screen);
  const [hoverTeam, setHoverTeam] = useState<number | null>(null);

  const syncScreen = useCallback((s: GameState["screen"]) => {
    setScreen(s);
  }, []);

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
    holdingRef.current = false;
    setScreen("team_select");
    setHoverTeam(null);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { w, h } = viewSizeRef.current;
      return screenToScene(clientX, clientY, rect, w, h);
    };

    const onPointerDown = (clientX: number, clientY: number) => {
      const state = stateRef.current;
      const { w, h } = viewSizeRef.current;

      if (state.screen === "team_select") {
        const boxes = getTeamSelectHitboxes(w, h);
        const hit = boxes.find(
          (b) =>
            clientX - canvas.getBoundingClientRect().left >= b.x &&
            clientX - canvas.getBoundingClientRect().left <= b.x + b.w &&
            clientY - canvas.getBoundingClientRect().top >= b.y &&
            clientY - canvas.getBoundingClientRect().top <= b.y + b.h
        );
        if (hit) {
          selectTeam(state, TEAMS[hit.teamIndex]);
          syncScreen(state.screen);
        }
        return;
      }

      if (state.screen === "bracket") {
        const btn = getBracketPlayButton(w, h);
        const lx = clientX - canvas.getBoundingClientRect().left;
        const ly = clientY - canvas.getBoundingClientRect().top;
        if (
          lx >= btn.x &&
          lx <= btn.x + btn.w &&
          ly >= btn.y &&
          ly <= btn.y + btn.h
        ) {
          continueFromBracket(state);
          syncScreen(state.screen);
        }
        return;
      }

      if (
        state.screen === "match_result" ||
        state.screen === "tournament_won"
      ) {
        return;
      }

      holdingRef.current = true;
      const local = getLocal(clientX, clientY);
      handlePointerDown(state, local.x, local.y, performance.now());
    };

    const onPointerUp = () => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      const state = stateRef.current;
      if (state.screen === "match") {
        handlePointerUp(state, performance.now());
      }
    };

    const onMouseDown = (e: MouseEvent) => onPointerDown(e.clientX, e.clientY);
    const onMouseUp = () => onPointerUp();
    const onMouseMove = (e: MouseEvent) => {
      const state = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const { w, h } = viewSizeRef.current;

      if (state.screen === "match") {
        const local = screenToScene(e.clientX, e.clientY, rect, w, h);
        handlePointerMove(state, local.x, local.y);
        return;
      }

      if (state.screen !== "team_select") return;
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const boxes = getTeamSelectHitboxes(w, h);
      const hit = boxes.findIndex(
        (b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h
      );
      setHoverTeam(hit >= 0 ? hit : null);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0])
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const state = stateRef.current;
      if (state.screen !== "match") return;
      const rect = canvas.getBoundingClientRect();
      const { w, h } = viewSizeRef.current;
      const local = screenToScene(
        e.touches[0].clientX,
        e.touches[0].clientY,
        rect,
        w,
        h
      );
      handlePointerMove(state, local.x, local.y);
    };

    const onTouchEnd = () => onPointerUp();

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    let animId = 0;
    let lastTime = performance.now();
    let lastScreen = stateRef.current.screen;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const state = stateRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      updateGame(state, dt, now);

      if (state.screen !== lastScreen) {
        lastScreen = state.screen;
        syncScreen(state.screen);
      }

      const { w, h } = viewSizeRef.current;

      if (state.screen === "team_select") {
        drawTeamSelectOverlay(ctx, w, h, TEAMS, hoverTeam);
      } else if (state.screen === "bracket") {
        drawGame(ctx, state, w, h);
        drawBracketPlayButton(ctx, w, h);
      } else {
        drawGame(ctx, state, w, h);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [hoverTeam, syncScreen]);

  const handleContinue = () => {
    const state = stateRef.current;
    if (state.screen === "match_result") {
      continueAfterLoss(state);
      syncScreen(state.screen);
    } else if (state.screen === "tournament_won") {
      restart();
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#0c082d]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Penalty Fever game"
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

      {(screen === "match_result" || screen === "tournament_won") && (
        <div className="absolute inset-0 flex items-end justify-center pb-24">
          <div className="pointer-events-auto mx-4 flex flex-col gap-3">
            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4" />
              {screen === "tournament_won" ? "Replay" : "Give It Another Shot"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-white/30 bg-black/40 px-8 py-3 text-center text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              Return Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
