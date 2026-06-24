export interface Vec2 {
  x: number;
  y: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Food {
  id: number;
  x: number;
  y: number;
  type: string;
  points: number;
  radius: number;
  color: string;
  secondary: string;
  wobble: number;
}

export interface Fish {
  id: number;
  x: number;
  y: number;
  score: number;
  radius: number;
  angle: number;
  vx: number;
  vy: number;
  color: { body: string; fin: string; stripe?: string };
  isPlayer: boolean;
  wanderTimer: number;
  name?: string;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  player: Fish;
  npcs: Fish[];
  foods: Food[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  status: GameStatus;
  camera: Vec2;
  mouseWorld: Vec2;
  nextId: number;
  eatFlash: number;
  screenShake: number;
  pendingNpcSpawns: number[];
  boosting: boolean;
  boostEnergy: number;
}
