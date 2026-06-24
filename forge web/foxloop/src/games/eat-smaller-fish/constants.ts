export const WIN_SCORE = 1000;
export const START_SCORE = 12;
export const WORLD_SIZE = 2800;

/** Visual fish radius at start and at win score */
export const MIN_FISH_RADIUS = 11;
export const MAX_FISH_RADIUS = 38;

export const BOOST_SPEED_MULTIPLIER = 2.4;
export const BOOST_DRAIN_RATE = 0.45;
export const BOOST_RECHARGE_RATE = 0.28;

export const FOOD_TYPES = [
  { type: "seaweed", points: 1, radius: 7, color: "#3cb371", secondary: "#2d8a4e" },
  { type: "worm", points: 2, radius: 9, color: "#f4a623", secondary: "#d4891a" },
  { type: "shrimp", points: 3, radius: 11, color: "#ff7b7b", secondary: "#e85555" },
  { type: "starfish", points: 5, radius: 14, color: "#ff4757", secondary: "#e8384a" },
] as const;

export const NPC_COLORS = [
  { body: "#4ecdc4", fin: "#3db8b0" },
  { body: "#a29bfe", fin: "#8b84e8" },
  { body: "#fd79a8", fin: "#e86a96" },
  { body: "#ffeaa7", fin: "#f5d985" },
  { body: "#74b9ff", fin: "#5aa8f0" },
  { body: "#55efc4", fin: "#45d9b0" },
  { body: "#fab1a0", fin: "#e89d8c" },
  { body: "#dfe6e9", fin: "#c8cdd0" },
];

export const PLAYER_COLOR = { body: "#ff9f43", fin: "#f08520", stripe: "#ffffff" };

export function radiusFromScore(score: number): number {
  const t = Math.min(score / WIN_SCORE, 1);
  const curved = Math.pow(t, 0.65);
  return MIN_FISH_RADIUS + (MAX_FISH_RADIUS - MIN_FISH_RADIUS) * curved;
}

export function speedFromRadius(radius: number): number {
  return Math.max(100, 240 - radius * 2.2);
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
