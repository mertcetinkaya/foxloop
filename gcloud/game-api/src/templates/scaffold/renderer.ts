import {
  ACCENT,
  BG_BOTTOM,
  BG_TOP,
  ENEMY_COLOR,
  PLAYER_COLOR,
  PLAYER_RADIUS,
} from "./constants";
import { drawGroundShadow, drawOrientedGlowBody, drawParallaxLayer } from "./draw-helpers";
import type { RuntimeState } from "./engine";

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: RuntimeState,
  width: number,
  height: number
): void {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake * 16 : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake * 16 : 0;
  const scroll = (Date.now() / 40) % 200;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawParallaxLayer(ctx, width, height, scroll, "rgba(255,255,255,0.06)", height * 0.72, 10, 48);
  drawParallaxLayer(
    ctx,
    width,
    height,
    scroll * 1.4,
    "rgba(255,255,255,0.04)",
    height * 0.82,
    14,
    64
  );

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + (i % 5) * 0.01})`;
    ctx.beginPath();
    ctx.arc((i * 97) % width, (i * 53) % height, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) {
    drawGroundShadow(ctx, e.x, e.y, e.r, 0.22);
    const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.r);
    g.addColorStop(0, "#fecaca");
    g.addColorStop(1, ENEMY_COLOR);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGroundShadow(ctx, state.playerX, state.playerY, PLAYER_RADIUS);
  drawOrientedGlowBody(
    ctx,
    state.playerX,
    state.playerY,
    0,
    PLAYER_RADIUS,
    PLAYER_COLOR,
    "#1d4ed8"
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(`Score ${state.score}`, 20, 36);

  for (let i = 0; i < state.maxLives; i++) {
    ctx.beginPath();
    ctx.arc(width - 30 - i * 28, 30, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? ACCENT : "rgba(255,255,255,0.2)";
    ctx.fill();
  }

  ctx.restore();
}
