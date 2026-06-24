export type Direction = "up" | "down" | "left" | "right";

export interface Cell {
  x: number;
  y: number;
}

/** JSON arrow: head leads; tail_path[0] is the cell directly behind the head. */
export interface ArrowDefinition {
  id: string;
  head_pos: Cell;
  direction: Direction;
  tail_path: Cell[];
}

export interface ArrowPiece extends ArrowDefinition {
  removed: boolean;
  animationTick: number;
}

export type GameStatus = "playing" | "won" | "lost";

export interface LevelData {
  id: string;
  name: string;
  grid: { width: number; height: number };
  arrows: ArrowDefinition[];
}

export interface GameState {
  gridWidth: number;
  gridHeight: number;
  arrows: ArrowPiece[];
  runoutIds: string[];
  lives: number;
  maxLives: number;
  status: GameStatus;
  level: number;
  blockedId: string | null;
  blockedFlash: number;
}

export interface BoardLayout {
  offsetX: number;
  offsetY: number;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}
