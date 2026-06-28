import type { GameState } from "./types";

export function createInitialState(width: number, height: number): GameState & {
  width: number;
  height: number;
} {
  return {
    status: "playing",
    score: 0,
    lives: 0,
    maxLives: 0,
    hint: "",
    pointerDown: false,
    keys: {},
    width,
    height,
  };
}

export type RuntimeState = ReturnType<typeof createInitialState>;

export function restartLevel(state: RuntimeState): void {
  Object.assign(state, createInitialState(state.width, state.height));
}

export function setPointer(state: RuntimeState, x: number, y: number): void {
  void x;
  void y;
  void state;
}

export function onPointerDown(state: RuntimeState, x: number, y: number): void {
  state.pointerDown = true;
  setPointer(state, x, y);
}

export function onPointerUp(state: RuntimeState, _x: number, _y: number): void {
  state.pointerDown = false;
}

export function onKey(state: RuntimeState, code: string, pressed: boolean): void {
  if (!state.keys) state.keys = {};
  state.keys[code] = pressed;
}

export function updateGame(state: RuntimeState, dt: number): void {
  void dt;
  if (state.status !== "playing") return;
}
