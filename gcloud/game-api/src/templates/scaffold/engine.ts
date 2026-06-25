import {
  ENEMY_RADIUS,
  ENEMY_SPEED,
  MAX_LIVES,
  PLAYER_RADIUS,
  SPAWN_MS,
} from "./constants";
import type { GameState } from "./types";

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function createInitialState(width: number, height: number): GameState & {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  spawnTimer: number;
  shake: number;
} {
  return {
    status: "playing",
    score: 0,
    lives: MAX_LIVES,
    maxLives: MAX_LIVES,
    hint: "Move with mouse or touch. Dodge the orbs!",
    width,
    height,
    playerX: width / 2,
    playerY: height * 0.65,
    enemies: [],
    spawnTimer: 0,
    shake: 0,
  };
}

export type RuntimeState = ReturnType<typeof createInitialState>;

export function restartLevel(state: RuntimeState): void {
  const next = createInitialState(state.width, state.height);
  Object.assign(state, next);
}

export function setPointer(state: RuntimeState, x: number, y: number): void {
  state.playerX = Math.max(PLAYER_RADIUS, Math.min(state.width - PLAYER_RADIUS, x));
  state.playerY = Math.max(PLAYER_RADIUS, Math.min(state.height - PLAYER_RADIUS, y));
}

function spawnEnemy(state: RuntimeState): void {
  const fromLeft = Math.random() > 0.5;
  const x = fromLeft ? -ENEMY_RADIUS : state.width + ENEMY_RADIUS;
  const y = 80 + Math.random() * (state.height - 160);
  const vx = fromLeft ? ENEMY_SPEED : -ENEMY_SPEED;
  state.enemies.push({ x, y, vx, vy: (Math.random() - 0.5) * 40, r: ENEMY_RADIUS });
}

function hit(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < a.r + b.r;
}

export function updateGame(state: RuntimeState, dt: number): void {
  if (state.status !== "playing") return;

  state.spawnTimer += dt * 1000;
  if (state.spawnTimer >= SPAWN_MS) {
    state.spawnTimer = 0;
    spawnEnemy(state);
  }

  for (const e of state.enemies) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  state.enemies = state.enemies.filter(
    (e) => e.x > -80 && e.x < state.width + 80
  );

  for (const e of state.enemies) {
    if (hit({ x: state.playerX, y: state.playerY, r: PLAYER_RADIUS }, e)) {
      state.lives -= 1;
      state.shake = 0.35;
      if (state.lives <= 0) state.status = "lost";
      e.x = -9999;
    }
  }

  state.score += Math.floor(dt * 10);
  if (state.score >= 500) state.status = "won";
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
}
