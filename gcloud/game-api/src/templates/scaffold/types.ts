export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  maxLives: number;
  hint: string;
  pointerDown?: boolean;
  keys?: Record<string, boolean>;
}
