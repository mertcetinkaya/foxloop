export const MAX_ROUNDS = 3;
export const ROUND_TIME = 99;
export const GRAVITY = 1400;
export const MOVE_SPEED = 280;
export const JUMP_VELOCITY = -520;
export const PUNCH_DAMAGE = 12;
export const KICK_DAMAGE = 18;
export const PUNCH_DURATION = 0.22;
export const KICK_DURATION = 0.28;
export const HURT_DURATION = 0.35;
export const HIT_STUN = 0.25;

export const PLAYER_COLOR = "#f39c12";
export const PLAYER_ACCENT = "#e67e22";
export const ENEMY_COLOR = "#e74c3c";
export const ENEMY_ACCENT = "#c0392b";

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
