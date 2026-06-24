import {
  ARROW_BLOCKED_COLOR,
  ARROW_COLOR,
  ARROW_HEAD_SIZE,
  ARROW_HOVER_COLOR,
  ARROW_LINE_WIDTH,
  BG_COLOR,
  BOARD_BG,
  BOARD_BORDER,
  BOARD_PADDING,
  BOARD_RADIUS,
  GRID_DOT_COLOR,
  GRID_DOT_RADIUS,
} from "./constants";
import {
  cellToPixel,
  computeLayout,
  getArrowPolyline,
} from "./engine";
import type { BoardLayout, Direction, GameState } from "./types";

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  size: number
) {
  ctx.beginPath();
  switch (direction) {
    case "up":
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * 0.65, y + size * 0.35);
      ctx.lineTo(x + size * 0.65, y + size * 0.35);
      break;
    case "down":
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size * 0.65, y - size * 0.35);
      ctx.lineTo(x + size * 0.65, y - size * 0.35);
      break;
    case "left":
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size * 0.35, y - size * 0.65);
      ctx.lineTo(x + size * 0.35, y + size * 0.65);
      break;
    case "right":
      ctx.moveTo(x + size, y);
      ctx.lineTo(x - size * 0.35, y - size * 0.65);
      ctx.lineTo(x - size * 0.35, y + size * 0.65);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  gridW: number,
  gridH: number
) {
  ctx.fillStyle = GRID_DOT_COLOR;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const p = cellToPixel({ x, y }, layout);
      ctx.beginPath();
      ctx.arc(p.x, p.y, GRID_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  arrow: (typeof state.arrows)[0],
  layout: BoardLayout,
  hoverId: string | null
) {
  if (arrow.removed && !state.runoutIds.includes(arrow.id)) return;

  const polyline = getArrowPolyline(state, arrow);
  if (polyline.length === 0) return;

  const isBlocked =
    state.blockedId === arrow.id && state.blockedFlash > 0;
  const isHover = hoverId === arrow.id && !isBlocked;

  ctx.strokeStyle = isBlocked
    ? ARROW_BLOCKED_COLOR
    : isHover
      ? ARROW_HOVER_COLOR
      : ARROW_COLOR;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = ARROW_LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (isBlocked) {
    const shake = Math.sin(state.blockedFlash * 30) * 3;
    ctx.save();
    ctx.translate(shake, 0);
  }

  ctx.beginPath();
  const first = cellToPixel(polyline[0], layout);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < polyline.length; i++) {
    const p = cellToPixel(polyline[i], layout);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  const head = cellToPixel(polyline[polyline.length - 1], layout);
  drawArrowHead(ctx, head.x, head.y, arrow.direction, ARROW_HEAD_SIZE);

  if (isBlocked) ctx.restore();
}

function drawHudBar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  layout: BoardLayout
) {
  const barY = layout.offsetY - 44;
  const barH = 36;
  const barW = Math.min(layout.boardWidth, canvasW - 32);
  const barX = (canvasW - barW) / 2;

  roundedRect(ctx, barX, barY, barW, barH, 10);
  ctx.fillStyle = "rgba(20, 16, 36, 0.85)";
  ctx.fill();

  ctx.fillStyle = "#f5f3ff";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Level ${state.level}`, barX + 14, barY + barH / 2);

  ctx.textAlign = "center";
  ctx.fillStyle = state.lives <= 1 ? "#fca5a5" : "#fde68a";
  ctx.fillText(`${state.lives} / ${state.maxLives}`, barX + barW * 0.35, barY + barH / 2);

  const remaining = state.arrows.filter((a) => !a.removed).length;
  ctx.fillStyle = "#c4b5fd";
  ctx.fillText(`${remaining} arrows`, barX + barW * 0.65, barY + barH / 2);
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  canvasH: number,
  hoverId: string | null
) {
  const layout = computeLayout(
    canvasW,
    canvasH,
    state.gridWidth,
    state.gridHeight,
    BOARD_PADDING
  );

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  roundedRect(
    ctx,
    layout.offsetX - 8,
    layout.offsetY - 8,
    layout.boardWidth + 16,
    layout.boardHeight + 16,
    BOARD_RADIUS
  );
  ctx.fillStyle = BOARD_BG;
  ctx.fill();
  ctx.strokeStyle = BOARD_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawGrid(ctx, layout, state.gridWidth, state.gridHeight);

  for (const arrow of state.arrows) {
    drawArrow(ctx, state, arrow, layout, hoverId);
  }

  drawHudBar(ctx, state, canvasW, layout);
}

export function getBoardLayout(
  canvasW: number,
  canvasH: number,
  gridW: number,
  gridH: number
): BoardLayout {
  return computeLayout(canvasW, canvasH, gridW, gridH, BOARD_PADDING);
}
