import {
  FIELD,
  FIELD_BORDER,
  FIELD_LINE,
  PILL_BG,
  TEXT,
  TEXT_MUTED,
  WALL,
  WALL_STROKE,
} from "./constants";

export interface PlayfieldBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Single flat playfield inset on canvas — not sky/ground layers. */
export function drawFlatPlayfield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  inset = 16
): PlayfieldBounds {
  ctx.fillStyle = "#0f1219";
  ctx.fillRect(0, 0, width, height);

  const x = inset;
  const y = inset + 8;
  const w = width - inset * 2;
  const h = height - inset * 2 - 16;
  const r = 20;

  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = FIELD;
  ctx.fill();
  ctx.strokeStyle = FIELD_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.strokeStyle = FIELD_LINE;
  ctx.lineWidth = 1;
  for (let row = y + 24; row < y + h; row += 28) {
    ctx.beginPath();
    ctx.moveTo(x, row);
    ctx.lineTo(x + w, row);
    ctx.stroke();
  }
  ctx.restore();

  return { x, y, w, h };
}

/** Semi-transparent obstacle block — walls, barriers, simple colliders. */
export function drawSimpleWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 10
): void {
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = WALL;
  ctx.fill();
  ctx.strokeStyle = WALL_STROKE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Top HUD: one title line left, optional stat lines right — no cards or meters. */
export function drawMinimalHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  title: string,
  rightStats: string[] = []
): void {
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title.toUpperCase(), 24, 22);

  if (rightStats.length) {
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = TEXT_MUTED;
    ctx.textAlign = "right";
    rightStats.forEach((line, i) => {
      ctx.fillText(line, width - 24, 22 + i * 18);
    });
  }
}

/** Optional bottom hint — skip when controls are obvious (prefer empty hint). */
export function drawHintPill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string
): void {
  if (!text.trim()) return;
  ctx.font = "600 14px system-ui, sans-serif";
  const padX = 18;
  const textW = ctx.measureText(text).width;
  const pillW = Math.min(width - 32, textW + padX * 2);
  const pillH = 40;
  const x = (width - pillW) / 2;
  const y = height - pillH - 24;
  ctx.fillStyle = PILL_BG;
  roundedRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, y + pillH / 2);
}

/** @deprecated Prefer drawMinimalHud. Kept for older drafts. */
export function drawScoreBadge(
  ctx: CanvasRenderingContext2D,
  score: number,
  label = "Score"
): void {
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${label} ${score}`, 24, 22);
}
