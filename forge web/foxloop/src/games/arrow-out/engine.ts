import { MAX_LIVES } from "./constants";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  LEVEL_1_ARROWS,
} from "./level1";
import type {
  ArrowDefinition,
  ArrowPiece,
  BoardLayout,
  Cell,
  Direction,
  GameState,
  PixelPoint,
} from "./types";

/** Sub-steps per grid cell during run-out animation (matches arrowout.io). */
export const ANIMATE_GRID_LEN = 3;

const DIR_VEC: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function cloneArrows(defs: ArrowDefinition[]): ArrowPiece[] {
  return defs.map((def) => ({
    ...def,
    head_pos: { ...def.head_pos },
    tail_path: def.tail_path.map((c) => ({ ...c })),
    removed: false,
    animationTick: 0,
  }));
}

export function createInitialState(): GameState {
  return {
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    arrows: cloneArrows(LEVEL_1_ARROWS),
    runoutIds: [],
    lives: MAX_LIVES,
    maxLives: MAX_LIVES,
    status: "playing",
    level: 1,
    blockedId: null,
    blockedFlash: 0,
  };
}

export function restartLevel(state: GameState): void {
  Object.assign(state, createInitialState());
}

/** Full path from tail end to head (used for rendering and snake motion). */
export function getArrowPath(arrow: ArrowDefinition): Cell[] {
  const tailToHead = [...arrow.tail_path].reverse();
  return [...tailToHead, { ...arrow.head_pos }];
}

export function getDirectionBetween(from: Cell, to: Cell): Direction {
  if (from.x === to.x) return to.y > from.y ? "down" : "up";
  if (from.y === to.y) return to.x > from.x ? "right" : "left";
  throw new Error(`Invalid segment (${from.x},${from.y}) -> (${to.x},${to.y})`);
}

function subGridPoint(
  point: Cell,
  progress: number,
  direction: Direction
): Cell {
  const { dx, dy } = DIR_VEC[direction];
  return { x: point.x + dx * progress, y: point.y + dy * progress };
}

function buildOccupancy(
  arrows: ArrowPiece[],
  excludeRemoved = true
): Map<string, string> {
  const occupied = new Map<string, string>();
  for (const arrow of arrows) {
    if (excludeRemoved && arrow.removed) continue;
    for (const cell of getArrowPath(arrow)) {
      occupied.set(cellKey(cell.x, cell.y), arrow.id);
    }
  }
  return occupied;
}

function isOnGrid(x: number, y: number, gridW: number, gridH: number): boolean {
  return x >= 0 && x < gridW && y >= 0 && y < gridH;
}

/** Head must have a clear ray to the board edge in its pointing direction. */
export function canArrowExit(
  arrow: ArrowDefinition,
  arrows: ArrowPiece[],
  gridW: number,
  gridH: number
): boolean {
  const { dx, dy } = DIR_VEC[arrow.direction];
  const head = arrow.head_pos;
  const occupied = buildOccupancy(arrows);

  let x = head.x + dx;
  let y = head.y + dy;

  while (isOnGrid(x, y, gridW, gridH)) {
    const occupant = occupied.get(cellKey(x, y));
    if (occupant && occupant !== arrow.id) return false;
    x += dx;
    y += dy;
  }

  return true;
}

export function buildRunoutPolyline(
  arrow: ArrowDefinition,
  tick: number
): { points: Cell[]; finished: boolean } {
  const path = getArrowPath(arrow);
  const step = Math.floor(tick / ANIMATE_GRID_LEN);
  const fraction = (tick % ANIMATE_GRID_LEN) / ANIMATE_GRID_LEN;

  if (step < path.length - 1) {
    const points: Cell[] = [];
    for (let i = step; i < path.length; i++) {
      const point = path[i];
      if (i === step) {
        const next = path[i + 1];
        const segDir = getDirectionBetween(point, next);
        points.push(subGridPoint(point, fraction, segDir));
      } else if (i === path.length - 1) {
        points.push(
          subGridPoint(point, tick / ANIMATE_GRID_LEN, arrow.direction)
        );
      } else {
        points.push({ ...point });
      }
    }
    return { points, finished: false };
  }

  const last = path[path.length - 1];
  const startExit = tick / ANIMATE_GRID_LEN - path.length + 1;
  const endExit = tick / ANIMATE_GRID_LEN;
  return {
    points: [
      subGridPoint(last, startExit, arrow.direction),
      subGridPoint(last, endExit, arrow.direction),
    ],
    finished: endExit > Math.max(GRID_WIDTH, GRID_HEIGHT),
  };
}

export function getArrowPolyline(
  state: GameState,
  arrow: ArrowPiece
): Cell[] {
  if (arrow.removed && state.runoutIds.includes(arrow.id)) {
    return buildRunoutPolyline(arrow, arrow.animationTick).points;
  }
  return getArrowPath(arrow);
}

export function trySelectArrow(state: GameState, arrowId: string): boolean {
  if (state.status !== "playing" || state.runoutIds.length > 0) return false;

  const arrow = state.arrows.find((a) => a.id === arrowId && !a.removed);
  if (!arrow) return false;

  if (canArrowExit(arrow, state.arrows, state.gridWidth, state.gridHeight)) {
    arrow.removed = true;
    arrow.animationTick = 0;
    state.runoutIds.push(arrow.id);
    state.blockedId = null;
    state.blockedFlash = 0;
    return true;
  }

  state.lives -= 1;
  state.blockedId = arrowId;
  state.blockedFlash = 1;
  if (state.lives <= 0) state.status = "lost";
  return false;
}

export function updateGame(state: GameState, dt: number): void {
  if (state.blockedFlash > 0) {
    state.blockedFlash = Math.max(0, state.blockedFlash - dt * 2.5);
    if (state.blockedFlash <= 0) state.blockedId = null;
  }

  if (state.runoutIds.length === 0 || state.status !== "playing") return;

  const tickStep = Math.max(1, Math.round(dt * 60 * 2));
  const stillRunning: string[] = [];

  for (const id of state.runoutIds) {
    const arrow = state.arrows.find((a) => a.id === id);
    if (!arrow) continue;
    arrow.animationTick += tickStep;
    const anim = buildRunoutPolyline(arrow, arrow.animationTick);
    if (!anim.finished) stillRunning.push(id);
  }

  state.runoutIds = stillRunning;

  if (state.runoutIds.length === 0) {
    const remaining = state.arrows.filter((a) => !a.removed);
    if (remaining.length === 0) state.status = "won";
  }
}

export function computeLayout(
  canvasW: number,
  canvasH: number,
  gridW: number,
  gridH: number,
  padding: number
): BoardLayout {
  const maxBoardW = canvasW - padding * 2;
  const maxBoardH = canvasH - padding * 2 - 56;
  const cellSize = Math.min(maxBoardW / gridW, maxBoardH / gridH, 14);
  const boardWidth = cellSize * gridW;
  const boardHeight = cellSize * gridH;
  const offsetX = (canvasW - boardWidth) / 2;
  const offsetY = (canvasH - boardHeight) / 2 + 20;

  return {
    offsetX,
    offsetY,
    cellSize,
    boardWidth,
    boardHeight,
  };
}

export function cellToPixel(cell: Cell, layout: BoardLayout): PixelPoint {
  return {
    x: layout.offsetX + (cell.x + 0.5) * layout.cellSize,
    y: layout.offsetY + (cell.y + 0.5) * layout.cellSize,
  };
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function findArrowAtPoint(
  state: GameState,
  px: number,
  py: number,
  layout: BoardLayout
): string | null {
  const threshold = Math.max(layout.cellSize * 0.4, 8);
  let bestId: string | null = null;
  let bestDist = threshold;

  for (const arrow of state.arrows) {
    if (arrow.removed && !state.runoutIds.includes(arrow.id)) continue;
    const polyline = getArrowPolyline(state, arrow);
    for (let i = 0; i < polyline.length - 1; i++) {
      const a = cellToPixel(polyline[i], layout);
      const b = cellToPixel(polyline[i + 1], layout);
      const d = distToSegment(px, py, a.x, a.y, b.x, b.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = arrow.id;
      }
    }
  }

  return bestId;
}

export function remainingArrowCount(state: GameState): number {
  return state.arrows.filter((a) => !a.removed).length;
}
