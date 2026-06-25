export const LANE_COUNT = 3;
export const LANE_OFFSETS = [-1, 0, 1];

export const BASE_SPEED = 140;
export const MAX_SPEED = 320;
export const BRAKE_RATE = 420;
export const ACCEL_RATE = 280;
export const NITRO_MULT = 1.65;
export const NITRO_DRAIN = 0.38;
export const NITRO_RECHARGE = 0.22;

export const WIN_DISTANCE = 2800;
export const TRAFFIC_COLORS = ["#e74c3c", "#c0392b", "#ff6b6b"];

export const BUILDING_COLORS = [
  "#f4d03f",
  "#5dade2",
  "#e67e22",
  "#e74c3c",
  "#9b59b6",
  "#1abc9c",
];

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
