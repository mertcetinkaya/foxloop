export type GameStatus = "playing" | "won" | "lost";

export type FighterState = "idle" | "walk" | "jump" | "punch" | "kick" | "hurt" | "block";

export interface Fighter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facing: 1 | -1;
  state: FighterState;
  stateTimer: number;
  onGround: boolean;
  isPlayer: boolean;
  color: string;
  accent: string;
  combo: number;
}

export interface HitSpark {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameState {
  status: GameStatus;
  player: Fighter;
  enemy: Fighter;
  arenaW: number;
  arenaH: number;
  groundY: number;
  round: number;
  maxRounds: number;
  playerWins: number;
  enemyWins: number;
  roundTimer: number;
  sparks: HitSpark[];
  screenShake: number;
  slowMo: number;
  keys: Record<string, boolean>;
  moveLeft: boolean;
  moveRight: boolean;
  wantJump: boolean;
  wantPunch: boolean;
  wantKick: boolean;
}
