import { MAX_ROUNDS } from "./constants";
import type { Fighter, GameState } from "./types";

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, groundY: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#1a1a2e");
  sky.addColorStop(0.55, "#4a3f6b");
  sky.addColorStop(1, "#6c5ce7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 6; i++) {
    const bw = 60 + i * 18;
    const bh = 80 + i * 35;
    const bx = (i % 2 === 0 ? 40 : w - bw - 40) + (i * 7);
    ctx.fillRect(bx, groundY - bh - 20, bw, bh);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillRect(bx + 8 + col * 22, groundY - bh + 10 + row * 22, 14, 16);
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.06)";
  }

  const floor = ctx.createLinearGradient(0, groundY, 0, h);
  floor.addColorStop(0, "#2d3436");
  floor.addColorStop(1, "#1e272e");
  ctx.fillStyle = floor;
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter) {
  const { x, y, width, height, facing, color, accent, state } = f;

  ctx.save();
  ctx.translate(x + width / 2, y + height);
  ctx.scale(facing, 1);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 4, width * 0.55, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -height, 0, 0);
  bodyGrad.addColorStop(0, color);
  bodyGrad.addColorStop(1, accent);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-width * 0.35, -height * 0.72, width * 0.7, height * 0.55, 10);
  ctx.fill();

  ctx.fillStyle = "#ffdbac";
  ctx.beginPath();
  ctx.arc(0, -height * 0.82, width * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = accent;
  if (state === "hurt") ctx.fillStyle = "#ff7675";

  const punchExt = state === "punch" ? 22 : 0;
  const kickExt = state === "kick" ? 28 : 0;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(width * 0.15, -height * 0.62, width * 0.35 + punchExt, 14, 6);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(-width * 0.15, -height * 0.35, width * 0.3 + kickExt, 16, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(width * 0.05, -height * 0.35, width * 0.28, 16, 6);
  ctx.fill();

  if (state === "punch") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(width * 0.55 + punchExt, -height * 0.58, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state === "kick") {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(width * 0.35 + kickExt, -height * 0.28, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  f: Fighter,
  x: number,
  y: number,
  align: "left" | "right",
  w: number
) {
  const barW = w * 0.36;
  const bx = align === "left" ? x : x - barW;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(bx, y, barW, 18, 9);
  ctx.fill();
  const pct = f.health / f.maxHealth;
  ctx.fillStyle = f.isPlayer ? "#2ecc71" : "#e74c3c";
  ctx.beginPath();
  ctx.roundRect(bx, y, barW * pct, 18, 9);
  ctx.fill();
  ctx.font = "bold 13px system-ui";
  ctx.fillStyle = "#fff";
  ctx.textAlign = align === "left" ? "left" : "right";
  ctx.fillText(f.isPlayer ? "YOU" : "RIVAL", bx, y - 6);
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState) {
  const w = state.arenaW;
  drawHealthBar(ctx, state.player, 20, 28, "left", w);
  drawHealthBar(ctx, state.enemy, w - 20, 28, "right", w);

  ctx.font = "bold 28px system-ui";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(String(Math.ceil(state.roundTimer)), w / 2, 42);

  ctx.font = "600 14px system-ui";
  ctx.fillText(`ROUND ${state.round}/${MAX_ROUNDS}`, w / 2, 62);
  ctx.fillText(
    `${state.playerWins} - ${state.enemyWins}`,
    w / 2,
    78
  );
}

function drawTouchHints(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const y = h - 56;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(16, y - 36, 110, 72, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(w - 200, y - 36, 184, 72, 12);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("◀ ▶ move", 70, y);
  ctx.fillText("↑ jump", 70, y + 18);
  ctx.fillText("J punch · K kick", w - 108, y + 6);
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
) {
  state.arenaW = width;
  state.arenaH = height;
  state.groundY = height * 0.78;

  const shake =
    state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake * 16 : 0;
  ctx.save();
  ctx.translate(shake, shake);

  drawBackground(ctx, width, height, state.groundY);

  const drawOrder =
    state.player.x < state.enemy.x
      ? [state.player, state.enemy]
      : [state.enemy, state.player];
  for (const f of drawOrder) drawFighter(ctx, f);

  for (const s of state.sparks) {
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 8 * s.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  drawHud(ctx, state);
  drawTouchHints(ctx, width, height);

  if (state.status !== "playing") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 34px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      state.status === "won" ? "Victory!" : "Defeat",
      width / 2,
      height / 2 - 12
    );
    ctx.font = "16px system-ui";
    ctx.fillText("Tap replay on overlay", width / 2, height / 2 + 22);
  }
}
