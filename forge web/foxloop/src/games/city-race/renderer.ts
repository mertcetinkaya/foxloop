import {
  BUILDING_COLORS,
  LANE_COUNT,
  WIN_DISTANCE,
  lerp,
} from "./constants";
import { LANE_SPREAD } from "./engine";
import type { GameState } from "./types";

function roadEdges(
  y: number,
  horizon: number,
  height: number,
  width: number
): { left: number; right: number; t: number } {
  const t = clamp01((y - horizon) / (height - horizon));
  const halfTop = width * 0.04;
  const halfBottom = width * 0.46;
  const half = halfTop + (halfBottom - halfTop) * t * t;
  const cx = width / 2;
  return { left: cx - half, right: cx + half, t };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#4fc3f7");
  g.addColorStop(1, "#87ceeb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon + 4);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const cloud of [
    { x: w * 0.15, y: horizon * 0.25, r: 28 },
    { x: w * 0.55, y: horizon * 0.18, r: 22 },
    { x: w * 0.82, y: horizon * 0.32, r: 20 },
  ]) {
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.r * 0.8, cloud.y - 8, cloud.r * 0.7, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.r * 1.5, cloud.y, cloud.r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDistantCity(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizon: number
) {
  const baseY = horizon - 8;
  for (let i = 0; i < 14; i++) {
    const bx = (i / 14) * w + (i % 2) * 12;
    const bw = w / 11;
    const bh = 30 + (i % 4) * 22;
    ctx.fillStyle = `rgba(120, 160, 200, ${0.25 + (i % 3) * 0.08})`;
    ctx.fillRect(bx, baseY - bh, bw * 0.85, bh);
  }
}

function drawSideBuildings(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  scroll: number
) {
  const count = 8;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? "left" : "right";
    const idx = Math.floor(i / 2);
    const t = idx / count;
    const y = horizon + (h - horizon) * (0.15 + t * 0.75);
    const { left, right, t: roadT } = roadEdges(y, horizon, h, w);
    const color = BUILDING_COLORS[(idx + Math.floor(scroll / 200)) % BUILDING_COLORS.length];
    const bh = lerp(40, 140, roadT);
    const bw = lerp(50, 110, roadT);

    if (side === "left") {
      const x = left - bw - lerp(8, 28, roadT);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - bh, bw, bh);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(x + 10 + col * 22, y - bh + 12 + row * 28, 12, 16);
        }
      }
    } else {
      const x = right + lerp(8, 28, roadT);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - bh, bw, bh);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(x + 10 + col * 22, y - bh + 12 + row * 28, 12, 16);
        }
      }
    }
  }
}

function drawRoadAndVerge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  scroll: number
) {
  for (let y = Math.floor(horizon); y < h; y++) {
    const { left, right, t } = roadEdges(y, horizon, h, w);
    const sidewalk = lerp(6, 22, t);

    const grass = lerpColor("#6fcf6f", "#52b852", t);
    ctx.fillStyle = grass;
    ctx.fillRect(0, y, Math.max(0, left - sidewalk), 1);
    ctx.fillRect(Math.min(w, right + sidewalk), y, w - right - sidewalk, 1);

    ctx.fillStyle = lerpColor("#bdbdbd", "#9e9e9e", t);
    ctx.fillRect(Math.max(0, left - sidewalk), y, sidewalk, 1);
    ctx.fillRect(right, y, sidewalk, 1);

    ctx.fillStyle = lerpColor("#4a4a4a", "#2e2e2e", t);
    ctx.fillRect(left, y, right - left, 1);

    const curb = lerpColor("#e74c3c", "#c0392b", t);
    ctx.fillStyle = curb;
    ctx.fillRect(left - 3, y, 3, 1);
    ctx.fillRect(right, y, 3, 1);
  }

  const dashPhase = (scroll * 0.15) % 40;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    for (let y = Math.floor(horizon); y < h; y++) {
      const { left, right, t } = roadEdges(y, horizon, h, w);
      const laneX = left + ((right - left) * lane) / LANE_COUNT;
      if (((y + dashPhase) % 40) < 22) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + t * 0.45})`;
        ctx.fillRect(laneX - 2, y, 4, 1);
      }
    }
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const c1 = parse(a);
  const c2 = parse(b);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const bl = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r},${g},${bl})`;
}

function projectLane(
  lanePos: number,
  z: number,
  w: number,
  h: number,
  horizon: number
): { x: number; y: number; scale: number } {
  const t = clamp01(1 - z);
  const y = horizon + (h - horizon) * (0.88 - t * 0.76);
  const { left, right } = roadEdges(y, horizon, h, w);
  const roadW = right - left;
  const laneCenter = left + roadW * (0.5 + lanePos * LANE_SPREAD);
  const scale = lerp(0.35, 1.15, t);
  return { x: laneCenter, y, scale };
}

function drawCarFromBehind(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  bodyColor: string,
  nitroFlame = false
) {
  const w = 44 * scale;
  const h = 28 * scale;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.35, w * 0.55, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, -h * 0.1);
  ctx.lineTo(-w * 0.35, -h * 0.55);
  ctx.lineTo(w * 0.15, -h * 0.65);
  ctx.lineTo(w * 0.42, -h * 0.35);
  ctx.lineTo(w * 0.42, h * 0.25);
  ctx.lineTo(-w * 0.45, h * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-w * 0.05, -h * 0.55, w * 0.35, h * 0.28);

  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(-w * 0.38, h * 0.08, w * 0.12, h * 0.1);
  ctx.fillRect(w * 0.28, h * 0.08, w * 0.12, h * 0.1);

  if (nitroFlame) {
    for (const off of [-0.12, 0.12]) {
      const fg = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.55);
      fg.addColorStop(0, "#3498db");
      fg.addColorStop(0.5, "#f39c12");
      fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(off * w - w * 0.06, h * 0.22);
      ctx.lineTo(off * w, h * 0.65);
      ctx.lineTo(off * w + w * 0.06, h * 0.22);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawTraffic(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  horizon: number
) {
  const sorted = [...state.traffic].sort((a, b) => b.z - a.z);
  for (const car of sorted) {
    const p = projectLane(car.lane, car.z, w, h, horizon);
    drawCarFromBehind(ctx, p.x, p.y, p.scale * 0.85, car.color);
  }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number
) {
  const panelW = 200;
  const panelH = 72;
  const px = (w - panelW) / 2;
  const py = 12;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 14);
  ctx.fill();

  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillStyle = "#2c3e50";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(state.displaySpeed)} km/h`, w / 2, py + 32);

  const barX = px + 16;
  const barY = py + 44;
  const barW = panelW - 32;
  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 10, 5);
  ctx.fill();
  ctx.fillStyle = state.nitroActive ? "#3498db" : "#2ecc71";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * state.nitro, 10, 5);
  ctx.fill();

  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(`Score ${state.score}`, 16, 32);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(state.distance)} / ${WIN_DISTANCE}m`, w - 16, 32);
}

function drawTouchControls(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const steerY = h - 88;
  const pedalY = h - 100;

  ctx.fillStyle = "rgba(108, 92, 231, 0.85)";
  ctx.beginPath();
  ctx.arc(56, steerY, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(130, steerY, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("◀", 56, steerY + 8);
  ctx.fillText("▶", 130, steerY + 8);

  ctx.fillStyle = "rgba(180, 180, 180, 0.9)";
  ctx.beginPath();
  ctx.roundRect(w - 150, pedalY, 58, 72, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(w - 78, pedalY, 58, 72, 10);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.font = "bold 11px system-ui";
  ctx.fillText("BRAKE", w - 121, pedalY + 40);
  ctx.fillText("RACE", w - 49, pedalY + 40);
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number
) {
  const shake = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
  const horizon = height * 0.36;

  ctx.save();
  ctx.translate(shake, shake);

  drawSky(ctx, width, height, horizon);
  drawDistantCity(ctx, width, horizon);
  drawRoadAndVerge(ctx, width, height, horizon, state.roadScroll);
  drawSideBuildings(ctx, width, height, horizon, state.roadScroll);
  drawTraffic(ctx, state, width, height, horizon);

  const player = projectLane(state.laneX, 0.12, width, height, horizon);
  drawCarFromBehind(
    ctx,
    player.x,
    player.y,
    player.scale,
    "#f1c40f",
    state.nitroActive
  );

  ctx.restore();

  drawHud(ctx, state, width, height);
  drawTouchControls(ctx, width, height);

  if (state.status !== "playing") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      state.status === "won" ? "Race Complete!" : "Crashed!",
      width / 2,
      height / 2 - 10
    );
    ctx.font = "16px system-ui";
    ctx.fillText("Tap replay on overlay", width / 2, height / 2 + 24);
  }
}
